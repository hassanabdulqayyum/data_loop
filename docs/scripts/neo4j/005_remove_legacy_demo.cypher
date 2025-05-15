// 005_remove_legacy_demo.cypher – One-off maintenance script
// -----------------------------------------------------------------
// Removes the legacy "ProgramDemo" branch that was created when the
// repository briefly used sample/ProgramDemo/Module01/Day01/Therapist01.json
// before switching to the proper demo catalog in 004_demo_catalog.cypher.
//
// Safe to run multiple times: if the Program node no longer exists, the
// MATCH clause simply returns zero rows and nothing is deleted.
//
// Usage (local dev):
//   docker compose exec neo4j cypher-shell -u $NEO4J_USER -p $NEO4J_PASSWORD \
//       -f docs/scripts/neo4j/005_remove_legacy_demo.cypher
//
// -----------------------------------------------------------------
// 1️⃣  Match the obsolete Program node and every descendant node/edge.
// 2️⃣  Detach-delete them so all relationships go away in one shot.
// -----------------------------------------------------------------

MATCH (p:Program {id: 'ProgramDemo'})
OPTIONAL MATCH (p)-[*]- (n)  // grab all connected nodes (modules, days, etc.)
DETACH DELETE p, n; 