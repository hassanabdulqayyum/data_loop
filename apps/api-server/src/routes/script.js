/**
 * This file defines the /script/:personaId endpoint.
 *
 * When a logged-in user calls GET /script/:personaId, it returns the list of turns (nodes)
 * that make up the latest "gold path" for the given persona. The gold path is the main
 * sequence of accepted turns for a script, in order. Additional metadata such as
 * whether each turn sits on the gold path, its human commit summary, and a simple
 * running *version* number are also returned.  The front-end uses these fields to
 * decide styling (badges / roll-ups) and to show helpful tooltips.
 *
 * Example usage:
 *   curl -H "Authorization: Bearer <token>" http://localhost:4000/script/1
 * Response:
 *   { "data": [ { id, role, depth, ts, text, accepted, commit_message, version } ] }
 *
 * If the persona does not exist, responds with 404 and a helpful error message.
 */
import express from 'express';
import { withSession } from '../../libs/node-shared/db.js';

const router = express.Router(); // creates a mini express app for routing

router.get('/:personaId', async (req, res, next) => {
  try {
    // Grab the personaId from the URL (always a string)
    const personaIdRaw = req.params.personaId;
    // Neo4j is type-sensitive: if the ID in the database is stored as an integer
    // but we pass a string, the match will fail. Here we detect pure digits and
    // cast them to a number so the query can match either integer or string IDs.
    const personaId = /^[0-9]+$/.test(personaIdRaw) ? Number(personaIdRaw) : personaIdRaw;
    // Use withSession to open a Neo4j session and run our Cypher query
    const result = await withSession(async (session) => {
      // We avoid APOC so the query works on a vanilla Neo4j instance (like CI).
      // 1. Start at the Persona's ROOTS relationship to its root Turn.
      // 2. Follow zero-or-more incoming CHILD_OF edges to reach every descendant Turn.
      // 3. Filter to only those turns that are part of the gold path (accepted = true).
      // 4. Optionally match the author of the turn via [:AUTHORED_BY] relationship.
      const query = `
                MATCH (per:Persona {id: $personaId})-[:ROOTS]->(root:Turn)
                MATCH path=(root)<-[:CHILD_OF*0..]-(t:Turn)
                WHERE t = root OR t.accepted = true
                WITH t, length(path) AS depth
                OPTIONAL MATCH (t)-[:AUTHORED_BY]->(author:User)
                RETURN t.id                AS id,
                       t.role              AS role,
                       depth               AS depth,
                       t.text              AS text,
                       t.ts                AS original_ts, // Keep original ts for sorting, rename for output
                       t.accepted          AS accepted,
                       t.commit_message    AS commit_message,
                       author.name         AS authorName
                ORDER BY depth ASC, original_ts ASC // Sort by original_ts
            `;
      return await session.run(query, { personaId });
    });
    // If there are no records, the persona does not exist or has no gold path
    if (!result.records.length) {
      const err = new Error('Persona not found');
      err.status = 404;
      return next(err);
    }
    // Map Neo4j records to plain JS objects
    const turns = result.records.map((record, idx) => {
      const neo4jTimestampObject = record.get('original_ts'); // Neo4j DateTime object or epoch number
      let createdAtIso = null;
      if (neo4jTimestampObject) {
        if (typeof neo4jTimestampObject === 'number') {
          // If it's an epoch number (milliseconds)
          createdAtIso = new Date(neo4jTimestampObject).toISOString();
        } else if (neo4jTimestampObject.toString) {
          // If it's a Neo4j DateTime, Integer-like, or similar object with a toString method
          // that produces a standard ISO 8601 string or can be parsed by Date.
          // Neo4j standard DateTime.toString() is ISO 8601.
          // For Neo4j numbers (Integer objects), .toNumber() is safer before new Date().
          let timestampForDate;
          if (typeof neo4jTimestampObject.toNumber === 'function') {
            timestampForDate = neo4jTimestampObject.toNumber();
          } else {
            timestampForDate = neo4jTimestampObject.toString();
          }
          try {
            createdAtIso = new Date(timestampForDate).toISOString();
          } catch (e) {
            console.error('Error converting timestamp to ISO string:', timestampForDate, e);
            // Keep createdAtIso as null if conversion fails
          }
        }
      }

      return {
        id: record.get('id'),
        role: record.get('role'),
        depth: record.get('depth').toNumber ? record.get('depth').toNumber() : record.get('depth'),
        text: record.get('text'),
        createdAt: createdAtIso, // Formatted ISO string
        accepted: record.get('accepted'),
        commit_message: record.get('commit_message'), // This will be used as changeSummary by frontend
        authorName: record.get('authorName') || null, // Author's name, null if not found
        // The array is already sorted by depth and timestamp so we can
        // derive a simple running version number by array position.
        // v1 is the *first* element, v2 the second, and so on.
        version: idx + 1 // "Version X of the gold path"
      };
    });
    // Respond with the gold path turns as JSON
    res.json({ data: turns });
  } catch (error) {
    // Pass any errors to the global error handler
    next(error);
  }
});

export default router;
