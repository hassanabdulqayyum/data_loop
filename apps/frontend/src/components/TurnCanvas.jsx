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
    // Commenting out repetitive logs for clarity during scroll debugging
    // console.log('[TurnCanvas] Turns from store:', s.turns);
    return s.turns;
  });
  const visibleTurns = useMemo(() => {
    const filtered = turns.filter((t) => t.role !== 'root');
    // console.log('[TurnCanvas] Visible turns:', filtered);
    return filtered;
  }, [turns]);

  // Log calculated nodes and edges
  const { nodes, edges } = useMemo(() => {
    const calculated = calculateNodesAndEdges(visibleTurns);
    // console.log('[TurnCanvas] Calculated nodes:', calculated.nodes);
    // console.log('[TurnCanvas] Calculated edges:', calculated.edges);
    return calculated;
  }, [visibleTurns]);

  const nodeTypes = useMemo(() => ({ turnNode: TurnNode }), []);

  // Log dimensions of the TurnCanvas wrapper div
  useEffect(() => {
    if (turnCanvasWrapperRef.current) {
      const rect = turnCanvasWrapperRef.current.getBoundingClientRect();
      console.log('[TurnCanvas] Wrapper div getBoundingClientRect():', rect);
      console.log('[TurnCanvas] Wrapper div scrollHeight:', turnCanvasWrapperRef.current.scrollHeight);
      console.log('[TurnCanvas] Wrapper div clientHeight:', turnCanvasWrapperRef.current.clientHeight);
      console.log('[TurnCanvas] Wrapper style:', turnCanvasWrapperRef.current.style.cssText);

      const reactFlowElement = turnCanvasWrapperRef.current.querySelector('.react-flow');
      if (reactFlowElement) {
        const rfRect = reactFlowElement.getBoundingClientRect();
        console.log('[TurnCanvas] ReactFlow component getBoundingClientRect():', rfRect);
        // Add scrollHeight and clientHeight for ReactFlow element itself
        console.log('[TurnCanvas] ReactFlow component scrollHeight:', reactFlowElement.scrollHeight);
        console.log('[TurnCanvas] ReactFlow component clientHeight:', reactFlowElement.clientHeight);
      } else {
        console.log('[TurnCanvas] ReactFlow component NOT FOUND in DOM query.');
      }
    }
  }, [nodes, visibleTurns]); // Re-log if nodes or visibleTurns change

  // console.log('[TurnCanvas] Rendering with nodes count:', nodes.length);

  return (
    <div
      ref={turnCanvasWrapperRef} // Added ref
      data-testid="turn-canvas-wrapper"
      style={{
        flex: '1 1 0%', // ADDED: Grow and shrink to fill CanvasWrapper (which is display:flex for ScriptView)
        width: '100%',
        display: 'flex', // ADDED: Make this a flex container for ReactFlow child
        flexDirection: 'column', // ADDED: Stack ReactFlow child vertically
        overflowX: 'hidden',
        background: 'rgb(250, 250, 250)'
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        minZoom={1}
        maxZoom={1}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        panOnScroll={false}
        panOnDrag={false}
        preventScrolling={false}
        style={{
          width: '100%',
          flex: '1 1 0%', // Grow and shrink to fill TurnCanvas wrapper div
          // ReactFlow should determine its own height based on content, constrained by this flex item.
        }}
      >
        <Background gap={16} size={0.5} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

export default TurnCanvas; 