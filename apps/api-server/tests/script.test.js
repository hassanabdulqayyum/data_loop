import request from 'supertest';
import app from '../src/app.js';
import fs from 'fs';
import path from 'path';
import { driver } from '../libs/node-shared/db.js';
// Polyfill __dirname in ES modules so we can build file paths relative to this test file.
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Prepares the Neo4j database with the minimal seed data required for the
 * /script endpoint tests. The seed comes from docs/scripts/neo4j/002_seed_data.cypher
 * so we stay consistent with the data used elsewhere in the repo.
 *
 * We resolve the path from the test file location (__dirname) so tests work
 * no matter where they are run from.
 */
async function resetDatabaseWithSeed() {
  const cypherPath = path.resolve(__dirname, '../../../docs/scripts/neo4j/002_seed_data.cypher');
  const fileContents = fs.readFileSync(cypherPath, 'utf8');
  const statements = fileContents
    .split(';')               // Cypher allows multiple statements separated by semicolons
    .map(stmt => stmt.trim()) // Strip whitespace and empty strings
    .filter(Boolean);

  const session = driver.session();
  try {
    // Start from a clean slate so tests are deterministic.
    await session.run('MATCH (n) DETACH DELETE n');

    // Apply each MERGE/CREATE statement in order so IDs match the documented seed.
    for (const stmt of statements) {
      await session.run(stmt);
    }
  } finally {
    await session.close();
  }
}

beforeAll(async () => {
  // Make sure the DB has exactly the seed data before we run any assertions.
  await resetDatabaseWithSeed();
});

afterAll(async () => {
  // Close the Neo4j driver once all tests have finished so Jest exits cleanly.
  await driver.close();
});

describe('GET /script/:personaId', () => {
  // We fetch a JWT once and reuse it in the route tests.
  let jwt;

  beforeAll(async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'demo@acme.test', password: 'pass123' });

    jwt = res.body.token;
    expect(typeof jwt).toBe('string'); // Quick sanity check.
  });

  it('returns the gold-path turns for a valid persona', async () => {
    const res = await request(app)
      .get('/script/1')
      .set('Authorization', `Bearer ${jwt}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    // Validate the shape of the first returned turn – the endpoint should now
    // expose *three* extra keys so the front-end can badge cards correctly.
    const firstTurn = res.body.data[0];
    expect(firstTurn).toHaveProperty('id');
    expect(firstTurn).toHaveProperty('role');
    expect(firstTurn).toHaveProperty('depth');
    expect(firstTurn).toHaveProperty('ts');
    expect(firstTurn).toHaveProperty('text');
    expect(firstTurn).toHaveProperty('accepted');
    expect(firstTurn).toHaveProperty('commit_message');
    expect(firstTurn).toHaveProperty('version');

    // The version field should be a positive integer starting from 1.
    expect(typeof firstTurn.version).toBe('number');
    expect(firstTurn.version).toBeGreaterThanOrEqual(1);

    // Every subsequent turn must have a strictly increasing version number so
    // the array stays in deterministic order and the UI can trust the badge.
    const versions = res.body.data.map(t => t.version);
    for (let i = 1; i < versions.length; ++i) {
      expect(versions[i]).toBe(i + 1);
    }

    // Additional guarantee: the order should follow root → system → user → assistant
    const roles = res.body.data.map(t => t.role);
    expect(roles.slice(0, 4)).toEqual(['root', 'system', 'user', 'assistant']);
  });

  it('responds with 404 when the persona does not exist', async () => {
    const res = await request(app)
      .get('/script/9999')
      .set('Authorization', `Bearer ${jwt}`);

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('rejects requests that are missing a valid JWT', async () => {
    const res = await request(app).get('/script/1');
    expect(res.statusCode).toBe(401);
  });
}); 