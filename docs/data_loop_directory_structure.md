data-loop/
│
├─ apps/                                # All programs you actually *run*
│   │
│   ├─ api-server/                      # Node.js backend (talks to DB, serves the UI)
│   │   ├─ src/
│   │   │                                   # 📦 Deployment: **Vercel serverless functions** (stateless, short-lived)
│   │   │                                   # The per-route lambda model fits our fast CRUD + auth endpoints.
│   │   │   ├─ modules/                 # One folder per *feature* to keep code bite-sized
│   │   │   │   ├─ scripts/             # "Load script", "Save version", "Export" routes + logic
│   │   │   │   ├─ auth/                # Login, JWT tokens, permissions
│   │   │   │   ├─ users/               # Create user, list users, roles
│   │   │   │   └─ …more as you grow
│   │   │   │
│   │   │   ├─ config/                  # Tiny files with settings (DB URL, JWT secret)
│   │   │   ├─ utils/                   # Generic helpers (date formatting, error wrappers)
│   │   │   └─ index.ts                 # 30–60 lines: boots Express/Nest, wires routes
│   │   │
│   │   ├─ tests/                       # Fast Jest tests; one file mirrors each feature file
│   │   ├─ package.json                 # NPM deps + "npm start", "npm test" scripts
│   │   └─ tsconfig.json                # TypeScript compiler rules
│   │
│   ├─ realtime-gateway/           # WebSocket service – **always-on** container (Railway / Fly / Cloud Run)
│   ├─ event-bus/                      # JSON event relay – runs 24×7 next to Python stack (Railway)
│   ├─ metrics-collector/              # Batch/stateless: can run on same Railway container set – **Railway** (long-running cron & DB export)
│   │
│   ├─ frontend/                        # React single-page app
│   │   ├─ src/
│   │   │   ├─ components/              # Small UI blocks (buttons, dialogs, node cards)
│   │   │   │   └─ common/             # Shared design-system bits (Button, Modal, Tooltip) – keeps you from copy-pasting UI code
│   │   │   ├─ pages/                   # Whole screens (Login page, Canvas page)
│   │   │   ├─ hooks/                   # Reusable React hooks (fetchData, useZoom)
│   │   │   ├─ styles/                  # CSS / Tailwind / styled-components—your choice
│   │   │   └─ main.tsx                # Boots React, React-Flow, router
│   │   ├─ public/                      # favicon, index.html
│   │   ├─ tests/                       # React-Testing-Library / Cypress
│   │   └─ package.json                 # 📦 Deployment: **Vercel static + ISR**
│   │
│   └─-ff.py              # Python AI service (FastAPI + workers) – **Railway** (needs always-on process, background embeddings/TTS)
│       │   │   └─ rephraser.py         # Grammar / tone fix helpers
│       │   │
│       │   ├─ tasks/                   # Longer jobs picked up by the worker process
│       │   │   ├─ embed_node.py        # Compute sentence embeddings, save to DB
│       │   │   ├─ nightly_dedupe.py    # Scan whole corpus for duplicate phrases
│       │   │   └─ tts_generate.py      # Turn text into audio
│       │   │
│       │   ├─ models/                  # Pydantic schemas + small local ML models
│       │   │   ├─ node.py              # How a "Node" looks in/out of the API
│       │   │   └─ diff_request.py      # Validate /diff-summary input
│       │   │
│       │   ├─ main.py                  # 20–40 lines: starts FastAPI app (uvicorn)
│       │   └─ worker.py                # 40–60 lines: starts Celery/RQ worker loop
│       │
│       ├─ tests/                       # Pytest files that hit routes & tasks
│       └─ pyproject.toml               # Python deps + "make test" shortcut
│
├─ libs/                                # Helper code reused inside one language
│   ├─ node-shared/
│   │   ├─ db/                          # Neo4j query helpers, small enough to read in 5-min
│   │   ├─ rbac.ts                      # One file that says "who is allowed to do what" – used everywhere instead of sprinkling if-checks
│   │   └─ queue.ts                     # Push message → Redis/Rabbit
│   └─ py-shared/
│       ├─ db/                          # Same, but Python (neo4j-driver wrappers)
│       ├─ dag/                        # Reusable graph helpers – topo sort, lineage queries, diff paths – keeps DAG logic in one place
│       ├─ vector_store/                # PGVector / Redis wrappers for fast similarity search on embeddings
│       ├─ embeddings/                  # Tiny local models reused across tasks (e.g., MiniLM for dedupe)
│       └─ queue.py                     # Consume or publish queue messages
│
├─ contracts/                           # Where Node & Python shake hands
│   ├─ openapi.yaml                     # Human + machine-readable list of AI endpoints
│   ├─ events/                          # Pure JSON/YAML schemas for every event we emit so all services agree on the format
│   ├─ queue-schema.md                  # "Here's what every queue message must contain" in plain English
│   └─ events.md                        # One-liner description of each event string (quick human ref)
│
├─ scripts/                             # One-time or admin commands
│   ├─ import_google_docs.py            # Founder runs once to load old JSON
│   └─ backfill_embeddings.py           # Run if you add a new model later
│
├─ infra/                               # "How do I run the whole thing?"
│   ├─ docker-compose.yml               # `docker compose up` spins DB, Node, Python, UI
│   ├─ nginx.conf                       # If you put Nginx in front (optional)
│   └─ env/                             # `.env.example` files showing required secrets
│
├─ docs/                                # Your planning docs live here, version-controlled
│   ├─ ideation_collab.md
│   ├─ user_flow_1_editing.md
│   └─ …future specs
│
├─ db/                                  # DB migrations & seed data (Neo4j, Postgres, Vector DB). Run once, checked in so devs stay in sync
│
├─ jobs/                                # Nightly or one-off batch jobs (Airflow / Dagster DAGs, Spark scripts, long celery tasks)
│
└─ ops/                                 # Observability & infra – Grafana dashboards, Kubernetes manifests, Terraform. "How does it run in prod?"

- Each "app" (Node backend, React frontend, Python AI) lives in its own folder so you and your dev can work without stepping on each other's toes.
- The "contracts" folder is your shared handshake: it's how you both agree on what data to send/receive, so you don't need to read each other's code.
- "libs" are helpers, but only for their own language.
- "infra" is the glue that lets you run everything together easily.
- "docs" is where all your planning and specs live.

This setup keeps things organized, easy to grow, and lets each person focus on what they do best.