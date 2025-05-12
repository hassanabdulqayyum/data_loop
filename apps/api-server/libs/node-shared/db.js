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

async function initNeo4j() {
    try {
      const serverInfo = await driver.getServerInfo(); // await driver.verifyConnectivity() is deprecated
      console.log('✅ Connected to Neo4j:', serverInfo);
    } catch (error) {
      console.error('❌ Neo4j connection failed:', error);
      process.exit(1); // Exit if the DB is not reachable
    }
  }  

export { driver, withSession, initNeo4j};