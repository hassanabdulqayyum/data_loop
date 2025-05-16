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
4. The right-hand column (RSP) now mirrors the staged helper wording from the
   Figma:
      • *No module picked*   → "Select a module to begin…".
      • *Module picked but no topic*   → "Select a topic…".
      • *Topic picked but no persona*  → "Select a script to load…".
      • *Persona picked*       → large **"Load script"** button.
   A floating **Export** button appears once the user has entered any module
   (disabled until a persona is also selected).  For now Export just shows a
   toast stub – the endpoint will be wired in a later micro-task.
   The Load button still navigates to `/canvas/{personaId}` which is yet to be
   implemented; `App.jsx` continues to stub that route for the time being.

Example usage:
```js
<BrowserRouter>
  <Routes>
    <Route path="/load" element={<LoadView />} />
  </Routes>
</BrowserRouter>
```
*/

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../store/useAuthStore.js';
import { apiFetch } from '../lib/api.js';
import HierarchyGraph from '../components/HierarchyGraph.jsx';
import TopNavBar from '../components/TopNavBar/TopNavBar.jsx';
import { ReactFlowProvider } from 'reactflow';

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
  const location = useLocation();

  const graphRef = useRef(null);

  /* ------------------------------------------------------------------
   * Style for the Load and Export buttons in the RSP
   * ---------------------------------------------------------------- */
  const buttonStyle = {
    fontFamily: '"Inter", sans-serif', // Ensure Inter is in quotes
    fontWeight: 500, // Medium weight for Inter
    fontSize: '24px',
    letterSpacing: '-0.05em', // -5% letter spacing
    color: '#000000',
    border: '2px solid #000000',
    padding: '8px', // 8px padding as per figma
    borderRadius: '6px', // Added a slight border radius for aesthetics, can be removed if not desired
    cursor: 'pointer',
    backgroundColor: '#FFFFFF', // Assuming a white background, can be transparent
    textDecoration: 'none', // For the export button if it's an <a> tag
  };

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
   * Pre-selection support – when ScriptView sends the user back with a
   * `state.preselect` object we auto-select the requested Module/Topic so
   * the hierarchy tree reopens at the same depth the user left.
   * ------------------------------------------------------------------ */
  useEffect(() => {
    if (!location.state || !location.state.preselect) return;

    const { moduleId: preModule, topicId: preTopic, personaId: prePersona } =
      location.state.preselect;

    if (preModule) setSelectedModuleId(preModule);
    if (preTopic) setSelectedTopicId(preTopic);
    if (prePersona) setSelectedPersonaId(prePersona);
  }, [location.state]);

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

  /**
   * ------------------------------------------------------------------
   * Fallback breadcrumb nodes – prevents the temporary "Mindfulness Program"
   * flash ------------------------------------------------------------------
   * If we navigated here via the breadcrumb *before* the /hierarchy request
   * finishes, we already know the IDs the user had selected (they were passed
   * in `location.state.preselect`).  The real node objects are only available
   * once `tree` is fetched, therefore – for the short in-between render – we
   * fabricate **minimal** placeholder objects so <TopNavBar /> can display the
   * correct IDs immediately instead of the default title.  The placeholders
   * are automatically replaced on the next render because the real nodes will
   * resolve once `tree` is set.
   * ------------------------------------------------------------------
   */
  if (!selectedModuleNode && selectedModuleId) {
    selectedModuleNode = { id: selectedModuleId, name: selectedModuleId };
  }
  if (!selectedTopicNode && selectedTopicId) {
    selectedTopicNode = { id: selectedTopicId, name: selectedTopicId };
  }
  if (!selectedPersonaNode && selectedPersonaId) {
    selectedPersonaNode = { id: selectedPersonaId, name: selectedPersonaId };
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
    const navState = {
      moduleNode: selectedModuleNode,
      topicNode: selectedTopicNode,
      personaNode: selectedPersonaNode
    };
    navigate(`/canvas/${selectedPersonaId}`, { state: navState });
  }

  /* ------------------------------------------------------------------
   * When the user presses "Export" we call the correct back-end endpoint
   * depending on what the user currently has highlighted.
   *
   *   Persona selected → GET /export/:personaId
   *   Topic   selected → GET /export/day/:dayId
   *   Module  selected → GET /export/module/:moduleId
   *
   * The server already sends `Content-Disposition: attachment` but browsers
   * don't respect that for `fetch` calls.  Therefore we build a Blob and
   * drive a synthetic <a download> click so the file lands in the user's
   * download tray with a human-readable name.
   * ---------------------------------------------------------------- */
  async function handleExport() {
    try {
      let path = null;
      let filename = null;

      if (selectedPersonaId) {
        path = `/export/${encodeURIComponent(selectedPersonaId)}`;
        filename = `script_${selectedPersonaId}.json`;
      } else if (selectedTopicId) {
        path = `/export/day/${encodeURIComponent(selectedTopicId)}`;
        filename = `day_${selectedTopicId}.json`;
      } else if (selectedModuleId) {
        path = `/export/module/${encodeURIComponent(selectedModuleId)}`;
        filename = `module_${selectedModuleId}.json`;
      } else {
        toast.error('Please select a module, topic, or persona to export.');
        return;
      }

      const data = await apiFetch(path, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      toast.success(`Exported \u201C${filename}\u201D`);
    } catch (err) {
      toast.error(err.message);
    }
  }

  // based on what the user has selected in the hierarchy tree.
  let rspContentElements = []; // Array to hold elements for RSP
  let helperText = "";

  if (selectedPersonaId) {
    // Persona selected: Show "Load script" and "Export" buttons
    // Helper text is not needed when buttons are present for this state.
    rspContentElements.push(
      <div key="buttons" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
        <button
          type="button"
          onClick={handleLoad}
          style={buttonStyle}
        >
          Load script
        </button>
        <button
          type="button"
          onClick={handleExport}
          style={buttonStyle}
          // Export button is always enabled when a Persona is selected to allow export
        >
          Export
        </button>
      </div>
    );
  } else if (selectedTopicId) {
    // Topic selected, but no Persona: Show "Select a script to load..." and "Export" button
    helperText = "Select a script to load…";
    rspContentElements.push(<p key="helper" style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.05em', color: '#000000', textAlign: 'center', marginBottom: '20px' }}>{helperText}</p>);
    rspContentElements.push(
      <button
        key="export-button"
        type="button"
        onClick={handleExport} // handleExport already checks for selectedPersonaId, but here we want to allow export attempt for a topic (backend might support it or show specific message)
        style={buttonStyle}
        disabled={!selectedTopicId} // Enable if a topic is selected, for consistency with design showing export at this stage
      >
        Export
      </button>
    );
  } else if (selectedModuleId) {
    // Module selected, but no Topic: Show "Select a topic..." and "Export" button
    helperText = "Select a topic…";
    rspContentElements.push(<p key="helper" style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.05em', color: '#000000', textAlign: 'center', marginBottom: '20px' }}>{helperText}</p>);
    rspContentElements.push(
      <button
        key="export-button"
        type="button"
        onClick={handleExport} // Allow export attempt for a module
        style={buttonStyle}
        disabled={!selectedModuleId} // Enable if a module is selected
      >
        Export
      </button>
    );
  } else {
    // Nothing selected beyond Program, or only Program selected: Show "Select a module to begin..."
    helperText = "Select a module to begin…";
    rspContentElements.push(<p key="helper" style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.05em', color: '#000000', textAlign: 'center' }}>{helperText}</p>);
  }

  const rspContent = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}>
      {rspContentElements}
    </div>
  );

  /* ------------------------------------------------------------------
   * Two-column flex layout: tree on the left, placeholder / action on right.
   * ---------------------------------------------------------------- */
  return (
    <>
      <TopNavBar
        selectedModuleNode={selectedModuleNode}
        selectedTopicNode={selectedTopicNode}
        selectedPersonaNode={selectedPersonaNode}
        /* Clicking module crumb resets deeper selections so user jumps back */
        onModuleClick={() => {
          if (!selectedModuleId) return; // no module selected yet
          setSelectedTopicId(null);
          setSelectedPersonaId(null);
        }}
        /* Clicking topic crumb clears persona selection */
        onTopicClick={() => {
          if (!selectedTopicId) return;
          setSelectedPersonaId(null);
        }}
        onPersonaClick={() => {
          /* At the moment clicking the persona breadcrumb does nothing extra,
             but we include the handler so future tasks can hook in analytics.
          */
        }}
      />
      <div style={{ display: 'flex', height: '100vh', paddingTop: '72px', boxSizing: 'border-box' }}>
        {/* Left column – the hierarchy */}
        <div
          ref={graphRef}
          style={{
            flex: 2,
            /* Removed 1-rem padding so the graph can span edge-to-edge.  The
               nav bar already sits above and the right panel has its own
               divider, so additional padding only wastes space. */
            padding: 0,
            height: 'calc(100% - 0px)',
            overflow: 'auto'
          }}
        >
          {loading && <p>Loading hierarchy…</p>}
          {!loading && tree && (
            <ReactFlowProvider>
              <HierarchyGraph
                tree={tree}
                selectedIds={{ moduleId: selectedModuleId, topicId: selectedTopicId, personaId: selectedPersonaId }}
                graphRect={graphRef.current ? graphRef.current.getBoundingClientRect() : null}
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
            </ReactFlowProvider>
          )}
        </div>

        {/* Right column – placeholder panel */}
        <div
          style={{
            flex: 1,
            padding: '1rem',
            /* Divider between graph and RSP: 3-px grey (#D1D1D1) per design */
            borderLeft: '3px solid #D1D1D1',
            /* Positioning context so the floating Export button anchors correctly */
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {/* Render the new rspContent which handles all states */}
          {rspContent}
        </div>
      </div>
    </>
  );
}

export default LoadView; 