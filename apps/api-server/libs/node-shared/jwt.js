import jwt from 'jsonwebtoken';

const jwt_secret = process.env.JWT_SECRET;
if (!process.env.JWT_SECRET) {
    throw new Error("Environment variable JWT_SECRET is undefined!")
}

/**
 * Tiny helpers to sign and verify JSON Web Tokens (JWT).
 *
 * Why we need it – keeps auth logic in one place and enforces a 12-hour expiry.
 *
 * Example:
 *   import { sign_jwt, verify_jwt } from '../../libs/node-shared/jwt.js';
 *   const token = sign_jwt({ userId: 42 });
 *   const payload = verify_jwt(token); // => { userId: 42, iat: <ts>, exp: <ts> }
 */

const sign_jwt = (payload) => jwt.sign(payload, jwt_secret, { expiresIn: '12h' });

const verify_jwt = (token) => jwt.verify(token, jwt_secret);

export { sign_jwt, verify_jwt };