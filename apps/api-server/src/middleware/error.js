/***
 * Centralised error-handling middleware for Express.
 *
 * Plain-English summary — why this file exists:
 * When any route or middleware in our API throws an Error (or rejects a Promise),
 * Express will skip straight here.  We catch that error, pick a sensible HTTP
 * status code, and respond with a neat JSON object that always contains an
 * "error" key.  This guarantees the front-end never receives an ugly HTML stack
 * trace and can rely on one consistent response shape.
 *
 * Shape of every response emitted by this middleware:
 *     {
 *       "error": "Human-readable message explaining what went wrong",
 *       "stack": "<stack trace only in development>"  // optional
 *     }
 *
 * Example usage (no manual wiring required — just import and register once):
 *     import errorHandler from './middleware/error.js';
 *     app.use(errorHandler);           // must be AFTER all other routes
 *
 * This file follows the layman-comment rule: minimal jargon, explain concepts as
 * if to a curious non-programmer.
 */

/**
 * Centralized error handling middleware.
 *
 * This middleware catches errors thrown by route handlers and other middleware.
 * It logs the error and sends a standardized JSON error response to the client.
 *
 * @param {Error} err - The error object.
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The Express next middleware function.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  // Log the full stack trace so developers can debug locally or in staging.
  // In production this still goes to stdout/stderr, which the hosting platform
  // (e.g. Vercel) will capture.
  console.error(err);

  // 1️⃣  Work out the correct HTTP status code.
  // If the upstream code set `err.status` or `err.statusCode` we respect that.
  // Otherwise default to 500 – the generic "server blew up" status.
  const statusCode = err.status || err.statusCode || 500;

  // 2️⃣  Decide on a safe error message.  Never leak raw stacks to end users.
  // If the error object already has a `message` we can surface it (useful for
  // 4xx client errors). For 5xx errors we fall back to a neutral sentence so we
  // don't disclose internal details.
  const isServerError = statusCode >= 500;
  const publicMessage = isServerError ? 'Internal server error' : err.message;

  // 3️⃣  Build the JSON payload.  Always include the `error` key so the
  // front-end contract stays stable.
  const payload = { error: publicMessage };

  // Include stack trace only when not running in production.  This helps
  // developers during local dev and CI but keeps prod responses tidy.
  if (process.env.NODE_ENV !== 'production') {
    payload.stack = err.stack;
  }

  res.status(statusCode).json(payload);
};

export default errorHandler;
