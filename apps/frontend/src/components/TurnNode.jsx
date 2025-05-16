/*
TurnNode.jsx – A single card in the vertical script view
========================================================
This **custom node** is consumed by React-Flow so each turn inside the
script becomes a draggable, selectable card on the canvas.

Plain-English overview
----------------------
• Renders the *text* of one system/user/assistant turn as a rounded
  "speech-bubble" card.
• Styling strictly follows the Figma spec (Script view – 1.png):
  – Unselected assistant/system → 2 px #CCCCCC outline, white fill.
  – Unselected user            → no outline, #C8C8C8 fill.
  – Selected (user or assistant) → 2.5 px #6C80DA outline.
• The component no longer shows explicit "user" / "assistant" labels – the
  colour cues alone communicate the speaker.
• Text is set in **Inter Medium 26 px** with −5 % letter-spacing and wraps
  inside a max width of 724 px; 8 px padding hugs the content. Cards can
  therefore grow quite wide on desktop before wrapping, matching the new
  high-fidelity Figma revision.  Corner radius also increases to 16 px so
  the bubble looks softer and friendlier.

How to use it?
The parent <TurnCanvas> registers this component under the node-type key
`turnNode`.  React-Flow will therefore render
`<TurnNode data={{ turn }} />` whenever it encounters
`type: 'turnNode'` in the nodes array.

Example (non-interactive excerpt):
```jsx
import TurnNode from './TurnNode.jsx';

const node = {
  id: '123',
  type: 'turnNode',
  data: {
    turn: {
      id: '123',
      role: 'assistant',
      text: 'Hello world – a concise preview…'
    }
  },
  position: { x: 0, y: 0 }
};
```
*/

import React from 'react';
import PropTypes from 'prop-types';
import useScriptStore from '../store/useScriptStore.js';
import { useNavigate, useParams } from 'react-router-dom';

function TurnNode({ id, data }) {
  // Pull helpers so clicking on a card can mark it selected and read selected id.
  const selectTurn = useScriptStore((s) => s.selectTurn);
  const selectedTurnId = useScriptStore((s) => s.selectedTurnId);

  const navigate = useNavigate();
  const { personaId } = useParams();

  // Destructure the turn for convenience.
  const { turn } = data;

  // ---------------------------------------------------------------------------
  // Visual style calculations (all numbers / colours come straight from Figma)
  // ---------------------------------------------------------------------------
  const isSelected = selectedTurnId === id;
  const isUser = turn.role === 'user';

  // Border rules – assistant/system have grey outline by default; user has none.
  const baseBorderWidth = isUser ? 0 : 2; // px
  const borderWidth = isSelected ? 2.5 : baseBorderWidth; // px
  const borderColour = isSelected ? '#6C80DA' : '#CCCCCC';

  // Fill rules – user cards are grey so editors instantly know who spoke.
  const backgroundColour = isUser ? '#C8C8C8' : '#FFFFFF';

  /* -------------------------------------------------------------------------
   * Typography – Inter Medium 26 px with −5 % letter-spacing (Figma exact).
   * We clamp the *width* to 172 px so when longer sentences arrive they wrap
   * onto a new line _inside_ the bubble instead of stretching horizontally.
   * ----------------------------------------------------------------------- */
  const bubbleStyle = {
    border: `${borderWidth}px solid ${borderColour}`,
    borderRadius: 16,
    background: backgroundColour,
    padding: 8,
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500, // "Medium" weight
    fontSize: 26,
    letterSpacing: '-0.05em', // −5 %
    lineHeight: 1.25,
    cursor: 'pointer',
    maxWidth: 724,
    width: 'fit-content',
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word'
  };

  // ---------------------------------------------------------------------------
  // The preview shows the *entire* text wrapped; no role badge per new spec.
  // ---------------------------------------------------------------------------
  const rawText = typeof turn.text === 'string' ? turn.text : '';

  return (
    <div
      style={bubbleStyle}
      onClick={() => selectTurn(id)}
      onDoubleClick={() => {
        /* Navigates to the timeline view (stub route) */
        navigate(`/canvas/${personaId}/node/${id}`);
      }}
    >
      {rawText}
    </div>
  );
}

TurnNode.propTypes = {
  id: PropTypes.string.isRequired,
  data: PropTypes.shape({
    turn: PropTypes.shape({
      role: PropTypes.string.isRequired,
      text: PropTypes.string
    }).isRequired
  }).isRequired
};

export default TurnNode; 