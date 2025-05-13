import request from 'supertest';

// Make sure the CORS whitelist is configured **before** the app initialises so
// the dynamic checker reads the correct value.
process.env.CORS_ORIGIN = '*.vercel.app';

import app from '../src/app.js';

/**
 * CORS automated test.
 *
 * This test makes a pre-flight OPTIONS request (the one browsers send before
 * POST /auth/login) with a custom **Origin** header. We expect the server to
 * return HTTP 204 and echo the allowed origin back in the
 * `Access-Control-Allow-Origin` response header.
 *
 * Why 204? The `cors` package (which Express hands the request to) uses 204 No
 * Content for successful pre-flights.
 *
 * Example usage:
 *   npm test -- cors.test.js         # run just this file in CI
 */

describe('CORS pre-flight', () => {
  it('responds 204 and correct headers for allowed origin', async () => {
    const origin = 'https://my-team-preview.vercel.app';

    await request(app)
      .options('/auth/login')
      .set('Origin', origin)
      .set('Access-Control-Request-Method', 'POST')
      .expect(204)
      .expect((res) => {
        const header = res.headers['access-control-allow-origin'];
        expect(['*', origin]).toContain(header);
      })
      .expect('Access-Control-Allow-Methods', /POST/);
  });
}); 