/*
App.jsx – Top-level component holding the Router switch.

For now we only have a Login page, but adding more routes later
( CanvasView, HierarchyDrawer overlay, etc. ) will be as easy as
dropping more <Route /> lines.

Example usage:
<BrowserRouter>
  <App />
</BrowserRouter>
*/

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import LoginView from './pages/LoginView.jsx';
import LoadView from './pages/LoadView.jsx';
import ScriptView from './pages/ScriptView.jsx';

function App() {
  return (
    <Routes>
      {/* Public route – users land here first */}
      <Route path="/login" element={<LoginView />} />
      <Route path="/load" element={<LoadView />} />
      <Route path="/canvas/:personaId" element={<ScriptView />} />

      {/* Fallback – any unknown path goes to /login for now. */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App; 