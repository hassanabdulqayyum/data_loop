import request from 'supertest';
import app from '../src/app.js';
import { withSession } from '../libs/node-shared/db.js';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';

/**
 * This test file checks the /hierarchy endpoint.
 * It covers both the case where the user is not logged in (should get 401)
 * and the case where the user is logged in and gets the full catalog tree.
 *
 * Example usage:
 *   jest hierarchy.test.js
 */

describe('/hierarchy endpoint', () => {
  // Before all tests, seed the database with the Cypher seed script
  beforeAll(async () => {
    // For ESM modules, __dirname is not defined, so we use import.meta.url and fileURLToPath
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    // Go up three directories from the test file to reach the workspace root, then into docs/scripts/neo4j/002_seed_data.cypher
    const seedPath = path.resolve(__dirname, '../../../docs/scripts/neo4j/002_seed_data.cypher');
    const seedCypher = fs.readFileSync(seedPath, 'utf8');
    await withSession(async (session) => {
      // Split on semicolons and run each statement
      for (const stmt of seedCypher.split(';')) {
        if (stmt.trim()) await session.run(stmt);
      }
    });
  });

  // Test: should return 401 if no Authorization header is present
  it('returns 401 if not logged in', async () => {
    const res = await request(app).get('/hierarchy');
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  // Test: should return the catalog tree if logged in
  it('returns the catalog tree for a valid user', async () => {
    // Sign a JWT for the demo user (role: editor)
    const token = jwt.sign({ email: 'demo@acme.test', role: 'editor' }, process.env.JWT_SECRET || 'testsecret', { expiresIn: '1h' });
    const res = await request(app)
      .get('/hierarchy')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    // The data should be an array of programs, each with modules, days, and personas
    const programs = res.body.data;
    expect(Array.isArray(programs)).toBe(true);
    // Check at least one program exists and has the right nested structure
    if (programs.length > 0) {
      const program = programs[0];
      expect(program).toHaveProperty('id');
      expect(program).toHaveProperty('seq');
      expect(Array.isArray(program.modules)).toBe(true);
      if (program.modules.length > 0) {
        const module = program.modules[0];
        expect(module).toHaveProperty('id');
        expect(module).toHaveProperty('seq');
        expect(Array.isArray(module.days)).toBe(true);
        if (module.days.length > 0) {
          const day = module.days[0];
          expect(day).toHaveProperty('id');
          expect(day).toHaveProperty('seq');
          expect(Array.isArray(day.personas)).toBe(true);
          if (day.personas.length > 0) {
            const persona = day.personas[0];
            expect(persona).toHaveProperty('id');
            expect(persona).toHaveProperty('seq');
          }
        }
      }
    }
  });
}); 