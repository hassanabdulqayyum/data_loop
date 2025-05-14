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
export const REF_PERSONA_WIDTH = 180; // Persona chip width – wider for long words like "Procrastination"
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
  // Fixed widths so chips never stretch / shrink with text length.  We pull
  // the same constants as the layout maths for perfect alignment.
  // ------------------------------------------------------------------
  const WIDTHS = {
    program: REF_NODE_WIDTH,
    module: REF_NODE_WIDTH,
    day: REF_NODE_WIDTH,
    persona: 'auto'  // persona resolves via minWidth later
  };

  return (
    <div
      style={{
        ...commonTextStyle,
        background: backgroundColor,
        border: borderStyle,
        borderRadius: '12px',
        padding: '10px 20px', // Increased padding for larger font
        width: WIDTHS[type],
        minWidth: type === 'persona' ? REF_PERSONA_WIDTH : REF_NODE_WIDTH,
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
    const yGap = 180;            // Vertical gap between hierarchy levels

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
              // We switch from a single horizontal strip to a *grid* so the
              // canvas width no longer explodes when a topic carries many
              // personas.  The rule is simple: **max 6 personas per row**.
              // Extra personas automatically wrap onto new rows.

              const colGap = 60;           // Horizontal gap inside persona grid
              const rowGap = 160;          // Vertical gap between persona rows

              // -----------------------------------------------------------------
              // Dynamic column count – the grid expands or contracts to fill the
              // available canvas width **at world co-ordinates** (i.e. before
              // zoom is applied).  The logic is:
              //    columns = floor( viewportWidth  /  (personaWidth + colGap) )
              // If the calculation yields < 1 we fall back to 1 so at least
              // one card is visible.
              // -----------------------------------------------------------------
              // We can only use *approximate* width here because React-Flow's
              // `viewport.zoom` is not yet known (the layout runs *before* we
              // calculate the final zoom).  A good heuristic is to assume a
              // neutral scale of 1 which still adapts nicely on common
              // laptop widths (> 1280 px).  We recalculate the *exact* zoom
              // later in the viewport effect, so any small mismatch is
              // corrected automatically.
              const worldViewportWidth = (graphRect?.width ?? 1200);
              const tentativeCols = Math.floor(worldViewportWidth / (REF_PERSONA_WIDTH + colGap));
              const maxPerRow = Math.max(1, tentativeCols);

              // How many columns will the *widest* row actually occupy?  Never
              // more than the number of personas we have.
              const gridCols = Math.min(maxPerRow, day.personas.length);

              const gridWidth = gridCols * (REF_PERSONA_WIDTH + colGap) - colGap;

              // Centre the grid under the Day node.
              let personaGridStartX =
                dayStartX +
                dayIdx * (baseNodeWidth + 40) -
                gridWidth / 2 +
                baseNodeWidth / 2;

              let personaY = dayY + yGap; // Y coordinate of the first row

              day.personas.forEach((per, perIdx) => {
                const row = Math.floor(perIdx / maxPerRow);
                const col = perIdx % maxPerRow;

                const x = personaGridStartX + col * (REF_PERSONA_WIDTH + colGap);
                const y = personaY + row * rowGap;

                const isPersonaSelected = selectedIds?.personaId === per.id;

                n.push({
                  id: per.id,
                  type: 'personaNode',
                  data: { label: per.id, selected: isPersonaSelected },
                  position: { x, y },
                  selectable: true,
                });

                e.push({
                  id: `${day.id}-${per.id}`,
                  source: day.id,
                  target: per.id,
                  type: 'straight',
                });
              });
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

    // 1. Run the auto-fit calculation *instantly* (duration 0) so the user does
    //    not perceive the temporary zoom that React-Flow uses to measure node
    //    positions.  This prevents the noticeable "zoom in then back out" flash.
    reactFlowInstance.fitView({ padding: 0.1, duration: 0 });

    // 2. Grab *hydrated* nodes which now include runtime `width` values so we
    //    can work out the zoom factor required for uniform chip sizes.
    const hydratedNodes =
      typeof reactFlowInstance.getNodes === 'function'
        ? reactFlowInstance.getNodes()
        : [];

    // Find the *largest* width among non-persona nodes.  We purposely exclude
    // persona chips because they are smaller by design.
    const structuralNodes = hydratedNodes.filter(
      (n) => n.type === 'programNode' || n.type === 'moduleNode' || n.type === 'dayNode'
    );

    const largestWidth = structuralNodes.reduce((acc, n) => Math.max(acc, n.width || 0), 0);

    // Desired on-screen width for those chips is our reference constant.
    const TARGET_WIDTH = REF_NODE_WIDTH;

    // Zoom needed so the largest node ends up exactly TARGET_WIDTH px wide.
    let desiredZoom = largestWidth > 0 ? TARGET_WIDTH / largestWidth : 1;

    // Keep the zoom inside readable bounds.
    desiredZoom = Math.max(0.4, Math.min(1.5, desiredZoom));

    // Current viewport – we'll *replace* the zoom then re-anchor the camera
    // so the Program node sits nicely near the top.
    let vp = { ...reactFlowInstance.getViewport(), zoom: desiredZoom };

    // Locate the Program node so we can anchor it.
    const programNode = hydratedNodes.find((n) => n.type === 'programNode');
    vp = computeViewportForRoot(vp, programNode, graphRect, 80);

    // Apply our final camera in one go (also no animation) so the whole
    // transition feels snappy instead of bouncing.
    reactFlowInstance.setViewport(vp, { duration: 0 });

    /*
     * eslint-disable-next-line react-hooks/exhaustive-deps
     * We deliberately omit `reactFlowInstance` from deps – the instance is
     * stable once mounted, so including it would create an unnecessary re-run.
     */
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