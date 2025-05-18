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
export const VERTICAL_GAP = 143; // px (≈ 100 bubble + 43 connector)

/**
 * calculateNodesAndEdges – deterministic layout builder.
 *
 * This function calculates the positions for script turn nodes and the edges connecting them.
 * Node X positions are set to a common baseline (0), as horizontal centering of the entire
 * group of nodes is handled by the parent CanvasWrapper component using React Flow's fitView.
 * Vertical positioning is based on a defined starting offset and a consistent gap between turns.
 * The actual width of each node is calculated and included in the node data, which can be
 * used by the TurnNode component for its rendering.
 *
 * @param {Array<Object>} turns - Array of visible turn objects (root excluded).
 * @returns {{nodes: Array<Object>, edges: Array<Object>}} Object containing arrays of nodes and edges for React Flow.
 * @throws {TypeError} If the `turns` argument is not an array.
 */
export function calculateNodesAndEdges(turns) {
  if (!Array.isArray(turns)) throw new TypeError('turns must be an array');

  const MAX_W = 724; // Maximum width for a turn node
  const PADDING_X = 28; // Horizontal padding within a turn node (14px each side)
  const FONT = '500 26px Inter'; // Font used for text measurement

  // Pre-measure every bubble to determine its intrinsic width.
  // This width is passed to the TurnNode and can be used for its styling.
  const bubbleWidths = turns.map((t) =>
    Math.min(MAX_W, measureTextWidth(t.text || '', FONT, PADDING_X))
  );

  const nodes = turns.map((turn, idx) => {
    const width = bubbleWidths[idx];
    return {
      id: String(turn.id),
      type: 'turnNode', // Specifies the custom node component to use
      data: { turn, width }, // Data passed to the TurnNode component
      position: {
        x: 0, // X position is now 0; CanvasWrapper handles group centering via fitView.
        y: FIRST_NODE_OFFSET_Y + idx * VERTICAL_GAP // Vertical stacking logic remains
      }
    };
  });

  const edges = turns.slice(1).map((turn, idx) => ({
    id: `e${turns[idx].id}-${turn.id}`,
    source: String(turns[idx].id), // ID of the source node for the edge
    target: String(turn.id), // ID of the target node for the edge
    type: 'default', // CHANGED: from 'straight' to 'default' for testing
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