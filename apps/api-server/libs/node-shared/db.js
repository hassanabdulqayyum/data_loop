/**
 * Neo4j driver singleton.
 *
 * Example usage (ES Modules):
 * import { driver, withSession, initNeo4j } from '../../libs/node-shared/db.js';
 *
 * // Initialise the connection once at application start – e.g. in src/index.js
 * await initNeo4j();
 *
 * // Run a one-off query
 * await withSession(async (session) => {
 *   const result = await session.run('RETURN 1 AS num');
 *   console.log(result.records[0].get('num')); // → 1
 * });
 */

import neo4j from 'neo4j-driver';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

function envRequired(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} is undefined!`);
  }
  return value;
}

const uri = envRequired('NEO4J_URI');
const username = envRequired('NEO4J_USER');
const password = envRequired('NEO4J_PASSWORD');

const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));

async function withSession(callback) {
  const session = driver.session();
  try {
    return await callback(session);
  } finally {
    await session.close();
  }
}

// -----------------------------  INIT HELPER  -----------------------------
/**
 * Verify Neo4j is reachable.  We perform a short retry loop so that automated
 * test-suites (which spin up Neo4j via Docker just before the tests run) have
 * a few seconds for the database to accept bolt connections.  In production
 * we still want a hard fail, because starting the API without its database is
 * useless – hence the conditional `process.exit(1)` below.
 *
 * The function is intentionally forgiving when `NODE_ENV === 'test'` so Jest
 * can proceed even if the container is still warming up; the individual tests
 * that need Neo4j will handle their own connection errors or skip as needed.
 *
 * Example: await initNeo4j();
 */
async function initNeo4j(maxRetries = 10, delayMs = 1_000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const serverInfo = await driver.getServerInfo(); // quick ping
      console.log('✅ Connected to Neo4j:', serverInfo);
      return; // success – exit the loop early
    } catch (error) {
      console.warn(`⌛ Neo4j not ready (attempt ${attempt}/${maxRetries})…`);
      // Final attempt failed → decide based on environment
      if (attempt === maxRetries) {
        console.error('❌ Neo4j connection failed after retries:', error);
        if (process.env.NODE_ENV !== 'test') {
          process.exit(1); // only crash in non-test environments
        }
        return; // In tests: swallow the error so suite can continue
      }
      // Wait before next try (simple linear back-off)
      await new Promise((res) => setTimeout(res, delayMs));
    }
  }
}

async function ensureDemoCatalog() {
  try {
    if (process.env.NODE_ENV === 'test') return; // Tests expect empty DB

    // Resolve against repository root regardless of where the process was
    // started (`process.cwd()` can be apps/api-server/ when running via nodemon).
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const repoRoot = path.resolve(__dirname, '../../..');
    const cypherPath = path.join(
      repoRoot,
      'docs/scripts/neo4j/004_demo_catalog.cypher'
    );
    if (!fs.existsSync(cypherPath)) return;

    await withSession(async (session) => {
      // Skip seeding if Program node already present to avoid duplicates.
      const exists = await session.run(
        "MATCH (p:Program {id:'Program'}) RETURN p LIMIT 1"
      );
      if (exists.records.length > 0) {
        return; // nothing to do – catalog already loaded
      }

      const fileTxt = fs.readFileSync(cypherPath, 'utf8');
      // Split on semicolons **followed by a newline** so we keep Cypher
      // comments and avoid empty trailing statements.
      const statements = fileTxt
        .split(/;\s*\n/)
        .map((s) => s.trim())
        .filter(Boolean);

      for (const stmt of statements) {
        await session.run(stmt);
      }
      console.log('✅ Demo catalog seeded');
    });
  } catch (err) {
    console.warn('⚠️  Failed to seed demo catalog:', err.message);
  }
}

// Call on startup (development only)
if (process.env.NODE_ENV !== 'test') {
  ensureDemoCatalog();
}

export { driver, withSession, initNeo4j };
