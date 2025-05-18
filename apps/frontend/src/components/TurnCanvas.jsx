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

import React, { useMemo, useRef, useLayoutEffect, useState, useEffect } from 'react';
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
  const turnCanvasWrapperRef = useRef(null); // Ref for the main div

  // Log turns from the store
  const turns = useScriptStore((s) => {
    console.log('[TurnCanvas] Turns from store:', s.turns);
    return s.turns;
  });
  const visibleTurns = useMemo(() => {
    const filtered = turns.filter((t) => t.role !== 'root');
    console.log('[TurnCanvas] Visible turns:', filtered);
    return filtered;
  }, [turns]);

  // Log calculated nodes and edges
  const { nodes, edges } = useMemo(() => {
    const calculated = calculateNodesAndEdges(visibleTurns);
    console.log('[TurnCanvas] Calculated nodes:', calculated.nodes);
    console.log('[TurnCanvas] Calculated edges:', calculated.edges);
    return calculated;
  }, [visibleTurns]);

  const nodeTypes = useMemo(() => ({ turnNode: TurnNode }), []);

  // Log dimensions of the TurnCanvas wrapper div
  useEffect(() => {
    if (turnCanvasWrapperRef.current) {
      const rect = turnCanvasWrapperRef.current.getBoundingClientRect();
      console.log('[TurnCanvas] Wrapper div dimensions:', {
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
      });
      console.log('[TurnCanvas] Wrapper div scrollHeight:', turnCanvasWrapperRef.current.scrollHeight);
      console.log('[TurnCanvas] Wrapper div clientHeight:', turnCanvasWrapperRef.current.clientHeight);


      const reactFlowElement = turnCanvasWrapperRef.current.querySelector('.react-flow');
      if (reactFlowElement) {
        const rfRect = reactFlowElement.getBoundingClientRect();
        console.log('[TurnCanvas] ReactFlow component direct dimensions:', {
            width: rfRect.width,
            height: rfRect.height,
        });
      } else {
        console.log('[TurnCanvas] ReactFlow component NOT FOUND in DOM query.');
      }
    }
  }, [nodes]); // Re-log if nodes change, might indicate re-render

  console.log('[TurnCanvas] Rendering with nodes count:', nodes.length);

  return (
    <div
      ref={turnCanvasWrapperRef} // Added ref
      data-testid="turn-canvas-wrapper"
      style={{
        // This div will now take full width and expand height based on its content.
        // Scrolling is handled by its parent in ThreePaneLayout.tsx.
        flex: '1 1 0%', // Flex properties might be redundant if CanvasWrapper's child is block
        width: '100%', // Ensure it takes full width from CanvasWrapper
        height: '100%', // REVERTED from min-height. ReactFlow needs a concrete height from its immediate parent.
                        // This div will take 100% height of CanvasWrapper. If ReactFlow content overflows,
                        // this div has overflowY:visible (default), so its scrollHeight will grow.
                        // CanvasWrapper (with min-height:100%) will then grow, triggering scroll on ThreePaneLayout.
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
        style={{ width: '100%' }} // REMOVED height: '100%', let ReactFlow determine its own height from content
      >
        <Background gap={16} size={0.5} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

export default TurnCanvas; 