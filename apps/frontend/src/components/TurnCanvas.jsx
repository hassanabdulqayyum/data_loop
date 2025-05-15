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

  /*
  We memoise the heavy transformation step so React only recomputes nodes &
  edges when the underlying `turns` array actually changes.
  */
  const { nodes, edges } = useMemo(() => {
    // Basic vertical layout: every card is 200 px below previous one.
    const verticalGap = 120;

    const nodes = turns.map((turn, idx) => ({
      id: String(turn.id),
      type: 'turnNode',
      data: { turn },
      position: { x: 0, y: idx * verticalGap }
    }));

    const edges = turns.slice(1).map((turn, idx) => ({
      id: `e${turns[idx].id}-${turn.id}`,
      source: String(turns[idx].id),
      target: String(turn.id),
      type: 'smoothstep'
    }));

    return { nodes, edges };
  }, [turns]);

  // React-Flow needs to know our custom node component.
  const nodeTypes = useMemo(() => ({ turnNode: TurnNode }), []);

  return (
    <div style={{ flex: 1, height: '100%', background: '#fafafa' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        zoomOnScroll={false}
        panOnScroll
      >
        {/* Subtle dotted background so users see canvas area boundaries */}
        <Background gap={16} size={0.5} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

export default TurnCanvas; 