/*
viewport.test.js – unit-tests for viewport helpers
=================================================
We keep these tests tiny: they only call the pure function `anchorRootToTop` so
no DOM or React-Flow context is needed.
*/

import { anchorRootToTop, clampZoom, computeViewportForRoot } from '../src/lib/viewport.js';

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

describe('clampZoom', () => {
  it('leaves the zoom untouched when already inside the range', () => {
    const vp = { x: 0, y: 0, zoom: 0.8 };
    const adjusted = clampZoom(vp, 0.4, 1.5);
    expect(adjusted.zoom).toBe(0.8);
  });

  it('bumps the zoom up when below the minimum', () => {
    const vp = { x: 0, y: 0, zoom: 0.1 };
    const adjusted = clampZoom(vp, 0.4, 1.5);
    expect(adjusted.zoom).toBe(0.4);
  });

  it('caps the zoom when above the maximum', () => {
    const vp = { x: 0, y: 0, zoom: 2.2 };
    const adjusted = clampZoom(vp, 0.4, 1.5);
    expect(adjusted.zoom).toBe(1.5);
  });
});

describe('computeViewportForRoot', () => {
  it('places node centre at wrapper midpoint and desired Y', () => {
    const vp = { x: -100, y: -100, zoom: 1 };
    const rootNode = { position: { x: 0, y: 0 }, width: 120, height: 60 };
    const rect = { left: 0, top: 72, width: 800, height: 600 };
    const adjusted = computeViewportForRoot(vp, rootNode, rect, 80);

    const screenX = rootNode.position.x * vp.zoom + adjusted.x + rootNode.width / 2;
    const screenY = rootNode.position.y * vp.zoom + adjusted.y + rootNode.height / 2;

    // The helper should centre the node horizontally inside the wrapper and
    // place it `topMargin` pixels from the top (plus half the node height
    // because we align centres, not edges).  We compute the *desired* screen
    // coordinates directly from the rect instead of hard-coding magic numbers
    // so the test stays valid if the wrapper changes size in future refactors.
    const expectedX = rect.left + rect.width / 2;
    const expectedY = rect.top + 80 + rootNode.height / 2;

    expect(screenX).toBe(expectedX);
    expect(screenY).toBe(expectedY);
  });
}); 