/**
 * commonStyles.js
 * -----------------
 * This file contains shared JSS (JavaScript Style Sheets) objects that can be
 * imported and reused across multiple components to maintain a consistent
 * look and feel throughout the application.
 *
 * Example Usage:
 * ```jsx
 * import { buttonStyle } from '../styles/commonStyles.js';
 *
 * const MyComponent = () => (
 *   <button style={buttonStyle}>Click Me</button>
 * );
 * ```
 */

/**
 * @constant buttonStyle
 * @description Common styles for primary and secondary action buttons.
 * Based on Figma specifications: Inter font, medium weight, 24px size,
 * -5% letter spacing, 8px padding, 2px solid black border, 12px border radius.
 *
 * @type {object}
 * @property {string} fontFamily - Font family for the button text.
 * @property {number} fontWeight - Font weight for the button text.
 * @property {string} fontSize - Font size for the button text.
 * @property {string} letterSpacing - Letter spacing for the button text.
 * @property {string} color - Text color.
 * @property {string} border - Border style.
 * @property {string} padding - Padding around the button content.
 * @property {string} borderRadius - Border radius for rounded corners.
 * @property {string} cursor - Cursor style on hover.
 * @property {string} backgroundColor - Default background color.
 * @property {string} textDecoration - Text decoration (e.g., for anchor tags styled as buttons).
 */
export const buttonStyle = {
  fontFamily: '"Inter", sans-serif', // Ensure Inter is in quotes
  fontWeight: 500, // Medium weight for Inter
  fontSize: '24px',
  letterSpacing: '-0.05em', // -5% letter spacing
  color: '#000000',
  border: '2px solid #000000',
  padding: '8px', // 8px padding as per figma
  borderRadius: '12px', // Updated from 6px to 12px as per Figma
  cursor: 'pointer',
  backgroundColor: '#FFFFFF', // Assuming a white background, can be transparent
  textDecoration: 'none', // For the export button if it's an <a> tag
};

// Add other common styles here as needed, for example:
// export const commonCardStyle = { ... };
// export const commonInputStyle = { ... };

/**
 * @constant metadataHeaderStyle
 * @description Style for the main version header in the RSP metadata display (e.g., "Version 4").
 * @type {object}
 * @property {string} fontFamily - Font: Inter.
 * @property {number} fontWeight - Weight: Medium (500).
 * @property {string} fontSize - Size: 24px.
 * @property {string} letterSpacing - Spacing: -5% (-0.05em).
 * @property {string} color - Color: Black (#000000).
 * @property {string} margin - Reset default paragraph margins.
 * @property {string} marginBottom - Space below this header before the next metadata block.
 */
export const metadataHeaderStyle = {
  fontFamily: '"Inter", sans-serif',
  fontWeight: 500, // Medium
  fontSize: '24px',
  letterSpacing: '-0.05em', // -5%
  color: '#000000', // Black
  margin: 0, // Reset default margins
  marginBottom: '20px', // Space below the version header
};

/**
 * @constant metadataLabelStyle
 * @description Style for labels in the RSP metadata display (e.g., "Created", "Author", "What changed?").
 * @type {object}
 * @property {string} fontFamily - Font: Inter.
 * @property {number} fontWeight - Weight: Medium (500).
 * @property {string} fontSize - Size: 24px.
 * @property {string} letterSpacing - Spacing: -5% (-0.05em).
 * @property {string} color - Color: Black (#000000).
 * @property {string} margin - Reset default paragraph margins.
 * @property {string} marginBottom - Space below the label, before its corresponding value.
 */
export const metadataLabelStyle = {
  fontFamily: '"Inter", sans-serif',
  fontWeight: 500, // Medium
  fontSize: '24px',
  letterSpacing: '-0.05em',
  color: '#000000', // Black
  margin: 0, // Reset default margins
  marginBottom: '4px', // Space below the label (e.g., "Created")
};

/**
 * @constant metadataValueStyle
 * @description Style for the values associated with labels in the RSP metadata display (e.g., the actual date for "Created", the author's name for "Author").
 * @type {object}
 * @property {string} fontFamily - Font: Inter.
 * @property {number} fontWeight - Weight: Medium (500).
 * @property {string} fontSize - Size: 24px.
 * @property {string} letterSpacing - Spacing: -5% (-0.05em).
 * @property {string} color - Color: Black (#000000).
 * @property {string} margin - Reset default paragraph margins.
 */
export const metadataValueStyle = {
  fontFamily: '"Inter", sans-serif',
  fontWeight: 500, // Medium
  fontSize: '24px',
  letterSpacing: '-0.05em',
  color: '#000000', // Black
  margin: 0, // Reset default margins
};

/**
 * @constant metadataChangeSummaryTextStyle
 * @description Style specifically for the "What changed?" commit summary text in the RSP metadata display.
 * @type {object}
 * @property {string} fontFamily - Font: Inter.
 * @property {number} fontWeight - Weight: Medium (500).
 * @property {string} fontSize - Size: 17px.
 * @property {string} letterSpacing - Spacing: -5% (-0.05em).
 * @property {string} color - Color: #373639.
 * @property {string} margin - Reset default paragraph margins.
 * @property {string} lineHeight - Adjust line height for better readability of potentially multi-line summary.
 */
export const metadataChangeSummaryTextStyle = {
  fontFamily: '"Inter", sans-serif',
  fontWeight: 500, // Medium
  fontSize: '17px',
  letterSpacing: '-0.05em',
  color: '#373639',
  margin: 0, // Reset default margins
  lineHeight: '1.4', // Adjust for readability
};

/**
 * @constant metadataBlockStyle
 * @description Style for the div wrapping each metadata block (e.g., the "Created" block, "Author" block).
 *              Provides consistent spacing between these blocks.
 * @type {object}
 * @property {string} marginBottom - Space below each metadata block, separating it from the next.
 */
export const metadataBlockStyle = {
  marginBottom: '20px', // Space between metadata sections (e.g., between Author block and What Changed? block)
}; 