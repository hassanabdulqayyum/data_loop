/*
TurnCanvas.utils.js – pure helper to build React-Flow nodes & edges
==================================================================
This tiny module exists so **we can unit-test the mathematically important
layout rules in complete isolation** from any browser or React-Flow runtime.
The rules come straight from the Figma spec and the user story:

1. The root turn is hidden so the list starts with the first *visible* turn.
2. Every visible turn is centred horizontally on the canvas spine.
   – We achieve this by positioning the **left-hand corner** of each node at
     `x = centreOffset` where
     `centreOffset = (graphAreaWidth / 2) − (MAX_BUBBLE_WIDTH / 2)`.
     The default `centreOffset` argument therefore equals `-362` which is
     half of the 724-px maximum bubble width; callers can override this once
     they know their container width.
3. The first node sits *44 px below* the navigation bar, so we apply a
   constant `FIRST_NODE_OFFSET_Y = 44`.
4. The grey connector between two successive nodes measures exactly **43 px**.
   As we can only approximate the dynamic bubble height *ahead* of rendering,
   we add an average 100 px bubble height to this 43 px gap, giving a
   vertical step of **143 px** per node.  Designers accept a ±10 px wiggle.
5. Connector styling: 2.5 px stroke, colour #CCCCCC.

The function is pure – given a list of *visible* turns and an optional x-offset
it always returns the same `nodes` and `edges` arrays.  This makes it trivial
to unit test and reuse across alternative canvas implementations.

Example usage
-------------
```js
import { calculateNodesAndEdges } from './TurnCanvas.utils.js';

const turns = [
  { id: '1', role: 'assistant', text: 'Hi' },
  { id: '2', role: 'user',      text: 'Hello' }
];

const { nodes, edges } = calculateNodesAndEdges(turns);
```
*/

import { measureTextWidth } from '../lib/textMeasurer.js';

export const FIRST_NODE_OFFSET_Y = 44; // px
// export const VERTICAL_GAP = 143; // px (≈ 100 bubble + 43 connector) - This is replaced by dynamic height + fixed gap
const REQUIRED_VERTICAL_GAP_BETWEEN_NODES = 43; // px, the desired edge-to-edge gap
const MAX_NODE_WIDTH_FALLBACK = 724; // Fallback width if not reported

/**
 * calculateNodesAndEdges – deterministic layout builder.
 *
 * This function calculates the positions for script turn nodes and the edges connecting them.
 * Node X positions are calculated to center each node horizontally based on its actual width and the provided canvasWidth.
 * Node Y positions are calculated based on the actual reported height of the preceding node and a fixed vertical gap.
 * If actual dimensions (width/height) or canvasWidth are not provided, it may use fallbacks or default positioning.
 *
 * @param {Array<Object>} turns - Array of visible turn objects (root excluded).
 * @param {number} [canvasWidth] - The width of the canvas area. Used for horizontal centering.
 * @param {Object.<string, number>} [nodeWidths] - A map of nodeId to its actual rendered width.
 * @param {Object.<string, number>} [nodeHeights] - A map of nodeId to its actual rendered height.
 * @returns {{nodes: Array<Object>, edges: Array<Object>}} Object containing arrays of nodes and edges for React Flow.
 * @throws {TypeError} If the `turns` argument is not an array.
 */
export function calculateNodesAndEdges(turns, canvasWidth, nodeWidths, nodeHeights) {
  if (!Array.isArray(turns)) throw new TypeError('turns must be an array');

  const nodes = [];
  let accumulatedY = FIRST_NODE_OFFSET_Y;

  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i];
    const nodeIdStr = String(turn.id);

    let currentTurnWidth = MAX_NODE_WIDTH_FALLBACK; // Default/fallback width
    if (nodeWidths && nodeWidths[nodeIdStr] !== undefined && nodeWidths[nodeIdStr] > 0) {
      currentTurnWidth = nodeWidths[nodeIdStr];
    } else {
      // Fallback: Could use measureTextWidth here if desired for an initial estimate before actuals are reported
      // For now, using MAX_NODE_WIDTH_FALLBACK ensures it doesn't break if widths aren't ready
      console.warn(`[calculateNodesAndEdges] Width for node ${nodeIdStr} not available or invalid, using fallback ${MAX_NODE_WIDTH_FALLBACK}px.`);
    }

    let xPosition = 0; // Default X if canvasWidth is not available
    if (canvasWidth && canvasWidth > 0) {
      xPosition = (canvasWidth - currentTurnWidth) / 2;
    } else {
      console.warn(`[calculateNodesAndEdges] canvasWidth not available or invalid (${canvasWidth}), defaulting xPosition to 0 for node ${nodeIdStr}.`);
    }
    
    // The data.width property is still useful for TurnNode if it wants to use it for internal styling or checks
    // It should reflect the width used for positioning or the best known width.
    const nodeDataWidth = currentTurnWidth; 

    nodes.push({
      id: nodeIdStr,
      type: 'turnNode', 
      data: { turn, width: nodeDataWidth }, // Pass turn and the determined width
      position: {
        x: xPosition,
        y: accumulatedY 
      }
    });

    // Update accumulatedY for the next node
    // Use reported height if available, otherwise a fallback (though this can lead to overlaps/gaps)
    let currentTurnHeight = 100; // Arbitrary fallback height if not reported
    if (nodeHeights && nodeHeights[nodeIdStr] !== undefined && nodeHeights[nodeIdStr] > 0) {
      currentTurnHeight = nodeHeights[nodeIdStr];
    } else {
      // This case should ideally be avoided by ensuring nodeHeights are reported before this recalculation for final layout
      console.warn(`[calculateNodesAndEdges] Height for node ${nodeIdStr} not available or invalid, using fallback ${currentTurnHeight}px for Y progression.`);
    }
    accumulatedY += currentTurnHeight + REQUIRED_VERTICAL_GAP_BETWEEN_NODES;
  }

  const edges = turns.slice(1).map((turn, idx) => ({
    id: `e${turns[idx].id}-${turn.id}`,
    source: String(turns[idx].id), // ID of the source node for the edge
    target: String(turn.id), // ID of the target node for the edge
    type: 'straight', // REVERTED: from 'default' back to 'straight'
    animated: false, // ADDED: Explicitly disable animation
    style: {
      stroke: '#CCCCCC', // Edge color
      strokeWidth: 2.5 // Edge thickness
    }
  }));

  return { nodes, edges }; // Return only nodes and edges
}

// keep export of DEFAULT_CENTER_OFFSET_X only for legacy imports
// This might be used by tests or other parts of the codebase not yet updated.
// For new calculations, X is 0 and centering is external.
export const DEFAULT_CENTER_OFFSET_X = 0; 