/*
LoadView.jsx – Browse the Program → Module → Day → Persona tree
================================================================
This page is the *second* screen the user sees after a successful login.
It fulfils implementation-plan item **2.6.2 LoadView**.

How it works (plain English):
1. When the component mounts we call `/hierarchy` on the API so we can show the
   full catalogue tree.  A helper called `apiFetch` takes care of base-URL and
   error parsing but we still need to pass the JWT in the `Authorization`
   header – we grab that token from the tiny zustand store `useAuthStore`.
2. The endpoint returns a *nested* JSON structure – a Program has Modules,
   each Module has Days, and each Day has Personas.  We store that nested
   object in React state (`tree`) so React re-renders automatically when the
   data arrives.
3. The left-hand column lists the hierarchy.  A little recursive function
   (`renderTree`) walks over the object and prints nested `<div>`s indented by
   1 rem per level.  Persona nodes – the *leaf* of the tree – are rendered as
   clickable buttons so the user can choose which script to load.
4. The right-hand column shows a placeholder text until a persona is selected.
   Once the user picks a persona we enable the **"Load script"** button.  For
   now that button simply navigates to `/canvas/{personaId}` – CanvasView does
   not exist yet so we'll stub the route in `App.jsx` with a temporary page.

Example usage:
```js
<BrowserRouter>
  <Routes>
    <Route path="/load" element={<LoadView />} />
  </Routes>
</BrowserRouter>
```
*/

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../store/useAuthStore.js';
import { apiFetch } from '../lib/api.js';
import HierarchyGraph from '../components/HierarchyGraph.jsx';

function LoadView() {
  /* ------------------------------------------------------------------
   * Local state – keeps track of the hierarchy, loading flag, and which
   * persona (if any) the user has clicked on.
   * ---------------------------------------------------------------- */
  const [tree, setTree] = useState(null); // The nested Program → Persona data
  const [loading, setLoading] = useState(true); // While we wait for /hierarchy
  const [selectedPersona, setSelectedPersona] = useState(null); // Leaf choice
  const [selectedModule, setSelectedModule] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);

  // Grab the JWT so we can call protected endpoints safely.
  const { token } = useAuthStore();
  const navigate = useNavigate();

  /* ------------------------------------------------------------------
   * Fetch the hierarchy exactly once when the component appears.
   * ---------------------------------------------------------------- */
  useEffect(() => {
    async function fetchHierarchy() {
      try {
        const { data } = await apiFetch('/hierarchy', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTree(data);
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (token) fetchHierarchy();
  }, [token]);

  /* ------------------------------------------------------------------
   * Recursive helper – prints one level of the tree.  The layout is kept
   * deliberately minimal at this stage – we only indent using `marginLeft`
   * so later we can drop in fancy SVG connectors without rewriting logic.
   * ---------------------------------------------------------------- */
  function renderTree(nodes, depth = 0) {
    if (!nodes) return null;

    return nodes.map((node) => {
      // PROGRAM level – has `modules` array
      if (node.modules) {
        return (
          <div key={node.id} style={{ marginLeft: depth * 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{node.id}</div>
            {renderTree(node.modules, depth + 1)}
          </div>
        );
      }

      // MODULE level – has `days` array
      if (node.days) {
        const isSelected = selectedModule === node.id;
        return (
          <div key={node.id} style={{ marginLeft: depth * 16, marginBottom: 8 }}>
            <button
              type="button"
              onClick={() => {
                setSelectedModule(node.id);
                setSelectedTopic(null);
                setSelectedPersona(null);
              }}
              style={{
                background: '#fff',
                color: '#000',
                border: `2px solid ${isSelected ? '#1E40AF' : '#000'}` /* blue outline when selected */,
                borderRadius: 6,
                padding: '0.3rem 0.6rem',
                cursor: 'pointer',
                fontSize: 16,
                fontWeight: isSelected ? 600 : 400,
                transition: 'border-color 0.2s'
              }}
            >
              {node.id}
            </button>
            {isSelected && renderTree(node.days, depth + 1)}
          </div>
        );
      }

      // DAY/Topic level – has `personas` array
      if (node.personas) {
        const isSelected = selectedTopic === node.id;
        return (
          <div key={node.id} style={{ marginLeft: depth * 16, marginBottom: 6 }}>
            <button
              type="button"
              onClick={() => {
                setSelectedTopic(node.id);
                setSelectedPersona(null);
              }}
              style={{
                background: '#fff',
                color: '#000',
                border: `2px solid ${isSelected ? '#1E40AF' : '#000'}`,
                borderRadius: 6,
                padding: '0.25rem 0.5rem',
                cursor: 'pointer',
                fontSize: 15
              }}
            >
              {node.id}
            </button>
            {isSelected && renderTree(node.personas, depth + 1)}
          </div>
        );
      }

      // PERSONA level – *leaf* node.  Render as a selectable button.
      return (
        <div key={node.id} style={{ marginLeft: depth * 16, marginBottom: 4 }}>
          <button
            type="button"
            onClick={() => setSelectedPersona(node.id)}
            style={{
              background: selectedPersona === node.id ? '#000' : '#fff',
              color: selectedPersona === node.id ? '#fff' : '#000',
              border: '1px solid #000',
              borderRadius: 4,
              padding: '0.25rem 0.5rem',
              cursor: 'pointer',
              fontSize: 14
            }}
          >
            {node.id}
          </button>
        </div>
      );
    });
  }

  /* ------------------------------------------------------------------
   * When the user presses "Load script" we navigate to `/canvas/{id}`.
   * CanvasView will be fleshed out in the next implementation item.
   * ---------------------------------------------------------------- */
  function handleLoad() {
    if (!selectedPersona) return; // Guard but button is already disabled.
    navigate(`/canvas/${selectedPersona}`);
  }

  /* ------------------------------------------------------------------
   * Two-column flex layout: tree on the left, placeholder / action on right.
   * ---------------------------------------------------------------- */
  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Left column – the hierarchy */}
      <div
        style={{
          flex: 2,
          padding: '1rem',
          height: '100%',
          overflow: 'hidden'
        }}
      >
        {loading && <p>Loading hierarchy…</p>}
        {!loading && tree && (
          <HierarchyGraph
            tree={tree}
            selectedIds={{ moduleId: selectedModule, topicId: selectedTopic, personaId: selectedPersona }}
            onSelect={(id) => {
              // Determine level by checking ids in tree structure
              if (tree[0].modules.some((m) => m.id === id)) {
                setSelectedModule(id);
                setSelectedTopic(null);
                setSelectedPersona(null);
              } else if (tree[0].modules.some((m) => m.days.some((d) => d.id === id))) {
                setSelectedTopic(id);
                setSelectedPersona(null);
              } else {
                setSelectedPersona(id);
              }
            }}
          />
        )}
      </div>

      {/* Right column – placeholder panel */}
      <div
        style={{
          flex: 1,
          padding: '1rem',
          borderLeft: '1px solid #e5e5e5',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {selectedPersona ? (
          <button
            type="button"
            onClick={handleLoad}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: 18,
              background: '#000',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer'
            }}
          >
            Load script
          </button>
        ) : (
          <p style={{ fontSize: 18, color: '#555' }}>Select a script to load…</p>
        )}
      </div>
    </div>
  );
}

export default LoadView; 