import React, { useState } from 'react';
import PropTypes from 'prop-types';
// We might need to import buttonStyle from commonStyles if it's ready and applicable
// import { buttonStyle } from '../styles/commonStyles';

// Example JSS styles (can be refined later or moved to a separate file)
const styles = {
  formContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px', // Spacing between elements
  },
  textArea: {
    width: '100%',
    minHeight: '150px',
    padding: '10px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontFamily: '"Inter", sans-serif',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  input: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontFamily: '"Inter", sans-serif',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'flex-end', // Align buttons to the right
    gap: '10px',
  },
  // Basic button styling, can be replaced by commonStyles
  button: {
    padding: '10px 15px',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '14px',
  },
  confirmButton: { // Specific style for confirm
    backgroundColor: '#4CAF50', // Green (example)
    color: 'white',
  },
  cancelButton: { // Specific style for cancel
    backgroundColor: '#f44336', // Red (example)
    color: 'white',
    // Or for an outlined look:
    // backgroundColor: 'transparent',
    // color: '#f44336',
    // border: '1px solid #f44336',
  }
};

/**
 * EditTurnForm component renders a form to edit a turn's text
 * and provide a commit message.
 *
 * @param {object} props - The component's props.
 * @param {object} props.turnData - The data of the turn being edited (e.g., { id, text }).
 * @param {function} props.onSave - Callback when "Confirm" is clicked (passes updatedText, commitMessage).
 * @param {function} props.onCancel - Callback when "Cancel" is clicked.
 * @returns {JSX.Element} The rendered form.
 *
 * @example
 * const turn = { id: '1', text: 'Original text' };
 * const handleSave = (text, msg) => console.log('Save:', text, msg);
 * const handleCancel = () => console.log('Cancel');
 * <EditTurnForm turnData={turn} onSave={handleSave} onCancel={handleCancel} />
 */
function EditTurnForm({ turnData, onSave, onCancel }) {
  const [editedText, setEditedText] = useState(turnData?.text || '');
  const [commitMessage, setCommitMessage] = useState('');

  const handleConfirm = () => {
    onSave(editedText, commitMessage);
  };

  const handleTextChange = (e) => {
    setEditedText(e.target.value);
  };

  const handleCommitMessageChange = (e) => {
    setCommitMessage(e.target.value);
  };

  return (
    <div style={styles.formContainer}>
      <textarea
        id="editedText"
        name="editedText"
        style={styles.textArea}
        value={editedText}
        onChange={handleTextChange}
        placeholder="Enter script content..."
      />
      <input
        type="text"
        id="commitMessage"
        name="commitMessage"
        style={styles.input}
        value={commitMessage}
        onChange={handleCommitMessageChange}
        placeholder="Quick summary of what changed..."
      />
      <div style={styles.buttonContainer}>
        <button
          style={{ ...styles.button, ...styles.cancelButton }}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          style={{ ...styles.button, ...styles.confirmButton }}
          onClick={handleConfirm}
        >
          Confirm
        </button>
      </div>
    </div>
  );
}

EditTurnForm.propTypes = {
  turnData: PropTypes.shape({
    id: PropTypes.string, // Or number, depending on your ID type
    text: PropTypes.string.isRequired,
  }).isRequired,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default EditTurnForm; 