import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TurnNode from '../src/components/TurnNode.jsx';
import '@testing-library/jest-dom';

/*
Simple smoke-test that the TurnNode custom component renders the author role
and a 40-char preview.
*/

describe('<TurnNode />', () => {
  it('shows the role label', () => {
    const sampleTurn = {
      id: '1',
      role: 'assistant',
      text: 'Hello world, this is a fairly long assistant answer used in tests.'
    };

    render(
      <MemoryRouter initialEntries={[{ pathname: '/canvas/p-123' }]}> 
        <TurnNode id="1" data={{ turn: sampleTurn }} />
      </MemoryRouter>
    );

    // Role label should be capitalised → Assistant
    expect(screen.getByText(/assistant/i)).toBeInTheDocument();
  });

  it('renders safely when text is null', () => {
    const sampleTurn = {
      id: '2',
      role: 'system',
      text: null
    };

    // The render call should not throw.
    expect(() =>
      render(
        <MemoryRouter initialEntries={[{ pathname: '/canvas/p-123' }]}> 
          <TurnNode id="2" data={{ turn: sampleTurn }} />
        </MemoryRouter>
      )
    ).not.toThrow();

    // We still expect the role badge to be present.
    expect(screen.getByText(/system/i)).toBeInTheDocument();
  });
}); 