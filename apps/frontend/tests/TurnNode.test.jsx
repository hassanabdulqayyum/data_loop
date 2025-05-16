import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TurnNode from '../src/components/TurnNode.jsx';
import useScriptStore, { initialState } from '../src/store/useScriptStore.js';
import '@testing-library/jest-dom';

/*
Unit-tests for the TurnNode presentation layer.
Instead of checking the role label (which is gone) we now assert on the CSS
properties that distinguish assistant vs user and selected vs unselected
states.
*/

describe('<TurnNode /> style rules', () => {
  beforeEach(() => {
    // Reset the zustand store so previous test runs never bleed through.
    useScriptStore.setState(initialState);
  });

  it('applies grey outline for assistant (unselected)', () => {
    const sampleTurn = {
      id: '1',
      role: 'assistant',
      text: 'Assistant turn body.'
    };

    render(
      <MemoryRouter initialEntries={[{ pathname: '/canvas/p-123' }]}> 
        <TurnNode id="1" data={{ turn: sampleTurn }} />
      </MemoryRouter>
    );

    const bubble = screen.getByText(/Assistant turn body\./i);
    expect(bubble).toHaveStyle('border-width: 2px');
  });

  it('uses grey fill and *no* border for user (unselected)', () => {
    const sampleTurn = {
      id: '2',
      role: 'user',
      text: 'User turn body.'
    };

    render(
      <MemoryRouter initialEntries={[{ pathname: '/canvas/p-123' }]}> 
        <TurnNode id="2" data={{ turn: sampleTurn }} />
      </MemoryRouter>
    );

    const bubble = screen.getByText(/User turn body\./i);
    expect(bubble).toHaveStyle('background: rgb(200, 200, 200)');
    expect(bubble).toHaveStyle('border-width: 0px');
  });

  it('highlights the card in blue when selected', () => {
    const sampleTurn = {
      id: '3',
      role: 'assistant',
      text: 'Selectable.'
    };

    render(
      <MemoryRouter initialEntries={[{ pathname: '/canvas/p-123' }]}> 
        <TurnNode id="3" data={{ turn: sampleTurn }} />
      </MemoryRouter>
    );

    // Simulate user clicking the card (selectTurn action inside component)
    fireEvent.click(screen.getByText(/Selectable\./i));

    const bubble = screen.getByText(/Selectable\./i);
    expect(bubble).toHaveStyle('border-width: 2.5px');
  });
}); 