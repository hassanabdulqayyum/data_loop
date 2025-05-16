/*
useScriptStore.js – Global state for the Script View
===================================================
This tiny zustand store centralises *all* state required by the upcoming
Script-View page so that any React component (TurnNode, Right-Side Panel,
etc.) can read or mutate it without prop-drilling.

Plain-English summary of what it stores:
• `turns` – the array of Turn objects returned by GET /script/:personaId.
• `selectedTurnId` – id of the Turn currently selected on the canvas.
• `isEditing` – *true* while the right-side panel shows the editing form.

Helper actions (all fully documented below):
• `loadScript(personaId, token)` – Fetches the gold-path turns from the API
  and stores them; also remembers the script in localStorage so Smart-Resume
  can reopen it next time the user logs in.
• `startEdit(turnId)` / `cancelEdit()` – Toggle editing state.
• `saveEdit(parentId, { text, commit_message }, token)` – Persists a new
  Turn version via PATCH /turn/:parentId then refreshes turns.
• `autoResume(navigateFn?)` – Returns the personaId from localStorage if the
  timestamp is < 7 days old.  If you pass a *navigate* function (e.g. the one
  returned by useNavigate from react-router) the helper will immediately
  redirect the user to `/canvas/:id` for you.

Example usage:
```js
import useScriptStore from '../store/useScriptStore.js';

const { loadScript } = useScriptStore.getState();
await loadScript('persona-123', token);
```
*/

import { create } from 'zustand';
import { getScript, patchTurn } from '../lib/api.js';

// How many milliseconds are in 7 days – used by autoResume()
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Helper that returns the *last persona record* object from localStorage
// or null when the value is invalid / corrupted.
function getLastPersonaRecord() {
  try {
    const raw = localStorage.getItem('lastPersonaOpened');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    //   parsed = { id, ts }
    if (!parsed.id || typeof parsed.id !== 'string') return null;
    if (!parsed.ts || typeof parsed.ts !== 'number') return null;
    return parsed;
  } catch (_) {
    // Any failure – treat as missing so we never crash.
    return null;
  }
}

// We expose *initialState* so unit tests (or components) can reset the store.
export const initialState = {
  turns: [],
  selectedTurnId: null,
  isEditing: false
};

const useScriptStore = create((set, get) => ({
  ...initialState,

  /* -------------------------------------------------------------
   * Action: loadScript
   * ----------------------------------------------------------- */
  async loadScript(personaId, token) {
    if (!personaId || !token) throw new Error('personaId and token are required');

    /* Early-exit optimisation ------------------------------------------------
     * If the store already holds turns for THIS persona we can return
     * immediately so the UI does not flicker through a loading state when
     * users bounce back and forth between Script ↔︎ Node views.
     *
     * We only skip the call when **some** turns are present – an empty array
     * means we have either never fetched or the list was purposely cleared.
     */
    const existingTurns = get().turns;
    if (existingTurns.length && existingTurns[0].persona_id === personaId) {
      return; // No network round-trip required – data already fresh enough.
    }

    // 1. Call the back-end – returns { data: [...] }
    const { data } = await getScript(personaId, token);

    // 2. Store the turns in state so UI re-renders.
    set({ turns: data, selectedTurnId: null, isEditing: false });

    // 3. Persist *which* script we just opened so Smart-Resume works.
    localStorage.setItem(
      'lastPersonaOpened',
      JSON.stringify({ id: personaId, ts: Date.now() })
    );
  },

  /* -------------------------------------------------------------
   * Action: startEdit – a user clicked the Edit button
   * ----------------------------------------------------------- */
  startEdit(turnId) {
    // Caller should guard but we double-check for dev peace-of-mind.
    if (!turnId) return;
    set({ selectedTurnId: turnId, isEditing: true });
  },

  /* -------------------------------------------------------------
   * Action: cancelEdit – user aborted editing, go back to view state
   * ----------------------------------------------------------- */
  cancelEdit() {
    set({ isEditing: false });
  },

  /* -------------------------------------------------------------
   * Action: saveEdit – persist new Turn version then refresh list
   * ----------------------------------------------------------- */
  async saveEdit(parentId, { text, commit_message }, token) {
    if (!parentId || !text) throw new Error('parentId and text are mandatory');

    await patchTurn(parentId, { text, commit_message }, token);

    // After save we pull the entire script again so ordering + version
    // numbers are accurate.
    const personaId = get().turns?.[0]?.persona_id || null;
    if (personaId) {
      await get().loadScript(personaId, token);
    }

    // Editing panel closes automatically.
    set({ isEditing: false, selectedTurnId: null });
  },

  /* -------------------------------------------------------------
   * Helper: autoResume – returns personaId if <7 days old, else null.
   * If `navigateFn` is supplied (e.g. from react-router) we also redirect.
   * ----------------------------------------------------------- */
  autoResume(navigateFn) {
    const record = getLastPersonaRecord();
    if (!record) return null;

    const age = Date.now() - record.ts;
    if (age > SEVEN_DAYS_MS) return null; // Too old – ignore.

    if (typeof navigateFn === 'function') {
      navigateFn(`/canvas/${record.id}`);
    }
    return record.id;
  },

  /* -------------------------------------------------------------
   * Test helper: reset – resets the store to initial values
   * ----------------------------------------------------------- */
  reset() {
    set(initialState); // merge so action methods stay intact
  },

  /* -------------------------------------------------------------
   * Action: selectTurn – highlight a card without entering editing
   * ----------------------------------------------------------- */
  selectTurn(turnId) {
    // Only update the currently highlighted card – do NOT toggle editing.
    if (!turnId) return;
    set({ selectedTurnId: turnId, isEditing: false });
  }
}));

export default useScriptStore; 