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
| 3 | **Migrate `LoadView`** to use the new layout + wrapper. Remove old width maths. Cypress smoke test still passes. | LoadView uses global shell, no bespoke maths. | 1,2 | (commit _Refactor LoadView to use ThreePaneLayout_) |
| 4 | **Extract `<PersonaGrid>`** inside LoadView; replace manual spacing with pure flex. | LoadView rows centre reliably. | 3 | ⬜ |
| 5 | **Migrate `ScriptView`** to `<ThreePaneLayout>` + `<CanvasWrapper>`. Delete legacy centring code. | ScriptView alignment unified. | 1,2 | ⬜ |
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

---

## 6  Next immediate action → **Micro-task #3 – Migrate `LoadView`**

Mode handshake: DIY / PAIR / AUTO?  
(Default **DIY** if no preference stated.)

---

*File created: `docs/implementation_plan/three_pane_layout_refactor.md` – this document is our single source of truth for the layout refactor going forward.* 