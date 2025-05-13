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

// Temporary stub so the router resolves /canvas/:id until CanvasView is built.
function CanvasStub() {
  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <h2>CanvasView coming soon…</h2>
    </div>
  );
}

function App() {
  return (
    <Routes>
      {/* Public route – users land here first */}
      <Route path="/login" element={<LoginView />} />
      <Route path="/load" element={<LoadView />} />
      <Route path="/canvas/:personaId" element={<CanvasStub />} />

      {/* Fallback – any unknown path goes to /login for now. */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App; 