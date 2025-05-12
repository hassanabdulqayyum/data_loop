/**
 * This file is now just the entry point that starts the server.
 *
 * It imports the pre-built Express app from app.js and calls app.listen.
 * This keeps the code tidy and lets tests import the app without starting a real server.
 *
 * Usage:
 *   node src/index.js   # starts the server for real
 */
import app from './app.js'

const port = process.env.PORT || 4000

app.listen(port, () => {
  console.log(`API listening on port ${port}`)
})