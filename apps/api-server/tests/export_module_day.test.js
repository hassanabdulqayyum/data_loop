import request from 'supertest';
import app from '../src/app.js';
import { sign_jwt } from '../libs/node-shared/jwt.js';

/*
export_module_day.test.js – Regression tests for the new hierarchical export
endpoints implemented in user-flow 1 micro-task 2.6.2.

We keep the assertions deliberately broad because the exact shape of the demo
catalog may evolve (IDs can be UUIDs or strings).  The contract we promise is:
  • Auth is required.
  • A 200 OK contains the correct top-level keys (days[] / personas[]).
  • A missing entity returns 404.

The tiny Neo4j seed (docs/scripts/neo4j/002_seed_data.cypher) creates:
  Module id 1 → Day id 1 → Persona id 1.
That's enough to exercise the happy-path for both routes.
*/

describe('Hierarchical export endpoints', () => {
  const token = sign_jwt({ email: 'demo@acme.test', role: 'editor' });

  describe('GET /export/day/:dayId', () => {
    it('requires authentication', async () => {
      const res = await request(app).get('/export/day/1');
      expect(res.statusCode).toBe(401);
    });

    it('returns personas array on success', async () => {
      const res = await request(app)
        .get('/export/day/1')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.personas)).toBe(true);
    });

    it('responds 404 for non-existent day', async () => {
      const res = await request(app)
        .get('/export/day/999999')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /export/module/:moduleId', () => {
    it('requires authentication', async () => {
      const res = await request(app).get('/export/module/1');
      expect(res.statusCode).toBe(401);
    });

    it('returns days array on success', async () => {
      const res = await request(app)
        .get('/export/module/1')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.days)).toBe(true);
    });

    it('responds 404 for non-existent module', async () => {
      const res = await request(app)
        .get('/export/module/999999')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(404);
    });
  });
}); 