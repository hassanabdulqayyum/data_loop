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

import React, { useEffect, useCallback, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useReactFlow, useNodesInitialized } from 'reactflow';

// Define a constant for the maximum node width used in TurnCanvas
const MAX_NODE_WIDTH_FOR_CENTERING = 724; // px, from TurnCanvas.utils.js

/**
 * CanvasWrapper - A component that wraps a React Flow instance to provide
 * automatic viewport management like fitting nodes or setting a manual view.
 *
 * @param {object} props - The component's props.
 * @param {React.ReactNode} props.children - The React Flow instance or other content to wrap.
 * @param {Array} [props.deps=[]] - Dependencies that trigger a re-calculation of the viewport.
 * @param {boolean} [props.useFitView=true] - If true, uses fitView to fit all nodes. If false, sets a manual viewport (zoom 1, y-offset, and calculated x-center).
 * @returns {JSX.Element} The CanvasWrapper component.
 *
 * Example usage:
 * ```jsx
 * // For fitting all nodes (e.g., LoadView)
 * <CanvasWrapper deps={[nodes.length]}>
 *   <ReactFlow … />
 * </CanvasWrapper>
 *
 * // For manual viewport (e.g., ScriptView for scrolling)
 * <CanvasWrapper deps={[nodes.length]} useFitView={false}>
 *   <ReactFlow … />
 * </CanvasWrapper>
 * ```
 */
function CanvasWrapper({ children, deps = [], useFitView = true }) {
  const reactFlowInstance = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const wrapperRef = useRef(null); // Ref for the wrapper div
  const [wrapperWidth, setWrapperWidth] = useState(0); // State to store the wrapper's width

  // Log dimensions of CanvasWrapper's root div when useFitView is false
  useEffect(() => {
    if (!useFitView && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      console.log('[CanvasWrapper] Root div getBoundingClientRect() (useFitView=false):', rect);
      console.log('[CanvasWrapper] Root div style (useFitView=false):', wrapperRef.current.style.cssText);
    }
    // Log this when useFitView changes or when the ref is available
  }, [useFitView, wrapperRef.current]);

  // Effect to update wrapperWidth when the wrapper div mounts or resizes
  useEffect(() => {
    const currentRef = wrapperRef.current;
    if (currentRef) {
      const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
          setWrapperWidth(entry.contentRect.width);
        }
      });
      resizeObserver.observe(currentRef);
      setWrapperWidth(currentRef.clientWidth); // Initial width
      return () => resizeObserver.unobserve(currentRef);
    }
  }, []);


  // Helper that (re)centres the viewport using React-Flow's native API.
  const manageViewport = useCallback(() => {
    if (!nodesInitialized || reactFlowInstance.getNodes().length === 0) {
      return;
    }

    try {
      if (useFitView) {
        reactFlowInstance.fitView({ padding: 0.1 });
        // After fitView, adjust the viewport for the 43px top offset
        const viewport = reactFlowInstance.getViewport();
        const desiredTopOffset = 43; // The visual offset we want from the top
        reactFlowInstance.setViewport({
          x: viewport.x,
          y: desiredTopOffset / viewport.zoom, // Ensure 43px visual offset regardless of zoom
          zoom: viewport.zoom
        });
      } else {
        // Manual viewport for scrolling cases like ScriptView
        const desiredTopOffset = 43;
        let xOffset = 0;
        if (wrapperWidth > 0) {
          // Center the content (max width MAX_NODE_WIDTH_FOR_CENTERING) within the wrapperWidth
          xOffset = (wrapperWidth - MAX_NODE_WIDTH_FOR_CENTERING) / 2;
        }
        reactFlowInstance.setViewport({
          x: xOffset, // Calculated x for centering
          y: desiredTopOffset, // y offset, zoom is 1
          zoom: 1 // Ensure zoom is 1 for natural size
        });
      }
    } catch (err) {
      // Swallow in production – better a slightly off-centre graph than a
      // crashed UI.  Still useful to log during development.
      if (process.env.NODE_ENV !== 'test') console.warn('CanvasWrapper.manageViewport failed', err);
    }
  }, [reactFlowInstance, nodesInitialized, useFitView, wrapperWidth]); // Added useFitView and wrapperWidth

  // 1) First mount + deps change (passed from parent) + when manageViewport callback itself changes.
  useEffect(() => {
    if (wrapperWidth > 0 || useFitView) { // Only run if width is known (for !useFitView) or if useFitView is true
        manageViewport();
    }
  }, [manageViewport, wrapperWidth, useFitView, ...deps]); // Added wrapperWidth, useFitView

  // 2) Window resize → debounce to avoid thrashing.
  // This effect also depends on the 'manageViewport' callback.
  useEffect(() => {
    let timeoutId = null;
    const onResize = () => {
      clearTimeout(timeoutId);
      // wrapperWidth will be updated by ResizeObserver, triggering the effect above
      // For useFitView=true, we still want to recenter
      if (useFitView) {
        timeoutId = setTimeout(manageViewport, 200);
      }
    };
    window.addEventListener('resize', onResize);
    // For !useFitView, ResizeObserver on wrapperRef handles width changes.
    // For useFitView, we still need window resize for general refitting.
    return () => {
      window.removeEventListener('resize', onResize);
      clearTimeout(timeoutId);
    };
  }, [manageViewport, useFitView]); // Removed direct dependency on centre (now manageViewport)

  const wrapperStyle = {
    width: '100%',
    ...(useFitView ? { height: '100%' } : { minHeight: '100%' }),
  };

  return (
    <div ref={wrapperRef} style={wrapperStyle}>
      {/* Changed height to minHeight conditionally based on useFitView.
          - For useFitView=true (e.g., LoadView), height: '100%' provides a stable area for fitView.
          - For useFitView=false (e.g., ScriptView), minHeight: '100%' allows content to overflow for scrolling. */}
      {children}
    </div>
  );
}

CanvasWrapper.propTypes = {
  children: PropTypes.node.isRequired,
  deps: PropTypes.array,
  useFitView: PropTypes.bool // Added prop type for useFitView
};

// Default props
CanvasWrapper.defaultProps = {
  deps: [],
  useFitView: true,
};

export default CanvasWrapper; 