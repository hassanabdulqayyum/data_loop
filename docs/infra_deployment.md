                 ┌──────────────┐           (short-lived, stateless)
Browser  ───►    │    Vercel    │   React / Next UI
                 │ (api-server) │──┐
                 └──────────────┘  │  publishes JSON "jobs / events" over TLS
                                   │
                                   ▼
                         (public TLS URL)
┌──────────────────────────────────────────────────────────────┐
│     Managed Queue / Broker – Redis Streams (Railway add-on)  │
│     ─ Lives in same Railway project as the always-on pods    │
└──────────────────────────────────────────────────────────────┘
           ▲                                   ▲
           │ private, persistent               │ private, persistent
           │                                   │
┌──────────┴───────────────────────────────────┴───────────────┐
│                     Railway container set                    │
│                                                              │
│ • realtime-gateway   – keeps WebSocket sessions open         │
│ • event-bus          – subscribes to all queue events        │
│                         and republishes / archives           │
│ • metrics-collector  – crunches events → Prometheus / OLAP   │
│ • python-ai service  – FastAPI + Celery/RQ worker            │
│                         (heavy embedding, TTS, nightly jobs) │
└──────────────────────────────────────────────────────────────┘

Key points
• Vercel's Node functions only open a quick TLS connection, push a job, and exit.
• The queue add-on is permanently running inside Railway, so the Python worker, WebSocket gateway, and event-bus keep warm, low-latency connections.

<!-- ------------------------------------------------------------------ -->
<!-- TODO: USER FLOW 1 – IMPORT COMPLETION EVENT STREAM ---------------- -->
<!--
     We will publish a `script.import.completed` entry (fields: job_id, program_id,
     module_seq, day_seq, persona_id, importer, ts) to Redis Streams.  This
     allows downstream services (analytics, WebSocket gateway, diff worker, etc.)
     to fan-out from a uniform queue without persisting operational metadata in
     Neo4j.  Implementation will be tackled alongside API-server milestone M2.
-->