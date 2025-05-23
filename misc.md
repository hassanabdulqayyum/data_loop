
You're articulating a strong and coherent design philosophy here, and I agree that the interaction model we've refined has a good chance of feeling intuitive and being picked up quickly. Let's break down why that intuition is likely sound:

1.  **Single-Click for Selection/Focus (and initial contextual actions):**
    *   **Alignment with Human Psyche:** This is a near-universal desktop UI paradigm. People expect a single click to select an object and make it the current focus. The idea that this selection also brings up a relevant "contextual menu" or initial set of actions in the right-side panel is a form of **progressive disclosure**. Users get immediate, relevant options without being overwhelmed. The zoom/center adds a nice "smart focus" feel.

2.  **Double-Click for Deeper Dive / Specific View (Node View/Version Timeline):**
    *   **Alignment with Human Psyche:** Double-click often signifies "open" or "activate" or "go deeper" into the selected item. Using it as a shortcut to the detailed "Node View / Version Timeline" within the contextual panel fits this pattern. It’s an accelerator for users who know they want to see the full history or detailed attributes immediately.

3.  **Contextual Right Panel as the Go-To for Actions:**
    *   **Alignment with Human Psyche:** This creates a **stable and predictable locus of control**. Users learn that "if I want to *do something with* what I've selected, or see more details, the right panel is where I look." This reduces cognitive load because they don't have to scan the entire interface for buttons or options scattered around. It supports the principle of **consistency** and **discoverability** (once the pattern is learned). The canvas remains the "what" (the data, the structure), and the panel becomes the "how" (the tools, the actions).

4.  **Read-Only Canvas (for content editing):**
    *   **Alignment with Human Psyche (for this specific model):** By clearly delineating the canvas as a selection/navigation space and the panel as the action/editing space, you create clear roles. This can reduce accidental edits and reinforces the idea that editing is a deliberate action taken via the panel. The exception for the "+" branching button is well-justified as it's a direct structural manipulation inherent to the canvas's purpose.

**Why this model should resonate with users:**

*   **Reduces Cognitive Load:** Clear separation of concerns and a predictable place for actions.
*   **Supports Learnability:** The core click behaviors are common, and the consistent use of the right panel reinforces a single pattern for deeper interaction.
*   **Efficiency:** Shortcuts like double-click cater to expert users, while the single-click + panel action provides a clear path for all.
*   **Cleanliness:** Keeps the primary data visualization (the canvas) uncluttered.

Your intuition about these interactions aligning with "human psyche" is well-founded in established UX principles. The key will be in the execution: ensuring the visual feedback is clear, the panel transitions are smooth, and the content within each contextual view in the panel is logically organized and highly relevant to the user's current task.


docker compose exec neo4j cypher-shell -u $NEO4J_USER -p $NEO4J_PASSWORD -d neo4j "MATCH (n) DETACH DELETE n"

cat docs/scripts/neo4j/004_demo_catalog.cypher | docker compose exec -T neo4j cypher-shell -u $NEO4J_USER -p $NEO4J_PASSWORD