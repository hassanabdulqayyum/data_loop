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
import { calculateNodesAndEdges } from './TurnCanvas.utils.js';

function TurnCanvas() {
  // -----------------------------------------------------------------------
  // Ref & state – we measure container width so we can *perfectly centre* the
  // nodes irrespective of viewport size or the presence of the right-side
  // panel.  We store the derived x-offset in React state so memoisation stays
  // deterministic.
  // -----------------------------------------------------------------------
  const containerRef = useRef(null);
  const [containerW, setContainerW] = useState(0);

  // ResizeObserver keeps the centre aligned on window resizes without the
  // need for expensive re-layouts – we only update the state when the width
  // actually changes.
  useLayoutEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === 'undefined') return;

    const handle = () => {
      const { clientWidth } = containerRef.current;
      setContainerW(clientWidth);
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
  const { nodes, edges, leftOffset } = useMemo(
    () => calculateNodesAndEdges(visibleTurns, containerW),
    [visibleTurns, containerW]
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
        /* Take *all* remaining space after the Right-Side Panel so the
           canvas auto-expands on large monitors and shrinks gracefully on
           small ones.  The sibling <RightSidePanel> now has an explicit
           `width:clamp(...)` so using `flex:1 1 0` here means: "grow to fill
           whatever is left". */
        flex: '1 1 0%',
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        background: '#fafafa'
      }}
    >
      <ReactFlow
        /* Changing the `key` forces React-Flow to fully re-mount whenever
           `leftOffset` changes.  This ensures the new `translateExtent` min/max X
           values take effect – otherwise the library only reads the prop on
           first mount, which is why the graph kept centring inside the *full*
           window until the user clicked. */
        key={leftOffset}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        /* -----------------------------------------------------------------
         * Scroll/zoom behaviour tweaks
         * -----------------------------------------------------------------
         * 1. We **disable** React-Flow's automatic fit-to-view logic because it
         *    centres the graph inside the *entire* window, ignoring the fixed
         *    Right-Side Panel.  Our ResizeObserver-driven maths already place
         *    the nodes correctly, so we only need a neutral starting
         *    viewport `{x:0,y:0,zoom:1}` (see `defaultViewport` prop below).
         * 2. React-Flow driven panning is switched off (`panOnScroll=false` &
         *    `panOnDrag` left false by default).  Vertical movement now relies
         *    on the wrapper's native `overflow-y:auto` scroll bar.
         * ---------------------------------------------------------------- */
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={1}
        maxZoom={1}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        panOnScroll={false}
        /* Allow wheel events to bubble so the wrapper div (overflow-y:auto)
           handles scrolling instead of React-Flow swallowing them. */
        preventScrolling={false}
        /* Clamp horizontal movement to keep nodes centred; allow large vertical range */
        translateExtent={[
          [leftOffset, -100000],
          [leftOffset, 100000]
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