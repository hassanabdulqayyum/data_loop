# Three-Pane Layout Refactor (User Flow 1)

## 1  Background – verbatim user description

> *Now, in all the three view (except the login view) and all future extensions we'll do in this project, these are the three things that will stay consistent:*  
> **1. Nav bar with breadcrumbs**  
> **2. The RSP panel** which is the contextual panel for all details and actions are user would want to take and is **33 % of the screen width**.  
> **3. The canvas/graph area** which occupies the **left two-thirds (≈ 67 %)** of the screen. It is read-only so users don't get overwhelmed; this keeps the canvas clutter-free. For this part, we are currently using **React-Flow** but I want to keep the choices open if it's not the right one for our use-case.
>
> Since these three elements are used everywhere, **we didn't make them global and reuse them** from the beginning of UI work which now requires us to fix it before we do any more work.
>
> The nodes in the **Load View**, the **Script View** and the **Node View** follow positioning rules for the first node – how far it is from the nav-bar and also sideways – so right now we have **very complex maths** to do for each different view. This makes it **brittle and error-prone** and the nodes are **not lining up properly** for quite some time now.
>
> I was thinking that if we could make the canvas part have a fixed two-third left area under the nav-bar and reuse that throughout the app, we could calculate the dimensions **once** when the graph area loads and then reuse that to position nodes.
>
> For Load and Script view, since we only centre them horizontally, we could just calculate the distance on either side of the nodes to the borders of the graph area. This would always keep them centred and not rely on faulty math we write for each view.
>
> For the size of the nodes themselves, we use some specific padding for the view plus a fixed font size that helps us decide what size they should be, and we have limits to how wide a box can be in the Script View or how wide a row can be in the Load View (we then use the next row – see the load-view image for an example of how we position persona nodes in a UI/UX-friendly way).

*(Screenshots referenced by the user: "Load view – 4.png", "Script view – 1.png / 2.png", "Node view – 1.png / 2.png")*

---

## 2  Why the current implementation hurts (assistant's analysis)

1. **Three identical panes, three separate implementations.**  
   Each of *Load*, *Script* and *Node* views re-creates its own nav-bar spacing, right-panel width and canvas width → any CSS tweak breaks the others.
2. **Manual pixel-math for centring.**  
   We currently compute "gap on left/right" for every screen in JS. That is fragile and drifts whenever padding, border width or font size changes.
3. **React-Flow encourages absolute positioning.**  
   Because React-Flow lets us place nodes anywhere, we ended up doing the centring arithmetic ourselves instead of letting the library handle it.
4. **Border-width side-effects.**  
   Selected nodes get a thicker border, throwing off apparent alignment. Compensation is currently sprinkled across multiple components instead of living in one place.

---

## 3  Design goals for the refactor

🔹 **Single source of layout truth.** Width & height maths live in one reusable shell component.  
🔹 **One-time centring calculation per mount.** Canvas computes its bounding box once, then calls React-Flow's `fitView()` or `setViewport()` – no bespoke math per page.  
🔹 **Encapsulated node alignment.** Border-aware width corrections live *inside* the node component, never in page-level code.  
🔹 **Pure CSS where possible.** Use flex/grid (`justify-content:center`, `flex-wrap`) so browser handles row centring for free.

---

## 4  Proposed solution (big picture)

### 4.1  `<ThreePaneLayout>` component
A reusable shell that renders:
• Top nav-bar (slot)  
• Left canvas area (67 %)  
• Right-side panel (33 %)  
CSS: grid `grid-template-columns: 2fr 1fr` or flex with `%` widths.

### 4.2  `<CanvasWrapper>` helper
Wraps React-Flow (or future graph lib) and, on mount / node-change / resize:
1. Reads its own clientWidth/clientHeight.  
2. Asks React-Flow for the bounding box of all nodes.  
3. Calls `setViewport()` (or `fitBounds`) once to centre.  
All pages reuse this component, so the centring logic is written **once**.

### 4.3  `<PersonaGrid>`
A plain flex-row that centres persona chips and wraps to the next line automatically (`justify-content:center; flex-wrap:wrap; gap: …px`). Eliminates custom gap maths in Load-View.

### 4.4  Border-aware node component
Each custom node gets a `borderWidth` prop (0 / 1 / 3 px). It subtracts *half* that width from internal padding so the visual width stays constant, keeping the vertical spine perfectly straight.

---

## 5  Step-by-step task list (micro-tasks)

> These tasks follow the **Adaptive-Delegation "micro-task" rules** in `docs/implementation_plan/user_flow_1_implementation_plan.md`.

| # | Micro-task | Outcome | Depends on | Status |
|---|------------|---------|-----------|---------|
| 1 | **Scaffold `<ThreePaneLayout>`** component with placeholder slots and Storybook example. | Re-usable 3-pane shell lives in `apps/frontend/src/components/layout/ThreePaneLayout.tsx`; Storybook demo renders without TS deps. | – | ✅ **COMPLETE** (commit _ThreePaneLayout shell_) |
| 2 | **Create `<CanvasWrapper>`** that auto-centres on mount/resize + Jest tests that stub React-Flow. | Wrapper lives in `layout/CanvasWrapper.jsx`, unit-tested (`tests/CanvasWrapper.test.jsx`). Provides single-source centring via `fitView()`. | 1 | ✅ **COMPLETE** (commit _CanvasWrapper with tests_) |
| 3 | **Migrate `LoadView`** to use the new layout + wrapper. Remove old width maths. Cypress smoke test still passes. | LoadView uses global shell, no bespoke maths. | 1,2 | ✅ **COMPLETE** (commit _Refactor LoadView to use ThreePaneLayout_) |
| 4 | **Extract `<PersonaGrid>`** inside LoadView; replace manual spacing with pure flex. | LoadView rows centre reliably. Addressed by alternative solution (`packIntoRows` utility in `HierarchyGraph.jsx`). | 3 | ✅ **COMPLETE** |
| 5 | **Migrate `ScriptView`** to `<ThreePaneLayout>` + `<CanvasWrapper>`. Delete legacy centring code. | ScriptView alignment unified. | 1,2 | 🔄 **IN PROGRESS** |
| 6 | **Migrate `NodeView`** similarly. Ensure alternating cards still align. | NodeView inherits shell. | 1,2 | ⬜ |
| 7 | **Refactor node component** to be border-aware (padding compensation). Unit test ensures spine alignment unaffected by selected state. | | 5,6 | ⬜ |
| 8 | **Clean-up & docs.** Remove dead code, update Storybook, add developer notes in README. | | All | ⬜ |

---

### Progress log

| Date | Summary |
|------|---------|
| *2025-05-18* | • **ThreePaneLayout** shell created with grid 2fr/1fr split and divider.<br>• Storybook story added (`*.jsx`). |
| *2025-05-18* | • **CanvasWrapper** implemented, calls `fitView()` on mount/resize/deps change.<br>• Jest tests verify behaviour; wrapper now ready to wrap any React-Flow canvas. |
| *2025-05-19* | • **LoadView (Task #3 integration)**: Debugged `LoadView` integration with `ThreePaneLayout` and `CanvasWrapper`.<br>  • Resolved `NaN` dimension errors by removing manual dimension calculations (`graphRect`) from `LoadView` and `HierarchyGraph`, deferring to `CanvasWrapper` and React Flow for layout and fitting.<br>  • Corrected `TypeError` for node click handlers by aligning prop names (`onSelect`) and ensuring `HierarchyGraph` properly adapts the handler for React Flow's `onNodeClick` event.<br>  • Removed redundant `fitView` logic from `HierarchyGraph` to rely solely on `CanvasWrapper`. |
| *2025-05-19* | • **LoadView (Task #3 visual refinement)**: Locked React Flow zoom to 1x in `HierarchyGraph` to ensure consistent font size and prevent user zooming, aligning with design goals. |
| *2025-05-19* | • **LoadView (Task #3 functionality)**: Resolved node clickability issue by correcting parameter order in `LoadView`'s `onSelect` handler. Click events now correctly trigger state updates and expected behavior. Removed debug logs. |
| *2025-05-19* | • **LoadView (Task #3 functionality/visuals)**: Fixed an issue in `HierarchyGraph` where not all topic nodes were displayed when a module was selected. Now, all topics for the selected module are correctly shown, addressing a key part of the `LoadView` migration. |
| *2025-05-19* | • **LoadView (Task #3 debugging)**: Refactored prop passing from `LoadView` to `HierarchyGraph` to use a single `selectedIds` object, resolving a `JSON.parse(undefined)` error in debug logs and clarifying component contracts. Added debug logs to `HierarchyGraph` to trace topic display. |
| *2025-05-19* | • **LoadView (Task #3 visual refinement)**: Adjusted `HierarchyGraph` to apply a 43px top offset to the Program node, ensuring correct initial vertical positioning below the nav bar. |
| *2025-05-19* | • **LoadView (Task #3 visual refinement)**: Revised Program node positioning. Reverted direct Y-offset in `HierarchyGraph`. Modified `CanvasWrapper` to adjust viewport after `fitView`, aiming for a consistent 43px visual top offset for the graph content. |
| *2025-05-19* | • **LoadView (Task #3 visual refinement)**: Enhanced `CanvasWrapper` to use `useNodesInitialized` and `useCallback` to ensure its centering and 43px top offset logic only runs after React Flow nodes are fully initialized, preventing initial layout jumps. |
| *2025-05-20* | • **LoadView (Task #3 functionality)**: Modified the "Export" button logic in `LoadView.jsx` to be enabled when a module, topic, or persona is selected, instead of only when a persona is selected. This allows users to export data at different hierarchy levels. |
| *2025-05-20* | • **LoadView (Task #3 UI refinement)**: Adjusted styles in `LoadView.jsx` for buttons (borderRadius, removed fixed width) and helper text (font, size, spacing) to match Figma specs. Centered the helper text and buttons block in the RSP. <br> • **HierarchyGraph (Task #3 visual refinement)**: Commented out edge creation for persona nodes in `HierarchyGraph.jsx` to hide connecting lines as per Figma design. |
| *2025-05-20* | • **LoadView (Task #3 UI refinement)**: Updated button layout in `LoadView.jsx` RSP. "Load Script" button now only appears when a persona is selected. When visible, "Load Script" and "Export" buttons align horizontally; otherwise, "Export" (if active for module/topic) is centered vertically. |
| *2025-05-20* | • **Styling (Task #3 Refactor)**: Created `apps/frontend/src/styles/commonStyles.js` and moved `buttonStyle` into it. Updated `LoadView.jsx` to import `buttonStyle` from this shared location, promoting reusability for upcoming view migrations. |
| *YYYY-MM-DD* | • **ScriptView (Task #5 Migration)**: Replaced `EditorShell` with `ThreePaneLayout` in `ScriptView.jsx`.<br>  • Wrapped `TurnCanvas` with `CanvasWrapper` to delegate centering and initial view logic.<br>  • Modified `TurnCanvas.jsx` to remove its internal `ResizeObserver`, width calculations, and specific React Flow props related to viewport management, now handled by `CanvasWrapper` or set directly for its vertical, non-pannable, non-zoomable nature.<br>  • Updated `TurnCanvas.utils.js` (`calculateNodesAndEdges`) to remove `containerW` dependency and horizontal centering logic; nodes are now positioned at `x:0`, with `CanvasWrapper` managing overall centering via `fitView`. Vertical layout logic remains. |
| *YYYY-MM-DD* | • **ScriptView (Task #5 Debugging)**: Resolved React Flow context error ("[React Flow]: Seems like you have not used zustand provider as an ancestor") by wrapping the `<CanvasWrapper><TurnCanvas /></CanvasWrapper>` composition with `<ReactFlowProvider>` in `ScriptView.jsx`. This ensures `CanvasWrapper`'s hooks (`useReactFlow`, `useNodesInitialized`) have access to the required React Flow context. |
| *YYYY-MM-DD* | • **ScriptView (Task #5 Debugging)**: Enabled vertical scrolling for long scripts in `ScriptView` by removing `overflow: 'hidden'` from the canvas slot `div` within `ThreePaneLayout.tsx`. This allows `TurnCanvas.jsx`'s `overflowY: 'auto'` style to take effect. |
| *2025-05-21* | • **ScriptView (Task #5 Scrolling)**: Resolved issue where the whole page section scrolled instead of just turn nodes. Made `ThreePaneLayout.tsx`'s canvas slot the definitive vertical scroller (`height: '100%', overflowY: 'auto'`). Removed `height: '100%'` and `overflowY: 'auto'` from `TurnCanvas.jsx` to prevent conflicting scroll handlers and allow it to expand to content height. |
| *2025-05-21* | • **ScriptView (Task #5 Visibility)**: Fixed issue where turn nodes disappeared after scrolling fix. Restored `height: '100%'` to `TurnCanvas.jsx` main `div` and added `style={{ height: '100%', width: '100%' }}` to the `ReactFlow` component to ensure it has dimensions to render. Scrolling remains managed by `ThreePaneLayout.tsx`. |
| *2025-05-21* | • **ScriptView (Task #5 Scrolling Fix Attempt)**: Modified `CanvasWrapper.jsx` to accept `useFitView` prop (default true). If false (as set in `ScriptView.jsx`), it skips `fitView()` and sets viewport to zoom 1, y-offset 43px, and calculated x-center based on its own width and max node width (724px). This aims to enable vertical scrolling for `ScriptView` by preventing nodes from being shrunk to fit. |
| *2025-05-21* | • **ScriptView (Task #5 Scrolling Diagnosis)**: Temporarily set `ReactFlow` component height in `TurnCanvas.jsx` to `3000px` to test if `ThreePaneLayout`'s canvas slot scrolls with explicitly oversized content. This helps determine if the issue is with the scroll container or React Flow's content/viewport sizing. |
| *2025-05-21* | • **ScriptView (Task #5 Scrolling Fix Attempt 2)**: Reverted temporary `3000px` height in `TurnCanvas.jsx`. Created `index.css` with `html, body, #root { height: 100%; overflow: hidden; }` to prevent base document scroll. Imported `index.css` into `main.jsx`. Aim: ensure `ThreePaneLayout`'s canvas slot is the sole scroll manager for its content. |
| *2025-05-21* | • **ScriptView (Task #5 Scrolling Fix Attempt 3)**: RSP stopped scrolling after previous change. Removed `overflow: 'hidden'` from the main grid container in `ThreePaneLayout.tsx`. `html,body,#root` still has `overflow:hidden`. Aim: Allow canvas and RSP slots in `ThreePaneLayout` to manage their own `overflowY: 'auto'` independently. |
| *2025-05-21* | • **ScriptView (Task #5 Scrolling Fix Attempt 4)**: Canvas still static. Removed `height: '100%'` from `ReactFlow` component style in `TurnCanvas.jsx` (width remains 100%). Aim: Allow ReactFlow to set its height based on content, potentially triggering overflow in `ThreePaneLayout`'s canvas slot (which has `height:100%` & `overflowY:auto`). |
| *2025-05-22* | • **ScriptView (Task #5 Scrolling Fix)**: Resolved canvas scrolling issue. Removed `height: '100%'` from the main wrapper `div` style in `apps/frontend/src/components/TurnCanvas.jsx`. This allows the `TurnCanvas` wrapper to grow with its `ReactFlow` content, correctly triggering `overflowY: 'auto'` on the designated scrolling parent (the canvas slot in `ThreePaneLayout.tsx`). |
| *2025-05-22* | • **ScriptView (Task #5 Node Visibility & Scrolling)**: Nodes disappeared after previous fix. Reverted `TurnCanvas.jsx` main div to use `height: '100%'` to ensure `ReactFlow` gets initial render area. Changed `height: '100%'` to `min-height: '100%'` in both `CanvasWrapper.jsx` and `TurnCanvas.jsx` main divs. This aims to provide an initial render area while allowing them to grow with `ReactFlow` content, enabling scrolling in `ThreePaneLayout`. |
| *2025-05-22* | • **LoadView/ScriptView (Task #5 Layout Stability)**: `LoadView` hierarchy disappeared after `min-height` change. Modified `CanvasWrapper.jsx` to use `height: '100%'` if `useFitView` is true (for `LoadView`), and `min-height: '100%'` if `useFitView` is false (for `ScriptView` scrolling). This should restore `LoadView` visibility while retaining `ScriptView` scrolling. `TurnCanvas.jsx` remains with `min-height: '100%'`. |
| *2025-05-22* | • **ScriptView (Task #5 Node Visibility)**: Turn nodes not visible in `ScriptView`. `LoadView` OK. Reverted `TurnCanvas.jsx` main wrapper from `min-height: '100%'` back to `height: '100%'`. `CanvasWrapper` remains conditional (`min-height` for `ScriptView`). This provides `ReactFlow` with a concrete initial height from `TurnCanvas`, aiming to restore node visibility and enable scrolling. |
| *2025-05-22* | • **ScriptView (Task #5 Debugging)**: Turn nodes still not visible. Added extensive console logging to `TurnCanvas.jsx` to inspect turns data, calculated nodes/edges, and div dimensions to diagnose the issue. |
| *2025-05-22* | • **ScriptView (Task #5 Debugging)**: Expanded console logs in `TurnCanvas.jsx` to show full `getBoundingClientRect()` for wrapper and ReactFlow elements. Added logs to `CanvasWrapper.jsx` to show its dimensions when `useFitView` is false (ScriptView case). |

---

## 6  Next immediate action → **Micro-task #3 – Migrate `LoadView`**

Mode handshake: DIY / PAIR / AUTO?  
(Default **DIY** if no preference stated.)

---

*File created: `docs/implementation_plan/three_pane_layout_refactor.md` – this document is our single source of truth for the layout refactor going forward.* 