/*
ThreePaneLayout.tsx – Universal 3-pane shell
===========================================
This component enforces the exact chrome that appears on every
post-login screen (Load-View, Script-View, Node-View and future ones).

LAYOUT OVERVIEW
---------------
            ┌──────────────────────────────────────┐  ← nav bar (72 px)
            │   ← props.nav (typically TopNavBar) │
┌───────────┴──────────────────────────────────────┴──────────────┐
│            2-fr               │          1-fr                   │
│ ┌─────────────────────────────┼────────────────────────────────┐ │
│ │  props.canvas               │  props.panel                   │ │
│ │  (read-only graph, React    │  (Right-Side Panel with        │ │
│ │   Flow etc.)                │   contextual actions)          │ │
│ └─────────────────────────────┴────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────┘

Why build this shell?
• We calculate the "two-thirds vs one-third" split **once** – no more
  per-view pixel maths.
• Future screens automatically inherit the exact widths and scrolling
  behaviour by simply passing three JSX props.
• Separation of concerns: this component knows *nothing* about what is
  rendered inside each slot.

Example usage
-------------
```tsx
<ThreePaneLayout
  nav={<TopNavBar breadcrumbs={…} />}
  canvas={<TurnCanvas />}
  panel={<RightSidePanel />}
/>
```
*/

import React, { ReactNode } from 'react';

/**
 * Props for the ThreePaneLayout component.
 *
 * @property nav    JSX element that represents the top navigation bar.
 * @property canvas JSX element to be rendered in the left 2-fr canvas area.
 * @property panel  JSX element to be rendered in the right 1-fr side panel.
 *
 * Example usage:
 * ```tsx
 * <ThreePaneLayout
 *   nav={<TopNavBar breadcrumbs={…} />}
 *   canvas={<TurnCanvas />}
 *   panel={<RightSidePanel />}
 * />
 * ```
 */
export interface ThreePaneLayoutProps {
  nav: ReactNode;
  canvas: ReactNode;
  panel: ReactNode;
}

/**
 * ThreePaneLayout – re-usable 3-pane page skeleton.
 *
 * It renders a fixed-height nav bar at the top (72 px) and a flexible grid
 * underneath. The grid consists of two columns: the left column consumes
 * exactly two portions of the available width, the right column consumes one
 * portion. This achieves the desired 2 : 1 (≈ 67 % / 33 %) split regardless
 * of the viewport size.
 *
 * The side panel (`panel` prop) automatically adds a subtle 3-px divider on
 * its left edge and scrolls independently so overflowing content never hides
 * the canvas.
 */
function ThreePaneLayout({ nav, canvas, panel }: ThreePaneLayoutProps) {
  return (
    <>
      {/* Top navigation bar – we trust the caller to pass the proper JSX. */}
      {nav}

      {/*
        Below the nav bar: a full-height grid with two columns.
        We subtract 72 px (nav height) so the grid fills the remaining
        viewport and never causes double scrollbars.
      */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          height: 'calc(100vh - 72px)',
          overflow: 'hidden'
        }}
      >
        {/* Left canvas area */}
        <div
          style={{
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {canvas}
        </div>

        {/* Right-Side Panel */}
        <aside
          style={{
            borderLeft: '3px solid #D1D1D1',
            background: '#ffffff',
            overflowY: 'auto'
          }}
        >
          {panel}
        </aside>
      </div>
    </>
  );
}

export default ThreePaneLayout; 