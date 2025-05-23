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

    // 3. Perform the turn update in a transaction
    await withSession(async (session) => {
      // Step 1: Fetch minimal original turn details (role needed for new version)
      // We no longer need to fetch depth or parent details here; the main query handles relationships.
      const fetchOriginalQuery = `
        MATCH (originalTurnToEdit:Turn {id: $parentIdParam})
        RETURN 
          originalTurnToEdit.id AS oteId, 
          originalTurnToEdit.role AS oteRole
          // oteTs is no longer needed here as newVersion will get a new timestamp from 'now'
      `;
      const fetchResult = await session.run(fetchOriginalQuery, { parentIdParam: parentId });

      if (!fetchResult.records || fetchResult.records.length === 0) {
        const err = new Error('Original turn to edit not found.');
        err.status = 404;
        throw err;
      }

      // Only need oteId and oteRole from the original turn for the new version.
      const { oteId, oteRole } = fetchResult.records[0].toObject();
      
      // Step 2: Construct and run the write query
      // This query creates the new turn, archives the old one,
      // and correctly sets up :CHILD_OF or :HAS_ROOT_TURN relationships.
      const createNewVersionQuery = `
        // Match the original turn being edited
        MATCH (originalTurnToEdit:Turn {id: $oteIdParam})

        // Merge the author for the new turn
        MERGE (author:User {id: $userIdParam})
          ON CREATE SET author.name = $userNameParam, author.createdAt = timestamp()
          ON MATCH SET author.name = $userNameParam

        // Create the new version of the turn
        CREATE (newVersion:Turn {
          id: $newTurnIdParam,
          role: $oteRoleParam,             // Inherit role from original
          text: $textParam,
          accepted: true,                  // New versions are accepted by default
          ts: $nowParam,                   // Use current timestamp for the new version
          commit_message: $commitMessageParam // Commit message for the new version
          // 'depth' and 'parent_id' properties are removed
        })

        // Link the new version to its author
        CREATE (newVersion)-[:AUTHORED_BY]->(author)

        // Archive the original turn by setting its 'accepted' flag to false
        SET originalTurnToEdit.accepted = false

        // Handle relationships for the newVersion based on the originalTurnToEdit's context
        WITH newVersion, author, originalTurnToEdit

        // Attempt to find the parent of the originalTurnToEdit
        OPTIONAL MATCH (actualParentOfOriginal:Turn)-[:CHILD_OF]->(originalTurnToEdit)

        // If originalTurnToEdit had an actual parent, link newVersion to that same parent
        FOREACH (_ IN CASE WHEN actualParentOfOriginal IS NOT NULL THEN [1] ELSE [] END |
          CREATE (actualParentOfOriginal)-[:CHILD_OF]->(newVersion)
        )

        // If originalTurnToEdit had NO actual parent (it was a root or orphaned):
        // Check if it was a root turn for any persona.
        WITH newVersion, author, originalTurnToEdit, actualParentOfOriginal // Carry over variables
        WHERE actualParentOfOriginal IS NULL // Proceed only if originalTurnToEdit had no actual parent relationship

        // Find Persona if originalTurnToEdit was its root
        OPTIONAL MATCH (p:Persona)-[r:HAS_ROOT_TURN]->(originalTurnToEdit)

        // If Persona link exists, delete old :HAS_ROOT_TURN link and create new one to newVersion
        FOREACH (ignore IN CASE WHEN p IS NOT NULL AND r IS NOT NULL THEN [1] ELSE [] END |
          DELETE r
          CREATE (p)-[:HAS_ROOT_TURN]->(newVersion)
        )

        RETURN newVersion.id AS newId // Return the ID of the newly created turn
      `;

      const queryParams = {
        userIdParam: userId,
        userNameParam: userName,
        newTurnIdParam: newTurnId,
        oteRoleParam: oteRole, // Role from the original turn
        textParam: text,
        nowParam: now, // Current timestamp for the new turn
        commitMessageParam: commit_message ?? null,
        oteIdParam: oteId // ID of the original turn to find and archive
        // Parameters for depth, parent_id, and actualParentId are removed
      };
      
      const creationResult = await session.run(createNewVersionQuery, queryParams);

      // Check if the new turn was successfully created
      if (!creationResult.records || creationResult.records.length === 0) {
        // This case should ideally not be reached if the Cypher query is correct
        // and doesn't conditionally prevent the RETURN statement.
        const err = new Error('Failed to create new turn version or retrieve its ID.');
        err.status = 500;
        throw err;
      }
      
      const newId = creationResult.records[0].get('newId');

      // 4. Emit an event (optional, but good for real-time updates elsewhere)
      if (redisClient.isOpen) {
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
            id: String(newTurnId), // Ensure string
            parent_id: String(parentId), // Ensure string (original turn ID that was edited)
            persona_id: String(personaId ?? ''), // Ensure string, use empty if null
            editor: String(req.user.email ?? 'unknown'), // Ensure string
            ts: String(now), // Ensure string for Redis timestamp
            text: String(text), // Ensure string
            commit_message: String(commit_message ?? '') // Ensure string, use empty if null
          });
        } catch (redisErr) {
          // Log but do not fail the HTTP response – eventual consistency is fine for v1.
          console.error('Redis publish failed:', redisErr);
        }
      }

      // 5. Respond to the client.
      res.status(201).json({ data: { id: newId } });
    });
  } catch (err) {
    next(err);
  }
});

export default router;
