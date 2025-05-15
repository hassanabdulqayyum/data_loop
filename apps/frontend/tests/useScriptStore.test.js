/*
useScriptStore.test.js – Jest tests for the new zustand store
============================================================
These tests cover the critical helper actions added in micro-task 3.1:
• `loadScript` – populates turns and writes to localStorage.
• `startEdit` / `cancelEdit` – toggle editing flags.
• `autoResume` – returns personaId when timestamp < 7 days, otherwise null.

We mock the *network* helpers so the tests never perform real HTTP calls.
*/

import useScriptStore, { initialState } from '../src/store/useScriptStore.js';
import { act } from '@testing-library/react';
import { jest } from '@jest/globals';

// Helper to build a fake fetch Response with desired JSON body.
function buildResponse(jsonBody) {
  return {
    ok: true,
    json: async () => jsonBody
  };
}

beforeEach(() => {
  // Reset store + localStorage between tests so they are isolated.
  useScriptStore.getState().reset();
  localStorage.clear();
  jest.clearAllMocks();

  // Stub the global fetch so network calls are captured.
  global.fetch = jest.fn().mockResolvedValue(
    buildResponse({ data: [{ id: 't1', persona_id: 'p1' }] })
  );
});

/* -------------------------------------------------------------
 * loadScript populates the store & persists lastPersonaOpened
 * ----------------------------------------------------------- */
test('loadScript stores turns & writes localStorage', async () => {
  await act(async () => {
    await useScriptStore.getState().loadScript('p1', 'fake-jwt');
  });

  const state = useScriptStore.getState();
  expect(state.turns).toHaveLength(1);

  const saved = JSON.parse(localStorage.getItem('lastPersonaOpened'));
  expect(saved.id).toBe('p1');
});

/* -------------------------------------------------------------
 * startEdit / cancelEdit flag logic
 * ----------------------------------------------------------- */
test('startEdit + cancelEdit toggle flags correctly', () => {
  act(() => {
    useScriptStore.getState().startEdit('t1');
  });
  expect(useScriptStore.getState().isEditing).toBe(true);
  expect(useScriptStore.getState().selectedTurnId).toBe('t1');

  act(() => {
    useScriptStore.getState().cancelEdit();
  });
  expect(useScriptStore.getState().isEditing).toBe(false);
});

/* -------------------------------------------------------------
 * autoResume returns id only when timestamp is fresh (<7 days)
 * ----------------------------------------------------------- */
test('autoResume obeys 7-day window', () => {
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const fresh = Date.now() - 1000; // 1 second ago
  const stale = Date.now() - (sevenDaysMs + 1000); // 7 days + 1 s ago

  // 1. Fresh timestamp → id returned
  localStorage.setItem('lastPersonaOpened', JSON.stringify({ id: 'p123', ts: fresh }));
  expect(useScriptStore.getState().autoResume()).toBe('p123');

  // 2. Stale timestamp → null returned
  localStorage.setItem('lastPersonaOpened', JSON.stringify({ id: 'p123', ts: stale }));
  expect(useScriptStore.getState().autoResume()).toBeNull();
}); 