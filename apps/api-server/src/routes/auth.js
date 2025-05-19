/***
 * Tiny router handling the login endpoint for our API server.
 *
 * Plain-English overview:
 * • The browser sends a POST request to /auth/login with a JSON body like:
 *     { "email": "demo@acme.test", "password": "pass123" }
 * • We check that both fields exist. If either is missing we answer with HTTP 400 so the
 *   front-end knows it made a bad request.
 * • We then compare the pair against a single hard-coded demo account. That is enough to
 *   unblock front-end work and automated tests until we hook this up to a real user table.
 * • If the pair does not match we respond with HTTP 401 (Unauthorised).
 * • When the pair matches we sign a short-lived JSON Web Token (JWT) that encodes the user's
 *   email and role. The token is sent back so subsequent requests can place it in the
 *   Authorization header.
 *
 * Example curl usage (replace demo credentials when real signup exists):
 *   curl -X POST http://localhost:4000/auth/login \
 *        -H "Content-Type: application/json" \
 *        -d '{"email": "demo@acme.test", "password": "pass123"}'
 *
 * Response on success →
 *   { "token": "<very-long-random-string>" }
 */
import express from 'express';
import { sign_jwt } from '../../libs/node-shared/jwt.js';

const router = express.Router(); // creates a mini express app for routing

// Hard-coded demo account – enough for first milestone tests & local dev.
const DEMO_USER = {
  id: 'demo-user-id-001',
  name: 'Demo User',
  email: 'demo@acme.test',
  password: 'pass123',
  role: 'editor'
};

// login route
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  // Extra guard: Both fields **must** be strings containing at least one printable character.
  // Without this check an attacker could send email as an object or empty string which would
  // side-step the simple truthy test below. By validating the JavaScript type and trimming
  // whitespace we ensure the backend only accepts sensible credentials and avoid surprising
  // runtime errors further down the flow.
  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    !email.trim() ||
    !password.trim()
  ) {
    return res.status(400).json({
      error: 'Email and password are required'
    });
  }

  if (!email || !password) {
    return res.status(400).json({
      error: 'Email and password are required'
    });
  }

  // Reject wrong credentials right away so callers know they must try again.
  if (email !== DEMO_USER.email || password !== DEMO_USER.password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Create a payload – include user info (never include password!)
  const payload = {
    id: DEMO_USER.id,
    name: DEMO_USER.name,
    email,
    role: DEMO_USER.role
  };

  // Sign token (12 h expiry baked into helper)
  const token = sign_jwt(payload);

  // If both are present
  res.status(200).json({ token });
});

export default router;
