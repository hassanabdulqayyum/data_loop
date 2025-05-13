/*
UserIcon.jsx – Avatar SVG icon used in the TopNavBar
===================================================
Renders a minimalist user/profile icon: a filled circle for the head and
an arc for the shoulders.  Accepts the same props as `SearchIcon`
(`size`, `colour`) so the two icons can be swapped without adjustments.

Example usage:
```jsx
import UserIcon from './Icons/UserIcon';

function Example() {
  return <UserIcon size={28} colour="#000" />;
}
```
*/

import React from 'react';
import PropTypes from 'prop-types';

function UserIcon({ size = 24, colour = '#1d1b20' }) {
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
        {/* Head */}
        <circle cx="12" cy="8" r="4" stroke={colour} strokeWidth="2.5" />
        {/* Shoulders */}
        <path
          d="M4 20c0-4 4-6 8-6s8 2 8 6"
          stroke={colour}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

UserIcon.propTypes = {
  size: PropTypes.number,
  colour: PropTypes.string
};

export default UserIcon; 