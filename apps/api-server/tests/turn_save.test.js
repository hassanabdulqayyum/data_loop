import request from 'supertest';
import app from '../src/app.js';
import fs from 'fs';
import path from 'path';
import { driver } from '../libs/node-shared/db.js';
import { fileURLToPath } from 'url';

// -----------------------------------------------------------------------------
// This test focuses on the full **save-new-version** round-trip described in the
// implementation plan § 2.6.3 → Back-end work 2.2. We post a new version, then
// immediately re-fetch the script and confirm:
//   • total card count grows by 1
//   • the last card matches the submitted text & commit summary
//   • its depth property is exactly parent.depth + 1 (here, 4)
// The seed data ensures an assistant turn with id 4 already exists at depth 3.
// -----------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Helper that wipes the graph and replays the seed Cypher so each test starts
 * from the identical baseline. This function duplicates the one in
 * turn_patch.test.js but is re-declared here to keep this file standalone &
 * copy-paste friendly for newcomers reading a single spec file in isolation.
 */
async function resetDatabaseWithSeed() {
  const cypherPath = path.resolve(__dirname, '../../../docs/scripts/neo4j/002_seed_data.cypher');
  const fileContents = fs.readFileSync(cypherPath, 'utf8');
  const statements = fileContents
    .split(';')
    .map(stmt => stmt.trim())
    .filter(Boolean);

  const session = driver.session();
  try {
    await session.run('MATCH (n) DETACH DELETE n');
    for (const stmt of statements) {
      await session.run(stmt);
    }
  } finally {
    await session.close();
  }
}

beforeAll(async () => {
  await resetDatabaseWithSeed();
});

afterAll(async () => {
  await driver.close();
});

describe('End-to-end save-new-version flow', () => {
  let jwt;

  beforeAll(async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'demo@acme.test', password: 'pass123' });
    jwt = res.body.token;
  });

  it('PATCHes a new turn and GET /script reflects the change', async () => {
    // 1️⃣ Fetch current gold path – should be 4 cards from seed.
    const before = await request(app)
      .get('/script/1')
      .set('Authorization', `Bearer ${jwt}`);

    expect(before.statusCode).toBe(200);
    const beforeTurns = before.body.data;
    const initialLen = beforeTurns.length;

    // 2️⃣ Save a new assistant version underneath the last assistant turn (id 4).
    const payload = {
      text: 'A **brand-new** assistant reply – now with depth 4',
      commit_message: 'add richer assistant answer',
    };

    const patchRes = await request(app)
      .patch('/turn/4')
      .set('Authorization', `Bearer ${jwt}`)
      .send(payload);

    expect(patchRes.statusCode).toBe(201);
    expect(patchRes.body.data).toHaveProperty('id');

    // 3️⃣ Re-fetch the script. We expect +1 turn (total 5) and last card equals payload.
    const after = await request(app)
      .get('/script/1')
      .set('Authorization', `Bearer ${jwt}`);

    expect(after.statusCode).toBe(200);
    const afterTurns = after.body.data;
    expect(afterTurns.length).toBe(initialLen + 1);

    const lastTurn = afterTurns[afterTurns.length - 1];
    expect(lastTurn.text).toBe(payload.text);
    expect(lastTurn.commit_message).toBe(payload.commit_message);
    // Parent depth is 3 → new card depth should be 4.
    expect(lastTurn.depth).toBe(4);
  });
}); 