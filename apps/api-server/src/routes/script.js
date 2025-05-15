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
import express from 'express'
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
            const query = `
                MATCH (per:Persona {id: $personaId})-[:ROOTS]->(root:Turn)
                MATCH path=(root)<-[:CHILD_OF*0..]-(t:Turn)
                WHERE t = root OR t.accepted = true
                WITH t, length(path) AS depth
                RETURN t.id            AS id,
                       t.role          AS role,
                       depth           AS depth,
                       t.text          AS text,
                       t.ts            AS ts,
                       t.accepted      AS accepted,
                       t.commit_message AS commit_message
                ORDER BY depth ASC, t.ts ASC
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
        const turns = result.records.map((record, idx) => ({
            id: record.get('id'),
            role: record.get('role'),
            depth: record.get('depth'),
            ts: record.get('ts'),
            text: record.get('text'),
            accepted: record.get('accepted'),
            commit_message: record.get('commit_message'),
            // The array is already sorted by depth and timestamp so we can
            // derive a simple running version number by array position.
            // v1 is the *first* element, v2 the second, and so on.
            version: idx + 1,
        }));
        // Respond with the gold path turns as JSON
        res.json({ data: turns });
    } catch (error) {
        // Pass any errors to the global error handler
        next(error);
    }
});

export default router;