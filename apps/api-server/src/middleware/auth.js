/***
 * Protects private routes by verifying the JSON Web Token (JWT) sent by the browser.
 *
 * How it works in plain English:
 * 1. The browser adds a header that looks like:
 *        Authorization: Bearer <long-random-token>
 * 2. We make sure that header exists and starts with the word "Bearer". If not, we stop right
 *    there and tell the caller they need to log in (HTTP 401).
 * 3. We take the token part, run it through `verify_jwt()` which checks that the token was signed
 *    with our secret key and hasn't expired or been tampered with.
 * 4. If the check passes we store the decoded info (e.g. user id and role) on `req.user` so the next
 *    middleware or route handler knows who is calling. Then we call `next()` so the request can
 *    continue.
 * 5. If the check fails, we again answer with 401 and explain what went wrong so the front-end can
 *    prompt the user to log in again.
 *
 * Example usage inside an Express route:
 * ```js
 * import express from 'express';
 * import auth from './middleware/auth.js';
 *
 * const router = express.Router();
 *
 * // Anyone can hit this route.
 * router.get('/public-info', (req, res) => {
 *   res.json({ message: 'hello world' });
 * });
 *
 * // Only logged-in users can hit this route.
 * router.get('/profile', auth, (req, res) => {
 *   res.json({ id: req.user.id, role: req.user.role });
 * });
 *
 * export default router;
 * ```
 */

import { verify_jwt } from "../../libs/node-shared/jwt.js";

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // Early-exit when header is missing or malformed. We keep the wording consistent across the API
        // so front-end code can rely on it.
        return res.status(401).json({ error: 'Missing or malformed token' });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
        const decoded = verify_jwt(token);
        req.user = decoded; // Attach user info to request
        next();
    } catch (err) {
        // Token failed verification – could be forged, expired or signed with wrong secret.
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

export default authMiddleware;