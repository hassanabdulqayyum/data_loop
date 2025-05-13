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