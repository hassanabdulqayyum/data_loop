import request from 'supertest';
import app from '../src/app.js';
import fs from 'fs';
import path from 'path';
import { driver } from '../libs/node-shared/db.js';
import { fileURLToPath } from 'url';
import { jest } from '@jest/globals';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Helper that wipes the graph and replays the seed Cypher file so every test starts with
 * identical data. This mirrors the helper used in script.test.js so upkeep stays easy.
 */
async function resetDatabaseWithSeed() {
  const cypherPath = path.resolve(__dirname, '../../../docs/scripts/neo4j/002_seed_data.cypher');
  const fileContents = fs.readFileSync(cypherPath, 'utf8');
  const statements = fileContents
    .split(';')
    .map((stmt) => stmt.trim())
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

describe('PATCH /turn/:turnId', () => {
  let jwt;
  // We will reuse the redis mock inside tests
  let redisMock;

  beforeAll(async () => {
    // Obtain a valid JWT
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'demo@acme.test', password: 'pass123' });
    jwt = res.body.token;

    // Grab reference to the mocked module so we can inspect calls
    const mod = await import('../libs/node-shared/redis.js');
    redisMock = mod.default;
    // Replace the stubbed implementation with a jest spy so we can assert call count
    redisMock.xAdd = jest.fn(redisMock.xAdd.bind(redisMock));
  });

  it('creates a new turn and emits a Redis event (happy path)', async () => {
    // Parent turn id comes from seed – id 4 (assistant)
    const parentId = 4;

    const payload = {
      text: 'A brand-new assistant reply',
      commit_message: 'Initial new version'
    };

    const res = await request(app)
      .patch(`/turn/${parentId}`)
      .set('Authorization', `Bearer ${jwt}`)
      .send(payload);

    expect(res.statusCode).toBe(201);
    expect(res.body.data).toHaveProperty('id');

    // Confirm we attempted to emit the Redis event exactly once
    expect(redisMock.xAdd).toHaveBeenCalledTimes(1);
    const [stream, _id, fields] = redisMock.xAdd.mock.calls[0];
    expect(stream).toBe('script.turn.updated');
    expect(fields).toMatchObject({
      parent_id: parentId,
      text: payload.text,
      commit_message: payload.commit_message
    });
  });

  it('returns 400 when text is missing', async () => {
    const res = await request(app).patch('/turn/4').set('Authorization', `Bearer ${jwt}`).send({});

    expect(res.statusCode).toBe(400);
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(app).patch('/turn/4').send({ text: 'Hi' });
    expect(res.statusCode).toBe(401);
  });

  it('returns 400 when commit_message exceeds 120 characters', async () => {
    const longMessage = 'x'.repeat(121); // 121 characters – one over the limit
    const res = await request(app)
      .patch('/turn/4')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ text: 'Some text', commit_message: longMessage });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});
