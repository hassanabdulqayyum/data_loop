/*
LoadView.test.jsx – quick smoke-test for the new LoadView page.
It stubs the fetch call so the component renders synchronously in the test
environment and then verifies that the top-level Program name is displayed.
*/

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import LoadView from '../src/pages/LoadView.jsx';
import useAuthStore from '../src/store/useAuthStore.js';

// A fake JWT so the component believes the user is authenticated.
useAuthStore.setState({ token: 'dummy-jwt' });

afterEach(() => {
  // Restore fetch after every test so other tests are unaffected.
  global.fetch.mockRestore && global.fetch.mockRestore();
});

it('renders hierarchy tree after fetch', async () => {
  // Stub the fetch() call made inside apiFetch
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      data: [
        {
          id: 'Program A',
          seq: 0,
          modules: [
            {
              id: 'Module 1',
              seq: 1,
              days: [
                {
                  id: 'Day 1',
                  seq: 1,
                  personas: [{ id: 'Persona 1', seq: 1 }]
                }
              ]
            }
          ]
        }
      ]
    })
  });

  render(
    <MemoryRouter>
      <LoadView />
    </MemoryRouter>
  );

  // Wait until the Program name appears in the document.
  await waitFor(() => expect(screen.getByText('Program A')).toBeInTheDocument());

  // Click the Persona button and assert that the Load script button appears.
  fireEvent.click(screen.getByRole('button', { name: 'Persona 1' }));
  expect(screen.getByRole('button', { name: /load script/i })).toBeEnabled();
}); 