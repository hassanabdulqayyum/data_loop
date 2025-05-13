/*
HierarchyGraph.jsx – Displays Program → Module → Topic → Persona tree using React-Flow.

Props:
• tree            – the nested array returned by /hierarchy (Programs at root).
• selectedIds     – { moduleId, topicId, personaId } so we can highlight.
• onSelect(node)  – callback invoked when any node is clicked.

The graph is rendered with fixed positions because the catalogue is small.
Depth 0 = y 0, depth 1 = y 120, depth 2 = y 240, depth 3 = y 360.
Within each depth we space nodes 200 px apart.
*/
import React, { useMemo } from 'react';
import ReactFlow, { Background } from 'reactflow';
import 'reactflow/dist/style.css';

function HierarchyGraph({ tree, selectedIds, onSelect }) {
  // Helpers to build React-Flow nodes & edges deterministically.
  const { nodes, edges } = useMemo(() => {
    const n = [];
    const e = [];
    let xPos = 0;

    tree.forEach((program) => {
      // Program node (depth 0)
      n.push({
        id: program.id,
        data: { label: program.id },
        position: { x: 400, y: 0 },
        style: {
          background: '#9CA3AF',
          color: '#fff',
          padding: '4px 12px',
          borderRadius: 6,
          fontWeight: 600,
          border: 'none'
        },
        selectable: false
      });

      program.modules.forEach((mod, modIdx) => {
        const modX = 200 * modIdx;
        n.push({
          id: mod.id,
          data: { label: mod.id },
          position: { x: modX, y: 120 },
          style: {
            background: '#fff',
            padding: '4px 12px',
            borderRadius: 6,
            border: `2px solid ${selectedIds?.moduleId === mod.id ? '#1E40AF' : '#000'}`
          }
        });
        e.push({ id: `${program.id}-${mod.id}`, source: program.id, target: mod.id });

        mod.days.forEach((day, dayIdx) => {
          if (selectedIds?.moduleId !== mod.id) return; // hide topics until module selected

          const dayX = modX + 150 * dayIdx;
          n.push({
            id: day.id,
            data: { label: day.id },
            position: { x: dayX, y: 240 },
            style: {
              background: '#fff',
              padding: '3px 10px',
              borderRadius: 6,
              border: `2px solid ${selectedIds?.topicId === day.id ? '#1E40AF' : '#000'}`,
              fontSize: 12
            }
          });
          e.push({ id: `${mod.id}-${day.id}`, source: mod.id, target: day.id });

          day.personas.forEach((per, perIdx) => {
            if (selectedIds?.topicId !== day.id) return; // hide personas until topic selected
            const perX = dayX + 110 * perIdx;
            n.push({
              id: per.id,
              data: { label: per.id },
              position: { x: perX, y: 360 },
              style: {
                background: '#fff',
                padding: '2px 8px',
                borderRadius: 6,
                border: `2px solid ${selectedIds?.personaId === per.id ? '#1E40AF' : '#000'}`,
                fontSize: 11
              }
            });
            e.push({ id: `${day.id}-${per.id}`, source: day.id, target: per.id });
          });
        });
      });
    });
    return { nodes: n, edges: e };
  }, [tree, selectedIds]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        onNodeClick={(_, node) => onSelect(node.id)}
      >
        <Background gap={16} size={0.5} />
      </ReactFlow>
    </div>
  );
}

export default HierarchyGraph; 