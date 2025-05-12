# API Server – Flow 1 Dataset Editing

This folder holds the **backend** that our front-end will talk to while you edit and version conversation scripts.

## What does it do?

1. List the hierarchy of _Programs → Modules → Days → Personas_.
2. Serve the latest "gold-path" script for a given persona.
3. Let editors save a **new version** of any turn (and push a message to Redis so other services notice the change).
4. Export the whole script as a downloadable JSON file.

All of that is wrapped in a simple **REST** API built with [Express 5](https://expressjs.com/).

---

## Getting it running locally

```bash
cd apps/api-server          # jump into this folder
npm install                 # grab all dependencies
cp .env.example .env        # copy the sample env-file and fill in the blanks
npm run dev                 # start the server with auto-reload (nodemon)
```

If you prefer the plain Node runtime without auto-reload:

```bash
npm start                   # equivalent to: node src/index.js
```

The server listens on the port you set in the **PORT** environment variable (defaults to `4000`).

---

## Environment variables (see `.env.example`)

| Name | What it is for |
|------|----------------|
| `NEO4J_URI` | Bolt URL to your Neo4j database (e.g. `bolt://localhost:7687`). |
| `NEO4J_USER` / `NEO4J_PASSWORD` | Credentials for Neo4j. |
| `REDIS_URL` | URL to Redis (used for streaming events). |
| `JWT_SECRET` | Secret string used to sign and verify JSON Web Tokens. |
| `PORT` | Port the HTTP server should listen on. |

> Tip: during development you can keep all services local by running Neo4j and Redis in Docker.

---

## Running the test suite

We use **Jest** together with **Supertest** for HTTP assertions. The tests **automatically** ensure a Neo4j test database is available:

* If port `7687` is already open (e.g. you have Neo4j running locally), the suite connects to that instance.
* Otherwise it runs `docker compose up -d neo4j` for you, waits until the DB is ready, then executes the assertions. After the final test it calls `docker compose down` to clean up.

So, in most cases you can simply run:

```bash
npm test
```

and the rest happens under the hood.

> If Docker isn't installed or the daemon isn't running, the suite will fail fast with a clear error message. Either start Docker or fire up your own Neo4j on `localhost:7687`.

---

## Next steps

* Hook up actual route files in `src/`.
* Add real Jest/Supertest tests for `/auth/login`, `/hierarchy`, etc.
* Push a pull-request and watch Vercel spin up a preview URL automatically.

Happy coding! 🚀
