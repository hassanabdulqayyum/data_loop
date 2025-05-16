/*
useHierarchyStore.js – Global cache for the program hierarchy
===========================================================
Purpose
-------
The hierarchical catalogue (Program → Module → Day → Persona) is needed by
multiple pages – **LoadView** needs the full tree, whereas **ScriptView** only
requires a single path to render breadcrumbs.  Fetching the same JSON from the
API every time the user toggles between routes causes a noticeable "Loading…"
flicker.

This tiny zustand store caches the `/hierarchy` response in memory so we can
reuse it during a single-page session.  The tree is considered *static* for
the duration of an editor session – if another user adds a module we do **not**
refresh automatically.  A manual page reload is acceptable for such admin
scenarios.

State shape
-----------
• `tree` – `null | Array`  →  The fully nested hierarchy (as returned by the API).

Actions
-------
• `setTree(tree)` – Persist the hierarchy in the store.
• `clear()`       – Wipe the cache (exposed for tests – rarely needed in prod).

Example usage
-------------
```js
import useHierarchyStore from '../store/useHierarchyStore.js';

const tree = useHierarchyStore.getState().tree;
if (!tree) {
  const { data } = await apiFetch('/hierarchy', { headers: { Authorization: `Bearer ${token}` } });
  useHierarchyStore.getState().setTree(data);
}
```
*/

import { create } from 'zustand';

// The initial (empty) state – exported for unit tests
export const initialHierarchyState = {
  tree: null
};

const useHierarchyStore = create((set) => ({
  ...initialHierarchyState,

  /**
   * Persist the hierarchy so subsequent route switches can reuse it.
   * @param {Array} tree – Nested Program → Persona hierarchy from the API.
   */
  setTree(tree) {
    set({ tree });
  },

  /**
   * Reset the cache – used by unit tests to start from a clean slate.
   */
  clear() {
    set(initialHierarchyState);
  }
}));

export default useHierarchyStore; 