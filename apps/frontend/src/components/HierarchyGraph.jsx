/*
HierarchyGraph.jsx – Displays Program → Module → Topic → Persona tree using React-Flow.

Props:
• tree            – the nested array returned by /hierarchy (Programs at root).
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

function HierarchyGraph({ tree, selectedIds, onSelect, graphRect }) {
  const { nodes, edges } = useMemo(() => {
    const n = [];
    const e = [];
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

    let programY = 50; // Anchor Program tier 50 px from top in Flow co-ords.

    tree.forEach((program) => {
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

      const availableWidth = (graphRect?.width ?? 1200) * 0.9; // Leave a 5 % margin each side.
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

          n.push({
            id: mod.id,
            type: 'moduleNode',
            data: {
              label: mod.id,
              selected: isModuleSelected,
              ancestor: isModuleSelected && selectedIds?.topicId !== null,
            },
            position: { x: chipX, y: moduleRowY },
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

      const measuredDays = filteredDays.map((d) => ({
        id: d.id,
        width: measureChipWidth(d.id),
        ref: d,
      }));

      const dayRows = packIntoRows(measuredDays, CHIP_GAP, availableWidth);

      let dayRowY = dayTierStartY;
      const dayPos = {};

      dayRows.forEach((rowObj) => {
        const rowStartX = -rowObj.width / 2;
        let chipX = rowStartX;

        rowObj.chips.forEach((chip) => {
          const day = chip.ref;
          const isTopicSelected = selectedIds?.topicId === day.id;

          // Border compensation: selected nodes carry a 3-px outline while
          // the ruler span had none.  We therefore nudge the x-position by
          // half that border so the *centre* of the rendered chip aligns
          // with the spine.
          const borderWidth = isTopicSelected ? 3 : 1;

          n.push({
            id: day.id,
            type: 'dayNode',
            data: {
              label: day.id,
              selected: isTopicSelected,
              ancestor: isTopicSelected && selectedIds?.personaId !== null,
            },
            position: { x: chipX - borderWidth / 2, y: dayRowY },
            selectable: true,
          });

          dayPos[day.id] = { x: chipX, y: dayRowY };

          // Edge module → day
          e.push({ id: `${activeModule.id}-${day.id}`, source: activeModule.id, target: day.id, type: 'straight' });

          chipX += chip.width + CHIP_GAP;
        });

        dayRowY += CHIP_HEIGHT + ROW_GAP;
      });

      const personaTierStartY = dayRowY - ROW_GAP + whiteGap;

      /* --------------------------------------------------------------
       * 4. PERSONA tier – may span many rows, always centred on mid-point.
       * ------------------------------------------------------------*/
      const activeDay = activeModule.days.find((d) => d.id === selectedIds?.topicId);
      if (!activeDay) return;

      const measuredPersonas = activeDay.personas.map((p) => ({
        id: p.id,
        width: measureChipWidth(p.id),
      }));

      const personaRows = packIntoRows(measuredPersonas, CHIP_GAP, availableWidth);

      let personaRowY = personaTierStartY;

      personaRows.forEach((rowObj) => {
        const rowStartX = -rowObj.width / 2;
        let chipX = rowStartX;

        rowObj.chips.forEach((chip) => {
          const isPersonaSelected = selectedIds?.personaId === chip.id;

          // Border compensation: selected nodes carry a 3-px outline while
          // the ruler span had none.  We therefore nudge the x-position by
          // half that border so the *centre* of the rendered chip aligns
          // with the spine.
          const borderWidth = isPersonaSelected ? 3 : 1;

          n.push({
            id: chip.id,
            type: 'personaNode',
            data: { label: chip.id, selected: isPersonaSelected },
            position: { x: chipX - borderWidth / 2, y: personaRowY },
            selectable: true,
          });

          chipX += chip.width + CHIP_GAP;
        });

        personaRowY += CHIP_HEIGHT + ROW_GAP;
      });

      // Topic → Persona edges intentionally omitted (design wants a clean look)
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

  /* ------------------------------------------------------------------
   * Dev-only diagnostic: log edge tilt angles
   * -------------------------------------------------------------
   * Purpose – While we refine the horizontal-centering maths, we want an
   * objective read-out of how much each connector deviates from a perfect
   * vertical.  For every edge we already know both end-point coordinates in
   * **flow space** (the same co-ordinate system we position nodes in).  A
   * vertical line means Δx = 0.  The angle away from vertical therefore is
   * `atan2(Δx, Δy)` in radians.
   *
   * This hook runs **only in development mode** and prints a neat
   * `console.table` whenever the node/edge set changes.  Designers (or we)
   * can click different chips and watch the angles update live.  Anything
   * above ~0.4° is visible to the naked eye and signals a centring bug.
   */
  useEffect(() => {
    /* eslint-disable no-console */
    console.log('Tilt diagnostic hook fired');
    console.log(`nodes: ${nodes.length}, edges: ${edges.length}`);
    /* eslint-enable no-console */
    // ------------------------------------------------------------------
    // Skip in production builds or SSR
    // ------------------------------------------------------------------
    const isDev =
      (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) ||
      (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development');

    if (!isDev || typeof window === 'undefined') return;

    if (!edges.length || !nodes.length) {
      /* eslint-disable no-console */
      console.warn('Tilt diagnostic: nodes/edges empty – skipping angle calc');
      /* eslint-enable no-console */
      return;
    }

    // Build quick lookup { id → position } for constant-time fetches.
    const posMap = new Map(nodes.map((n) => [n.id, n.position]));

    const rows = edges.map((edge) => {
      const src = posMap.get(edge.source);
      const tgt = posMap.get(edge.target);

      if (!src || !tgt) {
        /* eslint-disable no-console */
        console.warn('Tilt diagnostic: missing position for', edge.id, {
          source: edge.source,
          target: edge.target,
          srcFound: !!src,
          tgtFound: !!tgt
        });
        /* eslint-enable no-console */
        return null;
      }

      const dx = Math.abs(tgt.x - src.x);
      const dy = Math.abs(tgt.y - src.y);
      const angleDeg = (Math.atan2(dx, dy) * 180) / Math.PI;

      return {
        id: edge.id,
        dx: dx.toFixed(1),
        dy: dy.toFixed(1),
        'angle°': angleDeg.toFixed(2)
      };
    }).filter(Boolean);

    /* eslint-disable no-console */
    if (rows.length) {
      console.log('Edge tilt diagnostics →', rows);
      console.table(rows);
    } else {
      console.warn('Edge tilt diagnostics: rows empty');
    }
    /* eslint-enable no-console */
  }, [nodes, edges]);

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