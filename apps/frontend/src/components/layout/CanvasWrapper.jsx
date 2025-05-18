/*
CanvasWrapper.jsx – Auto-centering helper for React-Flow graphs
==============================================================
Plain-English summary
---------------------
Any screen that renders a React-Flow canvas wants the nodes to appear
centred every time:
• when the component first mounts,
• when the browser window is resized,
• or when some external dependency (e.g. the list of nodes) changes.

Instead of duplicating `fitView()` calls across every page we wrap the
canvas in **CanvasWrapper**.  The wrapper calls `fitView({ padding:0.1 })`
exactly when needed, using React-Flow's own coordinate system so no
manual pixel maths is involved.

Usage example
-------------
```jsx
<CanvasWrapper deps={[nodes.length]}>
  <ReactFlow … />
</CanvasWrapper>
```
`deps` is an optional array – whenever any value changes the wrapper
runs another `fitView()`.  Pass `nodes.length` or a version counter so
the graph recentres after nodes change.
*/

import React, { useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useReactFlow, useNodesInitialized } from 'reactflow';

function CanvasWrapper({ children, deps = [] }) {
  const reactFlowInstance = useReactFlow();
  const nodesInitialized = useNodesInitialized();

  // Helper that (re)centres the viewport using React-Flow's native API.
  const centre = useCallback(() => {
    if (!nodesInitialized || reactFlowInstance.getNodes().length === 0) {
      return;
    }

    try {
      reactFlowInstance.fitView({ padding: 0.1 });
      // After fitView, adjust the viewport for the 43px top offset
      const viewport = reactFlowInstance.getViewport();
      const desiredTopOffset = 43; // The visual offset we want from the top
      reactFlowInstance.setViewport({
        x: viewport.x,
        y: desiredTopOffset / viewport.zoom, // Ensure 43px visual offset regardless of zoom
        zoom: viewport.zoom
      });
    } catch (err) {
      // Swallow in production – better a slightly off-centre graph than a
      // crashed UI.  Still useful to log during development.
      if (process.env.NODE_ENV !== 'test') console.warn('CanvasWrapper.fitView failed', err);
    }
  }, [reactFlowInstance, nodesInitialized]);

  // 1) First mount + deps change (passed from parent) + when centre callback itself changes.
  useEffect(() => {
    centre();
  }, [centre, ...deps]);

  // 2) Window resize → debounce to avoid thrashing.
  // This effect also depends on the 'centre' callback.
  useEffect(() => {
    let timeoutId = null;
    const onResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(centre, 200);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      clearTimeout(timeoutId);
    };
  }, [centre]);

  return children;
}

CanvasWrapper.propTypes = {
  children: PropTypes.node.isRequired,
  /*
  ---------------
  deps (optional)
  ---------------
  Pass an array of values that, when changed, should trigger another
  `fitView()` call – for instance `nodes.length`, `nodesVersion`, or a
  boolean when a sidebar toggles.  Defaults to an empty array which means
  centre only on first mount + window resize.
  */
  deps: PropTypes.array
};

export default CanvasWrapper; 