import request from 'supertest';
import app from '../src/app.js';

describe('POST /auth/login', () => {
    const validUser = {
      email: 'demo@acme.test',
      password: 'pass123'
    };
  
    // Happy path
    it('should return 200 and a token when email and password are correct', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send(validUser);
  
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(typeof res.body.token).toBe('string');
      expect(res.body.token.length).toBeGreaterThan(0);
    });
  
    // Missing field
    it('should return 400 when password is missing', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'demo@acme.test' });
  
      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ error: 'Email and password are required' });
    });
  
    // Wrong password
    it('should return 401 when password is incorrect', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'demo@acme.test', password: 'wrong' });
  
      expect(res.statusCode).toBe(401);
      expect(res.body).toEqual({ error: 'Invalid credentials' });
    });
});