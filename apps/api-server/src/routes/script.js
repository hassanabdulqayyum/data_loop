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
      // 1. Start at the Persona's HAS_ROOT_TURN relationship to its root Turn.
      // 2. Use a CALL subquery to find the single, accepted gold path.
      //    - Match paths downwards from root where all nodes are accepted (or root).
      //    - Ensure the path ends at the last accepted turn in that sequence.
      //    - If multiple such paths, take the longest.
      // 3. Unwind nodes from this gold path to get them in order.
      // 4. Optionally match the author and parent of each turn on the path.
      // 5. Calculate lineageVersion:
      //    - If turn is the start of the gold path, version is 1.
      //    - Else, count accepted siblings (children of the same parent) created up to this turn.
      const query = `
                // Find the persona and its root turn
                MATCH (persona:Persona {id: $personaId})-[:HAS_ROOT_TURN]->(root:Turn)

                // Use CALL subquery to find the single, accepted gold path
                CALL {
                    WITH root
                    // The root node itself must be acceptable to start a gold path
                    WHERE root.accepted IS NULL OR root.accepted = true // Pre-filter root
                    
                    MATCH currentGoldPath = (root)-[:CHILD_OF*0..]->(leaf:Turn)
                    // Ensure all nodes in this path are either the root itself or are accepted
                    WHERE ALL(n IN nodes(currentGoldPath) WHERE n = root OR n.accepted = true)
                      // And ensure 'leaf' is the last accepted turn in this sequence
                      AND NOT EXISTS((leaf)-[:CHILD_OF]->(:Turn {accepted: true}))
                    RETURN currentGoldPath
                    ORDER BY length(currentGoldPath) DESC
                    LIMIT 1
                }
                // currentGoldPath is now the path returned from the CALL, or null if no such path found

                // Unwind the nodes of this currentGoldPath to process them in order
                // Also, keep the path_nodes accessible for the lineageVersion calculation
                UNWIND nodes(currentGoldPath) AS t_on_path
                WITH t_on_path, nodes(currentGoldPath) AS path_nodes_for_version // Make path_nodes available here

                // OPTIONAL MATCH for author, as before
                OPTIONAL MATCH (t_on_path)-[:AUTHORED_BY]->(author:User)

                // OPTIONAL MATCH for the actual parent of t_on_path, for lineageVersion calculation
                // This specifically finds the parent via CHILD_OF, ensuring it's the direct parent in the graph structure.
                OPTIONAL MATCH (t_on_path)<-[:CHILD_OF]-(actualParentOfT:Turn)


                // Calculate lineageVersion
                WITH t_on_path, author, actualParentOfT, path_nodes_for_version, // Use path_nodes_for_version
                     CASE
                       // If t_on_path is the root of the *identified* goldPath (i.e., the first node in the path_nodes_for_version array)
                       WHEN t_on_path = path_nodes_for_version[0] THEN 1
                       // If t_on_path has an actual parent from the CHILD_OF relationship
                       WHEN actualParentOfT IS NOT NULL THEN
                         // Count this turn and its *accepted* siblings that came at or before it.
                         // A sibling is another turn that also has actualParentOfT as its parent.
                         SIZE([(sibling:Turn)-[:CHILD_OF]->(actualParentOfT) 
                               WHERE sibling.ts <= t_on_path.ts AND (sibling.accepted = true OR sibling = t_on_path) | sibling])
                       ELSE 1 // Fallback (e.g., orphaned accepted turn, though unlikely with path logic)
                     END AS lineageVersion
                     
                RETURN t_on_path.id                AS id,
                       t_on_path.role              AS role,
                       // depth is removed
                       t_on_path.text              AS text,
                       t_on_path.ts                AS original_ts, // Keep original ts for client-side sorting if needed, or for date formatting
                       t_on_path.accepted          AS accepted,
                       t_on_path.commit_message    AS commit_message,
                       author.name                 AS authorName,
                       lineageVersion              AS version
                // The ORDER BY clause is implicitly handled by UNWIND nodes(currentGoldPath).
                // No explicit ORDER BY depth ASC, original_ts ASC needed here.
                // If client-side sorting by ts within a former "depth level" is desired,
                // the client can do that, but the primary order comes from the path.
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
        // depth: record.get('depth').toNumber ? record.get('depth').toNumber() : record.get('depth'), // Depth is removed
        text: record.get('text'),
        createdAt: createdAtIso, // Formatted ISO string
        accepted: record.get('accepted'),
        commit_message: record.get('commit_message'), // This will be used as changeSummary by frontend
        authorName: record.get('authorName') || null, // Author's name, null if not found
        version: record.get('version').toNumber ? record.get('version').toNumber() : record.get('version') // Use the lineageVersion from Cypher
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
