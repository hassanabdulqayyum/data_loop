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

import React, { useMemo, useRef, useLayoutEffect, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import ReactFlow, { Background, Controls, useReactFlow } from 'reactflow';
import 'reactflow/dist/style.css';
import useScriptStore from '../store/useScriptStore.js';
import TurnNode from './TurnNode.jsx';
import { calculateNodesAndEdges, FIRST_NODE_OFFSET_Y } from './TurnCanvas.utils.js';

const REQUIRED_VERTICAL_GAP = 43; // px, the desired edge-to-edge gap

/**
 * TurnCanvas - Renders the script turns as a vertical React Flow chart.
 *
 * This component displays the gold-path turns from the Zustand store.
 * It relies on `CanvasWrapper` (its parent) to handle `fitView` and initial centering.
 * It defines the node types and calculates the relative positions of turn nodes and edges.
 * Vertical scrolling for tall scripts is handled by this component's own styles.
 * Zooming and horizontal panning are disabled to maintain a focused vertical layout.
 * This version dynamically adjusts node Y positions to ensure a consistent vertical gap
 * based on the actual rendered height of each TurnNode.
 * It also now centers each node horizontally based on its actual width and the canvas width.
 *
 * @param {object} props - The component's props.
 * @param {number} [props.canvasWidth=0] - The width of the canvas area, passed from CanvasWrapper.
 * @example
 * // Used within ScriptView, wrapped by CanvasWrapper and ReactFlowProvider
 * <ReactFlowProvider>
 *   <CanvasWrapper useFitView={false}>
 *     <TurnCanvas />
 *   </CanvasWrapper>
 * </ReactFlowProvider>
 */
function TurnCanvas({ canvasWidth = 0 }) {
  const turnCanvasWrapperRef = useRef(null); // Ref for the main div
  const { setNodes, getNodes } = useReactFlow(); // Get setNodes and getNodes from useReactFlow

  const [displayNodes, setDisplayNodes] = useState([]); // ADDED: State for nodes to render
  const [displayEdges, setDisplayEdges] = useState([]); // ADDED: State for edges to render

  // Log turns from the store
  const turns = useScriptStore((s) => {
    // Commenting out repetitive logs for clarity during scroll debugging
    // console.log('[TurnCanvas] Turns from store:', s.turns);
    return s.turns;
  });
  const visibleTurns = useMemo(() => {
    const filtered = turns.filter((t) => t.role !== 'root');
    console.log('[TurnCanvas] visibleTurns updated:', filtered);
    return filtered;
  }, [turns]);

  const [nodeHeights, setNodeHeights] = useState({});
  const [nodeWidths, setNodeWidths] = useState({}); // ADDED: State for node widths

  /**
   * Callback for TurnNode instances to report their rendered height.
   * @param {string} nodeId - The ID of the node reporting its height.
   * @param {number} height - The rendered offsetHeight of the node.
   */
  const handleNodeHeightReport = useCallback((nodeId, height) => {
    console.log(`[TurnCanvas] Received height for ${nodeId}: ${height}`);
    setNodeHeights(prev => {
      if (prev[nodeId] === height) return prev;
      console.log('[TurnCanvas] Updating nodeHeights for', nodeId, 'to', height);
      return { ...prev, [nodeId]: height };
    });
  }, []);

  /**
   * Callback for TurnNode instances to report their rendered width.
   * @param {string} nodeId - The ID of the node reporting its width.
   * @param {number} width - The rendered offsetWidth of the node.
   */
  const handleNodeWidthReport = useCallback((nodeId, width) => {
    console.log(`[TurnCanvas] Received width for ${nodeId}: ${width}`);
    setNodeWidths(prev => {
      if (prev[nodeId] === width) return prev;
      console.log('[TurnCanvas] Updating nodeWidths for', nodeId, 'to', width);
      return { ...prev, [nodeId]: width };
    });
  }, []);

  // Initial calculation of nodes and edges from the utility function
  // This initial call does not have canvasWidth or nodeWidths, so X positions will be default (e.g., 0)
  // The main useEffect will recalculate once those are available.
  const initialLayout = useMemo(() => {
    console.log('[TurnCanvas] Calculating initialLayout, visibleTurns count:', visibleTurns.length);
    // Pass undefined or default values for canvasWidth and nodeWidths for the initial pass
    // as they are not yet available. X positions will be updated by the main useEffect.
    return calculateNodesAndEdges(visibleTurns, undefined, undefined);
  }, [visibleTurns]);

  // Augment initial nodes with the onHeightReport and onWidthReport callbacks
  // This is passed to ReactFlow for the first render.
  const nodesWithCallbacks = useMemo(() => { // Renamed from nodesWithCallback
    console.log('[TurnCanvas] Augmenting initial nodes. initialLayout.nodes count:', initialLayout.nodes.length);
    const augmented = initialLayout.nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        onHeightReport: handleNodeHeightReport,
        onWidthReport: handleNodeWidthReport // ADDED: Pass width reporting callback
      }
    }));
    console.log('[TurnCanvas] nodesWithCallbacks created:', augmented.map(n => n.id));
    return augmented;
  }, [initialLayout.nodes, handleNodeHeightReport, handleNodeWidthReport]); // ADDED: handleNodeWidthReport dependency

  // Effect to set initial nodes once they are calculated and augmented
  useEffect(() => {
    console.log('[TurnCanvas] useEffect setting initial nodes. nodesWithCallbacks count:', nodesWithCallbacks.length);
    if (nodesWithCallbacks.length > 0) {
      setNodes(nodesWithCallbacks);
      setDisplayNodes(nodesWithCallbacks);
      setDisplayEdges(initialLayout.edges); // ADDED: Set initial displayEdges
    } else {
      console.log('[TurnCanvas] No nodesWithCallbacks, setting empty array to ReactFlow and displayNodes/Edges');
      setNodes([]);
      setDisplayNodes([]);
      setDisplayEdges([]); // ADDED: Clear displayEdges
    }
    // Ensure initialLayout.edges is a dependency if used directly here
  }, [nodesWithCallbacks, setNodes, initialLayout.edges]); // Renamed nodesWithCallback

  // Effect to adjust Y and X positions once all node heights, widths, and canvasWidth are known
  useEffect(() => {
    console.log(`[TurnCanvas] X/Y-ADJUSTMENT useEffect triggered. Visible turns: ${visibleTurns.length}, Heights known: ${Object.keys(nodeHeights).length}, Widths known: ${Object.keys(nodeWidths).length}, CanvasWidth: ${canvasWidth}`);

    if (
      visibleTurns.length > 0 &&
      Object.keys(nodeHeights).length === visibleTurns.length &&
      Object.keys(nodeWidths).length === visibleTurns.length && // ADDED: Check for all widths reported
      canvasWidth > 0 // ADDED: Check for valid canvasWidth
    ) {
      console.log('[TurnCanvas] X/Y-ADJUSTMENT: All node dimensions and canvasWidth potentially reported.');
      const allDimensionsReported = visibleTurns.every(turn => {
        const nodeIdStr = String(turn.id);
        const heightReported = nodeHeights[nodeIdStr] !== undefined && nodeHeights[nodeIdStr] > 0;
        const widthReported = nodeWidths[nodeIdStr] !== undefined && nodeWidths[nodeIdStr] > 0; // ADDED: Check width
        if (!heightReported) console.log(`[TurnCanvas] X/Y-ADJUSTMENT: Height not reported or zero for ${nodeIdStr}: ${nodeHeights[nodeIdStr]}`);
        if (!widthReported) console.log(`[TurnCanvas] X/Y-ADJUSTMENT: Width not reported or zero for ${nodeIdStr}: ${nodeWidths[nodeIdStr]}`); // ADDED: Log width issue
        return heightReported && widthReported;
      });
      
      if (!allDimensionsReported) {
        console.log('[TurnCanvas] X/Y-ADJUSTMENT: Not all dimensions reported adequately, skipping adjustment.');
        return;
      }

      if (displayNodes.length === 0 && visibleTurns.length > 0) {
        console.log('[TurnCanvas] X/Y-ADJUSTMENT: displayNodes is empty but visibleTurns exist. Bailing out. Should be populated by initial useEffect.');
        return;
      }
      
      // Recalculate nodes and edges with all available information
      console.log('[TurnCanvas] X/Y-ADJUSTMENT: Recalculating nodes and edges with actual dimensions and canvasWidth.');
      const { nodes: recalculatedNodes, edges: recalculatedEdges } = calculateNodesAndEdges(
        visibleTurns,
        canvasWidth, // Pass actual canvasWidth
        nodeWidths,  // Pass actual nodeWidths
        nodeHeights  // Pass actual nodeHeights (for Y calculation if utils needs it directly, though it uses it for edges too)
      );

      // Augment recalculated nodes with callbacks again, as calculateNodesAndEdges returns raw data
      const finalNodesWithCallbacks = recalculatedNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          onHeightReport: handleNodeHeightReport,
          onWidthReport: handleNodeWidthReport
        }
      }));

      // Conditional update to prevent re-render loops
      let changed = false;
      if (finalNodesWithCallbacks.length !== displayNodes.length) {
        changed = true;
      } else {
        for (let i = 0; i < finalNodesWithCallbacks.length; i++) {
          const originalNode = displayNodes.find(dn => dn.id === finalNodesWithCallbacks[i].id);
          if (!originalNode || 
              originalNode.position.y !== finalNodesWithCallbacks[i].position.y ||
              originalNode.position.x !== finalNodesWithCallbacks[i].position.x || // ADDED: Check X position
              Object.keys(originalNode.data).length !== Object.keys(finalNodesWithCallbacks[i].data).length) {
            changed = true;
            break;
          }
        }
      }
      // Also check if edges changed
      if (!changed && recalculatedEdges.length !== displayEdges.length) {
        changed = true;
      } else if (!changed) {
        // Basic check if edge IDs or source/target changed, more complex checks might be needed if edge objects are complex
        for (let i = 0; i < recalculatedEdges.length; i++) {
          const originalEdge = displayEdges.find(de => de.id === recalculatedEdges[i].id);
          if (!originalEdge || originalEdge.source !== recalculatedEdges[i].source || originalEdge.target !== recalculatedEdges[i].target) {
            changed = true;
            break;
          }
        }
      }

      if (changed) {
        console.log('[TurnCanvas] X/Y-ADJUSTMENT: Node positions/count or edges changed. Updating React Flow and display states.');
        console.log('New Nodes:', finalNodesWithCallbacks.map(n => ({id: n.id, x:n.position.x, y: n.position.y}) ));
        console.log('New Edges:', recalculatedEdges.map(e => e.id));
        setNodes(finalNodesWithCallbacks);
        setDisplayNodes(finalNodesWithCallbacks);
        setDisplayEdges(recalculatedEdges);
      } else {
        console.log('[TurnCanvas] X/Y-ADJUSTMENT: No actual change in node positions/count or edges, skipping display update.');
      }
    } else {
      console.log('[TurnCanvas] X/Y-ADJUSTMENT: Conditions not met (not enough turns/dimensions reported or canvasWidth missing).');
    }
  }, [visibleTurns, nodeHeights, nodeWidths, canvasWidth, displayNodes, displayEdges, setNodes, handleNodeHeightReport, handleNodeWidthReport]); // ADDED: nodeWidths, canvasWidth, handleNodeWidthReport, displayEdges

  // Edges are taken directly from the initial calculation, 
  // const { edges } = initialLayout; // No longer directly used for ReactFlow prop
  console.log("[TurnCanvas] Edges that *would have been* from initialLayout:", initialLayout.edges); // Keep for debug if needed
  console.log("[TurnCanvas] DisplayEdges state:", displayEdges); // Log displayEdges

  // Existing useEffect for logging dimensions - keep for debugging if needed
  useEffect(() => {
    if (turnCanvasWrapperRef.current) {
      console.log('[TurnCanvas] Wrapper div BoundingClientRect:', turnCanvasWrapperRef.current.getBoundingClientRect());
    }
  }, [initialLayout.nodes, visibleTurns, nodeHeights]);

  console.log('[TurnCanvas] Rendering ReactFlow with displayNodes:', displayNodes.map(n => n.id), 'and displayEdges:', displayEdges.map(e => e.id) ); // Log displayNodes and displayEdges

  return (
    <div
      ref={turnCanvasWrapperRef}
      data-testid="turn-canvas-wrapper"
      style={{
        flex: '1 1 0%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden',
        background: 'rgb(250, 250, 250)'
      }}
    >
      <ReactFlow
        nodes={displayNodes} // CHANGED: Use displayNodes state for the nodes prop
        edges={displayEdges}      // CHANGED: Use displayEdges state
        nodeTypes={useMemo(() => ({ turnNode: TurnNode }), [])} // nodeTypes should be memoized
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
          overflowY: 'visible', // ATTEMPT: Override React Flow's internal overflow:hidden
          // ReactFlow should determine its own height based on content, constrained by this flex item.
        }}
      >
        <Background gap={16} size={0.5} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

// ADDED: PropTypes for TurnCanvas
TurnCanvas.propTypes = {
  canvasWidth: PropTypes.number
};

TurnCanvas.defaultProps = {
  canvasWidth: 0
};

export default TurnCanvas; 