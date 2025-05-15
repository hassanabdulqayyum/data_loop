/**
 * ESLint configuration for the whole project.
 * Think of ESLint as a spell-checker for JavaScript: it scans every .js file and points out
 * common mistakes (like unused variables) or style issues (like missing semi-colons).
 *
 * Example usage:
 *   $ npm run lint            # shows warnings & errors
 *   $ npm run lint:fix        # automatically fixes what it can
 * The helper scripts live in apps/api-server/package.json but ESLint will still walk the
 * entire repository starting from the folder where you run it.
 */
module.exports = {
  root: true, // Treat the folder containing this file as the project root so ESLint stops here.
  env: {
    es2023: true, // Enable modern language features.
    node: true,   // Adds Node.js global variables (e.g. __dirname).
    jest: true    // Allows Jest test globals like `describe` and `expect`.
  },
  extends: [
    "eslint:recommended",            // Start with sensible defaults from ESLint itself.
    "plugin:prettier/recommended"    // Disable rules that clash with Prettier & show Prettier issues as ESLint errors.
  ],
  parserOptions: {
    ecmaVersion: "latest", // Let ESLint parse the latest ECMAScript syntax.
    sourceType: "module"    // Code is written using ES-modules (import/export).
  },
  rules: {
    // Warn when `console.log` slips into committed code – handy during development
    // but something we usually want to tidy up before merging.
    "no-console": "warn",
    // Explicitly configure no-unused-vars to ignore underscore-prefixed variables.
    // This is usually default with "eslint:recommended" but helps ensure consistency.
    "no-unused-vars": ["error", { "varsIgnorePattern": "^_", "argsIgnorePattern": "^_" }]
  },
  ignorePatterns: [
    "venv/",          // Python virtual-env – no JavaScript lives here.
    "node_modules/",  // Installed packages – we never lint third-party code.
    "dist/",          // Compiled output (if we add bundling later).
    ".cursor/",       // AI assistant metadata.
    "*.cypher"        // Neo4j migration scripts – not JS.
  ]
}; 