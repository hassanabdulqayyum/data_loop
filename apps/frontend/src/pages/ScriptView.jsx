/*
ScriptView.jsx – Main page that hosts the Turn canvas
====================================================
This file wires together **three** building blocks so editors can see and
interact with a script:
1. <TurnCanvas /> – Centre/left area showing the gold-path turns as a vertical
   React-Flow chart.
2. <RightSidePanel /> – Fixed-width panel on the right that reacts to
   selection state (idle, selected, editing).
3. zustand store – On mount we call `loadScript(personaId)` which fetches the
   turns from the API and pumps them into global state so both children render.

At this stage there is **no editing flow yet** – the purpose is to paint the
script and prove routing + data loading work end-to-end.

Route declaration (already done in App.jsx):
```jsx
<Route path="/canvas/:personaId" element={<ScriptView />} />
```
*/

import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import TurnCanvas from '../components/TurnCanvas.jsx';
import RightSidePanel from '../components/RightSidePanel.jsx';
import useScriptStore from '../store/useScriptStore.js';
import useAuthStore from '../store/useAuthStore.js';

function ScriptView() {
  const { personaId } = useParams();
  const loadScript = useScriptStore((s) => s.loadScript);
  const token = useAuthStore((s) => s.token);

  // Kick off data load when component mounts *or* personaId changes.
  useEffect(() => {
    if (personaId && token) {
      // Fire and forget – store handles any error throwing.  In prod we will
      // add toast notifications; for the scaffold we just log.
      loadScript(personaId, token).catch((err) => {
        // eslint-disable-next-line no-console
        console.error('Failed to load script:', err);
      });
    }
  }, [personaId, token, loadScript]);

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Left – the React-Flow canvas renders turns */}
      <TurnCanvas />
      {/* Right – contextual actions */}
      <RightSidePanel />
    </div>
  );
}

export default ScriptView; 