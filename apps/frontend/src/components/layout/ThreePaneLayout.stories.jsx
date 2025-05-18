/*
Story: ThreePaneLayout (JSX)
===========================
A visual smoke test for the new 3-pane shell. Written in plain JSX so
it doesn't depend on Storybook's TypeScript types, eliminating the
`Cannot find module '@storybook/react'` linter warning.
*/

import React from 'react';
import ThreePaneLayout from './ThreePaneLayout';

// Default export required by Storybook (CSF format)
export default {
  title: 'Layout/ThreePaneLayout',
  component: ThreePaneLayout
};

// A very basic render showcasing the 2 : 1 split
export const Default = () => (
  <ThreePaneLayout
    nav={
      <div
        style={{
          height: '72px',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: '16px',
          background: '#F5F5F5',
          fontWeight: 600
        }}
      >
        Breadcrumb / Module / Topic
      </div>
    }
    canvas={
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#EAF4FF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px'
        }}
      >
        Canvas placeholder
      </div>
    }
    panel={
      <div style={{ padding: '24px' }}>
        <h3>Right-Side Panel</h3>
        <p>Any contextual actions go here.</p>
      </div>
    }
  />
); 