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
import useScriptStore from '../store/useScriptStore.js';

// Tiny helper components so we keep JSX readable.
function RSPIdle() {
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

  // ⤵ A single shared style object prevents repetition and keeps overrides easy.
  const buttonStyle = {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 18,
    letterSpacing: '-0.05em',
    color: '#6B6B6B', // greyed-out label to indicate disabled state
    border: '2px solid #D1D1D1',
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
    padding: '6px 12px',
    cursor: 'not-allowed', // ensure OS displays the *disabled* cursor
    opacity: 0.6 // extra visual cue
  };

  return (
    <div
      style={{
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 16
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
        disabled
        onClick={() => {
          /* Stub handler – will call /export once implemented (see spec 3.2) */
          /* eslint-disable-next-line no-console */
          console.log('TODO: Export Script – stub');
        }}
        style={buttonStyle}
      >
        Export Script
      </button>
    </div>
  );
}

function RSPSelected() {
  return (
    <div style={{ padding: 16 }}>
      <h3>Turn selected</h3>
      <p>Buttons (Edit / View timeline) will appear here in a later task.</p>
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
  const { selectedTurnId, isEditing } = useScriptStore();

  let Content;
  if (isEditing) Content = RSPEditing;
  else if (selectedTurnId) Content = RSPSelected;
  else Content = RSPIdle;

  return (
    /*
    Panel gets a fixed width so the canvas can flex.  We keep borders subtle so
    the overall UI is pleasant even before full styling.
    */
    <aside
      style={{
        width: 260,
        borderLeft: '1px solid #e0e0e0',
        background: '#fff',
        height: '100%'
      }}
    >
      <Content />
    </aside>
  );
}

export default RightSidePanel; 