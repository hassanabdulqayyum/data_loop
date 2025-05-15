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
    const session = driver.session()
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

export { driver, withSession, initNeo4j};