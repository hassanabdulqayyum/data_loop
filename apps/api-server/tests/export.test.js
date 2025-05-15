import request from 'supertest';
import app from '../src/app.js';
import { sign_jwt } from '../libs/node-shared/jwt.js';

describe('GET /export/:personaId', () => {
  const validToken = sign_jwt({ email: 'demo@acme.test', role: 'editor' });

  it('should require authentication', async () => {
    const res = await request(app).get('/export/1');
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it('should respond with 200 and return data array (works with seed DB)', async () => {
    const res = await request(app).get('/export/1').set('Authorization', `Bearer ${validToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should respond with 404 for a non-existent persona', async () => {
    /*
      We hit the endpoint with an obviously non-existent persona ID. The route
      is expected to return a 404 JSON error object instead of the usual data
      payload. This small regression test ensures we never accidentally expose
      an empty 200 response or an unhandled exception when the client asks for
      a persona that isn't in the database.
    */
    const res = await request(app)
      .get('/export/999999') // a persona ID that should never exist in the tiny seed DB
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});
