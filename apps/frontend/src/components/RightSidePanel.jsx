/*
RightSidePanel.jsx – Contextual actions for the Script View
==========================================================
This component renders content in the right-side panel of the ThreePaneLayout.
Its behavior is driven by the `useScriptStore` and the current route (`personaId`).

It can display three main states:
1. `RSPIdle`: Shown when no turn is selected in the script canvas and the user is not in editing mode.
   Displays general helper text.
2. `RSPSelected`: Shown when a turn is selected on the canvas and not in editing mode.
   This state displays detailed metadata about the selected turn (version, created date, author, change summary)
   using the `RSPMetadataDisplay` component, and provides "Edit" and "Export" action buttons.
   The metadata is sourced from the `turns` array in `useScriptStore`, which is populated by a backend API call.
   **Crucial Backend Dependency**: The turn objects in `useScriptStore.turns` must include
   `version` (string, e.g., "Version 4"), `createdAt` (ISO string), `authorName` (string),
   and `changeSummary` (string) fields for the metadata display to be complete.
3. `RSPEditing`: Shown when `isEditing` is true in `useScriptStore`.
   Currently a placeholder for the turn editing interface.

Key Data Flow for Metadata:
- `useScriptStore.loadScript()` fetches script data (array of turns) from the backend.
- The backend API is expected to provide `version`, `createdAt`, `authorName`, `changeSummary` for each turn.
- When a turn is selected on the canvas, `useScriptStore.selectedTurnId` is updated.
- `RightSidePanel` finds the selected turn object from `useScriptStore.turns`.
- This selected turn object (`selectedNodeData`) is passed to `RSPSelected`.
- `RSPSelected` prepares and passes a `metadata` object to `RSPMetadataDisplay`.
- `RSPMetadataDisplay` renders the individual metadata fields.
*/

import React from 'react';
import PropTypes from 'prop-types';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import useScriptStore from '../store/useScriptStore';
import useAuthStore from '../store/useAuthStore';
import { apiFetch } from '../lib/api';
import { buttonStyle } from '../styles/commonStyles';
import RSPMetadataDisplay from './RSPMetadataDisplay';

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

      // API call to backend to get export data for the current personaId
      const data = await apiFetch(`/export/${encodeURIComponent(personaId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const filename = `script_${personaId}.json`;
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);

      // Trigger download
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      toast.success(`Exported "${filename}"`);
    } catch (err) {
      toast.error(err.message);
    }
  };
}

/**
 * @file RightSidePanel.jsx
 * @description Component for the right-side panel, displaying contextual information or actions
 *              based on the current script view state (idle, node selected, or editing node).
 *              Relies heavily on `useScriptStore` for state management and data.
 */

/**
 * RSPIdle component.
 * Represents the content of the Right Side Panel when no specific node is selected
 * in the script canvas and the user is not in editing mode.
 * Typically displays helper text to guide the user.
 * @returns {JSX.Element}
 */
const RSPIdle = () => (
  <div style={{
    height: '100%', // Take full height of its container
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center', // Center content vertically
    alignItems: 'center', // Center content horizontally
    padding: '20px', // Provide some internal spacing
    textAlign: 'center'
  }}>
    <p style={{ fontFamily: '"Inter", sans-serif', fontSize: '17px', color: '#888', lineHeight: '1.6' }}>
      Select a node in the canvas to see its details and available actions here.
    </p>
    {/* Export button for the whole script could potentially be placed here if desired for idle state */}
  </div>
);

/**
 * RSPSelected component.
 * Represents the content of the Right Side Panel when a node is selected in the script canvas.
 * It displays detailed metadata about the selected node (version, created date, author, change summary)
 * and provides action buttons like "Edit" and "Export".
 *
 * @param {object} props - The component props.
 * @param {object} props.selectedNodeData - Data object for the selected node. This object is expected
 *   to be a 'turn' from `useScriptStore.turns` and **must** include `id`, and ideally `version`,
 *   `createdAt`, `authorName`/`author.name`, and `changeSummary` fields from the backend for full metadata display.
 * @param {Function} props.onEdit - Handler function to be called when the "Edit" button is clicked.
 * @param {Function} props.onExport - Handler function to be called when the "Export" button is clicked.
 * @returns {JSX.Element | null} Null if `selectedNodeData` is not provided (should not typically occur if parent logic is correct).
 */
const RSPSelected = ({ selectedNodeData, onEdit, onExport }) => {
  // Guard clause: If no selected node data is provided, render nothing.
  // This should ideally be prevented by the logic in the parent `RightSidePanel` component.
  if (!selectedNodeData) {
    return null;
  }

  // Prepare the metadata object for RSPMetadataDisplay.
  // This relies on selectedNodeData (a turn object from the store, ultimately from the backend)
  // having the necessary fields.
  const metadataForDisplay = {
    // `version`: Expected as a string like "Version X", pre-calculated by backend.
    version: selectedNodeData.version || "Version N/A",
    // `createdAt`: Expected as an ISO date string from backend. RSPMetadataDisplay will format it.
    createdDate: selectedNodeData.createdAt,
    // `authorName`: Expected from backend, sourced from user accounts. Supports `author.name` or `authorName` structures.
    authorName: selectedNodeData.author?.name || selectedNodeData.authorName || "N/A",
    // `changeSummary`: Use `commit_message` from backend data for this prop.
    changeSummary: selectedNodeData.commit_message || "No summary available.",
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between', // Pushes metadata to top, buttons to bottom
      height: '100%', // Occupy full height of the panel slot
      padding: '20px', // Internal padding
      boxSizing: 'border-box', // Ensure padding is included within the height/width
    }}>
      {/* Section to display the detailed metadata of the selected node */}
      <RSPMetadataDisplay metadata={metadataForDisplay} />

      {/* Section for action buttons, pushed to the bottom */}
      <div style={{ marginTop: 'auto', paddingTop: '20px' }}> {/* `marginTop: auto` pushes this block down */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* "Edit" button: Only shown if an onEdit handler is provided */}
          {onEdit && (
            <button type="button" onClick={onEdit} style={buttonStyle}>
              Edit
            </button>
          )}
          {/* "Export" button: Only shown if an onExport handler is provided */}
          {onExport && (
            <button type="button" onClick={onExport} style={buttonStyle}>
              Export
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

RSPSelected.propTypes = {
  /**
   * Data object for the selected node (a 'turn' from the script).
   * Critical: Expected to contain `id` and metadata fields like `version`,
   * `createdAt`, `authorName`/`author.name`, `changeSummary` from the backend.
   */
  selectedNodeData: PropTypes.shape({
    id: PropTypes.string.isRequired,
    version: PropTypes.string,       // e.g., "Version 4" (from backend)
    createdAt: PropTypes.string,     // ISO date string (from backend)
    author: PropTypes.shape({ name: PropTypes.string }), // Optional structure for author
    authorName: PropTypes.string,    // Alternative/direct author name (from backend)
    changeSummary: PropTypes.string, // Commit summary (from backend)
    // Include other existing turn properties that might be present, e.g., text, role, etc.
  }).isRequired,
  /** Handler for the "Edit" action. Typically triggers editing mode in `useScriptStore`. */
  onEdit: PropTypes.func,
  /** Handler for the "Export" action. Typically uses `useExportHandler`. */
  onExport: PropTypes.func,
};

/**
 * RSPEditing component.
 * Represents the content of the Right Side Panel when the user is in node editing mode.
 * This is currently a placeholder and will be implemented in future tasks.
 * @returns {JSX.Element}
 */
const RSPEditing = () => (
  // TODO: Implement the full editing interface as per future requirements.
  // This will likely involve text areas, commit message input, save/cancel buttons,
  // and interaction with `useScriptStore.saveEdit()` and `useScriptStore.cancelEdit()`.
  <div style={{ padding: '20px', textAlign: 'center' }}>
    <h3>Editing Mode</h3>
    <p>Editing form will appear here.</p>
  </div>
);

/**
 * RightSidePanel component.
 * This is the main component for the right-side panel in the ScriptView.
 * It orchestrates which sub-component (`RSPIdle`, `RSPSelected`, `RSPEditing`)
 * to display based on the state derived from `useScriptStore` (selectedTurnId, isEditing)
 * and `useParams` (for personaId needed by the export handler).
 *
 * It does not take direct props for data or handlers; it's self-contained using the store.
 *
 * @component
 * @example
 * // In ScriptView.jsx, within ThreePaneLayout: 
 * // panel={<RightSidePanel />}
 */
const RightSidePanel = () => {
  // Get personaId from URL params, primarily for the script export functionality.
  const { personaId } = useParams();

  // Subscribe to relevant state from useScriptStore.
  const selectedTurnId = useScriptStore((s) => s.selectedTurnId);
  const turns = useScriptStore((s) => s.turns); // The array of all turns for the current script.
  const isEditing = useScriptStore((s) => s.isEditing);
  const startEdit = useScriptStore((s) => s.startEdit); // Action to initiate editing mode.

  // Initialize the export handler for the current script.
  const handleExport = useExportHandler(personaId);

  // Style for the main container of the RightSidePanel.
  const panelStyle = {
    height: '100%', // Ensure it fills the allocated space in ThreePaneLayout.
    backgroundColor: '#ffffff', // Consistent white background.
    display: 'flex',
    flexDirection: 'column', // Stack content vertically.
    boxSizing: 'border-box',
  };

  let content; // Variable to hold the JSX for the current state.

  if (isEditing) {
    // If in editing mode, show the RSPEditing component.
    // Future: May need to pass data of the turn being edited to RSPEditing.
    // const turnToEdit = turns.find(t => t.id === selectedTurnId);
    content = <RSPEditing /* turnData={turnToEdit} */ />;
  } else if (selectedTurnId) {
    // If a turn is selected (and not editing), find its data from the store.
    const selectedNodeData = turns.find(t => t.id === selectedTurnId);

    if (selectedNodeData) {
      // If data is found, show RSPSelected with the node's data and action handlers.
      // `onEdit` uses the `startEdit` action from the store.
      // `onExport` uses the `handleExport` hook defined above.
      content = (
        <RSPSelected
          selectedNodeData={selectedNodeData} // Pass the full turn object.
          onEdit={() => startEdit(selectedTurnId)}
          onExport={handleExport}
        />
      );
    } else {
      // Fallback: If selectedTurnId is set but the turn data isn't found in the store
      // (e.g., data inconsistency or loading issue), show the idle state.
      // This situation should be rare in a stable application.
      content = <RSPIdle />;
    }
  } else {
    // If no turn is selected and not editing, show the idle state.
    content = <RSPIdle />;
  }

  // Render the determined content within the styled panel container.
  return <div style={panelStyle}>{content}</div>;
};

// RightSidePanel does not take external props; it derives its state from
// `useScriptStore` and `useParams`, so PropTypes are not defined here.

export default RightSidePanel; 