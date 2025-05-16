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
import TopNavBar from '../components/TopNavBar/TopNavBar.jsx';
import { apiFetch } from '../lib/api.js';

function ScriptView() {
  const { personaId } = useParams();
  const loadScript = useScriptStore((s) => s.loadScript);
  const token = useAuthStore((s) => s.token);

  // ------------------------------------------------------------------
  // Local state: hierarchy tree so we can derive breadcrumb nodes for the
  // TopNavBar.  We only need *one* traversal to locate the persona and its
  // parents; the entire object stays in state in case future micro-tasks
  // (e.g. Turn-level breadcrumbs) require extra information.
  // ------------------------------------------------------------------
  const [hierarchyTree, setHierarchyTree] = React.useState(null);
  const [crumbNodes, setCrumbNodes] = React.useState({
    module: null,
    topic: null,
    persona: null
  });

  /* ------------------------------------------------------------------
   * Effect: fetch /hierarchy so the breadcrumb can display Module/Topic/Persona
   * ------------------------------------------------------------------ */
  React.useEffect(() => {
    if (!token) return; // User not logged-in yet.

    async function fetchHierarchy() {
      try {
        // apiFetch already prepends the base URL and handles JSON parsing.
        const { data } = await apiFetch('/hierarchy', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setHierarchyTree(data);

        // Walk the tree – stop as soon as we find the Persona.
        let foundModule = null;
        let foundTopic = null;
        let foundPersona = null;

        outer: for (const program of data) {
          for (const mod of program.modules) {
            for (const topic of mod.days) {
              const persona = topic.personas.find((p) => p.id === personaId);
              if (persona) {
                foundModule = mod;
                foundTopic = topic;
                foundPersona = persona;
                break outer; // Exit all loops – path found
              }
            }
          }
        }
        setCrumbNodes({ module: foundModule, topic: foundTopic, persona: foundPersona });
      } catch (err) {
        // Non-fatal – the canvas still works without breadcrumbs.
        // eslint-disable-next-line no-console
        console.error('Failed to fetch hierarchy for breadcrumb:', err);
      }
    }

    fetchHierarchy();
  }, [personaId, token]);

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

  /* We add 72-px top padding so the content does not hide beneath the fixed
   * TopNavBar (the bar itself is 72 px tall per Figma spec).  Keeping this
   * padding in one place avoids magic numbers sprinkled across siblings. */
  return (
    <>
      {/* Fixed breadcrumb bar re-used from LoadView so the visual language is consistent */}
      <TopNavBar
        selectedModuleNode={crumbNodes.module}
        selectedTopicNode={crumbNodes.topic}
        selectedPersonaNode={crumbNodes.persona}
        /* The callbacks simply scroll to top for now – real behaviour will be
         * implemented in later micro-tasks. */
        onModuleClick={() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onTopicClick={() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onPersonaClick={() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Main area: Turn canvas + contextual panel */}
      <div
        style={{
          display: 'flex',
          height: '100vh',
          paddingTop: '72px', // Keeps canvas below the navbar
          boxSizing: 'border-box'
        }}
      >
        {/* Left – the React-Flow canvas renders turns */}
        <TurnCanvas />
        {/* Right – contextual actions */}
        <RightSidePanel />
      </div>
    </>
  );
}

export default ScriptView; 