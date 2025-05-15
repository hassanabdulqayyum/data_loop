/*
TurnNode.jsx – A single card in the vertical script view
========================================================
This **custom node** is consumed by React-Flow so each turn inside the
script becomes a draggable, selectable card on the canvas.

What does it actually show?
• Author role (system / user / assistant) in a small label.
• The *first 40 characters* of the turn`s text so editors get a quick glance
  at what is inside without reading the whole paragraph.  When the text is
  missing or `null` (a rare edge-case when placeholder nodes appear) the
  component simply shows an empty preview instead of crashing.

How is it used?
The parent <TurnCanvas> registers this component under the node-type key
`turnNode`.  React-Flow will render <TurnNode data={…} /> whenever it sees
`type: 'turnNode'` inside a node object.

Example – none of the routing logic here, purely visual:
```jsx
import TurnNode from './TurnNode.jsx';

const node = {
  id: '123',
  type: 'turnNode',
  data: {
    turn: {
      id: '123',
      role: 'assistant',
      text: 'Hello world this is a long assistant answer…'
    },
    isSelected: false
  },
  position: { x: 0, y: 0 }
};
```
*/

import React from 'react';
import PropTypes from 'prop-types';
import useScriptStore from '../store/useScriptStore.js';

function TurnNode({ id, data }) {
  // Pull helper so clicking on a card can mark it selected.
  const setSelected = useScriptStore((s) => s.startEdit);

  // Destructure the turn for convenience.
  const { turn } = data;

  // Compute a 40-char preview but guard against missing text so we never crash
  const rawText = typeof turn.text === 'string' ? turn.text : '';
  const preview =
    rawText.length > 40 ? `${rawText.slice(0, 40).trim()}…` : rawText;

  return (
    <div
      /*
      A very bare-bones card – later micro-tasks will replace inline styles
      with proper CSS modules.  For now we just need *something* visible so
      the canvas is not blank.
      */
      style={{
        border: '1px solid #ccc',
        borderRadius: 4,
        padding: 8,
        background: '#fff',
        minWidth: 180,
        cursor: 'pointer',
        fontSize: 12
      }}
      onClick={() => setSelected(id)}
    >
      {/* Role badge */}
      <strong style={{ textTransform: 'capitalize', color: '#555' }}>
        {turn.role}
      </strong>
      <div style={{ marginTop: 4 }}>{preview}</div>
    </div>
  );
}

TurnNode.propTypes = {
  id: PropTypes.string.isRequired,
  data: PropTypes.shape({
    turn: PropTypes.shape({
      role: PropTypes.string.isRequired,
      // `text` may be null in edge-cases (e.g. placeholder nodes).
      // We therefore accept either string **or** null to keep rendering safe.
      text: PropTypes.string
    }).isRequired
  }).isRequired
};

export default TurnNode; 