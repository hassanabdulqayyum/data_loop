/*
HierarchyGraph.jsx – Displays Program → Module → Topic → Persona tree using React-Flow.

Props:
• programs        – the nested array returned by /hierarchy (Programs at root).
• selectedIds     – { moduleId, topicId, personaId } so we can highlight.
• onSelect(nodeId, nodeType)  – callback invoked when any node is clicked, passing its id and type ('program', 'module', 'day', 'persona').
• graphRect       – the rectangle of the graph for viewport calculations.

The graph attempts a basic auto-layout logic for centering and distributing nodes.
*/
import React, { useMemo, useLayoutEffect, useEffect } from 'react';
import ReactFlow, { Background, Handle, Position, useReactFlow, useNodesInitialized } from 'reactflow';
import 'reactflow/dist/style.css';
import { computeViewportForRoot } from '../lib/viewport.js';
import { packIntoRows } from '../lib/layout.js';
import { measureChipWidth } from '../lib/textMeasurer.js';

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

// ------------------------------------------------------------------
// Design reference constants (single source of truth)
// ------------------------------------------------------------------
// Keeping these near the top makes it trivial for designers/devs to tweak the
// visual scale in one place without hunting through layout maths later on.
export const REF_NODE_WIDTH = 360;    // Program / Module / Topic chip width (fits "Module 1: Defusion")
// We no longer hard-code a persona chip width; each persona now shrinks or
// expands to wrap its own text content, so the constant becomes obsolete.
// Heights are dictated by line-height + padding so we don't hard-code them.

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

  // ------------------------------------------------------------------
  // Let the chip's width be dictated by its text content so labels like
  // "Focus" no longer sit inside an oversized grey bar.  We still keep a
  // *minimum* width for persona chips so very short words don't produce
  // awkward skinny boxes, but ancestor tiers (Program / Module / Topic)
  // receive no hard-coded width at all – their size is purely the text
  // length plus the 20-px side padding.
  // ------------------------------------------------------------------
  const WIDTHS = {
    program: 'max-content',
    module: 'max-content',
    day: 'max-content',
    persona: 'max-content'
  };

  return (
    <div
      style={{
        ...commonTextStyle,
        background: backgroundColor,
        border: borderStyle,
        borderRadius: '12px',
        padding: '8px 8px',
        width: WIDTHS[type],
        minWidth: 'auto',
        maxWidth: 'max-content',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
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

function HierarchyGraph({ programs, selectedIds, onSelect }) {
  const { nodes, edges } = useMemo(() => {
    const n = [];
    const e = [];

    if (!programs || programs.length === 0) {
      return { nodes: n, edges: e };
    }

    /*-----------------------------------------------
     * LAYOUT CONSTANTS – tweak here if spacing ever
     * feels cramped or too loose on different screens
     *---------------------------------------------*/
    const CHIP_HEIGHT = 44;      // Height of every chip regardless of tier (px)
    const whiteGap = 74;         // Vertical gap **between tiers** (px)

    // Design spec says the horizontal gap between neighbouring chips is a
    // tidy 21 px across *all* tiers, so we keep that as a constant here.
    const CHIP_GAP = 21;

    // Same spec calls for 33 px between *rows* that belong to the **same**
    // tier (e.g. when a long Modules line wraps).  Persona rows already used
    // the same value so we re-use it for consistency.
    const ROW_GAP = 33;

    // -------------------------------------------------------------
    // Node sizing
    // -------------------------------------------------------------
    // These constants mirror the exact pixel sizes in the Figma PNGs so the
    // UI stays 1-for-1 with the design regardless of zoom.  If the designer
    // later tweaks a chip size we only need to touch these numbers.
    // ---------------------------------------------------------------------
    const baseNodeWidth = REF_NODE_WIDTH;

    let programY = 0; // Anchor Program tier at y=0; viewport will later nudge it to the desired 43-px offset.

    programs.forEach((program) => {
      /* --------------------------------------------------------------
       * 1. PROGRAM (root) – always a single chip centred at x=0
       * ------------------------------------------------------------*/
      const progW = measureChipWidth(program.id);
      n.push({
        id: program.id,
        type: 'programNode',
        data: { label: program.id },
        position: { x: -progW / 2, y: programY },
        selectable: true,
      });

      /* --------------------------------------------------------------
       * 2. MODULE tier – may wrap over multiple rows.
       * ------------------------------------------------------------*/
      const filteredModules = program.modules.filter((mod, idx) => {
        // Existing visibility rules stay untouched – they simply decide which
        // modules make it into the packing helper.
        if (
          selectedIds?.moduleId !== null &&
          selectedIds?.moduleId !== undefined &&
          selectedIds?.moduleId !== mod.id
        ) {
          return false;
        }
        if (selectedIds?.moduleId === null && idx > 0 && program.modules.length > 1) {
          return false;
        }
        return true;
      });

      const measuredModules = filteredModules.map((mod) => ({
        id: mod.id,
        width: measureChipWidth(mod.id),
        ref: mod,
      }));

      const availableWidth = 1200 * 0.9; // Using fallback width, assuming 1200px default, CanvasWrapper will fit.
      const moduleRows = packIntoRows(measuredModules, CHIP_GAP, availableWidth);

      let moduleRowY = programY + CHIP_HEIGHT + whiteGap;

      // Mapping so later tiers can find the X/Y position of their parent.
      const modulePos = {};

      moduleRows.forEach((rowObj) => {
        const rowStartX = -rowObj.width / 2; // Centre around x=0.
        let chipX = rowStartX;

        rowObj.chips.forEach((chip) => {
          const mod = chip.ref;
          const isModuleSelected = selectedIds?.moduleId === mod.id;

          // Refined logic for effective border width and node state
          const isTopicOrPersonaSelected = selectedIds?.topicId !== null || selectedIds?.personaId !== null;
          const isTrulySelectedModule = isModuleSelected && !isTopicOrPersonaSelected;
          const isAncestorModule = isModuleSelected && isTopicOrPersonaSelected;

          let effectiveBorderWidth = 1; // Default for unselected
          if (isTrulySelectedModule) {
            effectiveBorderWidth = 3;
          } else if (isAncestorModule) {
            effectiveBorderWidth = 0; // Ancestors have no border in CustomNode
          }

          n.push({
            id: mod.id,
            type: 'moduleNode',
            data: {
              label: mod.id,
              selected: isTrulySelectedModule, // Pass true only if it's the actual selected item
              ancestor: isAncestorModule,
            },
            // Subtract *full* effective border width so the visual centre (including outline)
            // aligns perfectly with the canvas spine.
            position: { x: chipX - effectiveBorderWidth, y: moduleRowY },
            selectable: true,
          });

          // Record for day tier linking.
          modulePos[mod.id] = { x: chipX, y: moduleRowY };

          // Edge root → module.
          e.push({ id: `${program.id}-${mod.id}`, source: program.id, target: mod.id, type: 'straight' });

          chipX += chip.width + CHIP_GAP;
        });

        // Advance to next row if needed.
        moduleRowY += CHIP_HEIGHT + ROW_GAP;
      });

      /* After we exit the Module loop `moduleRowY` already equals
         bottom-edge-of-last-row + ROW_GAP (because we added CHIP_HEIGHT when
         we advanced the pointer).  To position the Topic tier we therefore
         discard that ROW_GAP and replace it with the design-spec whiteGap of
         74 px.  No extra CHIP_HEIGHT is needed here. */
      const dayTierStartY = moduleRowY - ROW_GAP + whiteGap;

      /* --------------------------------------------------------------
       * 3. DAY (topic) tier – only rendered if a module is selected.
       * ------------------------------------------------------------*/
      const activeModule = program.modules.find((m) => m.id === selectedIds?.moduleId);
      if (!activeModule) return; // Skip entire day tier when none selected.

      const filteredDays = activeModule.days.filter((day, idx) => {
        // Visibility logic for days
        if (
          selectedIds?.topicId !== null &&
          selectedIds?.topicId !== undefined &&
          selectedIds?.topicId !== day.id
        ) {
          return false;
        }
        if (selectedIds?.topicId === null && idx > 0 && activeModule.days.length > 1) {
          return false;
        }
        return true;
      });

      const measuredDays = filteredDays.map((day) => ({
        id: day.id,
        width: measureChipWidth(day.id),
        ref: day,
      }));

      // Use the same fallback width strategy for days
      const dayRows = packIntoRows(measuredDays, CHIP_GAP, availableWidth);
      let dayRowY = dayTierStartY;
      const dayPos = {};

      dayRows.forEach((rowObj) => {
        const rowStartX = -rowObj.width / 2; // Centre around x=0
        let chipX = rowStartX;

        rowObj.chips.forEach((chip) => {
          const day = chip.ref;
          const isTopicSelected = selectedIds?.topicId === day.id;
          const isPersonaSelectedForThisTopic = selectedIds?.personaId !== null && activeModule.days.find(d => d.id === selectedIds.topicId) === day;

          const isTrulySelectedDay = isTopicSelected && !selectedIds?.personaId;
          const isAncestorDay = isTopicSelected && selectedIds?.personaId;

          let effectiveBorderWidth = 1; // Default for unselected
          if (isTrulySelectedDay) {
            effectiveBorderWidth = 3;
          } else if (isAncestorDay) {
            effectiveBorderWidth = 0; // Ancestors have no border
          }

          n.push({
            id: day.id,
            type: 'dayNode',
            data: {
              label: day.id,
              selected: isTrulySelectedDay,
              ancestor: isAncestorDay,
            },
            position: { x: chipX - effectiveBorderWidth, y: dayRowY },
            selectable: true,
          });
          dayPos[day.id] = { x: chipX, y: dayRowY };
          if (modulePos[activeModule.id]) {
            e.push({ id: `${activeModule.id}-${day.id}`, source: activeModule.id, target: day.id, type: 'straight' });
          }
          chipX += chip.width + CHIP_GAP;
        });
        dayRowY += CHIP_HEIGHT + ROW_GAP;
      });

      const personaTierStartY = dayRowY - ROW_GAP + whiteGap;

      const activeDay = activeModule.days.find((d) => d.id === selectedIds?.topicId);
      if (!activeDay || !activeDay.personas) return; // Skip persona tier

      const measuredPersonas = activeDay.personas.map((p) => ({
        id: p.id,
        width: measureChipWidth(p.id), // Width per persona based on text
        ref: p,
      }));

      // Use the same fallback width strategy for personas
      const personaRows = packIntoRows(measuredPersonas, CHIP_GAP, availableWidth);
      let personaRowY = personaTierStartY;

      personaRows.forEach((rowObj) => {
        const rowStartX = -rowObj.width / 2; // Centre around x=0
        let chipX = rowStartX;
        rowObj.chips.forEach((chip) => {
          const persona = chip.ref;
          const isPersonaSelected = selectedIds?.personaId === persona.id;
          
          let effectiveBorderWidth = 1; // Default for unselected
          if (isPersonaSelected) {
            effectiveBorderWidth = 3;
          }

          n.push({
            id: persona.id,
            type: 'personaNode',
            data: { label: persona.id, selected: isPersonaSelected }, // Pass selected state
            position: { x: chipX - effectiveBorderWidth, y: personaRowY },
            selectable: true,
          });
          if (dayPos[activeDay.id]) {
            e.push({ id: `${activeDay.id}-${persona.id}`, source: activeDay.id, target: persona.id, type: 'straight' });
          }
          chipX += chip.width + CHIP_GAP;
        });
        personaRowY += CHIP_HEIGHT + ROW_GAP;
      });
    });
    return { nodes: n, edges: e };
  }, [programs, selectedIds]);

  const reactFlowInstance = useReactFlow();
  const nodesInitialized = useNodesInitialized();

  // Handler for React Flow's onNodeClick
  const handleNodeClick = (event, node) => {
    if (onSelect) {
      // Determine nodeType based on node.type (which comes from our custom node types)
      let nodeType = 'unknown';
      if (node.type === 'programNode') nodeType = 'program';
      else if (node.type === 'moduleNode') nodeType = 'module';
      else if (node.type === 'dayNode') nodeType = 'day';
      else if (node.type === 'personaNode') nodeType = 'persona';
      onSelect(node.id, nodeType); // Call the onSelect prop from LoadView
    }
  };

  if (!programs || programs.length === 0) {
    return <div style={{ textAlign: 'center', padding: '20px' }}>Loading hierarchy or no data...</div>;
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={handleNodeClick} // Pass the adapted click handler to React Flow
      fitView
      fitViewOptions={{ padding: 0.1 }}
      nodesDraggable={false}
      nodesConnectable={false}
      selectNodesOnDrag={false} // Prevent selection on drag, only on click
      style={{ background: '#F3F4F6' }} // Match the div background in LoadView for consistency
    >
      <Background color="#ccc" variant="dots" gap={16} size={1} />
    </ReactFlow>
  );
}

export default HierarchyGraph; 