/*
TurnCanvas.jsx – Vertical stack wrapper around React-Flow
=======================================================
Purpose in plain English:
This component receives the *list of turns* from the global zustand store and
transforms them into the `nodes` + `edges` arrays that React-Flow expects.
It then renders a **non-interactive** (for now) vertical flow chart so the
editor has a visual representation of the script.

Down the line
-------------
Future micro-tasks will make the layout smarter (border-aware alignment,
scroll-into-view, live selection highlighting, etc.).  Today we only care
about plumbing everything together so the canvas shows something useful on
screen.

Example usage (already wired in <ScriptView>):
```jsx
<TurnCanvas />
```
*/

import React, { useMemo } from 'react';
import ReactFlow, { Background, Controls } from 'reactflow';
import 'reactflow/dist/style.css';
import useScriptStore from '../store/useScriptStore.js';
import TurnNode from './TurnNode.jsx';

function TurnCanvas() {
  // Pull the gold-path turns from the store – array of objects.
  const turns = useScriptStore((s) => s.turns);

  // ---------------------------------------------------------------------------
  // We filter out the invisible ROOT node because the UI should start at the
  // system/user/assistant layer.  This matches the Figma design where the
  // root is purely a structural anchor and never shown to editors.
  // ---------------------------------------------------------------------------
  const visibleTurns = React.useMemo(
    () => turns.filter((t) => t.role !== 'root'),
    [turns]
  );

  /*
  We memoise the heavy transformation step so React only recomputes nodes &
  edges when the underlying `visibleTurns` array actually changes.
  */
  const { nodes, edges } = useMemo(() => {
    // Vertical layout: y-gap is 43 px between BOX BORDERS so the grey
    // connector line exactly matches the Figma measurement.  We achieve this
    // by placing nodes 43 px below the **previous node's bottom edge** – that
    // bottom edge height varies, but because nodes are centred horizontally
    // React-Flow recalculates fine.  For simplicity we keep a constant gap –
    // minor variations in perceived line length are acceptable at this stage.
    const verticalGap = 150; // px – rough average card height + 43-px line

    const nodes = visibleTurns.map((turn, idx) => ({
      id: String(turn.id),
      type: 'turnNode',
      data: { turn },
      position: { x: 0, y: idx * verticalGap }
    }));

    const edges = visibleTurns.slice(1).map((turn, idx) => ({
      id: `e${visibleTurns[idx].id}-${turn.id}`,
      source: String(visibleTurns[idx].id),
      target: String(turn.id),
      type: 'straight', // clean vertical line
      style: {
        stroke: '#CCCCCC',
        strokeWidth: 2.5
      }
    }));

    return { nodes, edges };
  }, [visibleTurns]);

  // React-Flow needs to know our custom node component.
  const nodeTypes = useMemo(() => ({ turnNode: TurnNode }), []);

  return (
    <div style={{ flex: 1, height: '100%', background: '#fafafa' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        minZoom={1}
        maxZoom={1}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        panOnScroll
      >
        {/* Subtle dotted background so users see canvas area boundaries */}
        <Background gap={16} size={0.5} />
        {/* Interactive controls hidden to keep UI minimal */}
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

export default TurnCanvas; 