# Implementation Plan – User Flow 1: Dataset Editing & Version Preservation

> **Audience:** Full-stack developers and product engineers shipping Flow 1 exactly as specced in `docs/user_flow/user_flow_1.md`.
> 
> **Goal:** Replace the Google-Docs editing workflow with an in-app, non-destructive editing flow that supports versioning and JSON export.

---

## 0  Scope Guardrails

Only items explicitly mentioned in `user_flow_1.md` are in scope.

*Not included*
• Draft auto-save / tab-recovery ✔ out of scope  
• Prometheus / Grafana dashboards  ✔ out of scope  
• Extra CI doc-lint / schema-lint  ✔ out of scope

Everything else below is required by the spec.

## 0a  Environment & Deployment (Portable by Default)

• Front-end (`apps/frontend`) and the stateless Node.js API-server (`apps/api-server`) are deployed on **Vercel** so every push automatically spins up a preview URL.
• **Neo4j**, **Redis Streams**, and the **Python AI-worker** run on the on-prem GPU workstation (2 × RTX 3090, high-core CPU).  These state-holding services are started via Docker Compose.
• All containers use **named volumes**; data lives outside the container layers, so stopping/replacing images never touches production data.
• Configuration is driven entirely by a single `.env` file.  Switching to staging or cloud hosting later is just a matter of changing the env-vars.
• Nightly `backup.sh` and `restore.sh` scripts dump Neo4j (`neo4j-admin dump`) and Redis (`redis-cli SAVE`) so the volumes can be copied to any host and re-hydrated without data loss.

---

## 1  Milestones & Timeline (~ 10–14 days)

• M1 (Day 1-2) – Neo4j schema applied; seed data committed  
• M2 (Day 2-5) – REST CRUD endpoints plus Redis event emission  
• M3 (Day 4-8) – Front-end Canvas, Right-Side Panel (RSP) + Smart-Resume & first-unedited-node autofocus  
• M4 (Day 6-9) – Python diff-worker *plus* Docker-Compose integration (Redis service & worker container)  
• M5 (Day 8-11) – Export JSON, commit-summary prompt, toast UX polish  
• M6 (Day 10-13) – End-to-end smoke in staging, doc tick-boxes, beta hand-off  
• M7 (Day 12-14) – **Post-MVP infra migration**: move Neo4j, Redis & workers to shared GPU workstation  

> Tip – ship one pull-request per milestone, feature-flagged by `FEATURE_FLOW1`.

---

## 2  Task Breakdown (developer-ready)

### 2.1  Database (Neo4j)

1. Apply **all** constraints & indexes defined in `docs/neo4j_catalog_schema.md` *as-is*.  
2. Add optional property `commit_message` (string ≤ 120 chars) to **`Turn`** nodes.  
3. Provide a Cypher seed script that establishes the minimum catalog **plus a gold path**:
```
(:Program)-[:HAS_MODULE]->(:Module)-[:HAS_DAY]->(:Day)-[:HAS_PERSONA]->(:Persona)
(:Persona)-[:ROOTS]->(:Turn {role:'root'})
(:Turn {role:'root'})<-[:CHILD_OF]-(:Turn {role:'system'})
(:Turn {role:'system'})<-[:CHILD_OF]-(:Turn {role:'user'})
(:Turn {role:'user'})   <-[:CHILD_OF]-(:Turn {role:'assistant'})
```
The sequence above gives editors four visible turns (system, user, assistant) beneath the single root.  **Every system, user, and assistant turn must carry an `accepted` property** (boolean).  A value of `true` marks that version as part of the current *gold path*.  Multiple siblings *may* be flagged `accepted=true` (e.g. two alternative system prompts that are both approved).  For the minimal seed data you may start with the assistant node `accepted=true` and leave the earlier nodes `false`, or flag additional nodes `true` if you wish to show a longer approved chain.

> **Status: COMPLETE ✅**  
> **Implementation summary (see `docs/code_lines/user_flow_1_code_lines.md` for line references):**  
> • **Schema DDL** – `docs/scripts/neo4j/001_init_schema.cypher` (lines 1-16) applies every uniqueness constraint & index declared in `docs/neo4j_catalog_schema.md`, including the vector index `turnEmbedding`.  
> • **Optional Property** – `Turn.commit_message` is supported implicitly by Neo4j's schemaless property model; no migration required.  
> • **Seed Data** – `docs/scripts/neo4j/002_seed_data.cypher` (lines 1-14) inserts the minimal catalog and gold-path DAG (`root → system → user → assistant`) with `accepted:true` flags set per spec.  
> • **Automated Tests** – `tests/test_schema.py` and `tests/test_seed.py` load the DDL/seed scripts in isolated sessions and assert that each constraint, index, node and relationship exists, guaranteeing CI regression coverage.

### 2.2  Import CLI – `scripts/import_google_docs.py`

> **Status: COMPLETE ✅**  
> **Implementation summary (see `docs/code_lines/user_flow_1_code_lines.md` for line references):**  
> • **Path Validation & Parsing** – robust guard clauses ensure the path contains `<Program>/<Module##>/<Day##>/<persona>.json` and verify `Module##`/`Day##` prefixes (`docs/scripts/import_google_docs.py` lines ✱).  
> • **Program.seq Support** – `program_seq` derived from digits in the program folder name and stored on every Program node for deterministic ordering (same file lines ✱).  
> • **Upserts & DAG Creation** – Program → Module → Day → Persona nodes with `seq` properties, root Turn + ordered `CHILD_OF` edges, all imported turns flagged `accepted:true`.  
> • **Job-ID Printing** – UUIDv1 returned to caller and printed to stdout.  
> • **Automated Tests** – `tests/test_import_google_docs.py` covers happy path, missing required field, and malformed path structure.  

• **Input:** Path to a Google-Docs-exported JSON file located at `<Program>/<Module##>/<Day##>/<persona##>.json` — i.e. every persona filename carries a two-digit sequence just like `Module##` and `Day##` (one file per persona script).  
• **Output:** Script DAG written to Neo4j; console prints Job-ID (UUID).  
• **Logic:**
  1. Derive `program_id`, `module_seq`, `day_seq`, **`persona_id` _and_ `persona_seq`** from the file path, then validate JSON turns with pydantic (only `text` and `role` are required; legacy `seq` is *accepted* but optional).
  2. Upsert catalog nodes (Program → Module → Day → Persona) ensuring each node carries its correct `seq` property (including `seq` on `Persona` for ordered listings).
  3. Insert **`Turn`** nodes in order, `MERGE`-ing `:CHILD_OF` edges (`parent_id` taken from the preceding turn's `id`).

*Unit tests*
• Happy path: one file, three turns.  
• Failure: missing required field raises `ValueError`.

### 2.3  API-Server – `apps/api-server`

#### Endpoints

• POST `/auth/login` – return JWT (public)  
• GET `/hierarchy` – Program → Module → Day → Persona tree (JWT)  
• GET `/script/:personaId` – latest gold path (JWT)  
• PATCH `/turn/:turnId` – create new Turn; body `{text, commit_message?}` (JWT roles editor/reviewer/founder)  
• GET `/export/:personaId` – download JSON of gold path (JWT)  

REST is stateless; each handler:
1. Opens Neo4j driver session from pool (`libs/node-shared/db`).
2. Wraps errors → JSON 4xx/5xx.

#### Event Emission (sequence diagram compliance)

`PATCH /turn/:id` publishes Redis Stream entry `script.turn.updated` with fields:
```
id, parent_id, persona_id, editor, ts, text, commit_message?
```

*Tests* (Jest + Supertest): auth failure, happy path, missing body field.

#### Detailed Task Checklist

1. **Project scaffold** – **Status: COMPLETE ✅**
   - Implementation summary: `apps/api-server` directory created with `package.json`, `.env.example`, and `README.md`; dependencies installed; NPM scripts (`dev`, `test`, `start`) configured.

2. **Shared infrastructure layer** – **Status: COMPLETE ✅**
   - `libs/node-shared/db.js` – Neo4j driver singleton (reads `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`).
   - `libs/node-shared/redis.js` – Redis (Stream) client singleton (`REDIS_URL`).
   - `libs/node-shared/jwt.js` – `sign(payload)`, `verify(token)` helpers (env `JWT_SECRET`, expiry 12 h).

3. **Express app skeleton** – **Status: COMPLETE ✅**
   - Implementation summary: `apps/api-server/src/index.js` (lines 1-33) loads env-vars, spins up the Express instance, registers the JSON body parser, exposes `/health`, and mounts the global error handler;  
     `apps/api-server/src/middleware/auth.js` (lines 1-60) validates the `Authorization` header, decodes the JWT with our shared helper, and injects `req.user`;  
     `apps/api-server/src/middleware/error.js` (lines 1-58) captures any thrown error, converts it into a tidy JSON `{ error }` response and prints stack-traces during development.
   - `src/index.js` – boot file (load env, create Express app, mount routers).
   - `src/middleware/auth.js` – JWT verifier → attaches `req.user = { id, role }`.
   - `src/middleware/error.js` – global error handler → JSON 4xx/5xx.
      Note for later: Express 5 automatically forwards rejected Promises to the error middleware, so we can implement src/middleware/error.js with plain Express code—no extra helper needed.

4. **Route modules & handlers** – **Status: COMPLETE ✅**
   - `POST /auth/login` – accept `{email,password}` (mock lookup for now); return `{token}`.
   - `GET /hierarchy` – return Program→Module→Day→Persona tree from Neo4j.
   - `GET /script/:personaId` – return latest gold-path turns.
   - `PATCH /turn/:turnId` – create new Turn, emit Redis event `script.turn.updated`.
   - `GET /export/:personaId` – download JSON of gold path.

5. **Validation layer** – **Status: COMPLETE ✅**  
   - Manual guards added in every route (string-type enforcement on POST /auth/login, body/param checks on editing endpoints).  See `docs/code_lines/user_flow_1_code_lines.md` entry #53 for exact code lines.

6. **Tests (Jest + Supertest)** – **Status: COMPLETE ✅**  
   - `auth.test.js` – login happy & failure cases.
   - `hierarchy.test.js` – returns correct tree structure.
   - `script.test.js` – gold-path length matches seed.
   - `turn_patch.test.js` – new turn creation, Redis stub assertion.
   - `export.test.js` – JSON export endpoint returns expected payload.
   - Provide docker-compose or in-memory mocks for CI.

7. **Redis event schema files**  – **Status: COMPLETE ✅**  
   - `contracts/events/script.turn.updated.yaml` – fields `id, parent_id, persona_id, editor, ts, text, commit_message`.
   - `contracts/events/script.turn.diff_reported.yaml` – stub for Milestone 2.4.

8. **Lint & format**
   – **Status: COMPLETE ✅**  
   - ESLint + Prettier configs added (`.eslintrc.cjs`, `.prettierrc.json`).  
   - New NPM scripts `lint` and `lint:fix`; dev-dependencies installed in `apps/api-server/package.json`.  
   - Docs updated and helper comments explain usage in plain language.

9. **NPM scripts** – **Status: COMPLETE ✅**
   - `dev` (nodemon src/index.js)
   - `test` (jest)
   - `start` (node src/index.js)

10. **Documentation updates** – **Status: COMPLETE ✅**
    - Update this implementation plan's progress table and **endpoint examples** (done ✅ – see below).
    - Ensure every file & function contains explanatory comments & docstrings as per the repository's custom instructions.

    #### Copy-paste endpoint examples

    ```bash
    # 1. Login – obtain a JWT you can reuse for all secured calls
    curl -X POST http://localhost:4000/auth/login \
         -H "Content-Type: application/json" \
         -d '{"email":"demo@acme.test","password":"pass123"}'
    # → { "token": "<jwt>" }

    # 2. Fetch the Program → Module → Day → Persona hierarchy
    curl -H "Authorization: Bearer <jwt>" \
         http://localhost:4000/hierarchy
    # → { "data": [ { "programId": "…", "modules": [ … ] } ] }

    # 3. Get the latest gold-path turns for a persona (replace :id)
    curl -H "Authorization: Bearer <jwt>" \
         http://localhost:4000/script/1
    # → { "data": [ { "id": "…", "role": "system", "depth": 0, "text": "…" }, … ] }

    # 4. Save a new assistant reply under turn 4 (example)
    curl -X PATCH http://localhost:4000/turn/4 \
         -H "Authorization: Bearer <jwt>" \
         -H "Content-Type: application/json" \
         -d '{"text":"Updated assistant reply","commit_message":"typo fix"}'
    # → { "id": "<new-turn-id>", "parent_id": "4", "persona_id": "1", "ts": 1710000000000 }

    # 5. Export the script as JSON (browser will download)
    curl -H "Authorization: Bearer <jwt>" \
         -L http://localhost:4000/export/1 --output script_1.json
    ```

11. **Git source control** – **Status: COMPLETE ✅**
    - Initialise a new Git repository with `main` as the default branch (`git init -b main`).  
    - Create a human-friendly `.gitignore` that skips Node modules, Python virtual-envs, OS clutter, secrets and other transient files (see `docs/code_lines/user_flow_1_code_lines.md` entry #61).  
    - Stage the entire workspace and commit: `git add -A && git commit -m "Initial commit: baseline codebase and .gitignore setup"`.  
    - Outcome: every file is versioned from this point onwards, enabling safe collaboration, roll-backs and CI/CD triggers.
    - **Branch naming convention:** start each task with `git checkout -b feature/<milestone-or-item-slug>` – e.g. `feature/2.3.4-route-handlers`.
    - **Commit message style:** follow the plain-English flavour of Conventional Commits (`feat: …`, `fix: …`, `docs: …`, `refactor: …`).  Include the relevant implementation-plan item number so reviewers can trace the change.  
      Example: `feat: 2.3.4 implement PATCH /turn event emission`.
    - **Micro-task cadence:** make one commit at the end of *every* micro-task so the history mirrors the learning log. If the change touches multiple files, the single commit still suffices provided the message summarises the whole micro-task.
    - **Push & PRs:** push the branch to the shared remote and open a Pull-Request targeting `main` (or the active milestone branch).  This automatically kicks off CI and Vercel preview deployments.
    - **Branch model:** keep two long-lived branches – `dev` (integration) and `prod` (stable release).  Merge feature branches into `dev`; once the staging checklist passes, fast-forward `prod` from `dev` so Vercel promotes the build to production.

12. **Vercel integration – Status: COMPLETE ✅**
    - **Config files added** – `vercel.json` at repo root declares the serverless build that points every request to `api/index.mjs`, passes through the required environment variables, and pins Vercel's Node builder.  
    - **Serverless entrypoint** – `api/index.mjs` simply re-exports the existing Express app so no code changes were needed inside the API itself.  
    - **Environment template** – `apps/api-server/env.example` lists every required variable (`NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`, `REDIS_URL`, `JWT_SECRET`, `PORT`) so developers can run the server locally and can copy–paste the same keys into Vercel.  
    - With those files in place you can now run `vercel dev` locally or push any branch to GitHub and Vercel will build a preview URL automatically, using `npm run start` under the hood.

### 2.4  Event Contracts – `contracts/events/`

1. `script.turn.updated.yaml` – exact schema as table above.  
2. `script.turn.diff_reported.yaml` – stub; fields `id, parent_id, persona_id, diff_html, grade`.  

- **Status: COMPLETE ✅** – Both contract files exist *and* are now protected by automated unit tests (`tests/test_event_contracts.py`) so CI will fail if any required field is removed or renamed.

### 2.5  Python Diff Worker – `apps/py-ai-service`

> **Implementation summary (see `docs/code_lines/user_flow_1_code_lines.md` entries 72-78):**  
> • **Docker-Compose** – `docker-compose.yml` now declares the `redis` service (profile `diff`, 256 MB limit, health-check, named volume) **and** `diff_worker` service that builds from `apps/py-ai-service/` and receives the correct Neo4j/Redis env-vars.  
> • **Worker image & source** – `apps/py-ai-service/Dockerfile` builds a slim Python 3.10 image, installs `redis`/`neo4j` clients from `requirements.txt`, copies `diff_worker.py`, and starts it as a non-root user.  
> • **Runtime behaviour** – `diff_worker.py` subscribes to `script.turn.updated`, fetches the *previous* turn text from Neo4j, computes an HTML diff via `difflib.HtmlDiff`, then publishes a `script.turn.diff_reported` event that matches the YAML contract. It keeps running indefinitely and logs, but never crashes the loop on a single bad message.  
> • **Automated tests** – `tests/test_diff_worker.py` stubs Redis & Neo4j in-memory, asserts diff HTML contains `diff_add`, and verifies the worker handles a missing `text` field gracefully. All 25 repository tests pass (`pytest -q`).

During active development **all three stateful back-end services – Neo4j, Redis Streams, and the Python diff-worker – run inside the existing `docker-compose.yml` file**.  One command (`docker compose --profile diff up -d`) now boots the whole stack on any laptop or CI runner, guaranteeing parity across environments.  A later section details how the same Compose file is reused on the shared GPU workstation once Flow 1 is feature-complete.

#### Docker-Compose additions (Milestone M4)
• **`redis` service** – official Redis image, named volume `redis-data`, health-check, optional `6379:6379` port mapping.  
• **`diff_worker` service** – builds from `apps/py-ai-service/`, `depends_on: [redis]`, `restart: unless-stopped`, environment `REDIS_URL=redis://redis:6379`, `NEO4J_URI=bolt://neo4j:7687`.  
• Memory guardrails: `mem_limit: 256m` on Redis so dev laptops don't thrash.  
• Profiles: mark Redis & worker with `profile: diff` so front-end-only contributors can opt-out: `docker compose --profile diff up -d`.

#### Worker behaviour
1. Subscribe to Redis Stream `script_updates` (blocking read).  
2. For every message compute an HTML diff via `difflib.HtmlDiff`.  
3. Publish a new entry to the same stream with event-type `script.turn.diff_reported` and fields `id, parent_id, persona_id, diff_html, grade`.  
4. Log errors and continue; never block retries.

*Pytest* – asserts correct diff output on normal messages and graceful handling of malformed payloads.

### 2.6  Front-End – `apps/frontend`

Libraries: React 18, React-Router, React-Flow, zustand, react-hot-toast.

Components & Pages

1. **LoginView** – posts to `/auth/login`; stores JWT in `localStorage.jwt`.
2. **HierarchyDrawer** – walks `/hierarchy`; closes on "Load script".
3. **CanvasView**
   * Header: breadcrumb path + **"Change script"** control (allows opt-out from Smart-Resume).
   * React-Flow canvas: gold path nodes render Markdown text & badge `vN`.
   * **Right-Side Panel (RSP)** — four states:
     a. *Selector* – shows prompts + "Load script" button.  
     b. *Selected-node context* – single-click view with actions.  
     c. *Node inspector / version timeline* – double-click view; shows parent turn + alternating timeline cards.  
     d. *Editing* – textarea, Markdown toolbar, **"Save New Version"** + **commit summary** input.
   * Toasts:
     – On Smart-Resume load: "Resumed last script: …" (non-blocking).  
     – After save: "v{N} saved by {user}".

#### Smart-Resume (2a)
*When:* user logs in and `localStorage.lastPersonaOpened` < 7 days ago.  
*Action:* auto GET `/script/:id`, skip hierarchy, toast message.

#### First-unedited-node autofocus (2b)
*Algorithm:* find first node where `version.author ≠ currentUser` **or** `date ≠ today`; center view via `reactFlowInstance.fitView`.

#### Inline Commit Summary (2c)
• Single-line `<input maxLength=120>` in Editing state.  
• Sent in `commit_message` field of `PATCH /turn/:id` body.

#### Export Script
*Button location:* RSP selector state when a script is loaded.  
*Action:* call `/export/:personaId`, trigger hidden `<a download>` with returned blob.

*Cypress tests* – selector flow, edit flow (commit summary visible), export flow.

### 2.7  Staging & Verification

1. Deploy preview → **Vercel** (frontend + Node lambdas).  The local GPU server continues to host Neo4j, Redis, and the Python worker, exposed over a secure VPN or SSH tunnel.  
2. Run Cypress E2E: **import → edit → export**.  
3. Tick *Done-When* checklist in MD file once green.

### 2.8  Post-MVP Infrastructure Migration – Shared GPU Workstation

Once User-Flow 1 passes staging smoke tests, **Neo4j, Redis Streams, and all Python workers move to the on-prem GPU workstation (2 × RTX 3090)**.  The **same `docker-compose.yml`** is copied to that host and started with `docker compose up -d`, preserving all versions and health-checks.

Steps:
1. Copy `.env.example` → `/opt/flow1/.env` on the GPU box; fill in production credentials.  
2. `scp` the repository or pull from Git; run `docker compose up -d` to launch `neo4j`, `redis`, and `diff_worker` containers (named volumes keep data outside image layers).  
3. Update Vercel project env-vars (`NEO4J_URI`, `REDIS_URL`) so the Node lambdas and front-end previews point at the workstation.  
4. Verify health endpoints (`:7474` for Neo4j, `PING` for Redis, worker logs via `docker compose logs -f diff_worker`).  
5. Remove any temporary tunnels; all preview and production deployments now hit the shared back-end directly.

Rollback plan: stop the workstation's Compose stack and point env-vars back to the original host; volumes guarantee no data loss.

---

## 3  Definition of Done (mirrors spec)

- [ ] Editor loads script, edits 1 node, new version badge appears, diff event emitted.  
- [ ] Smart-Resume + first-unedited autofocus perform as described.  
- [ ] Commit summary saved and displayed in timeline.  
- [ ] Export JSON matches latest gold path, Markdown intact.  
- [ ] `docs/user_flow/user_flow_1.md` Done-When list fully ticked.  
- [ ] Psychologist edits 5 nodes in staging and signs off.

---

## 4  Next Steps

1. `git checkout -b feature/flow1-dataset-editing`  
2. Implement **2.1** (schema + seed); push PR #1.  
3. While PR #1 awaits review, stub API endpoints using in-memory arrays to unblock front-end.  
4. Iterate through milestones, merging early & often behind `FEATURE_FLOW1`.  
5. When Definition of Done is satisfied, remove the flag and deploy to production.

### TODO – Import Completion Event (Redis)

Create a `script.import.completed` entry in the existing Redis Streams broker.  Fields:
`job_id, program_id, module_seq, day_seq, persona_id, importer, ts`.
This operational event lives outside Neo4j, enabling downstream workers to
observe import activity without adding "noise" nodes to the graph.  Implementation
is scheduled for Milestone **M2** alongside the REST CRUD endpoints.

*End of file – every line above is actionable and maps one-to-one to the Flow 1 spec.* 