/*
EditorShell.jsx – Shared two-column layout for Load, Script, Node views
======================================================================
This component centralises the chrome that is identical across the
content-editing screens so we never have to duplicate layout maths or
styles:

• TopNavBar (fixed 72-px height) – receives all breadcrumb props + click
  handlers via the `navBarProps` object.
• Below the bar a flex row enforces a **2 : 1 split**: the centre canvas
  takes two parts, the Right-Side Panel (RSP) takes one part.
• The RSP draws the 3-px grey divider and handles its own vertical
  scrolling so inner components don't need overflow logic.

Example usage from ScriptView:
```jsx
<EditorShell
  navBarProps={{ selectedModuleNode, selectedTopicNode, … }}
  MainComponent={<TurnCanvas />}
  SideComponent={<RightSidePanel />}
/>
```
*/

import React from 'react';
import PropTypes from 'prop-types';
import TopNavBar from '../TopNavBar/TopNavBar.jsx';

function EditorShell({ navBarProps, MainComponent, SideComponent }) {
  return (
    <>
      {/* --- Fixed breadcrumb bar ------------------------------------- */}
      <TopNavBar {...navBarProps} />

      {/* --- Main 2 : 1 flex layout ----------------------------------- */}
      <div
        style={{
          display: 'flex',
          height: 'calc(100vh - 72px)', // Below the bar
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}
      >
        {/* Centre canvas – the view that actually changes per page */}
        <div
          style={{
            flex: '2 1 0%',
            height: '100%',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          {MainComponent}
        </div>

        {/* Right-Side Panel – fixed 1 / 3 width incl. divider */}
        <aside
          style={{
            flex: '1 0 0',
            maxWidth: '440px',
            borderLeft: '3px solid #D1D1D1',
            background: '#fff',
            height: '100%',
            overflowY: 'auto',
            boxSizing: 'border-box'
          }}
        >
          {SideComponent}
        </aside>
      </div>
    </>
  );
}

EditorShell.propTypes = {
  navBarProps: PropTypes.object.isRequired,
  MainComponent: PropTypes.node.isRequired,
  SideComponent: PropTypes.node.isRequired
};

export default EditorShell; 