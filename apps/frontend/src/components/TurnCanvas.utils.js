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

export const FIRST_NODE_OFFSET_Y = 44; // px
export const VERTICAL_GAP = 143; // px (≈ 100 bubble + 43 connector)
export const DEFAULT_CENTER_OFFSET_X = -362; // px (−½ × 724-px max width)

/**
 * calculateNodesAndEdges – deterministic layout builder
 * @param {Array<Object>} turns – *visible* turns – must exclude the root.
 * @param {number} [centreOffsetX=DEFAULT_CENTER_OFFSET_X] – x-coordinate for
 *        the *left* border of each node so their **visual centre** aligns on
 *        the vertical spine.
 * @returns {{nodes:Array, edges:Array}} – ready for React-Flow.
 */
export function calculateNodesAndEdges(turns, centreOffsetX = DEFAULT_CENTER_OFFSET_X) {
  if (!Array.isArray(turns)) {
    throw new TypeError('turns must be an array');
  }

  // -------------------------------------------------------------------------
  // Build nodes – each one carries the original turn inside data.turn so the
  // custom <TurnNode> component can render role, text and metadata.
  // -------------------------------------------------------------------------
  const nodes = turns.map((turn, idx) => ({
    id: String(turn.id),
    type: 'turnNode',
    data: { turn },
    position: {
      x: centreOffsetX,
      y: FIRST_NODE_OFFSET_Y + idx * VERTICAL_GAP
    }
  }));

  // -------------------------------------------------------------------------
  // Build edges – simple parent→child straight line with the mandated 2.5-px
  // #CCCCCC stroke.  We assume the input `turns` array is already in the
  // correct parent-first order (depth asc, ts asc) because the API guarantees
  // that ordering.
  // -------------------------------------------------------------------------
  const edges = turns.slice(1).map((turn, idx) => ({
    id: `e${turns[idx].id}-${turn.id}`,
    source: String(turns[idx].id),
    target: String(turn.id),
    type: 'straight',
    style: {
      stroke: '#CCCCCC',
      strokeWidth: 2.5
    }
  }));

  return { nodes, edges };
} 