# Data-Loop Requirements

## Objectives
We're an AI lab that wants to speed up data iteration loop hence the name of the project.
1. Amount of improvement per iteration in terms of model improvement measured in user engagement (completion of days/modules)
2. Speed of each iteration measured in time (time between each production model update)

## Users
The users are both nontechnical psychologists who use it for data work and engineering team who use it for training data export and some data work too. The users include:
    - data team, nontechnical psychologists:
        - data work (SFT/RLHF) like creation of new scripts
        - rewriting current scripts
        - reviewing anonymous real user data for issues and improvements
    - product people:
        - reviewing rewrites and creations by the data team before training export
        - reviewing anonymous real user data for issues and improvements
        - adding suggestions for data team to implement
    - AI team
        - adding suggestions for data team to implement
        - creating training datasets based on latest versions completed by the data team and product people

## Parking Lot
- [ ] **DAG-based data structure:** every script training or anonymous real users data is a Directed Acyclic Graph
- [ ] **Version Preservation:** All previous versions are preserved; never deleted or overwritten.
- [ ] **Branching:** Edits, alternatives, what-ifs, or insertions create new branches. Any node can be branched from any prior node.
    - [ ] any user/assistant turn can be edited from the UI
    - [ ] if there's a need to add additional intermediate user/assistant responses, it can do that from the UI
    - [ ] at each turn, we'll add branching for RLHF preference dataset creation also from the UI
    - [ ] at each user message, we'll add logic to create alternate user responses for edge cases and then adding assistant response for the new user response from the UI
- [ ] **Commenting:** Any node can be commented multiple times by multiple users to facilitate rapid collaboration
    - [ ] Use `@` to tag other users in the comment to further speed up collaboration
    - [ ] Per-node threaded discussion for review, feedback, or debate.
- [ ] **Per-node Metadata:** Track author, timestamp, annotation status, ranking by users, ranking by LMs, etc.
- [ ] **Concurrent Editing:** Multiple users can work on different branches/nodes simultaneously.
- [ ] **Change/Audit History:** Full, immutable history of who changed what, when, and why.
- [ ] **Outcome-driven Learning Loop:** Feedback from training/evaluation is linked back to the node(s) responsible.
- [ ] **Incremental diff viewer:** Allow to quickly check what changed in this version to review only that and significantly speed up review and training data creation.
- [ ] **Graph-First Workspace:** Primary UI is an interactive DAG canvas; users read, edit, branch, and comment directly on nodes. Every user—data team, product, AI—works directly on the graph canvas itself. Each node is editable, comment-able, diff-able, and versionable in situ.
    - [ ] **Pan, zoom, and mini-map navigation** to explore large conversation graphs  
    - [ ] **Drag-and-drop branching:** grab any node’s edge to create a new branch on the spot  
    - [ ] **Inline node editing** (rich text / markdown) without leaving the canvas (aligns with DAG by creating a new node, not overwriting the original)
    - [ ] Version badges (v1, v2, …) shown on each node, with quick toggle to previous versions  
    - [ ] One-click “Compare Versions” diff overlay between any two selected nodes  
    - [ ] Status chips on nodes (draft, in-review, approved, rejected) with color cues  
    - [ ] **Script-level comments** supporting @mentions and emojis  
    - [ ] Real-time collaborator cursors and presence indicators for concurrent editing  
    - [ ] Keyboard shortcuts for rapid node creation, branch navigation, and search  
    - [ ] **Per-node metadata tooltip** (author, timestamp, annotation flags, scores along multiple criteria) on hover  
    - [ ] **Bulk actions:** select multiple nodes to assign to a role, suggest edits/goals/tasks, change status, export as dataset slice, edit metadata
    - [ ] **Preference-pair creator:** select two response nodes, click “Create Preference Pair”  
    - [ ] Contextual right-panel inspector that updates as you click nodes (shows content, diff, comments, approvals)  
    - [ ] **Autosave and offline-mode sync** to prevent work loss during connectivity issues
    - [ ] **Conflict-resolution UI** for concurrent edits on the same node (merge (will still create a new node) or choose version).
    - [ ] **Focus mode** – collapse everything except active lineage + its first-level children.
    - [ ] Edge styling to convey semantic meaning (primary storyline vs exploratory branch).
    - [ ] **Gold Path Selection:** Choose “best”/preferred paths or mark nodes for SFT dataset inclusion.
    - [ ] **Markdown rendering** with support for markdown export to create markdown-aware training data.
    - [ ] **Search & Discovery**
         – Full-text search across node content and comments.
         – Faceted filters on metadata (author, date range, status, tag).
         – “Find similar nodes” or semantic search to identify duplicates or reusable patterns.
- [ ] **Node view:**
    - [ ] **Lineage breadcrumbs**
        – Clickable path showing root → … → parent → current node, so users can jump up the chain  
        – Hover tooltip gives snippet and status of each ancestor
    - [ ] **Version timeline**
        – Scrollable list (v1, v2, v3 …) with timestamps and author avatars  
        – Selecting a version updates the content pane; shift-click two versions to open an inline diff
        - In “Version timeline” panels, show forks as a small tree rather than a flat list so users recognize a branch-point visually.
    - [ ] **Editable content panel**
        – Rich-text / markdown editor with autosave  
        – Toggle “view” vs “edit” to prevent accidental changes
    - [ ] **Children & siblings list**
        – Collapsible “Branches from here” section that shows immediate children and their status chips (draft, in-review, approved)  
        – Quick “+ Add Branch” button that focuses the canvas on a new child node
    - [ ] **Comment thread**
        – Node-specific discussion area with @mentions, emoji reactions, and resolve/close state  
        – “Jump to comment on canvas” link that pans to the node in graph view
    - [ ] **Comment resolution workflow** – mark comment thread as “actioned”, auto-update status chip.
    - [ ] **Metadata sidebar**
        – Author, created/updated timestamps, LM quality score, manual ranking, tags  
        – Toggle switches for “Include in next export” or “Mark as edge-case example”
    - [ ] **Preference-pair creator**
        – Select this node + one sibling to instantly produce an RLHF preference pair
        - AI-assisted pairs creation
    - [ ] **Path highlight toggle**
        – Switch dims all unrelated nodes in the canvas, spotlighting ancestors and descendants for context
    - [ ] **Keyboard shortcuts**
        – ↑ / ↓ to cycle through lineage; → / ← to move among siblings; V to open version diff; C for comment box
    - [ ] **Quick actions tray**
        – “Duplicate,” "Create preference pair,” "Comment," “Export subtree,” “Generate alternate response with LLM,” etc.
    - [ ] **Activity log**
        – Chronological list of edits, approvals, comments, shown inline or in a modal (“who did what, when”)
    - [ ] **Rich text diff** – highlight adds/dels within a paragraph, not just full-line changes.
    - [ ] Quick jump to “first usage in production model” or “highest-ranked child”.
    - [ ] **Dependency indication** – show whether a node is used in any exported dataset or model training run.
    - [ ] **Node-level checklist / tasks** (e.g. “needs SME review”, “needs grammar pass”).
        - [ ] AI-assisted checks whether the changes made achieve the task it intended to complete.
    - [ ] **AI-assisted completion/generation** for a node using the ancestory as the conversation history.
    - [ ] **“Run quality checks” button** (e.g. adherence to our own criteria for that step, response guidelines, length constraints) before approving a node.
    - [ ] Given a goal, the AI suggests it's own version alongside the human editors and human editors can select that to add a node.
    - [ ] **Intelligent Reviewer Routing:** AI recommends next task for each user—review, compare, generate, etc.—for optimal flow.
    - [ ] **AI-powered Suggestions:**
        - Surface likely improvements to prompts/responses.
        - Suggest new branches (e.g., “Would you like to try an alternative approach?”).
        - Suggest data that needs review or “hasn’t been preferred yet.”
        - Suggest markdown formatting to nodes content to improve readability and line breaks (will create a new version).
    - [ ] **Per-node Blueprint/Step Numbering:** Tag turns by workflow step, prompt template, or logic category.
– [ ] **Native export** to common RLHF/SFT data formats (JSONL, Parquet).
- [ ] **Phrase-deduplication guardrails**  
    – Nightly n-gram scan (e.g., 4- to 8-grams) across ALL scripts and versions.  
    – Any phrase whose frequency exceeds a configurable threshold (--dup_limit) is surfaced on a "Duplicates" dashboard and tagged on each offending node.  
    – Inline warning chip ("⚠︎ repeated phrase") appears while editing if the current text pushes that phrase over the threshold.  
    – One-click "View alternatives" opens a side panel suggesting synonyms or re-wordings generated by an LLM.  
    – Export pipeline blocks a branch that contains > _n_ overused phrases until they're resolved or whitelisted.  
    – Full audit trail: when a phrase is marked "keep", note approver & rationale (e.g., legal disclaimer must stay identical across scripts). 
- [ ] **Role-based permissions** (viewer / commenter / editor / approver).
- [ ] **Observability & Metrics**
    – Dashboards: average review turnaround, branch depth, % nodes with comments resolved.
    – Per-node lineage of model deployments (“first used in model v12, still active in v14”).
    – Lineage-linked performance dashboards – visualize improvement‐per-iteration by tying each node (or branch) to:
      • offline evaluation scores (BLEU, reward model score, rubric pass-rate, etc.)
      • live A/B or hold-out metrics (retention, completion, CSAT)
      • highlight which lineage paths contributed most to recent uplift
- [ ] **TTS for node content** to add a check where the editor gets to hear what it sounds like.
- [ ] **Archive** nodes to reduce clutter while still keeping them in the DB. No deletion to stay consistent with DAG philosophy.
- [ ] **Configurable stage-gated approval flows”**
    - Notifications & task routing
- [ ] **Data integrity & security**
    - End-to-end encryption of node content / comments for PII.
    - HIPAA compliance of the dataset plus all the external AI calls.
- [ ] Automated “similarity clustering” to propose deduplication or merge paths.
- [ ] **Frozen snapshot** of a subtree for reproducible training.
- [ ] **Performance & scalability**
- [ ] Smart Sizing & Storage
    - Per-script buckets – each Day/Script lives in its own mini-database table or file so we never scan more than we need.
    - Cold-storage after 90 days – untouched branches are zipped and moved to cheap storage; click once to revive them.
    - Map-style loading – the canvas only pulls in the part of the graph you can actually see, just like Google Maps.
    - Weekly “orphan sweeper” – a background job finds dead-end test branches and archives them (never deletes) to keep things tidy.
    - Switch on author-sharding later if editors start stepping on each other.
- [ ] “**Sticky-Note” Version Storage** – Every time someone edits a script, we keep just the tiny change (like a sticky note in the margin) instead of saving a whole new copy.
    - Drastically reduces storage.
    - Works perfectly with our DAG: each sticky note becomes a new node that points back to its parent.
    - Any version can be rebuilt by replaying the notes from the root to the leaf.



## Doc todos
- [ ] add current engagement ratio of day 1 to the first objective to kickstart tracking and measuring engagement.
- [ ] define must and optional metadata fields for both nodes and scripts.


## Glossary
- **Day** refers to one day/topic from our mindfulness interactive AI program
- **Module** refers to a single mindfulness skill that has number of days/topics under it
- Each day = 1 training **script** for a specific persona
- **Persona** refers to a specific type of user that comes to our mindfulness app for a specific goal to learn mindfulness