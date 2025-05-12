# Data-Loop Ideation – Collaborative Copy

> NOTE: This is a duplicate of the original `ideation.md` created for active collaboration. Feel free to propose edits and comments here; the original remains untouched for reference.

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
- AI team:
    - adding suggestions for data team to implement
    - creating training datasets based on latest versions completed by the data team and product people

## Glossary
- **Day** refers to one day/topic from our mindfulness interactive AI program
- **Module** refers to a single mindfulness skill that has number of days/topics under it
- Each day = 1 training **script** for a specific persona
- **Persona** refers to a specific type of user that comes to our mindfulness app for a specific goal to learn mindfulness

## Data-Loop Hierarchy

Below is the canonical path for **every piece of content** managed in Data-Loop:

```
Program
└── Module
    └── Day
        └── Persona / Script (DAG root)
            └── Turn-Node
                ├── role: user | assistant
                ├── version: v1, v2, … (each version = new DAG node)
                └── metadata: author, timestamp, status, etc.
```

## Backlog

### Data Model & Versioning
- [ ] **DAG-based versioning model:** Store every script as a Directed Acyclic Graph so each change (or branch for "what-if" edits, RLHF preference pairs, edge-case alternates, etc.) becomes a new node that points back to its parent. No version is ever overwritten or lost; any state can be reconstructed by replaying the chain from root to leaf. — ✅ pass 1 done
    - 🖥️ UI: Graph-first canvas with draggable nodes. Hovering a node reveals a "＋" button to create a branch, a comment button, an AI-Assist button offering predefined workflow actions, and a "⋯" menu for viewing/editing metadata. Shift/Ctrl-click enables multi-select; a toolbar or context action turns the selection into an RLHF preference pair (with AI-suggested pairs). Directed arrows show the action that produced the child node and display the author's name.
- [ ] **Version Preservation:** All previous versions are preserved; never deleted or overwritten. — ✅ pass 1 done
    1. I want to maintain all the work we have ever done on a specific turn user or assistant along with who did what so we have a full history,
    2. to promote versions retention for creating growing number of rlhf pairs, to review past choices, use them for source of inspiration and ideation for the latest version,
    3. maintain the comments, tasks, ideas per node that prompted us to make the change to that specific node so we build and maintain the FULL context that is missed in current approach.
    - 🖥️ UI:
        - **Canvas**
            - Tiny "latest-version" pill appears in the upper-right corner of each node and shows only the highest version number (e.g., "v7").
            - Only **one rectangle per node** is rendered on the canvas; all additional versions live in a collapsible timeline inside the Node Inspector.
            - Hovering the pill reveals a tooltip: "7 versions, last edited by Alice 2 h ago."
        - **Node Inspector** (shown when a node is selected)
            - Opens with the **Timeline** panel already visible.
            - Each timeline entry is formatted: "v3 – Bob – 2 h ago – status: approved".
            - Shift-click any two entries to open an inline diff view.
            - Each entry includes **Restore** and **Branch** buttons.
            - **Arrows View:** The inspector visualises arrows between versions/nodes that annotate what action occurred (e.g., *edited by Sarah*, *branched by Bob*) and who performed it—see reference image for example.
            - UX guardrails: unsaved edits in the commit turn the summary pill orange ("draft") until saved. Global search lets editors filter by commit text or branch-type (e.g., "all what-if branches by Bob last week").  

        - **Node inspector**
            - Arrows remain hover-only; the Inspector opens only when a node itself is selected.  
            - Default Inspector view shows:  
                – A small version-number pill (number only); hovering the pill reveals full version details in a tooltip.  
                – A "gold" badge if this node is designated as part of the gold path.  
            - Comments panel behaviour is TBD — we'll decide later whether it auto-opens and whether comments attach per-node or to a broader ancestor.

- [ ] **Branching:** Edits, alternatives, what-ifs, or insertions create new branches. Any node can be branched from any prior node. — ✅ pass 1 done
    - [ ] any user/assistant turn can be edited from the UI
    - [ ] if there's a need to add additional intermediate user/assistant responses, it can do that from the UI
    - [ ] at each turn, we'll add branching for RLHF preference dataset creation also from the UI
    - [ ] at each user message, we'll add logic to create alternate user responses for edge cases and then adding assistant response for the new user response from the UI

    1. branching means to create alternate routes for the tree from the parent node (user or assistant) to create infinite number of  
       - what if scenarios where the data person visualizes what would happen if the user/assistant said this instead  
       - edge cases quickly that routinely come up by user reviews, or inspecting the anonymous real user interactions with the model  
       - alternate versions to improve upon a node (user or assistant) that can also further used for RLHF  
       - additional turn pairs (user + assistant) from any user/assistant node effortlessly  
       And the label on the arrows of the branches helps show what change was made and who made it in the canvas first UI approach  
    2. for arrows, all three for now  
       - Free-text the author types when creating the branch?  
       - A drop-down of change-types (edit, what-if, RLHF pair, etc.)?  
       - Auto-generated (e.g., "edited by Sarah")?  
    3. always a new branch, following the DAG philosopy
    - 🖥️ UI:
        - **Canvas actions**
            - Hover affordance: hovering any node reveals a subtle "＋" handle on its right edge (always visible on the currently-selected node); the handle fades out 250 ms after the cursor leaves.  
            - Branch-first, decide-type-later: clicking or dragging the handle spawns a brand-new child node immediately, selects it, and opens inline-edit mode. The connecting arrow starts grey ("type pending").  
            - Optional drag gesture: dragging lets the user drop the new node anywhere on the canvas before release; result is identical—untyped child node, grey arrow.  
            - Quick type assignment: in the node inspector a pill "Branch type: <unset> ▾" opens a dropdown of branch types (Alternate, What-if, Edge-case, RLHF, Insert intermediate, …). Selecting recolors the arrow; AI suggestions surface likely types in future updates.  
            - Keyboard shortcut: ⌘/Ctrl +B creates an untyped branch from the selected node and focuses the editor; holding Shift while pressing opens the type dropdown first.  
            - Multi-select / bulk branch: lasso-select or Ctrl-click multiple nodes → floating "＋ Branch" toolbar; clicking spawns an untyped child for each node (arranged in a tidy grid).  
            - Visual feedback: grey arrow + dashed outline signal "type pending"; assigning a type recolors the arrow (yellow=alternate, cyan=what-if, magenta=edge-case, purple=RLHF, etc.). A toast reads "Branch created — Type unset (set later in inspector) · Undo".  

        - **Arrow labels & commit details**
            - Summary label placement & visibility: a tiny pill-style label sits centred on each arrow (e.g., "edited by Sarah"). The pill colour matches the branch-type colour theme (yellow, cyan, magenta, purple … – final palette TBD). The text pattern is _<action> by <author> at <timestamp>_.  
            - Hover card (read-only detailed commit): hovering an arrow opens a pop-over anchored at the arrow's mid-point. It shows author avatar, timestamp, branch-type badge, AI-generated summary sentence, and a "View in Inspector ↗︎" link. The pop-over auto-dismisses on mouse-leave; no clicks are required.  
            - Inspector editing flow: selecting the child node reveals a collapsible "Link from parent" panel at the top of the Inspector. It contains an AI-generated summary (single-line) and a detailed commit (rich-text / markdown). Both fields are fully editable inline and auto-save on blur or ⌘ S.  
            - AI auto-generation logic: on branch creation the backend diffs parent ↔ child, producing (1) a one-sentence summary (e.g., "Re-phrased greeting for brevity") and (2) a longer commit if the diff exceeds _n_ tokens or touches goal-tagged sections. If the parent node had open tasks/goals that are now resolved, the AI appends "✔︎ Resolved: <task>" to the detailed commit.  
            - UX guardrails: unsaved edits in the commit turn the summary pill orange ("draft") until saved. Global search lets editors filter by commit text or branch-type (e.g., "all what-if branches by Bob last week").  

        - **Node inspector**
            - Arrows remain hover-only; the Inspector opens only when a node itself is selected.  
            - Default Inspector view shows:  
                – A small version-number pill (number only); hovering the pill reveals full version details in a tooltip.  
                – A "gold" badge if this node is designated as part of the gold path.  
            - Comments panel behaviour is TBD — we'll decide later whether it auto-opens and whether comments attach per-node or to a broader ancestor.
            
        - **Diff / Compare panel**
            - Trigger: Shift-click any two _or more_ nodes (or versions in a node's timeline). A dedicated right-hand panel labelled "DIFF VIEW" slides in.  
            - The canvas stays visible on the left, preserving spatial context while you review changes.  
            - The panel shows inline word-level highlights (red = removed, green = added) and supports filters such as "All changes since last training."  
            - Navigation controls (↑ / ↓ or on-screen arrows) step through each diff if multiple versions are selected; Escape closes the panel.  
            - Action buttons like **Approve** / **Reject** live at the bottom; the Inspector collapses to a thin strip while the diff panel is open.

- [ ] **Frozen snapshot** of a subtree for reproducible training at node, script and dataset level. — ✅ pass 1 done
    - Link user engagement (measured in number of days completed in the app) back to each node that was used and that was not used, tracking both inclusion and exclusion to assess their impact.
    - Link the exact wording the model used in production to the specific training examples that were part of the snapshot, storing the exact text output by the model for each user interaction and mapping it to the relevant training data.
    - Link repetitions, issues, errors, and feedback to specific training examples that were part of the snapshot, supporting tagging or annotating these examples with outcomes and surfacing them in the UI for review.

### Data Export & Integration
- [ ] **Native export** to common RLHF/SFT data formats (JSONL, Parquet). — ✅ pass 1 done

### Collaboration & Review Workflow
- [ ] **Commenting system:** supports script-level and node-level threads, each with @mentions, emojis, and a resolution workflow. — ✅ pass 1 done
    - turn group level threads
        - This means keeping the entire context of what happened in the past at that turn group by all editors and other users
        - Also, the ability to reference a specific version with `@`
        - Also, the ability to reference a specific user with `@`
        - Also, create task for this turn group, suggest goal of what to change.
        - Having this entire context helps us add the discussion we do face to face manually to be saved in some amount inside the system
        - Helps the AI assist to check if all the comments are resolved and mark the task as complete
        - Add AI to add comments to the thread to add it's own suggestions.
    - script level threads
        - These are also important because each user is different and requires different way to answering, different considerations that need to be made on the go based on unique context
        - Suggest new learning new insights by the users for this specific user/persona
        - Comments that apply to the entire script and not just a specific turn group
    - notifications are given as part of the system
    - Resolution workflow:
        1. Open  
            - Default when the first comment or task is added.  
            - Anyone can pick it up or assign an owner with "@"  
        2. In-Progress  
            - Someone has claimed the thread via the "Start Fix" button or by pushing a new version that references the thread (auto-switch).  
            - Optional "Blocked" toggle appears if external dependency halts work.  
            - Notification: assignee + original commenter.  
        3. Needs Review  
            - The assignee marks "Ready for review".  
            - Pings the original commenter(s) and any @mentions.  
        4. Resolved  
            - A reviewer clicks "Resolve".  
            - AI double-checks: all tasks checked, no open sub-threads.
    - 🖥️ UI:
        - **Entry Points**  
            - *Turn-group hover:* Hover any node on the canvas (or any version row in the Node Inspector) → a chat-bubble icon fades in on the right edge; clicking opens the thread in the right-hand Comments panel.  
            - *Script-level:* A persistent comment icon sits next to the script title breadcrumb on the canvas; clicking shows the script-level thread in the same Comments panel.  
        - **Comments Panel**  
            - Slides in from the right; width collapsible.  
            - Each comment card shows avatar, name, timestamp; @user and @version appear as inline blue pills (hover → highlight the referenced version).  
            - AI suggestions use a bot avatar and collapse by default (click to expand).  
        - **Status Controls**  
            - Thread header displays colored badge: grey = Open, indigo = In-Progress, yellow = Needs Review, green = Resolved.  
            - Badge is clickable; dropdown lets authorized users advance or revert status.  
        - **Action Buttons**  
            - "Start Fix," "Ready for Review," and "Resolve" buttons inline with the badge (mirror the status workflow).  
            - Keyboard shortcuts: ⇧ F (Start Fix), ⇧ R (Ready for Review), ⇧ ✔︎ (Resolve).  
        - **Canvas Indicators**  
            - Nodes with open threads show a tiny badge (# of unresolved comments).  
            - Hovering the badge previews the latest comment.  
        - **Global Views**  
            - "My Threads" quick-filter in the sidebar lists all threads where the user is author/assignee/@mentioned, grouped by status.  
        - **Notifications**  
            - In-app toast + email/push on @mention or status change.  
        - **Accessibility**  
            - All controls keyboard-navigable; ARI
        - timestamp
        - ranking by human annotators, LMs of a specific version
        - version number
        - used in training data or not
        - other scores like for our internal blueprint for each day, response guidelines, other custom metrics.
        - turn speaker
        - word count
        - blueprint step number according to our internal blueprint
        - which persona it belongs to, persona number (only used for internal data), for anon real user data, maybe user id
        - Clarifications/decisions:
            - Rankings and scores can have multiple independent rating dimensions, not just one aggregate score.
            - LM scores store which model/version produced the score.
            - Training usage tracks dataset version(s) in which this node was included.
            - Persona vs user id use two dedicated, validated fields ("persona" from our controlled list, "anon_user_id" for real user data).
            - Extensibility allows arbitrary custom metric fields (key:value) for future needs.
    - 🖥️ UI: Metadata display & editing
        - Not shown on canvas or node inspector by default to avoid clutter.
        - User action reveals an **editable metadata inspector panel** inside the node inspector.
        - Canvas shows flags / notification badge counts (like iOS red badges). Clicking badge opens floating panel where each issue is clickable; clicking an issue jumps to the node inspector with only that specific metadata field shown for editing.
        - In the node inspector, if the selected node is the main (gold) node then the canvas workflow is also shown here.
        - Filtering and search will exist; specific design to be added later.
- [ ] **Concurrent Editing:** Multiple users can work on different branches/nodes simultaneously. — ✅ pass 1 done
- [ ] **Change/Audit History:** Full, immutable history of who changed what, when, and why. — ✅ pass 1 done
- [ ] **Incremental diff viewer:** Allow to quickly check what changed in this version to review only that and significantly speed up review and training data creation. — ✅ pass 1 done
    1. **Mid change:**
        - Help to see the changes made from last training version and see the current progress across one or multiple turn groups and make later changes till we have an acceptable version that passes for training.
        - If we have diff, automated checks by the LM for our special critera like internal blueprint, current tasks/goals for this dataset version, response guidelines, and so on, if the LM knew exactly what changed, we don't have to run every test again and also it would also help the LM to use far less *processing* to get to deltas and make decisions/suggestions/evaluations.
        - The flow that LMs do are also partially done by humans in the loop so that also applies here.
    2. **Post change:**
        - currently post-change, if there's a change made in a turn group or multiple turn groups, we have to read the entire script to review before we mark it go for training.
        - It would be so much more helpful if we knew exactly what changed since the last training version for certain turn groups and it would cut our review time post changes more than 2-3x.
        - This also helps with review from non-editors like product people who just review before the final go to make sure there's additional `eyes` and perspective on the new version and deltas.

    **Recommended handling**
    1. **Flag, don't force.**
        – Any turn group that follows a changed turn group in the same script gets a yellow "⚠︎ context-shift" badge.
        – Reviewers decide whether to open and update those nodes; nothing is blocked automatically.
    2. **Diff viewer cue.**
        – In the script-level diff panel, an "Impacted downstream nodes" sidebar lists those later turn groups.
        – Clicking a listed node pans the canvas there and opens its inspector (unchanged nodes appear side-by-side with their previous version so reviewers can scan quickly).
    4. **LM targeted tests.**
        – When the "Run targeted tests" button is pressed, the system sends both the changed turn groups and any downstream nodes still bearing a context-shift badge so the LM can check coherence end-to-end.

    This keeps us safe from hidden regressions while avoiding mandatory edits.

    - 🖥️ **UI:** Incremental Diff Viewer
        - **Canvas-level cues**  
            - Any node or **turn-group** that differs from the comparison baseline is outlined in **yellow** and carries a tiny "Δ" pill in its upper-right corner.  
            - Hovering the outline shows a tooltip: "Changed since v X — click V to view diff."  
            - Single-click selects as usual; press **V** (or click toolbar "Diff") to open the diff panel.  
            - **Shift V** on an empty canvas opens the **Script Diff** for the entire conversation.  
        - **Opening & closing**  
            - Diff opens as a **right-hand slide-in panel** (width resizable; remembers last size).  
            - ESC key or clicking the × in the panel header closes it and restores the inspector.  
        - **Node / Turn-group Diff Panel**  
            - Header shows version pills: "v 3 ⟷ v 7 ▾"; clicking either pill opens a switcher to pick *any* committed version.  
            - Shows **inline word-level highlights** (red = removed, green = added) with collapsible unchanged blocks.  
            - Footer actions: **← Prev / Next →**, **Run targeted tests**, **Create preference pair** (if two nodes selected).  
        - **Script-level Diff Panel**  
            - Left rail lists all changed turn-groups with avatar and "v a → v b" + timestamp.  
            - Selecting an entry focuses the content pane on that diff.  
            - Below, a yellow "⚠︎ Context-shift" section lists **Impacted downstream nodes**.  
            - Clicking a node pans the canvas there and opens an unchanged-vs-current side-by-side view; reviewers may multi-select and click **✔︎ Mark reviewed** to clear badges.  
        - **Automation hooks**  
            - **Run targeted tests** queues the LM to evaluate: (1) all changed turn-groups and (2) any downstream nodes still flagged with "⚠︎ context-shift."  
            - Button shows a spinner labelled "Running…" and then collapses into a green "Tests passed" or red "Issues found" pill.
- [ ] **Role-based permissions** (viewer / commenter / editor / approver). — ✅ pass 1 done
- [ ] **Configurable stage-gated approval flows** — ✅ pass 1 done
    - Notifications & task routing

### Interactive Canvas & Node View UI
- [ ] **Graph-First Workspace:** Primary UI is an interactive DAG canvas; users read, edit, branch, and comment directly on nodes. Every user—data team, product, AI—works directly on the graph canvas itself. Each node is editable, comment-able, diff-able, and versionable in situ.
    > Since this is a bigger item for item-wise review, we are doing subitems one by one.
    - [ ] **Pan, zoom, and mini-map navigation** to explore large conversation graphs  — ✅ pass 1 done
        1. large graphs is not limited; we can always zoom out to all or zoom in to just like four to six turn groups in the canvas view.  
        2. We can also define a standard view which is the four to six range.  
        3. for now, just desktop and every data person works from a larger curved monitor.  
        4. Always-visible mini-map (see inspiration image) with draggable viewport rectangle and click-to-jump.  
        5. Pan (mouse drag / space-bar drag) and Zoom (scroll-wheel, trackpad pinch, or Ctrl/Cmd ±) must stay buttery-smooth (≥ 60 FPS on typical curved-monitor setups).  
        - 🖥️ UI:
            - **Canvas Navigation**
                - **Pan:** click-and-drag empty canvas space or hold **Spacebar** + drag to move the view (hand-tool behaviour à la Miro).  
                - **Zoom:** mouse-wheel / track-pad pinch zooms smoothly around the cursor position; toolbar **＋ / −** buttons and a numeric slider (20 % – 400 %) live in the bottom-right corner.  
                - **Fit-to:** press **F** or click the "Fit to screen" icon to auto-frame the entire graph; **Shift + F** fits only the selected node(s).  
                - **Preset levels:** keys **1 / 2 / 3** jump to 25 %, 50 %, 100 % respectively; **0** returns to the last zoom before presets.  

            - **Mini-map (Miro-style)**
                - Docked top-left by default (160 × 110 px); drag to any corner to re-dock.  
                - Collapses to a tiny square when the cursor leaves for >3 s; hover or shortcut **M** re-expands.  
                - Shows a thumbnail of the full DAG; a translucent rectangle indicates the current viewport.  
                - Dragging the rectangle pans the main canvas; single-click anywhere jumps the view there.  
                - Scroll-wheel on the mini-map zooms the main canvas while keeping the same centre point.  
                - "Fit selection" and "Follow me" (live-cursor) buttons appear inside the mini-map header.  

            - **Zoom Toolbar & Shortcuts**
                - Vertical quick-access toolbar (bottom-right) contains: **Hand-tool**, **Select-tool**, **＋**, **−**, **Fit-to-screen**, **Toggle mini-map**.  
                - Tooltip on each icon shows keyboard shortcut on hover.  
                - **Ctrl/Cmd + Mouse-wheel** = zoom; **Spacebar** = temporarily switch to hand-tool; **M** = toggle mini-map; **⌘/Ctrl ＋ 0** resets to 100 %.  
                
    - [ ] **Inline node editing** (rich text / markdown) without leaving the canvas (aligns with DAG by creating a new node, not overwriting the original)  — ✅ pass 1 done
        - 🖥️ UI:
            - **Entry & Exit**
                - **Double-click** a node or press **Enter** to enter edit mode; the node gains a blue "editing" outline.  
                - **Esc** or click outside cancels; **Cmd/Ctrl + S** or losing focus commits changes.  
            - **Editor Surface**
                - A floating rich-text editor (TipTap) is absolutely positioned over the node rectangle; supports markdown shortcuts and toolbar buttons (B, I, link, list).  
                - The editor auto-expands the node box as lines wrap; connected arrows re-anchor in real time.  
            - **Versioning Flow**
                - On save, a **new node version** (v n+1) is committed; toast "v12 saved" appears.  
                - Unsaved edits render orange border and "Draft…" pill until committed.  
            - **Concurrency**
                - While editing, the node is soft-locked; collaborators see "Alice is editing…" overlay.  
                - Later upgrade path: live co-editing via CRDT.  
            - **Shortcuts**
                - **Cmd/Ctrl + B/I/U** formatting; **Shift + Enter** inserts soft break; **Cmd/Ctrl + Z/Y** undo/redo.  
            - **Autosave & Draft Recovery**
                - Autosave every 5 s; drafts persist in LocalStorage if the browser crashes.  
            - **Performance & Limits**
                - Maximum of three simultaneous inline editors open; idle editors auto-close after 2 min.  
                - Keeps ≥ 60 FPS with up to 15 active editors across a 5 000-node graph.
    - [ ] **Version badges** (v1, v2, …) shown on each node — hover reveals a pop-over listing the last three versions and a link to open the full timeline in the Inspector.  — ✅ pass 1 done
    - [ ] **Compare Versions (canvas diff overlay):** covered by Incremental Diff Viewer spec above — ✅ pass 1 done
    - [ ] **Status chips on nodes** (draft, in-review, approved, rejected) with color cues — ✅ pass 1 done
    - [ ] **Script-level comment thread (with resolution):** supports @mentions, emojis, and thread resolution — ✅ pass 1 done (already covered comprehensively in Commenting system above)
    - [ ] **Per-node metadata tooltip** (author, timestamp, annotation flags, scores along multiple criteria) on hover — ✅ pass 1 done
    - [ ] **Bulk actions:** Quickly perform the most common actions editors or reviewers need on multiple turn-groups—copy, change status, comment, edit metadata, suggest goals/tasks, assign to someone or a role, export as dataset slice. — ✅ pass 1 done
        - 🖥️ UI: Multi-select via cursor drag (lasso) or with keyboard modifier + click; detailed bulk-action toolbar UI will be defined in a future pass.
    - [ ] **Preference-pair creator (canvas):** multi-select any two response nodes anywhere on the graph and click "Create Preference Pair" to generate an RLHF preference pair. — ✅ pass 1 done
    - [ ] **Contextual right-panel inspector that updates as you click nodes (shows content, diff, comments, approvals)** — ✅ pass 1 done
        - **User-provided vision (verbatim):**
            - list of different standard views that can come up based on context:
                - Branching: I'm thinking to not have different parts that have same core DAG node addition like:
                    - Adding intermediate turn group
                    - create an edit/alternate version -> all the rewrite needs
                    - create what-if scenarios
                    - create a new version for RLHF that doesn't exist before
                - RLHF: using the different nodes of a turn group all yielded through branches can be used to create preference pairs, with auto suggestions by the AI
                - Scores and rankings across different dimensions that we define internally as our approach becomes more and more complex
                - Metadata view (currently it's discouraged in `per node metadata` but I'm thinking why not if we have a contextual panel. we can decide the final after completing the review stage.
                - Script level incremental diff view (already discussed before but now coming together)
                - Comments view
                - Chat view like talking to AI or other prompts, AI workflows to run - this I missed before but makes a lot of sense
                - lineage view
                - training outcomes metrics or other related things
                - etc. future addons
            - So first click open the inspector panel if it's not open. Maybe double clicking opens the node inspector which we previously said would use one click. But this item helps bring lot of the right panel things we have been talking about vaguely for comments, diff, metadata come into focus.
        - **Assistant thoughts (verbatim):**
            - High-level thoughts on your contextual right-panel concept:
            
            1. Intent-first over data-type  
               - Grouping the views by user goal (Branching, RLHF pairing, Reviewing scores, etc.) rather than by raw object type lets one panel serve radically different jobs without cognitive gear-shifts. Users mentally say, "I want to branch" or "I need a diff," not "Show me metadata."  
               - That also keeps the entry points predictable: the same shortcut or double-click always summons the panel; its contents then morph to match intent.
            
            2. Progressive disclosure & focus  
               - The panel can start in a slim "summary" mode—basic node info + the most common action(s) for that context. An inline "Expand" chevron (or hitting a hotkey) reveals the full toolkit for that view.  
               - For rarely-touched areas (e.g., lineage graph, training metrics) a secondary collapsible section keeps them one click away without crowding the core tools.
            
            3. Shared canvas interactions, divergent panel payloads  
               - Single click could continue to select a node and open the default "Content" inspector.  
               - Modifier+click (or a context-menu pick) shifts the same side panel to Branching, RLHF, Diff, etc.—no floating dialogs.  
               - This keeps muscle memory intact: canvas interactions stay lightweight; heavy lifting happens in the single, reliable anchor zone.
            
            4. Internal consistency, external flexibility  
               - Many of the listed views reuse common UI primitives—diff viewer, rich-text editor, table of scores, timeline list—so a component library for the inspector will amortise design effort.  
               - A pluggable panel framework (each view registers its nav icon, hotkey, and React component) lets future add-ons slot in without re-architecting.
            
            5. Node- vs script-level scope  
               - Some views (Branching, RLHF, Comments) are node-centric, while script-level diff or training metrics span the whole conversation. A breadcrumb or scope toggle at the top of the panel could switch context without closing it—avoids losing focus when moving from micro to macro tasks.
            
            6. Performance guardrails  
               - Because the panel will fetch a variety of heavy data (diffs, LLM suggestions, metrics), lazy-load each sub-view and cache results in memory so toggling between tabs feels instant.  
               - Content virtualization for long lists (scores, lineage) keeps panel scrolling silky even on huge graphs.
            
            7. "Talk to AI" integration  
               - Embedding chat inside the panel is smart: it inherits current selection as context automatically and can push results (e.g., rewrite suggestions, branch stubs) right back into the node canvas—tight feedback loop, zero copy-paste.
            
        - 🖥️ UI: Opens automatically on node-click and updates context when a different node is selected; width is user-resizable via a draggable edge; panel pushes the canvas over (fluid layout) instead of overlay; progressive disclosure—each section starts collapsed and expands via a chevron; quick-action buttons and hotkeys TBD.
    - [ ] **Focus mode** – collapse everything except active lineage + its first-level children. — ✅ pass 1 done
        1. faster navigation time is definitely the goal  
        2. reduced visual clutter is needed but this doesn't directly help a great deal since we don't show all the versions just the gold path  
        3. blur not needed since we only show gold path  
        4. focusing is done by clicking the node once  
        5. the right side contextual panel shows some starting view related to the node from where the user can choose different modes discussed in the contextual panel point  
        6. Since only the gold path is shown by default, focus is merely bringing the right zoom, firing up the contextual panel on the right, giving it a selected indicator like a color/glow TBDL.  
        7. I'm thinking also not show all the first-level children, just the gold version.  
        - Assistant add-ons:  
            1. *Canonical storyline first* – Gold-only focus keeps the canvas mental model clean; alternates surface only when explicitly requested.  
            2. Navigation speed vs. discovery friction – hiding children is a net win for clarity, but a tiny "＋ n" badge (or panel tab) can hint that alternates exist, preserving discovery.  
            3. Selected indicator – a subtle halo or 1-2 px color outline is enough once the viewport zooms; heavier treatments risk visual jank.  
            4. Contextual panel – auto-opens on click and can house a "Peers/Branches" tab so hidden children stay one click away.  
            5. Future extensibility – gold-only mode keeps collaborator cursors and real-time noise down; an "Explore" toggle can temporarily lift the curtain for advanced workflows.
    - [ ] Edge styling to convey semantic meaning (primary storyline vs exploratory branch). — ✅ pass 1 done (deferred until multi-branch view)
        - Rationale: In the current gold-only canvas there is only a single edge category, so extra styling adds no information. When an "Explore/Show branches" mode displays multiple edge types, a dedicated styling system will become valuable.
    - [ ] **Gold Path Selection:** Choose "best"/preferred paths or mark nodes for SFT/RLHF dataset inclusion. — ✅ pass 1 done
        1. If we already showing the gold path, so that's the default.  
        2. The gold status is part of the metadata and can be done from the right side contextual panel in node/canvas view.  
        3. Scoring/rankings will be there but final choice will be humans of deciding gold.  
        4. The previous training data paths can be alternative paths which can be triggered if wanted from the contextual menu if the user wants, that seems useful.  
        5. Also we need to keep in mind that multiples branches can be in training, yes, because the model needs to be able to handle that so maybe multiple golds in a given turn group, yes that makes sense.  
        6. Then, there can be other views like AI suggested paths that are better options etc. things like this.  
        - Assistant add-ons:  
            1. Gold is a metadata flag, set/unset via the contextual panel; no extra canvas noise.  
            2. Default canvas acts as a gold-only lens; Gold Path Selection is essentially a filter plus a toggle.  
            3. Multiple golds per turn-group allowed; UI indicates counts (e.g., "×2").  
            4. AI may suggest gold nodes, but human approvers make the final commit.  
            5. Historical gold nodes remain discoverable through a quick filter for audit / rollback.  
            6. Promotion flow: pick alternate → view scores → tick "Gold" → node appears on canvas; audit logged.  
            7. Permissions: only users with Approver role can toggle gold; actions are audit-logged.  
            8. Success metrics: faster dataset prep, clearer reviewer focus, traceable training inclusion.
    - [ ] **Markdown rendering** with support for markdown export to create markdown-aware training data. — ✅ pass 1 done (core rendering already in markdown, implementation straightforward)
    - [ ] **Search & Discovery** — ✅ pass 1 done (canvas-integrated; details to be refined in later pass)
         – Full-text search across node content and comments.
                - Search results can be highlighted and the others blurred when a query is inputted in the canvas view.
         – Faceted filters on metadata (author, date range, status, tag).
         – "Find similar nodes" (powered by nightly similarity-clustering) to surface duplicates or reusable patterns.
- [ ] **Node view:**
    - [ ] **Lineage breadcrumbs**
        - the entire path upto the first ancestor is shown, and accessible from the breadcrumb, which can be placed on the canvas top, the top bar or the contextual right side panel. This helps speed and navigation. Less zoom/pan.
        - The full lineage will be shown in the lineage view that will be designed as one of the standard contextual panel view.
        - Hovering on a specific breadcrumb item gives the turn groups content snippet without jumping there plus its status and maybe additional details TBDL.
        - **Q&A**
            1. "first ancestor" = the root DAG node for the script.  
            2. Handling extremely long paths TBDL.  
            3. Clicking a breadcrumb zooms and centres the canvas on that node.  
            4. Tooltip shows full turn-group content snippet (no truncation) to allow specific reference.  
            5. No right-click/context-menu actions for now.
    — ✅ pass 1 done
    - [ ] **Version timeline**
        - The node inspector main view shows the version timeline by default like turn groups are shown for the canvas view.
        - **Overall layout**
            - Center spine = chronological order (newest → oldest, top-down).
            - Each card is a node version and the first the immediate parent.
                - parent is needed as current turn group depends on it and we as data team need that constantly in front of us also in the node view if we are comparing two or more siblings so we'll pin it to the top as a fixed block with full content rendered by default.
                - When you scroll, the parent card stays sticky on the top.
            - Cards alternate left / right to maximise horizontal room for text.
            - Right-hand contextual panel (comments, metadata, tests, AI chat with option for generation/completion/rephrasing etc., ranking/scoring) remains a separate column—nothing changes there.
            - Follows the "text in front of us" requirement by showing the full text for:
                - the gold versions (sft and rlhf)
                - latest written version
                - those that have comments that are unresolved/tasks pending
                - the last training data version.
                - all those that are between the latest and the last training data version since that are the most relevant for the current review and also for diff view.
            - The rest of the versions can be just smaller cards by default without the context showing.
            - Diff view can be showed here in the main view by a certain action TBDL. No need for it to be in the contextual menu anymore.
            - + button sign showing for branching options on each version card (alternate, what if, etc.) and clicking it copies that versions content to the new node.
            - Content editing can be done inline for any version that will be saved as a new version or this may be turned off since + provides everything need.
            - When in content editing mode, using inline or `+`, it shows the text editor in the contextual menu with markdown styling, AI chat/gen/completion/rephrasing option, and after submitting the AI runs the tests in the contextual panel vertically positioned in sequence with description next to the circle:`O-O-O -> tick-O-O -> tick-tick-failed`
            - Also maybe show the next gold child of the next turn group at the bottom since that is also relevant but how, that TBDL.
            - I'm thinking of pruning certain versions from the timeline view which means archiving those with very small diffs between two versions and keeping them out of the version timeline (still be kept in archive and the DB and will be a part of the full DAG, never deleted), this will be necessary if there are multiple one word edits or edits with only a single word is bolded. Exact specific TBDL.
    — ✅ pass 1 done
    - [ ] **Editable content panel**
        – Rich-text / markdown editor (leverages global autosave/offline-sync) — ✅ pass 1 done
    - [ ] **Children & siblings list**
        - Only gold direct children are displayed, each with full text rendered (same card style as the pinned parent) to provide maximum context when reviewing the current node.
        - Quick "+ Add Branch" button remains; clicking spawns a new child and focuses the canvas there.
    — ✅ pass 1 done
    - [ ] **Turn group-level comment thread (with resolution):** Turn group-specific discussion area with @mentions, emoji reactions; can be marked "actioned" to auto-update status chip; includes "Jump to comment on canvas" link that pans to the node in graph view — ✅ pass 1 done
    - [ ] **Metadata sidebar**
        – Author, created/updated timestamps, LM quality score, manual ranking, tags  
        – Toggle switches for "Include in next export" or "Mark as edge-case example"
     — ✅ pass 1 done
    - [ ] **Preference-pair creator (inspector):**
        - select this node + one sibling to instantly produce an RLHF preference pair (AI can suggest likely matches).
        - also an option button to create preference pair either in the node inspector or the right contextual panel, TBDL.
        - Also all multiselect feature support this as one of the options.
        - AI can also suggest preference pairs when the RLHF button is clicked.
        - This also can be a standard follow up from the AI model to create a preference pair after either completing the latest version or after changing the gold version, exact specifics TBDL.
    — ✅ pass 1 done
    - [ ] **Path highlight toggle**
        - Switch dims all unrelated nodes in the canvas, spotlighting ancestors and descendants for context
        - One-click (or keyboard shortcut) switch that temporarily applies a visual filter to the canvas.
        - The filter keeps the currently-selected node fully opaque and brightly coloured, plus every ancestor and every descendant along that lineage.
        - All other nodes and edges on the canvas drop to, say, 20–30 % opacity (or a greyed-out monochrome), effectively dimming the background noise.
        - Switching the toggle off restores the normal colour scheme.
        - Why it's useful:
            - Cognitive load – even with gold-only view, a long script can span dozens of nodes. Being able to "shine a torch" down the active path helps reviewers orient instantly.
            - Review & diff workflows – when you come out of a diff or comment thread, toggling path-highlight re-centres context without having to manually pan/zoom or mentally trace edges.
            - Fits into bulk-action flows – if you lasso-select the highlighted nodes you can run "Export subtree", "Create preference pairs", etc., all without worrying about stray branches.
            - Complements "Focus mode" rather than replacing it: Focus mode collapses/hides everything except the core lineage; path-highlight is a lighter, instant overlay that can be used ad-hoc without changing layout.
    — ✅ pass 1 done
    - [ ] **Keyboard shortcuts (inspector):** ↑ / ↓ cycle lineage; → / ← move among siblings; V diff; C comment box — ✅ pass 1 done
    - [ ] **Quick actions tray** 
        – "Duplicate," "Create preference pair," "Comment," "Export subtree," 
        – "Generate alternate response with LLM"  _(AI-assisted completion/generation using the node's ancestry for context)_
        – … etc.
    — ✅ pass 1 done
    - [ ] **Activity log (node scope):** inline view of the global Change/Audit History filtered to this node/branch (edits, approvals, comments, timestamps).
        - Place the Activity Log in its own tab inside the right-hand contextual panel.
        - Provide lightweight cues in the timeline spine—e.g., a tiny clock-icon badge on each version card showing the count of audit events for that commit; clicking the badge auto-switches the right panel to the Activity tab and scrolls to that timestamp.
     — ✅ pass 1 done
    - [ ] **Rich-text diff (node inspector):** inline diff view that highlights word-level adds/dels for the selected version pair. Shown in the node view/version timeline when toggled on.
    — ✅ pass 1 done
    - [ ] **Quick jump** to "first usage in production model" or "highest-ranked child". Most likely would be from the contextual right panel. Exact placement TBD.
    — ✅ pass 1 done
    - [ ] **Dependency indication**
        - show whether a node is used in any exported dataset or model training run, evaluation set, preference-pair participation,
        open tasks/comments, duplicate-phrase flag etc.
    — ✅ pass 1 done
    - [ ] **Turn-group checklist / tasks** (e.g. "needs SME review", "needs grammar pass"): A lightweight, structured way to capture "work still required on this specific turn-group" so nothing slips through the cracks before it becomes gold / training data. Comments are great for discussion; check-list items are explicit, trackable commitments. These are mainly suggested by other human editors, reviewers and AI can be later included if decided.
        - Default scope = entire turn-group. An advanced toggle may pin a task to a single version, but that is not the common case.
        - AI can help auto-convert comments into tasks and maybe also assign to someone since every task should have an owner, exact implementation TBD.
        - Given a task, the AI suggests it's own version alongside the human editors and human editors can select that to add a node.
        - AI-assisted checks whether the changes made achieve the tasks it intended to complete.
    — ✅ pass 1 done
    - [ ] **Automated AI-assisted Run quality checks before commit** (e.g. adherence to our own criteria for that step, response guidelines, length constraints) before approving a node for commit. — ✅ pass 1 done
    - [ ] **Intelligent Reviewer Routing:**
        AI recommends next task for each user—review, compare, generate, etc.—for optimal flow. In short, Intelligent Reviewer Routing becomes the “traffic controller,” ensuring the right eyes land on the right nodes at the right time, maximising iteration speed and reviewer focus while minimising idle queue backlogs.
        - Eliminate “what should I work on next?” dead-time.
        - Balance workload among editors/reviewers according to expertise, role, and current queue.
        - Surface high-priority or blocking items (e.g., nodes that gate a training snapshot) before long-tail cleanup work.
        - High-impact lineage (in production, heavy user traffic, high reward-model gain).
        - Past expertise (modules, personas previously edited, high approval acceptance rate).
        - If a reviewer has just finished a task inside the same script, prefer routing follow-ups in that vicinity to maintain mental context.
        - After saving a new version with unresolved checklist items, the system auto-creates a “Needs Review” task and routes it to an approver.
        - When two nodes are selected and “Create preference pair” is clicked, a follow-up task “Rank this pair” is spawned and routed to a human labeler.
        - QA tasks generated by “Run quality checks” (if they fail) are routed to the original author first, then escalate after 24 h.
        - Future bells & whistles
            - Reinforcement-learning ranking: model learns which recommendations users accept or reassign.
            - Calendar-aware batching: group tasks so a reviewer can breeze through 10 diff approvals in one sitting.
            - Cross-tool hooks: push tasks to Slack / Teams if idle for > Y minutes.
    — ✅ pass 1 done
    - [ ] **AI-powered Suggestions:**
        - Surface likely improvements to prompts/responses.
        - Suggest new branches (e.g., "Would you like to try an alternative approach?").
        - Suggest data that needs review or "hasn't been preferred yet."
        - Suggest markdown formatting to nodes content to improve readability and line breaks (will create a new version).
        - Auto fix grammar, markdown and formatting mistakes.
        - On submission, check whether the new version meets the tasks/checklist compared to the old before it can be accepted, if not, the user is asked to fix before submitting.
        - Suggest turn groups that require fixing duplication highlighted in the last nightly run.
        - On submission, autorun tests like blueprint, response guidelines, subtext etc. in the right panel before it can be accepted.
        - Parse new comments; offer “Convert to checklist item → assign to @Alice.”
        - Tone matching: If assistant response tone differs sharply from preceding user tone, suggest softening/energising wording.
        - “Edge-case gap finder”: compare the current node’s persona + scenario matrix to coverage heat-map; propose new branches for missing combos.
        - Preference-pair suggester: after any edit, AI surfaces 1–3 sibling nodes that would make useful RLHF pairs (“large semantic delta, same intent”).
        - Negative test generator: proposes adversarial user turns (negation cases) to branch from this node for robustness data.
        - Diversity dial: warns when a node’s phrasing is too similar to high-frequency n-grams or "flagged words/phrases" in existing dataset; offers varied re-phrasings.
        - Interactive diff explanation: highlights why a change matters (e.g., “removes duplicated phrase previously flagged in nightly scan”).
        - Context-aware rewrite palette: offer multiple rewrite styles in a single click—“shorten”, “add empathy”, “increase formality”, “coach-like tone”, etc.
        - Coherence checker across turns: when a node is edited, AI scans the next 2-3 downstream gold nodes and flags wording that now feels out-of-sync; one-click “Rewrite to re-align context”.
        - While typing, highlights passages that would fail your blueprint checks (tone, length, prohibited phrases) and offers inline fixes before you even press Save.
        - Structured prompt helper: If a node follows a multi-slot prompt template (e.g., greeting, empathy line, instruction, example), AI shows placeholders and autocompletes missing slots.
        - Interactive persona voice coach: Side-panel chatbot explains why a wording tweak better matches the target persona, teaching editors to fish instead of always taking the suggestion verbatim.
            - Detect divergence from persona voice or response-guideline rubric (“sounds too formal for ‘Gen-Z Mindfulness’ persona”).
            - One-click “Rephrase in target tone” chip appears beside the highlighted sentence.
        - “What would production say?” simulator: Runs the latest production model against the current user turn and shows the live model response side-by-side; AI then suggests edits that close the gap or intentionally diverge.
        - Automated diff explainer: Converts a raw word-level diff into a human-readable summary: “Condensed intro, removed repeat definition of mindfulness, added gratitude example (-37 tokens).”
        Preference-pair recommender
        - On any new child, AI scores semantic distance to siblings; if a good RLHF pair exists, a toast says “Pair v7 with v5?” → one click creates preference pair.
        - Production-gap closing: Runs latest prod model on current user turns; if model output diverges strongly from gold responses, AI suggests edits or additional branches to reconcile.
        - Conversational interface in the right contextual panel: “Ask AI → How can I shorten this?” and the chat returns rewrites.
    — ✅ pass 1 done
    - [ ] **Per-node Blueprint/Step Numbering:** As a mindfulness AI coach, we have a standard blueprint that is used to guide the conversation while maintaining high flexibility to human nuances, user queries, prioritizing therapeutic alliance over structure, user persona etc.
        - Since some turns do not follow the pattern, we keep repeating the current blueprint step number. This can be assisted by AI.
        - Also here use the workflow for step numbering we have built using the AI. For any step, it checks:
            - Do the next step
            - Stay on the current step (user step number till it completes)
            - What the coach should and shouldn't do here, like stay here and don't ask them to complete the step if the user is overwhelmed and doing so would break therapeutic alliance.
        - Based on the checks, it creates a unique "blueprint" criteria for this step that doesn't fit into the standard ones so the blueprint scoring is correct later on in tests ran by the AI prior to submission.
        - New metadata field on the turn-group node:
            - blueprint_step_id (string, ex. “05”, “07b”, “L-Intro”)
            - is_repeated_step (bool) → true when we intentionally reuse previous step number.
    — ✅ pass 1 done
    - [ ] **TTS for node content** to add a check where the editor gets to hear what it sounds like.
        - This can be most useful when one finishes writing a new version so we can add it to that workflow and it's recommended for all editors to do this after writing a version or even intermediate drafts before committing.
        - Then, it can be added to AI chat view in the right contextual panel TBDL.
        - Also, it can come in handy when comparing different versions so should be shown in diff view.
    — ✅ pass 1 done

### Observability, Metrics & Outcomes
- [ ] **Observability & Metrics**
    Provide near-real-time, end-to-end visibility from the moment an editor creates a node all the way to downstream user behaviour so we can a) shorten iteration time and b) verify that each iteration improves real-world outcomes.
    - **Anchor on the two North-Star questions**
        A. “How fast does any given node travel from ✍️ first-draft → ✅ approved → 📦 training snapshot → 🤖 production model?”
        B. “Did shipping that node (or branch) actually improve real-world outcomes (engagement, retention, CSAT)?”
    Everything below either shortens A or strengthens confidence in B.
    - Why we need it
        - The entire project is predicated on shortening a closed-loop learning cycle.
        - Without real-time visibility into (a) how fast each stage runs and (b) whether those stages actually move the needle on end-user behaviour, we can’t know if iteration speed or data quality is improving.
        - Observability therefore becomes the nervous system that ties every other backlog item together: DAG versioning, snapshotting, reviewer workflows, AI-assisted checks, etc.
    - **Metrics**
    A. Iteration speed
        - How long does it take a script/node to travel from “first draft” → “approved” → “in training set” → “in production model”?
        - Where are the bottlenecks (waiting on review, waiting on AI tests, etc.)?
        - Editor productivity
    B. Iteration quality
        - Did the new model snapshot that included node X actually improve downstream user behaviour (engagement, retention, CSAT)?
        - Which lineage paths / branches contributed most to that uplift or regression?
    - Guiding principle: “If it moved, log it. If it was logged, link it to outcomes.”
    - How to capture it: Event-sourcing approach: each action emits a JSON event to a message bus.
— ✅ pass 1 done
- [ ] **Dashboards:** average review turnaround & increase in real user engagement (our two key objectives)
    - Single source of truth
        - Every metric should derive from the same event stream we already plan for audit/observability.
        - No hand-entered numbers—everything is emitted automatically by the system.
    - For KPI1: measure cycle time between the last training version and the new gold per turn group and use it in the right contextual panel in canvas and node inspector/version timeline.
    - For KPI2: measure engagement for each user for each day - % of users who came back for day 2 OUT OF total who at least sent one message and read the assistant response for this model version.
    - Every chart should answer a question someone actually asks several times a week, e.g. “Where is my script stuck?” or “Did last Friday’s snapshot lift Day-2 retention?”
    - 1-click path to action: Any spiking metric should let you drill straight to the exact node(s) or reviewer queue causing it.
— ✅ pass 1 done
- [ ] **Outcome-driven Learning Loop:** Feedback from training/evaluation is linked back to the node(s) responsible.
    - The same event stream enables future ML (e.g., learning which edits predict engagement uplift).
    - In real user scripts, log the actual messages with the blueprint step number where the user drops out and link it back to the node responsible.
    - Automation-first, human-in-the-loop: Surface why a node hurt/helped; generate a suggested fix or branch; let humans accept or iterate.
    - Bidirectional feedback: Model ➝ User ➝ Metrics ➝ Node ➝ Reviewer in < 24 h; otherwise the loop is too slow to act on.
    - Source-of-truth lineage: every production token must be traceable back to the exact training node(s) that taught it.
    - Production telemetry
        - Per-turn engagement: read receipt, dwell-time, user reply length, sentiment, reply rate.
        - Day-x retention / completion flags.
        - CSAT thumbs-up / open feedback text.
    - 🚀 Green or 🔻 red pill on nodes with statistically-significant uplift/regression (> 2 σ). Hover shows metrics; click opens diff vs previous gold.
    - AI Suggestion memory: LLM prompt bank stores patterns of successful rewrites (“shorten intro”, “add concrete example”) and surfaces them earlier next time similar regression appears.
    - Suggest which specific real user personas have lower retention compared to others.
    - Treat every production message as an experiment by checking what happens next. Here we don't look what caused it. We just ask did it work?
        - **Method 1** by linking it back to the certain nodes in the snapshot.
            - Layman's explanation:
                1. Imagine every assistant reply the end-user sees as a “coupon” that tells us two things:
                    - which recipe page (training nodes) the model mostly used to cook that reply, and
                    - how the diner (real user) reacted—did they take another bite (keep chatting), leave a tip (👍), or push the plate away (drop off)?
                2. If we can staple the coupon back onto the recipe book, editors instantly know which pieces of training data are making customers happy or unhappy—and can rewrite exactly those pieces instead of guessing.
            - Is it doable, given the model is probabilistic? Yes—because we don’t need a perfect causal map, just a good-enough signal that focuses human attention. Three practical layers:
                - Snapshot ID (guaranteed).
                    - Every time we train a model we stamp it with a unique snapshot hash.
                    - All production logs already know “response X came from model hash Y”.
                    - So at minimum we trace back to the set of nodes that fed that snapshot.
                - “Nearest-recipe” attribution (cheap & 80 % useful).
                    - Keep all training nodes in a vector index (embeddings).
                    - For each production response, grab the top-k closest nodes by cosine similarity.
                    - Tag those nodes with the user’s outcome signal (👍/👎, churn, dwell-time, etc.).
                    - Over thousands of messages the noisy, probabilistic nature averages out—patterns emerge.
                - Token-level influence (advanced, optional).
                    - Techniques like log-prob gradient attribution or “influence functions” estimate which training examples most affected a specific token.
                    - More compute-heavy, but you can batch-compute offline for the worst-performing responses only.
        - **Method 2** another way to make each message an experiment is by linking it forward to per-turn engagement metrics. Here instead linking it back to the source, the idea is to use the message as a node itself which is judged by what the user does next.
            - This differs from Method 1 (attribution back to training data) because here we treat the production message itself as the experiment—we don’t care why the model said it; we just ask did it work?
            - Think “cause → reaction” at the finest granularity.
                - The assistant says something (the “treatment”).
                - We simply watch what the user does next—keep reading, reply eagerly, go silent, quit the session, rate thumbs-up, etc.
                - The difference between “what usually happens” and “what happened this time” is our rough measure of success or failure for that single message.
            - No blame game, just empirical feedback.
                - We don’t have to know why the user behaved differently; we just capture that they did.
                - Over many conversations the platform builds a scoreboard of which wording patterns, tones, or blueprint steps tend to nudge users forward and which ones stall them.
            - Complements lineage tracking.
                - Lineage tells us “this production token came from training nodes A, B, C.”
                - The micro-experiment view tells us “when the model emitted token X in context Y, the user stuck around (or didn’t).”
                - Together they close the loop: we can later go back to the lineage nodes that most often precede drop-offs and target them for rewriting.
            - Why it’s practical.
                - The signals we need (read receipts, response latency, follow-up length, sentiment, retention to next day) are already common app analytics events.
                - We’re not running A/B infra per message; we’re just labeling every message with its natural outcome and aggregating patterns afterwards.
                - This keeps the cognitive load low—editors don’t think about experiment design; the platform passively learns from real usage.
            - What “success” looks like.
                - Editors can open a node and see a simple badge: 🚀 “Messages like this boost next-turn engagement by +8 % on average” or 🔻 “−5 % retention”.
                - A nightly digest might say: “Top three phrasing patterns that lost users after greeting—consider rewriting these gold nodes.”
    — ✅ pass 1 done
            
### Storage, Performance & Scalability
- [ ] **Performance & scalability**
    - **Sticky-Note Version Storage** – Every time someone edits a script, we keep just the tiny change (like a sticky note in the margin) instead of saving a whole new copy.
        - Drastically reduces storage.
        - Works perfectly with our DAG: each sticky note becomes a new node that points back to its parent.
        - Any version can be rebuilt by replaying the notes from the root to the leaf.
    - Cheap semantic diff pruning
        - If two consecutive versions differ by ≤ k characters and no metadata changed, automatically mark the newer one “archived-by-dedup” so it’s skipped in default timelines but still queryable.
    - Content-addressable chunks
        - Split large texts into 4-8 KB chunks, hash each; reuse identical chunks across versions/scripts.
        - Great for phrase-level dedup without complex diffing.
    - React-Window style list virtualization
        - For version timelines or activity logs; renders only visible rows to keep 60 FPS.
    - Write-behind vector store
        - On commit, enqueue a job that computes the node embedding and use a DB that support vector store like neo4j.
        - Keeps save latency predictable; allows semantic dedup & similarity queries.
        - Only do this for the successful submissions and not for drafts.
    - AI
        - Use smaller/cheaper models for easier tasks and bigger models for more difficult ones.
        - Limit the number of new tokens based on the type of task and also make sure in the prompt.
        - Reserve the paid API only for tasks where the local model’s quality isn’t good enough.
        - Use appropriate models based on the latency requirements of the different tasks. Some tasks can be done nightly so don't require fastest serverless inference. Could reduce costs while also keeping serverless for time-critical generations.
        - Diff view is used by the browser not the AI.
        - Use AI costs tracking to monitor the costs of outbound calls.
    “Hot vs Cold” memory: Keep the stuff editors touched in the last week in fast memory or SSD. Everything older lives in cheap storage (think S3 Glacier). If someone clicks an ancient node we just pull it back on-demand.
— ✅ pass 1 done
- [ ] **Autosave & offline-sync:** all canvas edits are auto-saved locally and synced when online — ✅ pass 1 done
- [ ] **Smart Sizing & Storage**
    - Per-script buckets – each Day/Script lives in its own mini-database table or file so we never scan more than we need.
    - Cold-storage after 90 days – untouched branches are zipped and moved to cheap storage; click once to revive them.
    - Map-style loading – the canvas only pulls in the part of the graph you can actually see, just like Google Maps.
    - Weekly "orphan sweeper" – a background job finds dead-end test branches and archives them (never deletes) to keep things tidy.
    - Switch on author-sharding later if editors start stepping on each other.
— ✅ pass 1 done
- [ ] **Archive** nodes to reduce clutter while still keeping them in the DB. No deletion to stay consistent with DAG philosophy. — ✅ pass 1 done

### Security & Compliance
- [ ] **Data integrity & security**
    - End-to-end encryption of node content / comments for PII/PHI.
    - HIPAA compliance of the dataset plus all the external AI calls WITH BAA agreement with the provider.
    - ALWAYS use anonymized data by masking the details that could identify the individual when viewing.
    - Never use real user data for training. Against values and also causes degradation in model performance -> regurgitating.
    - Route prompts through a reversible encryption layer so plain text never lands in provider logs (important for HIPAA path).
    - Data Retention & “Right to be Forgotten”
     - HIPAA = 6 years retention; GDPR = user-initiated deletion in ≤30 days.
     - Mark “script_id” or “anon_user_id” as purgeable; cascaded delete from object store, vector DB, cache, logs after retention horizon or DSAR request.
    - Vendor questionnaire + SOC-2/HIPAA mapping for every external API (text embeddings, storage, analytics).
— ✅ pass 1 done

### Other Features
- [ ] **Phrase-deduplication** Duplication is a major issue in AI systems as it makes the LLM repeat certain phrases instead of learning the underlying pattern. Repeated phrases make the model sound canned and can even hurt learning. Our goal: spot them early, fix them fast, and keep editors focused on real creativity.
    - Should be able to catch paraphrases like “That took real effort” ↔ “That showed courage.” However, using miniLM-v6 or a cross-encoder gives 0.4-0.5.
        - So for exact/near-exact matches → MiniLM + cosine ≥ 0.70 → warn immediately in UI.
        -  Everything else → nightly batch:
         - embed with higher-quality bi-encoder (MPNet / e5-base).
         - pull top-k neighbours (say 20).
         - run only those pairs through the STS-trained cross-encoder.
         - apply the calibrated threshold (≈ 0.40).
        - Symmetry trick to boost the score
            - Because entailment is directional, score A→B and B→A, then take the max or average.
            - This often nudges paraphrase pairs from ~0.48 to ~0.6 while unrelated pairs stay low.
        - Fail-safe for borderline cases
            - If score is within ±0.05 of threshold, tag “needs human review” instead of auto-flagging.
            - Editors will still see maybe-dup chips but can override with one click.
    - **Phrase Segmentation Strategy**
        - We want each “chunk” to be semantically self-contained (so its embedding actually represents one idea) yet small enough that short paraphrases line up in the vector space. That means:
            - never cut in the middle of a clause or example
            - aim for roughly one simple thought per chunk (≈ 5–30 tokens)
            - allow light overlap so different phrasing of the same thought still collides
	    - Feed the similarity models chunks that are roughly comparable in length, so the embedding space has a fair shot at judging “same idea vs. different idea.”
            - **Phrase Normalization**
                - Convert text to lowercase to ensure case-insensitive matching.
                - Apply stemming or lemmatization to reduce words to their base forms. TBD
            - **Sentence-level splitting**
                - The default and most robust approach is to split node content into sentences using a sentence boundary detector (e.g., spaCy, NLTK, or a simple regex for MVP).
                - This works well for conversational data, as each sentence is usually a self-contained thought or feedback unit.
            - **Sub-sentence chunking (optional, advanced)** For longer sentences or compound statements, use clause-aware “smart split” order. we may want to further split on punctuation (commas, semicolons, “and”, “but”, etc.) to catch repeated sub-phrases.
                1️⃣ Split first on semicolons / em-dashes / bullets / emojis (often deliberate idea breaks).
                2️⃣ Next on coordinating conjunctions followed by a subject (“and I…”, “but she…”).
                3️⃣ Then on commas that precede relative-clauses (“which”, “that”, “who”).
                4️⃣ Final fallback: sliding 20-token window with 50 % overlap.
                This preserves grammatically complete clauses while still chopping run-ons.
— ✅ pass 1 done



## Parking Lot
> This is added here so we can add or remove items from the backlog if needed when deciding on implementation
- **Drag-and-drop branching:** grab any node's edge to create a new branch on the spot (moved from Interactive Canvas backlog)
- **Real-time collaborator cursors and presence indicators for concurrent editing** (moved from Interactive Canvas backlog)
- **Conflict-resolution UI:** for concurrent edits on the same node (merge still creates a new node) or choose version.
- **Save all prompts as reusable tools/programs/workflows**
- **Create and update a test set** that measures the things we find as issues in real user chats to test whether future changes improve on those tests or not. A growing set of tests is something could be useful when a training run is done and needs testing. Since the issues we're tracking will keep on increasing, we do need a system that does issue -> add to test to check for whether model can handle these types of issues or not -> then make changes to the training data -> train -> test the new model on those test sets instead of waiting for another real user to present the same scenario.
- **Ongoing system to improve human-AI judging alignment**
- **Use real user examples that caused issues as tests in the test set**
- **Build a systematic module in the system for error analysis**

## Doc todos
- [ ] add current engagement ratio of day 1 to the first objective to kickstart tracking and measuring engagement.
- [ ] define must and optional metadata fields for both nodes and scripts.