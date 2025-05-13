/***
 * This file builds and configures the Express app for our API server, but does NOT start the server.
 *
 * Why split it? This lets us import the app in tests (using Supertest) without accidentally starting a real server.
 *
 * Usage:
 *   import app from './app.js';
 *   // ...use in tests or start server elsewhere
 *
 * All routes, middleware, and error handlers are registered here.
 */
import * as dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import cors from 'cors'
import errorHandler from './middleware/error.js'
import authRouter from './routes/auth.js'
// Import the hierarchy route so we can handle GET /hierarchy requests from logged-in users
import hierarchyRouter from './routes/hierarchy.js'
import authMiddleware from './middleware/auth.js'
// Import the script route so we can handle GET /script/:personaId requests from logged-in users
import scriptRouter from './routes/script.js'
import turnRouter from './routes/turn.js'
import exportRouter from './routes/export.js'

// ---------------------------------------------------------------------------
// Early DB connections – so build logs always show whether the tunnels & env
// vars are correct *before* the first real HTTP request arrives.
// ---------------------------------------------------------------------------
// Redis: the module connects as a side-effect of its top-level code, so simply
// importing it is enough to see either ✅ or ❌ in the log.
import '../libs/node-shared/redis.js';

// Neo4j: we expose an explicit init helper that verifies connectivity and
// prints a success/failure message. We invoke it once at startup using
// top-level await (Node 18 on Vercel supports this by default).
import { initNeo4j } from '../libs/node-shared/db.js';
await initNeo4j();

const app = express()

// -------------------------------------------------------------
// Smarter origin check – supports wildcard patterns such as
//   *.vercel.app  or  https://data-loop-frontend*.vercel.app
// List multiple values in CORS_ORIGIN separated by commas.
// Example:
//   CORS_ORIGIN=https://data-loop-frontend.vercel.app,*.vercel.app
// -------------------------------------------------------------

// let corsOrigin; // OLD DYNAMIC LOGIC
// if (!process.env.CORS_ORIGIN || process.env.CORS_ORIGIN.trim() === '*') { // OLD DYNAMIC LOGIC
//   corsOrigin = '*'; // OLD DYNAMIC LOGIC
// } else { // OLD DYNAMIC LOGIC
//   const tokens = process.env.CORS_ORIGIN.split(',').map((s) => s.trim()); // OLD DYNAMIC LOGIC
//   const exact = tokens.filter((t) => !t.includes('*')); // OLD DYNAMIC LOGIC
//   const wildcards = tokens // OLD DYNAMIC LOGIC
//     .filter((t) => t.includes('*')) // OLD DYNAMIC LOGIC
//     .map((pat) => // OLD DYNAMIC LOGIC
//       // escape dots then replace * with .* // OLD DYNAMIC LOGIC
//       new RegExp('^' + pat.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$') // OLD DYNAMIC LOGIC
//     ); // OLD DYNAMIC LOGIC
// // OLD DYNAMIC LOGIC
//   corsOrigin = function (origin, callback) { // OLD DYNAMIC LOGIC
//     if (!origin) return callback(null, true); // non-browser request // OLD DYNAMIC LOGIC
//     if (exact.includes(origin)) return callback(null, true); // OLD DYNAMIC LOGIC
//     for (const re of wildcards) { // OLD DYNAMIC LOGIC
//       if (re.test(origin)) return callback(null, true); // OLD DYNAMIC LOGIC
//     } // OLD DYNAMIC LOGIC
//     callback(new Error('CORS not allowed')); // OLD DYNAMIC LOGIC
//   }; // OLD DYNAMIC LOGIC
// } // OLD DYNAMIC LOGIC
// app.use(cors({ origin: corsOrigin })); // OLD DYNAMIC LOGIC
// // Some browsers send a preflight OPTIONS request. Make sure we reply quickly
// // with the correct CORS headers for *every* path.
// app.options('*', cors({ origin: corsOrigin })); // OLD DYNAMIC LOGIC

// --- TEMPORARY SIMPLIFIED CORS FOR DEBUGGING ---
// Explicitly handle OPTIONS preflight requests first.
// This ensures that preflight requests get the necessary headers immediately.
app.options('/:path*', (req, res) => {
  // Log to Vercel to confirm if OPTIONS requests reach this handler.
  console.log(`OPTIONS request received for: ${req.path} from origin: ${req.headers.origin}`);

  // Set permissive CORS headers for the preflight response.
  // 'Access-Control-Allow-Origin' should be '*' or the specific requesting origin.
  res.setHeader('Access-Control-Allow-Origin', '*'); // Allow any origin
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  // 'Access-Control-Allow-Headers' must include any headers the client might send,
  // like 'Content-Type' or 'Authorization' for JWTs.
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version');
  // 'Access-Control-Allow-Credentials' can be true if your frontend needs to send cookies or auth headers.
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Respond with 204 No Content, which is a common practice for preflight requests.
  res.status(204).end();
});

// Then, use the cors middleware for all other (actual) requests.
// This will also add CORS headers to responses for GET, POST, etc.
app.use(cors({
  origin: '*', // Allow all origins for actual requests too.
  credentials: true, // Allow credentials (e.g., for Authorization header).
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With', 'Accept', 'Accept-Version', 'Content-Length', 'Content-MD5', 'Date', 'X-Api-Version']
}));
// --- END TEMPORARY SIMPLIFIED CORS ---

// Parse incoming JSON
app.use(express.json());

app.get('/health', (req, res) => {
  res.send({ status: 'ok' })
})

// Mount the login router so POST /auth/login is reachable from the front-end.
app.use('/auth', authRouter)

// Mount the hierarchy router so GET /hierarchy is protected by JWT middleware
app.use('/hierarchy', authMiddleware, hierarchyRouter)

// Mount the script router so GET /script is protected by JWT middleware
app.use('/script', authMiddleware, scriptRouter);

// Mount the turn router so GET /turn is protected by JWT middleware
app.use('/turn', authMiddleware, turnRouter);

// Mount the export router so GET /export is protected by JWT middleware
app.use('/export', authMiddleware, exportRouter);

// Register the global error handler AFTER all routes so Express only reaches
// it when something goes wrong in the chain above.
app.use(errorHandler)

export default app; 