/*
viewport.test.js – unit-tests for viewport helpers
=================================================
We keep these tests tiny: they only call the pure function `anchorRootToTop` so
no DOM or React-Flow context is needed.
*/

import { anchorRootToTop } from '../src/lib/viewport.js';

describe('anchorRootToTop', () => {
  it('moves the viewport so the root node sits at the requested margin', () => {
    // Screen transform before panning.
    const viewport = { x: -100, y: -200, zoom: 0.5 };

    // The Program node sits at y = 50 in flow coordinates.
    const rootNode = { position: { x: 0, y: 50 } };

    // Ask the helper to pin the node 60 px from the top.
    const adjusted = anchorRootToTop(viewport, rootNode, 60);

    // After the shift, the rendered (screen) Y of the root must be 60.
    const screenY = rootNode.position.y * viewport.zoom + adjusted.y;
    expect(screenY).toBe(60);
  });
}); 