import React from 'react';
import PropTypes from 'prop-types';
import {
  metadataHeaderStyle,
  metadataLabelStyle,
  metadataValueStyle,
  metadataChangeSummaryTextStyle,
  metadataBlockStyle,
} from '../styles/commonStyles';

/**
 * @file RSPMetadataDisplay.jsx
 * @description Component to display node metadata in the Right Side Panel (RSP).
 * This component shows information such as version, creation date, author,
 * and a summary of changes (commit message) for a selected node.
 * It receives metadata as a prop and uses shared styles for consistent appearance.
 * It is responsible for formatting the creation date.
 */

/**
 * Formats an ISO date string (expected from `metadata.createdDate`) into a
 * human-readable format like "March 15, 2024".
 * If the date string is invalid or missing, it returns "N/A".
 *
 * @param {string} dateString - The ISO date string to format.
 * @returns {string} The formatted date string, or "N/A" if the input is invalid or missing.
 * @example
 * formatDate("2024-03-15T10:00:00.000Z") // "March 15, 2024"
 * formatDate(null) // "N/A"
 */
const formatDate = (dateString) => {
  // Check if dateString is provided and is a valid date
  if (!dateString || isNaN(new Date(dateString))) {
    return 'N/A'; // Return "N/A" for invalid or missing dates
  }
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * RSPMetadataDisplay component.
 * Renders the metadata for a selected node. This includes:
 * - Version: The node's version string (e.g., "Version 4").
 * - Created: The formatted creation date of this version.
 * - Author: The name of the author of this version.
 * - What changed?: The commit summary for this version.
 *
 * The component expects all metadata fields to be provided via the `metadata` prop.
 * It uses predefined styles from `commonStyles.js` for consistent theming.
 *
 * @component
 * @param {object} props - The component props.
 * @param {object} props.metadata - The metadata object for the selected node.
 *   This object is expected to be sourced from the backend and passed down.
 * @param {string} [props.metadata.version="Version N/A"] - The version of the node (e.g., "Version 4").
 *   This is expected to be a pre-calculated string from the backend (e.g., via Neo4j indexing).
 * @param {string} [props.metadata.createdDate] - The ISO string of when the node was created.
 *   Will be formatted by this component. Defaults to "N/A" if not provided or invalid.
 * @param {string} [props.metadata.authorName="N/A"] - The name of the author who created/modified the node.
 *   Sourced from user accounts via backend. Defaults to "N/A".
 * @param {string} [props.metadata.changeSummary="No summary provided."] - A summary of changes made in this version.
 *   This is the commit message. Defaults to "No summary provided.".
 *
 * @example
 * const metadata = {
 *   version: "Version 4", // From backend (Neo4j index)
 *   createdDate: "2024-03-15T12:30:00.000Z", // From backend node property
 *   authorName: "Hasan", // From backend user data
 *   changeSummary: "Changed the acknowledgment to use better wording." // From backend node property
 * };
 * return <RSPMetadataDisplay metadata={metadata} />
 */
const RSPMetadataDisplay = ({ metadata }) => {
  // If metadata is not provided, render nothing. Parent component should handle loading states.
  if (!metadata) {
    return null;
  }

  // Destructure with fallbacks to ensure the component doesn't break if a field is unexpectedly missing.
  // These defaults are primarily for robustness during development or if backend data is sparse.
  const {
    version = "Version N/A", // Default if version is null/undefined
    createdDate, // formatDate will handle null/undefined for this
    authorName = "N/A", // Default if authorName is null/undefined
    changeSummary = "No summary provided." // Default if changeSummary is null/undefined
  } = metadata;

  // Format the date using the helper function
  const displayCreatedDate = formatDate(createdDate);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Version: Displayed as a header. Expected to be like "Version X" from backend. */}
      <p style={metadataHeaderStyle}>{version}</p>

      {/* Created Date Block */}
      <div style={metadataBlockStyle}>
        <p style={metadataLabelStyle}>Created</p>
        <p style={metadataValueStyle}>{displayCreatedDate}</p>
      </div>

      {/* Author Block */}
      <div style={metadataBlockStyle}>
        <p style={metadataLabelStyle}>Author</p>
        <p style={metadataValueStyle}>{authorName}</p>
      </div>

      {/* Change Summary Block */}
      <div style={metadataBlockStyle}>
        <p style={metadataLabelStyle}>What changed?</p>
        <p style={metadataChangeSummaryTextStyle}>{changeSummary}</p>
      </div>
    </div>
  );
};

RSPMetadataDisplay.propTypes = {
  /**
   * The metadata object for the selected node.
   * This object structure is crucial and is expected to be provided by the parent component,
   * ultimately sourced from the backend.
   */
  metadata: PropTypes.shape({
    /** The version string (e.g., "Version 4"). Expected to be pre-calculated by the backend. */
    version: PropTypes.string,
    /** ISO date string for when the node version was created. */
    createdDate: PropTypes.string,
    /** Name of the author. Dependent on user accounts system via backend. */
    authorName: PropTypes.string,
    /** The commit summary or change description for this version. */
    changeSummary: PropTypes.string,
  }).isRequired, // Marking as isRequired as the component is not useful without metadata.
};

export default RSPMetadataDisplay; 