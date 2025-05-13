// 004_demo_catalog.cypher – Inserts the demo Program → Module → Day → Persona tree
// matching the Figma screenshots used during Flow-1 development.
//
// Run once:
//   docker compose exec neo4j cypher-shell -u $NEO4J_USER -p $NEO4J_PASSWORD \
//       -f docs/scripts/neo4j/004_demo_catalog.cypher
//
// Safe to run repeatedly thanks to MERGE clauses.

// ─────────────────────────────────────────────────────────────
// 1. Program & Module
// ─────────────────────────────────────────────────────────────
MERGE (prog:Program {id: 'Program'})
  ON CREATE SET prog.seq = 1;

MERGE (mod1:Module {id: 'Module 1: Defusion'})
  ON CREATE SET mod1.seq = 1;

MERGE (prog)-[:HAS_MODULE]->(mod1);

// ─────────────────────────────────────────────────────────────
// 2. Topic (mapped to Day in schema)
// ─────────────────────────────────────────────────────────────
MERGE (topic1:Day {id: 'Topic 1: Intro'})
  ON CREATE SET topic1.seq = 1;
MERGE (mod1)-[:HAS_DAY]->(topic1);

// ─────────────────────────────────────────────────────────────
// 3. Personas under Topic 1
// ─────────────────────────────────────────────────────────────
WITH topic1
UNWIND [
  'Focus','Stress','Procrastination','Anxiety','Depression','Productivity',
  'Loneliness','Anger','Social media','Breakup','Physical pain','Grief',
  'ADHD','OCD','Impulsivity','Midlife crisis','Insomnia','Health anxiety',
  'Infidelity','Binge eating','Trauma','Mindfulness'
] AS name
WITH topic1, name, apoc.algo.indexOf(name, '') AS idx // idx gives deterministic position
MERGE (per:Persona {id: name})
  ON CREATE SET per.seq = idx;
MERGE (topic1)-[:HAS_PERSONA]->(per); 