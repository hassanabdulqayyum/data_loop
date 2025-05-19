/***
 * Router: /turn
 *
 * Responsibilities in clear layman terms:
 * 1. When the front-end sends a PATCH request to /turn/:turnId it means "I want to save a new version of this turn".
 *    – :turnId is the ID of the parent turn (the existing version that the user clicked 'Edit' on).
 *    – The body must contain a "text" field (the revised content). Optionally it can include a "commit_message" that is a one-line summary.
 * 2. If the request is valid and the user is authorised, we:
 *    a. Create a brand-new Turn node in Neo4j.
 *       • It links back to the parent turn via a CHILD_OF relationship.
 *       • The new turn is immediately flagged **accepted:true** so the front-end can display it straight away on the gold path. Reviewers can still toggle this later.
 *       • We also persist a **depth** property equal to `parent.depth + 1` (or `1` when the parent lacks a depth value). Storing depth avoids expensive `length(path)` calculations for huge scripts during analytics queries.
 *    b. Immediately broadcast a Redis Stream event called "script.turn.updated" so the AI diff worker and other services know something changed.
 * 3. The endpoint returns 201 Created together with the new turn ID so the UI can render it.
 *
 * Example curl:
 *   curl -X PATCH \
 *        -H "Authorization: Bearer <token>" \
 *        -H "Content-Type: application/json" \
 *        -d '{"text":"New wording…","commit_message":"clarify intro"}' \
 *        http://localhost:4000/turn/123
 *
 * Success response:
 *   201
 *   { "data": { "id": "550e8400-e29b-41d4-a716-446655440000" } }
 *
 * Error cases:
 *   400 – missing text
 *   401 – missing/invalid JWT (handled by auth middleware earlier in the chain)
 *   404 – parent turn not found
 */
import express from 'express';
import { randomUUID } from 'crypto';
import { withSession } from '../../libs/node-shared/db.js';
import redisClient from '../../libs/node-shared/redis.js';

const router = express.Router();

/**
 * Helper that verifies the logged-in user is allowed to create a new version.
 * In v1 the spec only mentions three roles that may do this: editor, reviewer, founder.
 * If the user has any other role we respond with 403 Forbidden.
 */
function ensureCanEdit(user) {
  const allowedRoles = new Set(['editor', 'reviewer', 'founder']);
  if (!user || !allowedRoles.has(user.role)) {
    const err = new Error('You are not allowed to edit this script');
    err.status = 403;
    throw err;
  }
}

router.patch('/:turnId', async (req, res, next) => {
  try {
    // 1. Basic validation – make sure body.text exists and is a string.
    const { text, commit_message } = req.body;
    // Validate main revised text – must be a non-empty string.
    if (typeof text !== 'string' || !text.trim()) {
      const err = new Error('Field "text" is required and must be a non-empty string');
      err.status = 400;
      throw err;
    }

    // Optional commit_message: when supplied, we cap at 120 characters (per UI spec) so
    // downstream storage and dashboards never need to truncate arbitrarily. The front-end
    // already enforces the cap, but we duplicate the guard server-side for defence in depth.
    if (commit_message !== undefined) {
      if (typeof commit_message !== 'string') {
        const err = new Error('Field "commit_message" must be a string when provided');
        err.status = 400;
        throw err;
      }
      if (commit_message.length > 120) {
        const err = new Error('Field "commit_message" cannot exceed 120 characters');
        err.status = 400;
        throw err;
      }
    }

    // 2. Check user role.
    ensureCanEdit(req.user);

    // Extract user information for authorship.
    // Assuming req.user.id is the unique identifier for the User node
    // and req.user.name is the display name. Fallback to email if name is not present.
    const userId = req.user.id || req.user.email; // Prefer specific ID, fallback to email if ID isn't there
    const userName = req.user.name || req.user.email; // User's display name, fallback to email

    if (!userId) {
      // This should ideally not happen if user is authenticated and req.user is populated.
      console.error('User ID not found in req.user for authorship tracking.');
      const err = new Error('User identifier not found for authorship.');
      err.status = 500; // Internal server error or configuration issue
      throw err;
    }

    const parentId = /^[0-9]+$/.test(req.params.turnId)
      ? Number(req.params.turnId)
      : req.params.turnId;
    const newTurnId = randomUUID(); // v4 UUID – globally unique
    const now = Date.now(); // Unix millis – used for Redis ts field

    // 3. Create the Turn in Neo4j inside one session.
    const createCypher = `
      MATCH (parent:Turn {id: $parentId})
      MERGE (author:User {id: $userId})
        ON CREATE SET author.name = $userName, author.createdAt = timestamp() // Set name & creation time if User node is new
        ON MATCH SET author.name = $userName // Update name if User node already exists (name might change)
      CREATE (parent)<-[:CHILD_OF]-(new:Turn {
        id: $newTurnId,
        role: parent.role,
        text: $text,
        accepted: true,
        parent_id: $parentId,
        depth: coalesce(parent.depth, 0) + 1,
        ts: timestamp(),
        commit_message: $commitMessage
      })
      CREATE (new)-[:AUTHORED_BY]->(author) // Link new Turn to its Author
      SET parent.accepted = false // Archive the parent turn from the gold path
    `;

    // Run the creation statement. If the MATCH fails we surface 404.
    await withSession(async (session) => {
      const result = await session.run(createCypher, {
        parentId,
        newTurnId,
        text,
        commitMessage: commit_message ?? null,
        userId,     // Pass userId for User node MERGE
        userName    // Pass userName for User node SET
      });
      if (result.summary.counters.updates().nodesCreated === 0) {
        const err = new Error('Parent turn not found');
        err.status = 404;
        throw err;
      }
    });

    // Best-effort lookup for personaId (used only for the Redis payload).
    let personaId = null;
    try {
      personaId = await withSession(async (session) => {
        const res2 = await session.run(
          `MATCH (per:Persona)-[:ROOTS]->(:Turn {role:'root'})<-[:CHILD_OF*0..]-(t:Turn {id: $parentId})
           RETURN per.id AS id LIMIT 1`,
          { parentId }
        );
        return res2.records.length ? res2.records[0].get('id') : null;
      });
    } catch (_) {
      /* ignore – personaId stays null */
    }

    // 4. Publish the Redis Stream event. We wrap in try/catch so a Redis hiccup does not break the API request.
    try {
      await redisClient.xAdd('script.turn.updated', '*', {
        id: newTurnId,
        parent_id: parentId,
        persona_id: personaId,
        editor: req.user.email ?? 'unknown',
        ts: now,
        text,
        commit_message: commit_message ?? ''
      });
    } catch (redisErr) {
      // Log but do not fail the HTTP response – eventual consistency is fine for v1.
      console.error('Redis publish failed:', redisErr);
    }

    // 5. Respond to the client.
    res.status(201).json({ data: { id: newTurnId } });
  } catch (err) {
    next(err);
  }
});

export default router;
