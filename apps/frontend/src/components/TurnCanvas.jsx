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

/**
 * TurnCanvas - Renders the script turns as a vertical React Flow chart.
 *
 * This component displays the gold-path turns from the Zustand store.
 * It relies on `CanvasWrapper` (its parent) to handle `fitView` and initial centering.
 * It defines the node types and calculates the relative positions of turn nodes and edges.
 * Vertical scrolling for tall scripts is handled by this component's own styles.
 * Zooming and horizontal panning are disabled to maintain a focused vertical layout.
 *
 * @example
 * // Used within ScriptView, wrapped by CanvasWrapper
 * <CanvasWrapper>
 *   <TurnCanvas />
 * </CanvasWrapper>
 */
function TurnCanvas() {
  // Container ref and width state are no longer needed as CanvasWrapper handles layout context.
  // const containerRef = useRef(null);
  // const [containerW, setContainerW] = useState(0);

  // ResizeObserver for containerW is no longer needed.
  // useLayoutEffect(() => { ... }, []);

  const turns = useScriptStore((s) => s.turns);
  const visibleTurns = useMemo(() => turns.filter((t) => t.role !== 'root'), [turns]);

  // calculateNodesAndEdges no longer needs containerW for centering.
  // It focuses on relative positioning of nodes and vertical layout.
  const { nodes, edges } = useMemo(
    () => calculateNodesAndEdges(visibleTurns),
    [visibleTurns]
  );

  const nodeTypes = useMemo(() => ({ turnNode: TurnNode }), []);

  return (
    <div
      // ref={containerRef} // No longer needed
      data-testid="turn-canvas-wrapper"
      style={{
        // This div will now take full width and expand height based on its content.
        // Scrolling is handled by its parent in ThreePaneLayout.tsx.
        flex: '1 1 0%', // Flex properties might be redundant if CanvasWrapper's child is block
        width: '100%', // Ensure it takes full width from CanvasWrapper
        height: '100%', // RESTORED: Allow this div to fill the parent's height
        // overflowY: 'auto', // REMOVED: Scrolling handled by parent
        overflowX: 'hidden',
        background: '#fafafa'
      }}
    >
      <ReactFlow
        // key={containerW} // No longer needed
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        // defaultViewport, minZoom, maxZoom, zoomOnScroll, zoomOnPinch, zoomOnDoubleClick,
        // panOnScroll, preventScrolling are managed by CanvasWrapper or set to fixed values here.
        // CanvasWrapper will call fitView, so defaultViewport is not necessary.
        minZoom={1} // Keep zoom locked
        maxZoom={1} // Keep zoom locked
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        panOnScroll={false}
        panOnDrag={false} // Keep horizontal panning disabled
        preventScrolling={false} // Allow wheel events for the div's overflowY scroll
        style={{ height: '3000px', width: '100%' }} // TEMP: Force very tall canvas for diagnostics
      >
        <Background gap={16} size={0.5} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

export default TurnCanvas; 