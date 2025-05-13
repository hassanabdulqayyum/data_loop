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
import TopNavBar from '../components/TopNavBar/TopNavBar.jsx';

function LoadView() {
  /* ------------------------------------------------------------------
   * Local state – keeps track of the hierarchy, loading flag, and which
   * persona (if any) the user has clicked on.
   * ---------------------------------------------------------------- */
  const [tree, setTree] = useState(null); // The nested Program → Persona data
  const [loading, setLoading] = useState(true); // While we wait for /hierarchy
  const [selectedModuleId, setSelectedModuleId] = useState(null); // Store ID
  const [selectedTopicId, setSelectedTopicId] = useState(null);   // Store ID
  const [selectedPersonaId, setSelectedPersonaId] = useState(null); // Store ID

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
        // Assuming data is an array of programs, and each program has a 'name'
        // For TopNavBar, we might need the program name if no module is selected.
        // However, current TopNavBar logic defaults to "Data Loop".
        // The tree structure is: [{ id: 'ProgramName', name: 'ProgramName', modules: [...] }]
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
   * Helper functions to find full node objects from IDs.
   * These are needed to pass names to TopNavBar.
   * Assumes tree is an array of program nodes.
   * ---------------------------------------------------------------- */
  const findNodeById = (nodes, id) => {
    if (!nodes || !id) return null;
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.modules) {
        const foundInModules = findNodeById(node.modules, id);
        if (foundInModules) return foundInModules;
      }
      if (node.days) { // 'days' are topics
        const foundInDays = findNodeById(node.days, id);
        if (foundInDays) return foundInDays;
      }
      if (node.personas) {
        const foundInPersonas = findNodeById(node.personas, id);
        if (foundInPersonas) return foundInPersonas;
      }
    }
    return null;
  };
  
  // Derive full node objects for TopNavBar
  // The 'tree' is expected to be an array of programs.
  // findNodeById needs to search through this structure.
  
  // To get the module node, we need to iterate through programs and their modules.
  let selectedModuleNode = null;
  if (selectedModuleId && tree) {
    for (const program of tree) {
      selectedModuleNode = findNodeById(program.modules, selectedModuleId);
      if (selectedModuleNode) break;
    }
  }

  // To get the topic node, we search within the selected module's days.
  let selectedTopicNode = null;
  if (selectedTopicId && selectedModuleNode && selectedModuleNode.days) {
    selectedTopicNode = findNodeById(selectedModuleNode.days, selectedTopicId);
  }
  
  // To get the persona node, we search within the selected topic's personas.
  let selectedPersonaNode = null;
  if (selectedPersonaId && selectedTopicNode && selectedTopicNode.personas) {
    selectedPersonaNode = findNodeById(selectedTopicNode.personas, selectedPersonaId);
  }

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
        const isSelected = selectedModuleId === node.id;
        return (
          <div key={node.id} style={{ marginLeft: depth * 16, marginBottom: 8 }}>
            <button
              type="button"
              onClick={() => {
                setSelectedModuleId(node.id);
                setSelectedTopicId(null);
                setSelectedPersonaId(null);
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
        const isSelected = selectedTopicId === node.id;
        return (
          <div key={node.id} style={{ marginLeft: depth * 16, marginBottom: 6 }}>
            <button
              type="button"
              onClick={() => {
                setSelectedTopicId(node.id);
                setSelectedPersonaId(null);
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
            onClick={() => setSelectedPersonaId(node.id)}
            style={{
              background: selectedPersonaId === node.id ? '#000' : '#fff',
              color: selectedPersonaId === node.id ? '#fff' : '#000',
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
    if (!selectedPersonaId) return; // Guard but button is already disabled.
    navigate(`/canvas/${selectedPersonaId}`);
  }

  /* ------------------------------------------------------------------
   * Two-column flex layout: tree on the left, placeholder / action on right.
   * ---------------------------------------------------------------- */
  return (
    <>
      <TopNavBar 
        selectedModuleNode={selectedModuleNode}
        selectedTopicNode={selectedTopicNode}
        selectedPersonaNode={selectedPersonaNode}
      />
      <div style={{ display: 'flex', height: '100vh', paddingTop: '72px', boxSizing: 'border-box' }}>
        {/* Left column – the hierarchy */}
        <div
          style={{
            flex: 2,
            padding: '1rem',
            height: 'calc(100% - 0px)',
            overflow: 'auto'
          }}
        >
          {loading && <p>Loading hierarchy…</p>}
          {!loading && tree && (
            <HierarchyGraph
              tree={tree}
              selectedIds={{ moduleId: selectedModuleId, topicId: selectedTopicId, personaId: selectedPersonaId }}
              onSelect={(id, nodeType, nodeData) => {
                if (nodeType === 'program') {
                  setSelectedModuleId(null);
                  setSelectedTopicId(null);
                  setSelectedPersonaId(null);
                } else if (nodeType === 'module') {
                  setSelectedModuleId(id);
                  setSelectedTopicId(null);
                  setSelectedPersonaId(null);
                } else if (nodeType === 'day') {
                  setSelectedTopicId(id);
                  setSelectedPersonaId(null);
                } else if (nodeType === 'persona') {
                  setSelectedPersonaId(id);
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
            /* Divider between graph and RSP: 3-px grey (#D1D1D1) per design */
            borderLeft: '3px solid #D1D1D1',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {selectedPersonaId ? (
            <button
              type="button"
              onClick={handleLoad}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: 24,
                fontWeight: 500,
                letterSpacing: '-0.05em',
                background: '#ffffff',
                color: '#000000',
                border: '2px solid #000000',
                borderRadius: 6,
                cursor: 'pointer'
              }}
            >
              Load script
            </button>
          ) : (
            <p style={{
              fontSize: 28,
              fontWeight: 500,
              letterSpacing: '-0.05em',
              color: '#9CA3AF'
            }}>Select a script to load…</p>
          )}
        </div>
      </div>
    </>
  );
}

export default LoadView; 