import express from 'express';
import { withSession } from '../../libs/node-shared/db.js';
// import { Record } from 'neo4j-driver'; // This import is not used

const router = express.Router(); // creates a mini express app for routing

/**
 * This file defines the /hierarchy endpoint.
 * When a logged-in user calls GET /hierarchy, it returns the full catalog tree (Program → Module → Day → Persona) as a nested JSON object.
 * Example usage:
 *   curl -H "Authorization: Bearer <token>" http://localhost:4000/hierarchy
 * Response:
 *   { "data": [ { id, seq, modules: [ ... ] } ] }
 */

router.get('/', async (req, res, next) => {
  try {
    // Use the withSession helper to open a Neo4j session and run our Cypher query
    const tree = await withSession(async (session) => {
      // This Cypher query walks the full catalog tree: Program → Module → Day → Persona
      const query = `
                MATCH (p:Program)-[:HAS_MODULE]->(m:Module)-[:HAS_DAY]->(d:Day)-[:HAS_PERSONA]->(per:Persona)
                RETURN p.id AS programId, p.seq AS programSeq,
                    m.id AS moduleId, m.seq AS moduleSeq,
                    d.id AS dayId, d.seq AS daySeq,
                    per.id AS personaId, per.seq AS personaSeq
                ORDER BY programSeq, moduleSeq, daySeq, personaSeq
            `;
      const result = await session.run(query);
      // We'll build a nested array structure to match the catalog tree
      const programs = [];
      for (const record of result.records) {
        // Extract each field from the Neo4j record and coerce Neo4j Integer objects
        /*
         * Neo4j returns its integer properties as special objects with `{ low, high }` keys
         * so they can safely hold 64-bit numbers.  Those objects break React rendering
         * because React will refuse to print an *object* as text ("Error #31").
         *
         * The helper below converts anything that looks like a Neo4j Integer into a plain
         * JavaScript number (when the field is a *sequence* index) or a string (when the
         * field represents an *id* that we only ever treat as an opaque label).
         */
        const asPlain = (value, treatAsString = false) => {
          if (value === null || value === undefined) return value;
          // Detect the neo4j-driver Integer shape: `{ low: <number>, high: <number> }`
          const isNeoInt =
            typeof value === 'object' && value.low !== undefined && value.high !== undefined;
          if (isNeoInt) {
            // The driver guarantees the number fits into 32-bit if `high === 0` (our case).
            const num = value.low;
            return treatAsString ? String(num) : num;
          }
          return treatAsString ? String(value) : value;
        };

        const programId = asPlain(record.get('programId'), true);
        const programSeq = asPlain(record.get('programSeq'));
        const moduleId = asPlain(record.get('moduleId'), true);
        const moduleSeq = asPlain(record.get('moduleSeq'));
        const dayId = asPlain(record.get('dayId'), true);
        const daySeq = asPlain(record.get('daySeq'));
        const personaId = asPlain(record.get('personaId'), true);
        const personaSeq = asPlain(record.get('personaSeq'));

        // Find or create the program node
        let program = programs.find((p) => p.id === programId);
        if (!program) {
          program = { id: programId, seq: programSeq, modules: [] };
          programs.push(program);
        }
        // Find or create the module node
        let module = program.modules.find((m) => m.id === moduleId);
        if (!module) {
          module = { id: moduleId, seq: moduleSeq, days: [] };
          program.modules.push(module);
        }
        // Find or create the day node
        let day = module.days.find((d) => d.id === dayId);
        if (!day) {
          day = { id: dayId, seq: daySeq, personas: [] };
          module.days.push(day);
        }
        // Always add the persona (no need to check for duplicates since Cypher returns unique rows)
        day.personas.push({ id: personaId, seq: personaSeq });
      }
      return programs;
    });
    // Respond with the nested catalog tree as JSON
    res.json({ data: tree });
  } catch (error) {
    // If anything goes wrong, pass the error to the global error handler
    next(error);
  }
});

export default router;
