import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ScriptView from '../src/pages/ScriptView.jsx';
import useScriptStore, { initialState } from '../src/store/useScriptStore.js';
import useAuthStore from '../src/store/useAuthStore.js';
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

/*
Unit-test – Ensure that mounting <ScriptView /> triggers the zustand
`loadScript` action so the turns get fetched from the API.

We avoid any live network call by swapping the `loadScript` method with a Jest
mock implementation that resolves immediately.
*/

// Small helper copied from useScriptStore tests so we can build fake Responses.
function buildResponse(jsonBody) {
  return {
    ok: true,
    json: async () => jsonBody
  };
}

beforeEach(() => {
  // Reset any previous mocks so tests stay isolated.
  jest.clearAllMocks();

  // Stub the *browser* fetch that apiFetch relies on.  We only care about the
  // /hierarchy call here so we can return a minimal tree that contains the
  // persona under test.
  global.fetch = jest.fn().mockResolvedValue(
    buildResponse({
      data: [
        {
          id: 'Program1',
          modules: [
            {
              id: 'm1',
              days: [
                {
                  id: 'd1',
                  personas: [{ id: 'p-123' }]
                }
              ]
            }
          ]
        }
      ]
    })
  );
});

describe('<ScriptView />', () => {
  it('calls loadScript for the given personaId', async () => {
    // 1. Prepare – inject fake JWT so ScriptView thinks user is logged in.
    useAuthStore.setState({ token: 'test-jwt' });

    // 2. Replace loadScript with a jest.fn so we can assert on it.
    const loadMock = jest.fn().mockResolvedValue();
    useScriptStore.setState({ ...initialState, loadScript: loadMock });

    // 3. Render component inside a MemoryRouter so route params work.
    render(
      <MemoryRouter initialEntries={[
        {
          pathname: "/canvas/p-123",
          state: {
            moduleNode: { id: "m1", name: "Module 1" },
            topicNode: { id: "d1", name: "Topic 1" },
            personaNode: { id: "p-123", name: "Focus" }
          }
        }
      ]}>
        <Routes>
          <Route path="/canvas/:personaId" element={<ScriptView />} />
        </Routes>
      </MemoryRouter>
    );

    // 4. Wait until useEffect flushes.
    await waitFor(() => {
      expect(loadMock).toHaveBeenCalledWith('p-123', 'test-jwt');
    });

    // 5. Breadcrumb should show the persona id once hierarchy fetch resolves.
    await waitFor(() => {
      expect(screen.getByText('p-123')).toBeInTheDocument();
    });
  });
}); 