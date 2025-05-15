/***
 * Router: /export
 *
 * Plain-English overview (post-implementation):
 * • The front-end calls **GET /export/:personaId** to download the *approved* (gold-path) turns for a script.
 * • The route is protected by JWT middleware (mounted in `src/app.js`), so only logged-in editors can export.
 * • What we do step by step:
 *   1. Read `:personaId` from the URL.  If it is all digits we cast it to a number so Neo4j matches integer IDs; otherwise we keep it a string (covers UUIDs).
 *   2. Run a Cypher query that starts at the Persona's *root* Turn and walks every incoming `CHILD_OF` edge.
 *      – We keep the root *plus* every descendant Turn where `accepted = true`.  That gives us the latest "gold path".
 *      – We return each turn's **depth** (hop-count from the root) so the client can rebuild the hierarchy if needed.
 *      – Results are ordered first by depth and then by timestamp (`ts`) so sibling edits appear deterministically.
 *   3. Convert Neo4j Records → plain JavaScript objects and send them back as JSON:  `{ data: [ ...turns ] }`.
 *   4. We also set `Content-Disposition: attachment; filename=script_<personaId>.json` so browsers treat the response as a downloadable file by default.
 *
 * Error behaviour:
 * • 404 if the persona does not exist (or has no accepted turns yet).
 * • Standard JSON error payload handled by the global error middleware covers all other issues.
 *
 * Example curl:
 *   curl \
 *     -H "Authorization: Bearer <token>" \
 *     http://localhost:4000/export/1 \
 *     --output script_1.json
 *
 * This docstring was refreshed on implementation completion (2.3.5 validation layer) so the TODO scaffold no longer applies.
 */
import express from 'express';
import { withSession } from '../../libs/node-shared/db.js';

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /export/module/:moduleId – download full JSON for an entire Module
// ---------------------------------------------------------------------------
router.get('/module/:moduleId', async (req, res, next) => {
  try {
    // Extract & normalise the Module identifier (numbers stay numeric for Neo4j)
    const rawId = req.params.moduleId;
    const moduleId = /^[0-9]+$/.test(rawId) ? Number(rawId) : rawId;

    const result = await withSession(async (session) => {
      /*
       * We need a nested structure, but APOC isn't guaranteed, so we pull a flat
       * recordset from Cypher and build the nested JSON in JavaScript.
       *
       * 1. Grab every Day below the requested Module.
       * 2. For each Day fetch its Personas and each Persona's approved gold path.
       * 3. We return **one row per Persona** with the Turn list already collected so
       *    JS can group the rows by Day easily afterwards.
       */
      const query = `
                MATCH (m:Module {id: $moduleId})-[:HAS_DAY]->(d:Day)
                MATCH (d)-[:HAS_PERSONA]->(p:Persona)
                MATCH (p)-[:ROOTS]->(root:Turn)
                MATCH path=(root)<-[:CHILD_OF*0..]-(t:Turn)
                WHERE t = root OR t.accepted = true
                WITH d, p, t, length(path) AS depth
                ORDER BY d.seq ASC, p.seq ASC, depth ASC, t.ts ASC
                WITH d, p, collect({id:t.id, role:t.role, depth:depth, text:t.text, ts:t.ts}) AS turns
                RETURN d.id AS dayId, p.id AS personaId, turns
            `;
      return session.run(query, { moduleId });
    });

    if (!result.records.length) {
      const err = new Error('Module not found');
      err.status = 404;
      return next(err);
    }

    // Build the nested JS structure → { id, days:[ { id, personas:[ { id, turns } ] } ] }
    const daysMap = new Map();
    for (const record of result.records) {
      const dayId = record.get('dayId');
      const personaId = record.get('personaId');
      const turns = record.get('turns');

      if (!daysMap.has(dayId)) {
        daysMap.set(dayId, { id: dayId, personas: [] });
      }
      const dayObj = daysMap.get(dayId);
      dayObj.personas.push({ id: personaId, turns });
    }

    const payload = {
      id: moduleId,
      days: Array.from(daysMap.values())
    };

    res.setHeader('Content-Disposition', `attachment; filename=module_${rawId}.json`);
    return res.json(payload);
  } catch (error) {
    return next(error);
  }
});

// ---------------------------------------------------------------------------
// GET /export/day/:dayId – download JSON for a single Topic/Day
// ---------------------------------------------------------------------------
router.get('/day/:dayId', async (req, res, next) => {
  try {
    const rawId = req.params.dayId;
    const dayId = /^[0-9]+$/.test(rawId) ? Number(rawId) : rawId;

    const result = await withSession(async (session) => {
      const query = `
                MATCH (d:Day {id: $dayId})-[:HAS_PERSONA]->(p:Persona)
                MATCH (p)-[:ROOTS]->(root:Turn)
                MATCH path=(root)<-[:CHILD_OF*0..]-(t:Turn)
                WHERE t = root OR t.accepted = true
                WITH p, t, length(path) AS depth
                ORDER BY p.seq ASC, depth ASC, t.ts ASC
                WITH p, collect({id:t.id, role:t.role, depth:depth, text:t.text, ts:t.ts}) AS turns
                RETURN p.id AS personaId, turns
            `;
      return session.run(query, { dayId });
    });

    if (!result.records.length) {
      const err = new Error('Day not found');
      err.status = 404;
      return next(err);
    }

    const personas = result.records.map((rec) => ({
      id: rec.get('personaId'),
      turns: rec.get('turns')
    }));

    const payload = { id: dayId, personas };
    res.setHeader('Content-Disposition', `attachment; filename=day_${rawId}.json`);
    return res.json(payload);
  } catch (error) {
    return next(error);
  }
});

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
                RETURN t.id AS id, t.role AS role, depth AS depth, t.text AS text, t.ts AS ts
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
    const turns = result.records.map((record) => ({
      id: record.get('id'),
      role: record.get('role'),
      depth: record.get('depth'),
      ts: record.get('ts'),
      text: record.get('text')
    }));
    // Before we send the JSON back, set a header so browsers treat the response as a downloadable file.
    // The front-end can still choose to ignore this and handle the blob manually, but setting the header
    // gives us sensible default behaviour (i.e. the file appears in the browser's download tray).
    res.setHeader('Content-Disposition', `attachment; filename=script_${personaId}.json`);
    // We rely on Express to set Content-Type: application/json automatically.
    res.json({ data: turns });
  } catch (error) {
    // Pass any errors to the global error handler
    next(error);
  }
});

export default router;
