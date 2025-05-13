/*
SearchIcon.jsx – Magnifying-glass SVG icon used in the TopNavBar
=================================================================
This component renders a scalable vector graphic that resembles a
magnifying glass.  It is intentionally kept **stateless** so it can
be re-used anywhere in the front-end without extra props.  The only
prop we accept is `size` so callers can control the rendered width
and height in pixels.

Example usage:
```jsx
import SearchIcon from './Icons/SearchIcon';

function Example() {
  return <SearchIcon size={24} />;  // 24 × 24 icon
}
```
*/

import React from 'react';
import PropTypes from 'prop-types';

function SearchIcon({ size = 24, colour = '#1d1b20' }) {
  /* We wrap the SVG in a span so we can easily apply cursor styles
   * or additional CSS from the parent if required later.  The SVG
   * path itself draws a circle with a handle to mimic a lens.  All
   * values are expressed as percentages so the icon scales evenly. */
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle
          cx="11"
          cy="11"
          r="7"
          stroke={colour}
          strokeWidth="2.5"
        />
        <line
          x1="15.5"
          y1="15.5"
          x2="21"
          y2="21"
          stroke={colour}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

SearchIcon.propTypes = {
  /** Width & height in pixels.  The icon is square so one value is enough. */
  size: PropTypes.number,
  /** Stroke colour.  Defaults to dark grey (#1d1b20) so it mirrors the Figma spec. */
  colour: PropTypes.string
};

export default SearchIcon; 