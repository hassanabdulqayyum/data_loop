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