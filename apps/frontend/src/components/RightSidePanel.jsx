/*
RightSidePanel.jsx – Contextual actions for the Script View
==========================================================
The component renders three mutually-exclusive sub-views that match the Script
View spec (implementation-plan §3.2):
1. *Idle* – no Turn selected, not editing ➜ helper copy + disabled **Export
   Script** button (implemented in this commit).
2. *Selected* – a Turn is selected ➜ Edit / View timeline actions (stubbed –
   next micro-task).
3. *Editing* – textarea + commit summary + Save (stubbed – see checklist step
   4).

The zustand store (`useScriptStore`) drives which sub-component is rendered so
we avoid prop-drilling across the canvas hierarchy.

Three exclusive states exist:
1. Idle – No turn is selected and `isEditing` is false.
2. Selected – A turn is selected and `isEditing` is false.
3. Editing – `isEditing` is true (we do not care which turn right now).

Later micro-tasks will replace the stubs with real buttons, textarea, markdown
preview, etc.
*/

import React from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import useScriptStore from '../store/useScriptStore.js';
import useAuthStore from '../store/useAuthStore.js';
import { apiFetch } from '../lib/api.js';

/* ------------------------------------------------------------------
 * Shared styling – copied 1-for-1 from <LoadView /> so the Edit and Export
 * buttons look absolutely identical across the entire application.  This will
 * eventually live in a central CSS module but inline is fine for now.
 * ---------------------------------------------------------------- */
const buttonStyle = {
  fontFamily: '"Inter", sans-serif',
  fontWeight: 500,
  fontSize: '24px',
  letterSpacing: '-0.05em',
  color: '#000000',
  border: '2px solid #000000',
  padding: '8px',
  borderRadius: '6px',
  cursor: 'pointer',
  backgroundColor: '#FFFFFF',
  textDecoration: 'none'
};

/* ------------------------------------------------------------------
 * Helper – exports the *entire* script (gold path) regardless of which node
 * is selected.  Mirrors LoadView behaviour but scoped to the personaId route
 * param so we do not rely on parent components passing props.
 * ---------------------------------------------------------------- */
function useExportHandler(personaId) {
  const { token } = useAuthStore();

  return async function handleExport() {
    try {
      if (!personaId) {
        toast.error('Script not loaded yet – cannot export.');
        return;
      }

      const data = await apiFetch(`/export/${encodeURIComponent(personaId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const filename = `script_${personaId}.json`;
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      toast.success(`Exported \u201C${filename}\u201D`);
    } catch (err) {
      toast.error(err.message);
    }
  };
}

function RSPIdle({ onExport }) {
  /**
   * RSPIdle – Script-level helper view
   * ----------------------------------
   * Shown when *no* Turn node is selected on the ScriptView canvas *and* we are
   * not in editing mode (`isEditing === false`).  The panel provides subtle
   * guidance so new users know how to proceed and surfaces global (script-level)
   * actions that are always safe to perform – for now this is just the
   * **Export Script** feature.
   *
   * UX details (mirrors Figma spec "3.2 Component tree – Script-level context")
   * • Primary helper copy  : "Click a node to view details…" (neutral tone)
   * • Secondary action     : Disabled "Export Script" button – the script must
   *   first be loaded (which it always is at this point) *and* contain at least
   *   one accepted turn for the action to become meaningful.  Future tasks will
   *   enable this button once back-end wiring is complete.
   *
   * NOTE: All inline-styles are temporary until step **3.3 CSS modules**.
   */

  return (
    <div
      style={{
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 20
      }}
    >
      {/* Helper text */}
      <p
        style={{
          margin: 0,
          fontSize: 20,
          fontWeight: 500,
          letterSpacing: '-0.05em',
          color: '#000'
        }}
      >
        Click a node to view details…
      </p>

      {/* Disabled Export button – hooks up to real handler later */}
      <button
        type="button"
        onClick={onExport}
        style={buttonStyle}
      >
        Export
      </button>
    </div>
  );
}

function RSPSelected({ onExport, onEdit }) {
  /**
   * Shows metadata for the selected turn plus the Edit + Export buttons.
   */

  const { selectedTurnId, turns } = useScriptStore();

  // Find the turn object so we can display its details.
  const turn = turns.find((t) => t.id === selectedTurnId) || {};
  const createdDate = turn.ts
    ? new Date(turn.ts).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    : 'Unknown';

  const author = turn.author || turn.editor || turn.role || 'Unknown';

  return (
    <div
      style={{
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 24
      }}
    >
      {/* Metadata block */}
      <div style={{ fontSize: 16, lineHeight: 1.4 }}>
        <div style={{ marginBottom: 4 }}>
          <strong>Created</strong>
          <br />
          {createdDate}
        </div>
        <div>
          <strong>Author</strong>
          <br />
          {author}
        </div>
      </div>

      {/* Action buttons */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: 14
        }}
      >
        <button type="button" onClick={onEdit} style={buttonStyle}>
          Edit
        </button>
        <button type="button" onClick={onExport} style={buttonStyle}>
          Export
        </button>
      </div>
    </div>
  );
}

function RSPEditing() {
  return (
    <div style={{ padding: 16 }}>
      <h3>Editing…</h3>
      <p>Textarea + Save button coming soon.</p>
    </div>
  );
}

function RightSidePanel() {
  const { selectedTurnId, isEditing, startEdit } = useScriptStore();
  const { personaId } = useParams();

  const handleExport = useExportHandler(personaId);

  let Content;
  if (isEditing) {
    Content = RSPEditing;
  } else if (selectedTurnId) {
    Content = (props) => (
      <RSPSelected {...props} onExport={handleExport} onEdit={() => startEdit(selectedTurnId)} />
    );
  } else {
    Content = (props) => <RSPIdle {...props} onExport={handleExport} />;
  }

  return (
    /*
    Panel gets a fixed width so the canvas can flex.  We keep borders subtle so
    the overall UI is pleasant even before full styling.
    */
    <aside
      style={{
        /* Responsive width – never smaller than 300 px, prefer ~30 % of the
           viewport, and cap at 440 px so ultra-wide monitors do not waste
           space.  `flex:0 0 auto` stops the panel from *growing*, we want it
           to keep the exact clamp() width. */
        borderLeft: '3px solid #D1D1D1', // subtle divider – consistent with LoadView
        background: '#fff',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        overflowY: 'auto'
      }}
    >
      <Content />
    </aside>
  );
}

export default RightSidePanel; 