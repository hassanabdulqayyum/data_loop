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

export function clampZoom(viewport, minZoom = 0.4, maxZoom = 1.5) {
  // -----------------------------------------------------------------------
  // clampZoom – keeps the zoom factor within a comfortable reading range
  // -----------------------------------------------------------------------
  // React-Flow will sometimes zoom *very* far in (e.g. 3×) when only a couple
  // of nodes are visible, or zoom *very* far out (e.g. 0.1×) when dozens of
  // nodes are on screen.  Both extremes make the labels hard to read.
  //
  // This helper takes the viewport returned by `fitView()` and nudges the
  // `zoom` value so it never goes below `minZoom` nor above `maxZoom`.
  // Horizontal/vertical translations **stay untouched** – we only adjust the
  // scale.  The function returns a *new* viewport object and never mutates the
  // one received so it plays nicely with React state updates.
  //
  // Parameters
  // ----------
  // viewport – an object like `{ x, y, zoom }` from `reactFlowInstance`.
  // minZoom  – lowest allowed zoom factor (defaults to 0.4 ×).
  // maxZoom  – highest allowed zoom factor (defaults to 1.5 ×).
  //
  // Returns
  // -------
  // A fresh viewport object whose `zoom` sits inside the requested bounds.
  // -----------------------------------------------------------------------
  if (!viewport || typeof viewport.zoom !== 'number') return viewport;

  const clamped = Math.max(minZoom, Math.min(maxZoom, viewport.zoom));
  return { ...viewport, zoom: clamped };
}

/* -------------------------------------------------------------------------
 * anchorRootToCorner(viewport, rootNode, topMargin?, leftMargin?)
 * -------------------------------------------------------------------------
 * Same idea as `anchorRootToTop` but clamps both **vertical** *and* **horizontal*
 * position so the root node (Program) always starts `topMargin` pixels from
 * the top and `leftMargin` pixels from the left edge of the screen.
 *
 * This is useful when the lower levels (e.g. a wide persona grid) push the
 * auto-fit bounding box far to the right, leaving the root node off-screen on
 * the left.  By re-centring we guarantee the user can always see where the
 * tree begins without manual panning.
 */
export function anchorRootToCorner(
  viewport,
  rootNode,
  topMargin = 60,
  leftMargin = 60
) {
  if (!rootNode || !rootNode.position) return viewport;

  // Current on-screen coordinates of the root node.
  const screenX = rootNode.position.x * viewport.zoom + viewport.x;
  const screenY = rootNode.position.y * viewport.zoom + viewport.y;

  // How far do we need to move the camera?
  const deltaX = leftMargin - screenX;
  const deltaY = topMargin - screenY;

  return {
    ...viewport,
    x: viewport.x + deltaX,
    y: viewport.y + deltaY
  };
} 