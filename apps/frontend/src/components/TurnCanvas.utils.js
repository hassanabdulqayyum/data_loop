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
 * calculateNodesAndEdges – deterministic layout builder that centres nodes
 * horizontally based on the **widest bubble** so the grey spine never moves.
 *
 * @param {Array<Object>} turns  Visible turns (root excluded)
 * @param {number} containerW   Width of the canvas column in px
 * @returns {{nodes:Array, edges:Array}}
 */
export function calculateNodesAndEdges(turns, containerW) {
  if (!Array.isArray(turns)) throw new TypeError('turns must be an array');

  if (!containerW) return { nodes: [], edges: [], leftOffset: 0 };

  // --------------------------------------------------------------
  // 1️⃣  Figure out the widest bubble so we can anchor all nodes on
  //     a common centre.  Real rendered width = text + 28-px padding
  //     (14 px each side) + outline thickness (worst-case 3-px).
  // --------------------------------------------------------------
  const MAX_W = 724;
  const PADDING_X = 28; // matches TurnNode padding 14-px each side
  const FONT = '500 26px Inter';

  const widest = Math.min(
    MAX_W,
    Math.max(...turns.map((t) => measureTextWidth(t.text || '', FONT, PADDING_X)))
  );

  // Constant left offset shared by every node so their **centres** line up
  const leftOffset = containerW / 2 - widest / 2;

  // ----------------------- Build nodes --------------------------
  const nodes = turns.map((turn, idx) => ({
    id: String(turn.id),
    type: 'turnNode',
    data: { turn, widest },
    position: {
      x: leftOffset,
      y: FIRST_NODE_OFFSET_Y + idx * VERTICAL_GAP
    }
  }));

  // ----------------------- Build edges --------------------------
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

  return { nodes, edges, leftOffset };
}

// keep export of DEFAULT_CENTER_OFFSET_X only for legacy imports
export const DEFAULT_CENTER_OFFSET_X = 0; 