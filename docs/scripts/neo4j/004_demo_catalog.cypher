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

// Connect Program to Module
MATCH (prog:Program {id:'Program'}), (mod1:Module {id:'Module 1: Defusion'})
MERGE (prog)-[:HAS_MODULE]->(mod1);

// ─────────────────────────────────────────────────────────────
// 2. Topic (mapped to Day in schema)
// ─────────────────────────────────────────────────────────────
MERGE (topic1:Day {id: 'Topic 1: Intro'})
  ON CREATE SET topic1.seq = 1;

// Connect Module to Topic/Day
MATCH (mod1:Module {id:'Module 1: Defusion'}), (topic1:Day {id:'Topic 1: Intro'})
MERGE (mod1)-[:HAS_DAY]->(topic1);

// Personas block as single query terminated by semicolon
MATCH (topic1:Day {id: 'Topic 1: Intro'})
WITH topic1, [
  'Focus','Stress','Procrastination','Anxiety','Depression','Productivity',
  'Loneliness','Anger','Social media','Breakup','Physical pain','Grief',
  'ADHD','OCD','Impulsivity','Midlife crisis','Insomnia','Health anxiety',
  'Infidelity','Binge eating','Trauma','Mindfulness'
] AS names
UNWIND range(0, size(names)-1) AS idx
WITH topic1, names[idx] AS name, idx
MERGE (per:Persona {id: name})
  ON CREATE SET per.seq = idx
MERGE (topic1)-[:HAS_PERSONA]->(per);

// ─────────────────────────────────────────────────────────────
// 3. Demo Turns for the "Focus" persona
//    (content sourced from sample/ProgramDemo/Module01/Day01/Therapist01.json)
// ─────────────────────────────────────────────────────────────

// We only create the Turns when they do NOT already exist so the file stays
// idempotent.  We detect an existing script by checking whether the Focus
// persona already has a ROOTS relationship.
MATCH (focus:Persona {id:'Focus'})
OPTIONAL MATCH (focus)-[:ROOTS]->(existingRoot)
WITH focus, existingRoot
WHERE existingRoot IS NULL
// 1. Root node
CREATE (root:Turn {id: randomUUID(), role:'root', ts: timestamp()})
MERGE (focus)-[:ROOTS]->(root)
// 2. Define ordered turns as list of maps
WITH root, [
  {role:'system', text:'You are a helpful AI assistant that teaches mindfulness to parents and children.'},
  {role:'user', text:'Hello! Can you help me start teaching mindfulness to my child?'},
  {role:'assistant', text:'Absolutely! Let\'s begin with a simple breathing exercise that you can practice together.'},
  {role:'user', text:'Great. What should we do next after the breathing exercise?'},
  {role:'assistant', text:'After a few rounds of breathing, introduce a short body-scan where you both notice sensations from head to toe.'},
  {role:'user', text:'That sounds wonderful. Thank you for the guidance!'},
  {role:'assistant', text:'You\'re very welcome! Aim to practice this short routine daily. Consistency helps children associate mindfulness with a positive, calming experience.'},
  {role:'user', text:'How long should each mindfulness session be for a seven-year-old?'},
  {role:'assistant', text:'Start with just five minutes. Once your child is comfortable, gradually extend to ten minutes. The key is keeping it fun and pressure-free.'},
  {role:'user', text:'Do you have any tips to keep them engaged during the body-scan?'},
  {role:'assistant', text:'Use playful language—ask them to imagine a gentle "flashlight" of attention moving from head to toe. You can also add soft background music if that helps them focus.'},
  {role:'user', text:'These ideas are fantastic. Thanks again for all your help!'}
] AS turns
// 3. Create every turn with an index so we can link later
UNWIND range(0, size(turns)-1) AS idx
WITH root, idx, turns[idx] AS t
CREATE (turn:Turn {id: randomUUID(), role:t.role, text:t.text, accepted:true, ts: timestamp(), order:idx})
WITH root, collect(turn) AS newTurns
// 4. Wire CHILD_OF edges preserving order
WITH root, newTurns
UNWIND range(0, size(newTurns)-1) AS i
WITH root, newTurns, i, newTurns[i] AS current
WITH current,
     CASE WHEN i=0 THEN root ELSE newTurns[i-1] END AS parent
MERGE (parent)<-[:CHILD_OF]-(current);