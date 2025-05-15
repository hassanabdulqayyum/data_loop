/*
RightSidePanel.jsx – Contextual actions for the Script View
==========================================================
For now this panel only shows *placeholder* content so developers can see the
layout and confirm the zustand store drives the correct state.

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
  return (
    <div style={{ padding: 16 }}>
      <h3>Nothing selected</h3>
      <p>Select a card to see actions here.</p>
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