# Neo4j Catalog & Script-DAG Schema

> Updated: 2025-05-09  
> Maintainer: **Data-Loop Engineering** (<add contact>)  
> Purpose: Single-source specification for how our *program → module → day → persona* hierarchy and each persona's Script-DAG are represented inside Neo4j.

> **Key principle (2025-05-10 update):** Each script is modelled as one *directed-acyclic graph* where every turn/node stores **exactly one** backward-pointing `CHILD_OF` edge to its parent.  This single-edge scheme enables unlimited branching while keeping lineage queries trivial.

---

## 1. High-level picture

```text
(:Program) ──[:HAS_MODULE]──▶ (:Module) ──[:HAS_DAY]──▶ (:Day)
                                                        \
                                                         └─[:HAS_PERSONA]──▶ (:Persona)
                                                                                   \
                                                                                    └─[:ROOTS]──▶ (root)  ──▶ (system?)  ──▶ (user)  ──▶ (assistant)
                                                                                                         └─▶ (system v2?)
```

*   The **catalog** (Program → Module → Day → Persona) is very small — typically only a few thousand nodes — and lives in the same database as the large **Script-DAG**.
*   Each `:Persona` node keeps a *single* outgoing `:ROOTS` relationship that points to the root `:Turn` node of its DAG.  The rest of the DAG is discovered by following the chain of `:CHILD_OF` edges (every node knows only its direct parent).

> **Why this layout?**  
> • Keeps the catalog ACID-consistent with the DAG.  
> • Lets us query lineage, permissions and metadata in one hop without external JSON files.  
> • Adding a new persona or day is a single Cypher transaction.

---

## 2. Node labels & properties

The following bullet list replaces the previous table for readability and Git diff friendliness.

- **Program**  
  • Mandatory: `id` (UUID, unique), `name` (string)  
  • Optional:  `createdAt` (epoch-ms)  
  • Notes: Top-level container for a training programme (e.g. *Mindfulness 101*).

- **Module**  
  • Mandatory: `id`, `name`  
  • Optional:  `seq` (int – display order), `createdAt`  
  • Notes: Belongs to exactly **one** Program.

- **Day**  
  • Mandatory: `id`, `name`  
  • Optional:  `seq` (int), `blueprintStep` (string)  
  • Notes: Represents the *n*-th day/topic inside a module.

- **Persona**  
  • Mandatory: `id`, `name`, `seq` (int – display order)  
  • Optional:  `status` (enum `active` | `archived`), `createdAt`  
  • Notes: Target audience of the script (e.g. *"Gen-Z anxious student"*).  `seq` is mandatory so that personas are always stored with an explicit order, mirroring the requirement for Module and Day sequencing.

- **Turn**  
  • Mandatory: `id` (UUID, unique), `role` (`system` | `user` | `assistant` | `root`), `author` (string), `ts` (epoch-ms)  
  • Conditional-mandatory: `parent_id` (UUID) — *required for every node **except** the single anchor node where `role = 'root'`.*  
  • Mandatory for `system`, `user`, and `assistant` roles: `accepted` (bool, default **false** – except when a *canonical* script is imported via `import_google_docs.py`, where each imported turn starts with `accepted:true` to reflect its gold-path status); optional for the single `root` node.  Other optional fields: `embedding_id`, `embedding` (List<Float>, hot set only), `status` (e.g. `draft`, `approved`)  
  • Notes: One script ⇒ one *root* node (`role='root'`, `parent_id=NULL`).  Zero-or-more `system` nodes **may** hang directly off root, allowing multiple prompt versions or even none at all.  All `user`/`assistant` turns ultimately descend from either a `system` node or the root.  The deprecated `seq` integer field has been fully removed—ordering now relies on DAG depth (hop-count) and the `ts` timestamp, eliminating renumbering headaches.

> • `id` uniqueness is enforced by constraints (see §4).  
> • We store **either** `embedding` *or* `embedding_id` depending on hot/cold tiering.

---

## 3. Relationship types

Relationship definitions expressed as a concise bullet list:

- **HAS_MODULE**  — Program → Module (1-N)  · Meaning: Program contains modules.  
- **HAS_DAY**     — Module → Day (1-N)     · Meaning: Module contains days.  
- **HAS_PERSONA** — Day → Persona (1-N)   · Meaning: Day targets multiple personas.  
- **ROOTS**       — Persona → Turn (1-1) · Entry point of a persona's Script-DAG.  
- **CHILD_OF**    — *child* Turn → *parent* Turn (many-to-one)  · Standard edit, alternate branch, or revision; *must* point to an older node.  
- **(Others)**    — Relationships like `COMMENTED_ON`, `APPROVED_BY`, etc. for workflow & review metadata.

> **Important rule**: DAG relationships (`CHILD_OF`) must *never* create cycles ➜ always point to *older* versions.

> **Validation rules**  
> 1. Exactly **one** `Turn` node per script may have `role = 'root'`; this node must have `parent_id = NULL`.  
> 2. Every other node (`role ≠ 'root'`) **must** set `parent_id` and carry one outgoing `CHILD_OF` edge to that parent.  
> 3. No node may point *to* the root via `CHILD_OF`; the root's incoming degree is always **0**.  
> 4. `CHILD_OF` edges must point to an older node (`child.ts > parent.ts`) to guarantee acyclicity.

---

## 4. Schema constraints & indexes

```cypher
// === Uniqueness ===
CREATE CONSTRAINT program_id IF NOT EXISTS FOR (p:Program)  REQUIRE p.id IS UNIQUE;
CREATE CONSTRAINT module_id  IF NOT EXISTS FOR (m:Module)   REQUIRE m.id IS UNIQUE;
CREATE CONSTRAINT day_id     IF NOT EXISTS FOR (d:Day)      REQUIRE d.id IS UNIQUE;
CREATE CONSTRAINT persona_id IF NOT EXISTS FOR (per:Persona)  REQUIRE per.id IS UNIQUE;
CREATE CONSTRAINT turn_id    IF NOT EXISTS FOR (t:Turn)  REQUIRE t.id IS UNIQUE;

// === Lookup indexes ===
CREATE INDEX module_by_prog IF NOT EXISTS FOR (m:Module)  ON (m.seq);
CREATE INDEX day_by_module  IF NOT EXISTS FOR (d:Day)     ON (d.seq);

// === Sibling fetch / candidate ordering ===
CREATE INDEX candidate_by_parent_ts IF NOT EXISTS
FOR (t:Turn) ON (t.parent_id, t.ts);

// === Vector index (hot tier) ===
CREATE VECTOR INDEX turnEmbedding IF NOT EXISTS
FOR (t:Turn) ON (t.embedding)
OPTIONS {
  indexConfig: {
    `vector.dimensions`: 384,
    `vector.similarity_function`: 'cosine'
  }
};
```

> • Constraints guarantee global uniqueness of UUIDs.  
> • `seq` indexes make ordered UI queries fast.  
> • The vector index exists **only** for nodes that currently hold the `embedding` array.

### 4.1  Recommended CI tests

Add these smoke-tests to your pytest suite so any migration or seed-data change that violates the schema is caught immediately:

1. **Single root per persona** – ensure each `Persona` has exactly one outgoing `ROOTS` edge.
2. **Root uniqueness** – confirm exactly one `Turn` per script has `role='root'` and `parent_id IS NULL`.
3. **Root has no incoming `CHILD_OF`** – match any `CHILD_OF` → root; expect zero rows.
4. **Non-root requires parent** – query for turns where `role <> 'root'` **and** (`parent_id IS NULL` **OR** no outgoing `CHILD_OF`); expect zero rows.
5. **`CHILD_OF` acyclicity** – verify every `CHILD_OF` pair satisfies `child.ts > parent.ts`.
6. **`candidate_by_parent_ts` index exists** – `SHOW INDEXES WHERE name = 'candidate_by_parent_ts'` returns a row.
7. **System nodes are direct children of root** – for every `role='system'` node, ensure its parent has `role='root'`.

---

## 5. Example: creating a new persona with an empty script DAG

```cypher
// 1. Locate the parent day
MATCH (d:Day {id: $dayId})

// 2. Create the persona and root turn in the same tx
CREATE (per:Persona {
  id: randomUuid(),
  name: $personaName,
  status: 'active',
  createdAt: timestamp()
})
CREATE (root:Turn {
  id: randomUuid(),
  role: 'root',
  ts: timestamp(),
  status: 'draft'
})
// 3. Wire them up
CREATE (d)-[:HAS_PERSONA]->(per)
CREATE (per)-[:ROOTS]->(root);

// 4. Later: create a new assistant candidate that branches from a user turn
MATCH (parent:Turn {id: $parentId})
CREATE (child:Turn {
  id: randomUuid(),
  role: 'assistant',
  ts: timestamp(),
  author: $editor,
  accepted: false
})
CREATE (child)-[:CHILD_OF]->(parent);
```

---

## 6. Hot ↔ cold vector tiering rules

1. Any `:Turn` edited in the last 90 days **must** carry an `embedding` array and therefore remains part of the Neo4j vector index.
2. A nightly job removes the `embedding` property from older turns, writes its `embedding_id`, and upserts the vector into Pinecone.
3. When a cold node becomes active again, a background worker fetches the vector from Pinecone and re-adds `embedding`.

---

## 7. Glossary & conventions

| Term | Meaning |
|------|---------|
| **Catalog** | Lightweight hierarchy (Program → Module → Day → Persona) |
| **Script-DAG** | All `Turn` nodes + their `CHILD_OF` edges for one persona |
| **Root Turn** | First node (role = `root`) of a Script-DAG |
| **Gold Path** | Reviewer-approved lineage. At each fork, **one or more** child nodes may have `accepted = true`; the front-end chooses which branch(s) to surface based on UX rules. |

---

### End of file  
_Keep this document close to code; update it whenever the schema changes._ 