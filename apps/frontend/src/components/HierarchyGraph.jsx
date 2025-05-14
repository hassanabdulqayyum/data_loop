/*
HierarchyGraph.jsx – Displays Program → Module → Topic → Persona tree using React-Flow.

Props:
• tree            – the nested array returned by /hierarchy (Programs at root).
• selectedIds     – { moduleId, topicId, personaId } so we can highlight.
• onSelect(nodeId, nodeType)  – callback invoked when any node is clicked, passing its id and type ('program', 'module', 'day', 'persona').
• graphRect       – the rectangle of the graph for viewport calculations.

The graph attempts a basic auto-layout logic for centering and distributing nodes.
*/
import React, { useMemo, useLayoutEffect } from 'react';
import ReactFlow, { Background, Handle, Position, useReactFlow, useNodesInitialized } from 'reactflow';
import 'reactflow/dist/style.css';
import { computeViewportForRoot } from '../lib/viewport.js';

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

function HierarchyGraph({ tree, selectedIds, onSelect, graphRect }) {
  const { nodes, edges } = useMemo(() => {
    const n = [];
    const e = [];
    /*-----------------------------------------------
     * LAYOUT CONSTANTS – tweak here if spacing ever
     * feels cramped or too loose on different screens
     *---------------------------------------------*/
    const CHIP_HEIGHT = 44;      // 28 px font + 8 px padding above + below
    const whiteGap = 74;         // Visible empty space between chip borders (Figma)

    // -------------------------------------------------------------
    // Node sizing
    // -------------------------------------------------------------
    // These constants mirror the exact pixel sizes in the Figma PNGs so the
    // UI stays 1-for-1 with the design regardless of zoom.  If the designer
    // later tweaks a chip size we only need to touch these numbers.
    // ---------------------------------------------------------------------
    const baseNodeWidth = REF_NODE_WIDTH;

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

      let moduleY = programY + CHIP_HEIGHT + whiteGap;
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
          let dayY = moduleY + CHIP_HEIGHT + whiteGap;
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
              /* -----------------------------------------------------------------
               * Persona placement – dynamic row wrapping
               * -----------------------------------------------------------------
               * 1. We measure each persona's text width using a temporary canvas
               *    so every chip hugs its content (textWidth + 16 px padding).
               * 2. We accumulate chips left-to-right, inserting a 21-px gap in
               *    front of every chip except the first in the row.
               * 3. As soon as the running row width would exceed the available
               *    canvas width (graphRect.width × 0.9 safety), we break and
               *    start a fresh row beneath the previous one (33-px row gap).
               * 4. After all rows are known we loop a second time to push
               *    nodes into React-Flow, centring each row under the Topic
               *    chip so the tree stays balanced.
               * ----------------------------------------------------------------- */

              const colGap = 21;
              const rowGap = 33;

              // Build a measurement context once – avoids repeated DOM calls.
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              ctx.font = `${commonTextStyle.fontWeight} ${commonTextStyle.fontSize} ${commonTextStyle.fontFamily}`;

              // Safety guard when graphRect is missing (e.g. unit tests).
              const availableWidth = (graphRect?.width ?? 1200) * 0.9;

              const rows = [];
              let currentRow = [];
              let currentRowWidth = 0;

              day.personas.forEach((per, index) => {
                const textW = ctx.measureText(per.id).width;
                const chipW = textW + 16; // 8 px padding left + right

                const needed = currentRow.length === 0 ? chipW : chipW + colGap;

                if (currentRowWidth + needed > availableWidth) {
                  // Commit the current row and reset accumulators.
                  rows.push({ chips: currentRow, width: currentRowWidth });
                  currentRow = [];
                  currentRowWidth = 0;
                }

                currentRow.push({ id: per.id, width: chipW });
                currentRowWidth += needed;
              });

              // Push the final row.
              if (currentRow.length) {
                rows.push({ chips: currentRow, width: currentRowWidth });
              }

              // -----  Now create React-Flow nodes row by row  -----
              const chipHeight = 44; // 28 px font + 8 px padding top + bottom
              let personaY = dayY + CHIP_HEIGHT + whiteGap; // Position of first row.

              rows.forEach((rowObj) => {
                const { chips, width: rowW } = rowObj;

                const rowStartX =
                  dayStartX +
                  dayIdx * (baseNodeWidth + 40) -
                  rowW / 2 +
                  baseNodeWidth / 2;

                let chipX = rowStartX;

                chips.forEach((chip, chipIdx) => {
                  const isPersonaSelected = selectedIds?.personaId === chip.id;

                  n.push({
                    id: chip.id,
                    type: 'personaNode',
                    data: { label: chip.id, selected: isPersonaSelected },
                    position: { x: chipX, y: personaY },
                    selectable: true,
                  });

                  // Advance X for next chip.
                  chipX += chip.width + colGap;
                });

                personaY += chipHeight + rowGap; // Move down by chip height + gap.
              });

              // NOTE: We intentionally do **not** push Topic→Persona edges in
              // order to keep the canvas clean – the vertical hierarchy already
              // implies the relationship.
            }
          });
        }
      });
    });
    return { nodes: n, edges: e };
  }, [tree, selectedIds]);

  /* ------------------------------------------------------------------
   * Smart viewport logic (option B from our discussion)
   * ---------------------------------------------------
   * 1. After every render where the **node set changes** we let React-Flow
   *    choose a reasonable zoom via `fitView()`.
   * 2. We then *nudge* the camera so the Program node (root) sits `80` pixels
   *    from the top of the canvas, matching the Figma screenshot.
   * 3. When deeper levels of the tree are revealed the effect fires again,
   *    so the new children are always visible and the root anchor is kept.
   * ------------------------------------------------------------------ */
  const reactFlowInstance = useReactFlow();
  const nodesInitialised = useNodesInitialized();

  // useLayoutEffect fires **before** the browser paints the updated DOM, so
  // any viewport tweaks we make here are applied invisibly—removing the last
  // flicker some users noticed.
  useLayoutEffect(() => {
    if (!nodesInitialised || nodes.length === 0) return;

    // ------------------------------------------------------------------
    // NEW STRATEGY (May-2025): we **lock the zoom factor to 1×** so the UI
    // is always rendered at native pixel size.  That means no scroll-wheel or
    // pinch gestures will scale the canvas – users can still pan, but the
    // text stays crisp and the chip sizes match the Figma 1-for-1.
    // ------------------------------------------------------------------

    // 1. Grab the current viewport, force zoom to 1.
    let vp = { ...reactFlowInstance.getViewport(), zoom: 1 };

    // 2. Centre the Program node `80` px from the top edge so the hierarchy
    //    always starts in a predictable spot.  We need the *hydrated* nodes
    //    (those contain runtime width/height measurements) to do this.
    const hydratedNodes =
      typeof reactFlowInstance.getNodes === 'function'
        ? reactFlowInstance.getNodes()
        : [];

    const programNode = hydratedNodes.find((n) => n.type === 'programNode');
    vp = computeViewportForRoot(vp, programNode, graphRect, 50);

    // 3. Apply the viewport instantly (no animation) so the load feels snappy.
    reactFlowInstance.setViewport(vp, { duration: 0 });

    // eslint-disable-next-line react-hooks/exhaustive-deps – instance is stable.
  }, [nodes, nodesInitialised]);

  const defaultEdgeOptions = {
    style: { stroke: '#c8c8c8', strokeWidth: 3 }, // Thicker connectors per design
    type: 'straight'
  };

  return (
    /*
     * Wrapper div previously carried a 24-px padding on all sides which, combined
     * with the parent container's own margin, produced visible white gutters
     * around the canvas.  We drop that padding so the React-Flow surface can
     * claim the full allotted space.  If future designs need a buffer we can
     * re-introduce a smaller margin or rely on fitView spacing.
     */
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        minZoom={1}
        maxZoom={1}
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