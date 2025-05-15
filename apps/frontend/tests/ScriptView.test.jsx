import React from 'react';
import { render, waitFor } from '@testing-library/react';
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

describe('<ScriptView />', () => {
  it('calls loadScript for the given personaId', async () => {
    // 1. Prepare – inject fake JWT so ScriptView thinks user is logged in.
    useAuthStore.setState({ token: 'test-jwt' });

    // 2. Replace loadScript with a jest.fn so we can assert on it.
    const loadMock = jest.fn().mockResolvedValue();
    useScriptStore.setState({ ...initialState, loadScript: loadMock });

    // 3. Render component inside a MemoryRouter so route params work.
    render(
      <MemoryRouter initialEntries={["/canvas/p-123"]}>
        <Routes>
          <Route path="/canvas/:personaId" element={<ScriptView />} />
        </Routes>
      </MemoryRouter>
    );

    // 4. Wait until useEffect flushes.
    await waitFor(() => {
      expect(loadMock).toHaveBeenCalledWith('p-123', 'test-jwt');
    });
  });
}); 