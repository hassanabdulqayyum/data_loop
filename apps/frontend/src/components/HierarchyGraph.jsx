/*
HierarchyGraph.jsx – Displays Program → Module → Topic → Persona tree using React-Flow.

Props:
• tree            – the nested array returned by /hierarchy (Programs at root).
• selectedIds     – { moduleId, topicId, personaId } so we can highlight.
• onSelect(nodeId, nodeType)  – callback invoked when any node is clicked, passing its id and type ('program', 'module', 'day', 'persona').

The graph attempts a basic auto-layout logic for centering and distributing nodes.
*/
import React, { useMemo } from 'react';
import ReactFlow, { Background, Handle, Position } from 'reactflow';
import 'reactflow/dist/style.css';

/*
 * All node labels now mirror the Figma spec: 36 px font-size with a ‑5 % letter
 * spacing for that tight headline look.  The typeface remains "Inter".
 */
const commonTextStyle = {
  fontFamily: 'Inter, sans-serif',
  fontSize: '28px',
  fontWeight: '500',
  letterSpacing: '-0.05em',
  color: '#000000'
};

// Custom node to ensure consistent styling and no default handles
const CustomNode = ({ data, selected, type }) => {
  /* `data.ancestor` is true when the node was once selected but the user has
   * since drilled *deeper* into its children.  In that state the spec wants a
   * grey fill and *no* blue outline (similar to the Program node). */
  const { ancestor } = data;

  let borderStyle;
  let backgroundColor = '#F3F3F3'; // Default for mid-level nodes

  if (type === 'program' || ancestor) {
    backgroundColor = '#c8c8c8';
    borderStyle = 'none';
  } else {
    borderStyle = selected ? '3px solid #6C80DA' : '1px solid #c8c8c8';
  }

  // Persona nodes stay white so they remain the visual "leaf" focus.
  if (type === 'persona') backgroundColor = '#FFFFFF';

  return (
    <div
      style={{
        ...commonTextStyle,
        background: backgroundColor,
        border: borderStyle,
        borderRadius: '12px',
        padding: '10px 20px', // Increased padding for larger font
        textAlign: 'center',
      }}
    >
      {data.label}
      {/* Hidden handles to satisfy React Flow if needed, but visually not present */}
      <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
      <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
    </div>
  );
};

const nodeTypes = {
  programNode: (props) => <CustomNode {...props} type="program" />,
  moduleNode: (props) => <CustomNode {...props} type="module" selected={props.data.selected} />,
  dayNode: (props) => <CustomNode {...props} type="day" selected={props.data.selected} />,
  personaNode: (props) => <CustomNode {...props} type="persona" selected={props.data.selected} />,
};

function HierarchyGraph({ tree, selectedIds, onSelect }) {
  const { nodes, edges } = useMemo(() => {
    const n = [];
    const e = [];
    const yGap = 180; // Increased vertical gap for larger nodes
    const baseNodeWidth = 200; // Estimate, actual width depends on label

    let programY = 50;

    tree.forEach((program) => {
      const programNodeWidth = program.id.length * 15 + 40; // Rough estimate
      n.push({
        id: program.id,
        type: 'programNode',
        data: { label: program.id },
        position: { x: 0, y: programY }, // Centering will be handled by fitView and layout adjustments
        selectable: true,
      });

      let moduleY = programY + yGap;
      const totalModuleWidth = program.modules.length * (baseNodeWidth + 50) - 50;
      let moduleStartX = -(totalModuleWidth / 2) + (baseNodeWidth / 2);

      program.modules.forEach((mod, modIdx) => {
        if (selectedIds?.moduleId !== mod.id && selectedIds?.moduleId !== null && !program.modules.find(m=>m.id === selectedIds?.moduleId)) return; // Hide if a specific module is selected and it's not this one
        if (selectedIds?.moduleId === null && modIdx > 0 && program.modules.length > 1) return; // Show only first module if none selected
        
        const isModuleSelected = selectedIds?.moduleId === mod.id;
        n.push({
          id: mod.id,
          type: 'moduleNode',
          data: { label: mod.id, selected: isModuleSelected, ancestor: isModuleSelected && selectedIds?.topicId !== null },
          position: { x: moduleStartX + modIdx * (baseNodeWidth + 50) , y: moduleY },
          selectable: true,
        });
        e.push({ id: `${program.id}-${mod.id}`, source: program.id, target: mod.id, type: 'straight' });

        if (isModuleSelected) {
          let dayY = moduleY + yGap;
          const totalDayWidth = mod.days.length * (baseNodeWidth + 40) - 40;
          let dayStartX = moduleStartX + modIdx * (baseNodeWidth + 50) -(totalDayWidth/2) + (baseNodeWidth/2);

          mod.days.forEach((day, dayIdx) => {
             if (selectedIds?.topicId !== day.id && selectedIds?.topicId !== null && !mod.days.find(d=>d.id === selectedIds?.topicId)) return;
             if (selectedIds?.topicId === null && dayIdx > 0 && mod.days.length > 1) return;

            const isTopicSelected = selectedIds?.topicId === day.id;
            n.push({
              id: day.id,
              type: 'dayNode',
              data: { label: day.id, selected: isTopicSelected, ancestor: isTopicSelected && selectedIds?.personaId !== null },
              position: { x: dayStartX + dayIdx * (baseNodeWidth + 40) , y: dayY },
              selectable: true,
            });
            e.push({ id: `${mod.id}-${day.id}`, source: mod.id, target: day.id, type: 'straight' });

            if (isTopicSelected) {
              let personaY = dayY + yGap;
              const totalPersonaWidth = day.personas.length * (baseNodeWidth + 20) - 20;
              let personaStartX = dayStartX + dayIdx * (baseNodeWidth + 40) - (totalPersonaWidth/2) + (baseNodeWidth/2) ;

              day.personas.forEach((per, perIdx) => {
                const isPersonaSelected = selectedIds?.personaId === per.id;
                n.push({
                  id: per.id,
                  type: 'personaNode',
                  data: { label: per.id, selected: isPersonaSelected },
                  position: { x: personaStartX + perIdx * (baseNodeWidth + 20) , y: personaY },
                  selectable: true,
                });
                e.push({ id: `${day.id}-${per.id}`, source: day.id, target: per.id, type: 'straight' });
              });
            }
          });
        }
      });
    });
    return { nodes: n, edges: e };
  }, [tree, selectedIds]);

  const defaultEdgeOptions = {
    style: { stroke: '#c8c8c8', strokeWidth: 3 }, // Thicker connectors per design
    type: 'straight'
  };

  return (
    <div /* Adds a soft gutter so nodes never touch the viewport edge. */
         style={{ width: '100%', height: '100%', padding: '24px', boxSizing: 'border-box' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        nodesDraggable={false}
        nodesConnectable={false} // This should hide handles
        elementsSelectable={true}
        onNodeClick={(_, node) => {
          let nodeType = 'persona'; // Default to persona
          if (node.type === 'programNode') nodeType = 'program';
          else if (node.type === 'moduleNode') nodeType = 'module';
          else if (node.type === 'dayNode') nodeType = 'day';
          onSelect(node.id, nodeType);
        }}
        selectNodesOnDrag={false}
      >
        <Background gap={20} size={1} color="#f0f0f0" />
      </ReactFlow>
    </div>
  );
}

export default HierarchyGraph; 