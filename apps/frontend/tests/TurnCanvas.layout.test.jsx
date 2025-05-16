/*
TurnCanvas.layout.test.jsx – regression test for scroll-shift bug
================================================================
The bug fixed in this commit caused the React-Flow viewport to re-centre on
*every* wheel scroll, pushing half of the Turn cards under the Right-Side
Panel.  The root cause was React-Flow panning; we have now:
  • disabled `panOnScroll`,
  • moved vertical scrolling to the wrapper div via `overflow-y:auto`, and
  • locked the panel width at 420 px.

This test asserts that the wrapper element exposes the correct overflow rule
so future refactors cannot regress the behaviour.
*/

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TurnCanvas from '../src/components/TurnCanvas.jsx';
import useScriptStore, { initialState } from '../src/store/useScriptStore.js';
import '@testing-library/jest-dom';

// Mock ResizeObserver because JSDOM does not implement it.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = global.ResizeObserver || ResizeObserverMock;

// Provide a minimal gold-path so TurnCanvas actually renders a node.
const sampleTurns = [
  { id: '1', role: 'assistant', text: 'Hi there!' },
  { id: '2', role: 'user', text: 'Hello back' }
];

describe('<TurnCanvas /> layout container', () => {
  beforeEach(() => {
    useScriptStore.setState({ ...initialState, turns: sampleTurns });
  });

  it('enables vertical scrolling via overflow-y: auto', () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/canvas/p-1' }]}> 
        <TurnCanvas />
      </MemoryRouter>
    );

    const wrapper = screen.getByTestId('turn-canvas-wrapper');
    expect(wrapper).toHaveStyle('overflow-y: auto');
    expect(wrapper).toHaveStyle('overflow-x: hidden');
  });
}); 