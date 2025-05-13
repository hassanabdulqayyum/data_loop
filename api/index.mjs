/**
 * Vercel serverless **entrypoint** for our Express API.
 *
 * Vercel automatically looks for any file inside the top-level `api/` folder
 * and treats the file's default export as the **request handler**.  Because an
 * Express application **already is** a `(req, res) => …` function, we can just
 * import the app we built elsewhere in the repo and export it unchanged.
 *
 * Nothing here opens a port – Vercel injects the request/response objects and
 * we hand them directly to Express.  That's all it takes to run the entire
 * API under Vercel's serverless platform.
 *
 * Example (local development):
 *   $ vercel dev
 *   $ curl http://localhost:3000/health   # → { "status": "ok" }
 */

import app from '../apps/api-server/src/app.js';

export default app; 