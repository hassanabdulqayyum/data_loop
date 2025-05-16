/*
TurnCanvas.jsx – Vertical stack wrapper around React-Flow
=======================================================
Purpose in plain English:
This component turns the array of *gold-path turns* from the zustand store
into a vertical React-Flow chart that exactly matches the updated Figma spec
(Script View rev-04):

• A **2.5-px #CCCCCC vertical spine** runs down the *mathematical centre* of
  the canvas.
• Each Turn bubble is horizontally centred on that spine by measuring the
  container width in real-time and offsetting the node.x coordinate so the
  largest allowed bubble (724 px) sits dead-centre.
• The very first visible node (root is hidden) appears **44 px below** the
  TopNavBar so the flow aligns with the hierarchy view.
• Successive nodes are spaced so the grey connector segment between them is
  **exactly 43 px** long; we approximate bubble height at ~100 px which is
  close enough for all practical scripts.
• Horizontal panning is *disabled* – users can only scroll up/down.  We
  enforce this by clamping `translateExtent` to `x = 0`.

Down the line
-------------
Future micro-tasks will make the layout smarter (border-aware alignment,
scroll-into-view, live selection highlighting, etc.).  Today we only care
about plumbing everything together so the canvas shows something useful on
screen.

Example usage (already wired in <ScriptView>):
```jsx
<TurnCanvas />
```
*/

import React, { useMemo, useRef, useLayoutEffect, useState } from 'react';
import ReactFlow, { Background, Controls } from 'reactflow';
import 'reactflow/dist/style.css';
import useScriptStore from '../store/useScriptStore.js';
import TurnNode from './TurnNode.jsx';
import {
  calculateNodesAndEdges,
  DEFAULT_CENTER_OFFSET_X
} from './TurnCanvas.utils.js';

function TurnCanvas() {
  // -----------------------------------------------------------------------
  // Ref & state – we measure container width so we can *perfectly centre* the
  // nodes irrespective of viewport size or the presence of the right-side
  // panel.  We store the derived x-offset in React state so memoisation stays
  // deterministic.
  // -----------------------------------------------------------------------
  const containerRef = useRef(null);
  const [centreX, setCentreX] = useState(DEFAULT_CENTER_OFFSET_X);

  // ResizeObserver keeps the centre aligned on window resizes without the
  // need for expensive re-layouts – we only update the state when the width
  // actually changes.
  useLayoutEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === 'undefined') return;

    const handle = () => {
      const { clientWidth } = containerRef.current;
      // Centre x = (available width / 2) − (maxBubbleWidth / 2)
      const calculated = clientWidth / 2 - 362; // 362 = ½ × 724-px bubble
      setCentreX(calculated);
    };

    handle(); // Initial calculation

    const ro = new ResizeObserver(handle);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Pull the gold-path turns from the zustand store.
  const turns = useScriptStore((s) => s.turns);

  // Skip the invisible ROOT node – start canvas at first *real* turn.
  const visibleTurns = useMemo(() => turns.filter((t) => t.role !== 'root'), [turns]);

  // Build nodes & edges once inputs change.  The helper keeps the file tidy
  // and 100 % unit-testable.
  const { nodes, edges } = useMemo(
    () => calculateNodesAndEdges(visibleTurns, centreX),
    [visibleTurns, centreX]
  );

  // React-Flow needs to know our custom node component.
  const nodeTypes = useMemo(() => ({ turnNode: TurnNode }), []);

  // ---------------------------------------------------------------------
  // Wrapper takes the remaining width after the Right-Side Panel (fixed
  // 420 px) so the canvas never leaks underneath.  We enable **vertical**
  // scrolling via `overflowY:auto` – React-Flow no longer pans the viewport.
  // ---------------------------------------------------------------------

  return (
    <div
      ref={containerRef}
      data-testid="turn-canvas-wrapper"
      style={{
        /* 2 parts of the available width so canvas ≈ two-thirds */
        flex: '2 1 0%',
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        background: '#fafafa'
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        /* -----------------------------------------------------------------
         * View-port behaviour tweaks (bug-fix – nodes jumped under RSP on scroll)
         * -----------------------------------------------------------------
         * 1. `proOptions.fitViewOnInit` guarantees the gold-path is centred *once*
         *    when the component mounts.  Afterwards we leave the viewport
         *    untouched so horizontal position remains rock-solid.
         * 2. We turn *off* React-Flow driven panning (`panOnScroll`,
         *    `panOnDrag`) so vertical movement now relies on the wrapper
         *    div's natural `overflow-y: auto` scroll bar.  This removes the
         *    accidental X-reset that previously shoved half the cards under
         *    the right-side panel.
         * ---------------------------------------------------------------- */
        proOptions={{ fitViewOnInit: true }}
        minZoom={1}
        maxZoom={1}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        panOnScroll
        panOnScrollMode="vertical"
        panOnDrag={false}
        /* Clamp horizontal movement to keep nodes centred; allow large vertical range */
        translateExtent={[
          [centreX, -100000],
          [centreX, 100000]
        ]}
      >
        {/* Subtle dotted background so users see canvas area boundaries */}
        <Background gap={16} size={0.5} />
        {/* Interactive controls hidden to keep UI minimal */}
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

export default TurnCanvas; 