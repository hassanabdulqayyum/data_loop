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

import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../store/useAuthStore.js';
import { apiFetch } from '../lib/api.js';
import HierarchyGraph from '../components/HierarchyGraph.jsx';
import { ReactFlowProvider } from 'reactflow';
import useHierarchyStore from '../store/useHierarchyStore.js';
import ThreePaneLayout from '../components/layout/ThreePaneLayout.tsx';
import CanvasWrapper from '../components/layout/CanvasWrapper.jsx';
import TopNavBar from '../components/TopNavBar/TopNavBar.jsx';

function LoadView() {
  /* ------------------------------------------------------------------
   * Local state – keeps track of the hierarchy, loading flag, and which
   * persona (if any) the user has clicked on.
   * ---------------------------------------------------------------- */
  const cachedHierarchy = useHierarchyStore((s) => s.tree);
  const setHierarchyCache = useHierarchyStore((s) => s.setTree);

  const [tree, setTree] = useState(cachedHierarchy); // Local copy for this view
  const [loading, setLoading] = useState(!cachedHierarchy); // true only when we genuinely need a fetch
  const [selectedModuleId, setSelectedModuleId] = useState(null); // Store ID
  const [selectedTopicId, setSelectedTopicId] = useState(null);   // Store ID
  const [selectedPersonaId, setSelectedPersonaId] = useState(null); // Store ID

  // Grab the JWT so we can call protected endpoints safely.
  const { token } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

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
    borderRadius: '12px', 
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
        // Cache globally so subsequent route switches reuse the same array.
        setTree(data);
        setHierarchyCache(data);
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    }

    // If we already have the catalogue cached we can skip the network round-
    // trip entirely – setLoading(false) immediately so UI renders.
    if (cachedHierarchy) {
      setLoading(false);
      return; // Early exit – no fetch needed
    }

    if (token) fetchHierarchy();
  }, [token, cachedHierarchy]);

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
   * Props for TopNavBar, similar to what was passed to navBarProps of EditorShell
   * ---------------------------------------------------------------- */
  const topNavProps = {
    currentView: 'load',
    programNode: tree && tree.length > 0 ? tree[0] : null, // Assuming the first program is relevant context
    selectedModuleNode,
    selectedTopicNode,
    selectedPersonaNode,
    onModuleSelect: (moduleId) => {
      setSelectedModuleId(moduleId);
      setSelectedTopicId(null);
      setSelectedPersonaId(null);
    },
    onTopicSelect: (topicId) => {
      setSelectedTopicId(topicId);
      setSelectedPersonaId(null);
    },
    onPersonaSelect: (personaId) => {
      setSelectedPersonaId(personaId);
    },
  };

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

  const buttonDisabled = loading || !selectedPersonaId;

  // Bundle IDs for HierarchyGraph
  const currentSelectedIds = {
    moduleId: selectedModuleId,
    topicId: selectedTopicId,
    personaId: selectedPersonaId
  };

  return (
    <ReactFlowProvider>
      <ThreePaneLayout
        nav={<TopNavBar {...topNavProps} />}
        canvas={
          <CanvasWrapper deps={[tree, selectedModuleId, selectedTopicId, selectedPersonaId]}>
            <div style={{ height: '100%', width: '100%', backgroundColor: '#F3F4F6', position: 'relative' }}>
              {loading && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <p>Loading hierarchy...</p>
                </div>
              )}
              {!loading && tree && tree.length > 0 && (
                <HierarchyGraph
                  programs={tree}
                  selectedIds={currentSelectedIds}
                  onSelect={(nodeId, nodeType) => {
                    if (nodeType === 'module') {
                      setSelectedModuleId(nodeId);
                      setSelectedTopicId(null);
                      setSelectedPersonaId(null);
                    } else if (nodeType === 'topic' || nodeType === 'day') { // Assuming 'day' is topic
                      setSelectedTopicId(nodeId);
                      setSelectedPersonaId(null);
                    } else if (nodeType === 'persona') {
                      setSelectedPersonaId(nodeId);
                    }
                  }}
                />
              )}
              {!loading && (!tree || tree.length === 0) && (
                 <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <p>No hierarchy data found.</p>
                </div>
              )}
            </div>
          </CanvasWrapper>
        }
        panel={
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ 
              padding: '20px',
              textAlign: 'center',
              fontFamily: "'Inter', sans-serif",
              fontWeight: 500,
              fontSize: '28px',
              letterSpacing: '-0.05em',
              marginBottom: '20px'
            }}>
              {!selectedModuleId && <p>Select a module to begin viewing its topics and associated personas.</p>}
              {selectedModuleId && !selectedTopicId && <p>Select a topic to explore available personas.</p>}
              {selectedTopicId && !selectedPersonaId && <p>Select a script to load their script.</p>}
              {selectedPersonaId && <p>Ready to load script for: <strong>{selectedPersonaNode?.name || selectedPersonaId}</strong>.</p>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <button
                type="button"
                onClick={handleLoad}
                disabled={buttonDisabled}
                style={{
                  ...buttonStyle,
                  cursor: buttonDisabled ? 'not-allowed' : 'pointer',
                  opacity: buttonDisabled ? 0.5 : 1,
                }}
              >
                Load Script
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={loading || (!selectedModuleId && !selectedTopicId && !selectedPersonaId)}
                style={{
                  ...buttonStyle,
                  cursor: (loading || (!selectedModuleId && !selectedTopicId && !selectedPersonaId)) ? 'not-allowed' : 'pointer',
                  opacity: (loading || (!selectedModuleId && !selectedTopicId && !selectedPersonaId)) ? 0.5 : 1,
                  backgroundColor: '#EFEFEF', 
                }}
              >
                Export
              </button>
            </div>
          </div>
        }
      />
    </ReactFlowProvider>
  );
}

export default LoadView; 