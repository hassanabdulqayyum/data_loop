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
import { makeRows, CHIP_HORIZONTAL_GAP } from '../lib/layoutUtils.js';

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
    const CHIP_HEIGHT = 44;      // 28 px tall chip (28-px text + padding)
    const whiteGap = 74;         // Vertical gap between tiers straight from Figma

    const globalCentreX = 0;     // Program sits at x=0 so this is the visual centre
    const maxRowWidth = (graphRect?.width ?? 1200) * 0.9; // 5 % margin either side

    let programY = 50; // Leave breathing room below the nav bar

    tree.forEach((program) => {
      /*--------------------------------------------------------------
        PROGRAM NODE (root)
      --------------------------------------------------------------*/
      n.push({
        id: program.id,
        type: 'programNode',
        data: { label: program.id },
        position: { x: globalCentreX, y: programY },
        selectable: true,
      });

      /*--------------------------------------------------------------
        MODULE TIER – may wrap across multiple rows
      --------------------------------------------------------------*/
      const visibleModules = program.modules.filter((mod, idx) => {
        if (selectedIds?.moduleId !== null && selectedIds?.moduleId !== undefined) {
          // When a module is selected show *only* that module.
          return mod.id === selectedIds.moduleId;
        }
        // No module selected → only show the first module to reduce clutter.
        return idx === 0;
      });

      let tierY = programY + CHIP_HEIGHT + whiteGap;

      const moduleRows = makeRows(visibleModules, maxRowWidth);

      moduleRows.forEach((rowObj) => {
        const startX = globalCentreX - rowObj.width / 2;
        let chipX = startX;

        rowObj.chips.forEach((chip) => {
          const mod = program.modules.find((m) => m.id === chip.id);
          const isModuleSelected = selectedIds?.moduleId === mod.id;

          n.push({
            id: mod.id,
            type: 'moduleNode',
            data: {
              label: mod.id,
              selected: isModuleSelected,
              ancestor: isModuleSelected && selectedIds?.topicId !== null,
            },
            position: { x: chipX, y: tierY },
            selectable: true,
          });

          // Edge Program → Module
          e.push({ id: `${program.id}-${mod.id}`, source: program.id, target: mod.id, type: 'straight' });

          chipX += chip.width + CHIP_HORIZONTAL_GAP;
        });

        tierY += CHIP_HEIGHT + whiteGap; // Move down after finishing this row
      });

      /*--------------------------------------------------------------
        TOPIC (Day) TIER – rendered only when a module is picked
      --------------------------------------------------------------*/
      const selectedModule = program.modules.find((m) => m.id === selectedIds?.moduleId);
      if (!selectedModule) return; // No deeper levels visible yet

      const visibleTopics = selectedModule.days.filter((day, idx) => {
        if (selectedIds?.topicId !== null && selectedIds?.topicId !== undefined) {
          return day.id === selectedIds.topicId;
        }
        return idx === 0;
      });

      let topicY = tierY; // tierY carries the bottom of the module rows

      const topicRows = makeRows(visibleTopics, maxRowWidth);

      topicRows.forEach((rowObj) => {
        const startX = globalCentreX - rowObj.width / 2;
        let chipX = startX;

        rowObj.chips.forEach((chip) => {
          const day = selectedModule.days.find((d) => d.id === chip.id);
          const isTopicSelected = selectedIds?.topicId === day.id;

          n.push({
            id: day.id,
            type: 'dayNode',
            data: {
              label: day.id,
              selected: isTopicSelected,
              ancestor: isTopicSelected && selectedIds?.personaId !== null,
            },
            position: { x: chipX, y: topicY },
            selectable: true,
          });

          e.push({ id: `${selectedModule.id}-${day.id}`, source: selectedModule.id, target: day.id, type: 'straight' });

          chipX += chip.width + CHIP_HORIZONTAL_GAP;
        });

        topicY += CHIP_HEIGHT + whiteGap;
      });

      /*--------------------------------------------------------------
        PERSONA TIER – rendered only when a topic is picked.
      --------------------------------------------------------------*/
      const selectedTopic = selectedModule.days.find((d) => d.id === selectedIds?.topicId);
      if (!selectedTopic) return;

      const personaRows = makeRows(selectedTopic.personas, maxRowWidth);

      const rowGap = 33;
      let personaY = topicY;

      personaRows.forEach((rowObj) => {
        const startX = globalCentreX - rowObj.width / 2;
        let chipX = startX;

        rowObj.chips.forEach((chip) => {
          const isPersonaSelected = selectedIds?.personaId === chip.id;

          n.push({
            id: chip.id,
            type: 'personaNode',
            data: { label: chip.id, selected: isPersonaSelected },
            position: { x: chipX, y: personaY },
            selectable: true,
          });

          chipX += chip.width + CHIP_HORIZONTAL_GAP;
        });

        personaY += CHIP_HEIGHT + rowGap;
      });

      // We purposely do NOT draw edges to personas – keeps the view clear.
    });
    return { nodes: n, edges: e };
  }, [tree, selectedIds, graphRect]);

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