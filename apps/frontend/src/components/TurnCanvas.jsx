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
 *
 * @example
 * // Used within ScriptView, wrapped by CanvasWrapper and ReactFlowProvider
 * <ReactFlowProvider>
 *   <CanvasWrapper useFitView={false}>
 *     <TurnCanvas />
 *   </CanvasWrapper>
 * </ReactFlowProvider>
 */
function TurnCanvas() {
  const turnCanvasWrapperRef = useRef(null); // Ref for the main div
  const { setNodes, getNodes } = useReactFlow(); // Get setNodes and getNodes from useReactFlow

  const [displayNodes, setDisplayNodes] = useState([]); // ADDED: State for nodes to render

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

  // Initial calculation of nodes and edges from the utility function
  const initialLayout = useMemo(() => {
    console.log('[TurnCanvas] Calculating initialLayout, visibleTurns count:', visibleTurns.length);
    return calculateNodesAndEdges(visibleTurns);
  }, [visibleTurns]);

  // Augment initial nodes with the onHeightReport callback
  // This is passed to ReactFlow for the first render.
  const nodesWithCallback = useMemo(() => {
    console.log('[TurnCanvas] Augmenting initial nodes. initialLayout.nodes count:', initialLayout.nodes.length);
    const augmented = initialLayout.nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        onHeightReport: handleNodeHeightReport
      }
    }));
    console.log('[TurnCanvas] nodesWithCallback created:', augmented.map(n => n.id));
    return augmented;
  }, [initialLayout.nodes, handleNodeHeightReport]);

  // Effect to set initial nodes once they are calculated and augmented
  useEffect(() => {
    console.log('[TurnCanvas] useEffect setting initial nodes. nodesWithCallback count:', nodesWithCallback.length);
    if (nodesWithCallback.length > 0) {
      setNodes(nodesWithCallback);
      setDisplayNodes(nodesWithCallback); // ADDED: Update displayNodes
    } else {
      console.log('[TurnCanvas] No nodesWithCallback, setting empty array to ReactFlow and displayNodes');
      setNodes([]);
      setDisplayNodes([]); // ADDED: Update displayNodes
    }
  }, [nodesWithCallback, setNodes]);

  // Effect to adjust Y positions once all node heights are known
  useEffect(() => {
    console.log('[TurnCanvas] Y-ADJUSTMENT useEffect triggered. Visible turns:', visibleTurns.length, 'Heights known:', Object.keys(nodeHeights).length);
    // console.log('[TurnCanvas] Y-ADJUSTMENT: current displayNodes before adjustment:', displayNodes.map(n=>n.id)); // Keep this for detailed debugging if needed

    if (visibleTurns.length > 0 && Object.keys(nodeHeights).length === visibleTurns.length) {
      console.log('[TurnCanvas] Y-ADJUSTMENT: All node heights potentially reported.');
      const allHeightsReported = visibleTurns.every(turn => {
        const reported = nodeHeights[String(turn.id)] !== undefined && nodeHeights[String(turn.id)] > 0;
        if (!reported) console.log(`[TurnCanvas] Y-ADJUSTMENT: Height not reported or zero for ${String(turn.id)}: ${nodeHeights[String(turn.id)]}`);
        return reported;
      });
      
      if (!allHeightsReported) {
        console.log('[TurnCanvas] Y-ADJUSTMENT: Not all heights reported adequately, skipping Y adjustment.');
        return;
      }

      if (displayNodes.length === 0 && visibleTurns.length > 0) {
        console.log('[TurnCanvas] Y-ADJUSTMENT: displayNodes is empty but visibleTurns exist. Bailing out. Should be populated by initial useEffect.');
        return;
      }
      
      const currentNodesMap = new Map(displayNodes.map(n => [n.id, n]));
      const newCalculatedNodes = [];
      let accumulatedY = FIRST_NODE_OFFSET_Y;

      for (let i = 0; i < visibleTurns.length; i++) {
        const turn = visibleTurns[i];
        const nodeId = String(turn.id);
        const currentNode = currentNodesMap.get(nodeId);
        const height = nodeHeights[nodeId];

        if (!currentNode) {
          console.warn(`[TurnCanvas] Y-ADJUSTMENT: Node with ID ${nodeId} not found in current displayNodes. Skipping.`);
          continue;
        }
        if (height === undefined || height === 0) {
          console.warn(`[TurnCanvas] Y-ADJUSTMENT: Height for node ${nodeId} is ${height}. Critical error, should have been caught by allHeightsReported. Bailing.`);
          return;
        }

        newCalculatedNodes.push({
          ...currentNode,
          position: {
            ...currentNode.position,
            y: accumulatedY
          },
          data: {
            ...currentNode.data,
            onHeightReport: handleNodeHeightReport
          }
        });
        accumulatedY += height + REQUIRED_VERTICAL_GAP;
      }

      // Conditional update to prevent re-render loops
      let changed = false;
      if (newCalculatedNodes.length !== displayNodes.length) {
        changed = true;
      } else {
        for (let i = 0; i < newCalculatedNodes.length; i++) {
          // More robust check: find corresponding node in displayNodes by ID, as order might not be guaranteed if displayNodes was manipulated elsewhere (though unlikely here)
          const originalNode = displayNodes.find(dn => dn.id === newCalculatedNodes[i].id);
          if (!originalNode || originalNode.position.y !== newCalculatedNodes[i].position.y) {
            // Also check if the number of data properties changed, or onHeightReport got lost (should not happen with spread)
            if (!originalNode || Object.keys(originalNode.data).length !== Object.keys(newCalculatedNodes[i].data).length) {
                changed = true;
                break;
            }
            changed = true;
            break;
          }
        }
      }

      if (changed) {
        console.log('[TurnCanvas] Y-ADJUSTMENT: Node positions or count changed. Updating React Flow and displayNodes.', newCalculatedNodes.map(n => ({id: n.id, y: n.position.y}) ));
        setNodes(newCalculatedNodes);
        setDisplayNodes(newCalculatedNodes);
      } else {
        console.log('[TurnCanvas] Y-ADJUSTMENT: No actual change in node positions/count, skipping displayNodes update to prevent loop.');
        // If only React Flow internal state needs sync without triggering a displayNodes-based rerender of this effect:
        // setNodes(newCalculatedNodes); // Potentially still useful if RF internal state could diverge and needs strict sync.
        // However, if displayNodes didn't change, and newCalculatedNodes are based on displayNodes + heights, then RF state should be in sync if setDisplayNodes was the last thing.
      }
    } else {
      console.log('[TurnCanvas] Y-ADJUSTMENT: Conditions not met (not enough visible turns or not all heights reported).');
    }
  }, [visibleTurns, nodeHeights, displayNodes, setNodes, handleNodeHeightReport]);

  // Edges are taken directly from the initial calculation, 
  // React Flow should update them automatically when nodes move.
  const { edges } = initialLayout;
  console.log("[TurnCanvas] Edges being passed to ReactFlow:", edges); // ADDED: Log edges

  // Existing useEffect for logging dimensions - keep for debugging if needed
  useEffect(() => {
    if (turnCanvasWrapperRef.current) {
      console.log('[TurnCanvas] Wrapper div BoundingClientRect:', turnCanvasWrapperRef.current.getBoundingClientRect());
    }
  }, [initialLayout.nodes, visibleTurns, nodeHeights]);

  console.log('[TurnCanvas] Rendering ReactFlow with displayNodes:', displayNodes.map(n => n.id) ); // Log displayNodes

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
        edges={edges}      // Edges from initial layout, React Flow updates paths
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

export default TurnCanvas; 