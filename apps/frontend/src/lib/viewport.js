/*
viewport.js – tiny helpers for camera / viewport maths
=======================================================
These functions are **framework-agnostic**.  They receive plain objects and
return plain objects so you can unit-test them without booting React-Flow or
a browser.  All maths is done using the same co-ordinate system React-Flow
uses internally (positive X → right, positive Y → down).

Example
-------
```js
import { anchorRootToTop } from './viewport.js';

// Current transform returned by `reactFlowInstance.getViewport()`
const vp = { x: -350, y: -220, zoom: 0.6 };

// The Program node we want to pin near the top of the visible region.
const programNode = { position: { x: 0, y: 50 } };

// Ask the helper to nudge the camera so that node lands 80 px from the top.
const newVp = anchorRootToTop(vp, programNode, 80);
// → { x: -350, y: -170, zoom: 0.6 }
```

All helpers keep the **zoom factor untouched**; they only pan (translate) the
viewport.
*/

/* -------------------------------------------------------------------------
 * anchorRootToTop(viewport, rootNode, topMargin?)
 * -------------------------------------------------------------------------
 * Given the current React-Flow viewport `{ x, y, zoom }` and the *root node*
 * (the Program node in our case), this helper pans the viewport vertically so
 * the root appears exactly `topMargin` pixels from the top edge of the
 * screen.  Horizontal position and zoom remain unchanged.
 *
 * Parameters
 * ----------
 * viewport   – `{ x:number, y:number, zoom:number }` as returned by
 *              `reactFlowInstance.getViewport()`.
 * rootNode   – *Any* node object that carries `position.x` & `position.y` in
 *              **Flow co-ordinates** (i.e. not yet transformed by zoom/pan).
 * topMargin  – Distance in *screen pixels* you want between the top edge of
 *              the canvas and the root node.  Defaults to `60` which matches
 *              the 60 px buffer used in the Figma reference.
 *
 * Returns a **new** viewport object.  The function never mutates its inputs so
 * it behaves nicely inside immutable React state updates or reducers.
 */
export function anchorRootToTop(viewport, rootNode, topMargin = 60) {
  if (!rootNode || !rootNode.position) return viewport;

  // 1. Where is the root node *currently* rendered on screen?
  //    Formula:  screenY = (flowY * zoom) + translateY
  const currentScreenY = rootNode.position.y * viewport.zoom + viewport.y;

  // 2. How far do we need to move the camera so the root sits at `topMargin`?
  const requiredDelta = topMargin - currentScreenY;

  // 3. Return a *new* viewport with the y-translation adjusted.  X & zoom stay
  //    as-is so we keep the horizontal centring and the zoom level chosen by
  //    the earlier `fitView()` call.
  return {
    ...viewport,
    y: viewport.y + requiredDelta
  };
} 