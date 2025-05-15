/*
ScriptView.jsx – Placeholder for the upcoming Canvas page
========================================================
Implementation-plan reference: **2.6.3 – Script View** (micro-task 3.1)

At this stage we only need a *route target* so the router resolves
`/canvas/:personaId`.  The heavy lifting (React-Flow canvas, Right-Side Panel,
etc.) will follow in later micro-tasks.

Therefore this file just prints a centred "Coming soon…" banner so designers
can see navigation working.

Example usage (already wired in App.jsx):
```jsx
<Route path="/canvas/:personaId" element={<ScriptView />} />
```
*/

import React from 'react';
import { useParams } from 'react-router-dom';

function ScriptView() {
  const { personaId } = useParams();
  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <h2>
        Canvas for persona <code>{personaId}</code> coming soon…
      </h2>
    </div>
  );
}

export default ScriptView; 