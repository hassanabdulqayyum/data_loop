// Set a dummy JWT secret so our tests can sign and verify tokens
process.env.JWT_SECRET = 'testsecret';
// Set dummy Neo4j connection details for tests (adjust as needed for your local setup)
process.env.NEO4J_URI = 'bolt://localhost:7687';
process.env.NEO4J_USER = 'neo4j';
// Use the correct password for the running Neo4j container
process.env.NEO4J_PASSWORD = 'test12345';
// Set a dummy Redis URL for tests (not used in these tests, but required by some imports)
process.env.REDIS_URL = 'redis://localhost:6379';

const { execSync } = await import('node:child_process'); // Import here because this file runs in Node (Jest env).
const net = await import('node:net');

async function isBoltPortOpen() {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(500);
    socket.once('connect', () => {
      socket.end();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      resolve(false);
    });
    socket.connect(7687, '127.0.0.1');
  });
}

if (!global.__NEO4J_CONTAINER_STARTED) {
  const portOpen = await isBoltPortOpen();
  if (!portOpen) {
    try {
      execSync('docker compose up -d neo4j', { stdio: 'inherit' });
      global.__NEO4J_CONTAINER_STARTED = true;
    } catch (err) {
      console.error('❌ Failed to start Neo4j test container via Docker Compose. Is Docker running?');
      throw err;
    }
  }
}

// Add a Jest global setup hook that waits until the Neo4j test container is up and accepting connections. This prevents race-conditions in CI where tests start before the DB is ready.
beforeAll(async () => {
  /*
    We attempt to verify connectivity to the Neo4j instance up to 10 times
    with an exponential back-off. The loop exits early as soon as we can
    successfully establish a Bolt connection. If the DB never comes online
    (e.g. Docker daemon mis-configured on the CI runner) we let the final
    failure propagate so Jest reports a clear error.
  */
  const MAX_ATTEMPTS = 10;
  const { initNeo4j } = await import('../libs/node-shared/db.js');
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await initNeo4j();
      // ✅ Connection succeeded – break out of the retry loop.
      return;
    } catch (err) {
      if (attempt === MAX_ATTEMPTS) {
        // Propagate the error – the tests will fail with a helpful stack-trace.
        throw err;
      }
      // Wait a bit longer on each retry (basic exponential backoff).
      const delayMs = 500 * attempt;
      // eslint-disable-next-line no-undef
      await new Promise((res) => setTimeout(res, delayMs));
    }
  }
});

// Cleanly close the Neo4j driver after all tests so Jest exits without open handles.
// We import the driver dynamically here to make sure the environment variables above
// are already set **before** the db module initialises.
afterAll(async () => {
  const { driver } = await import('../libs/node-shared/db.js');
  await driver.close();
  if (global.__NEO4J_CONTAINER_STARTED) {
    try {
      execSync('docker compose down', { stdio: 'inherit' });
      delete global.__NEO4J_CONTAINER_STARTED;
    } catch (err) {
      console.error('⚠️  Could not stop Docker Compose services. You may need to run `docker compose down` manually.');
    }
  }
}); 