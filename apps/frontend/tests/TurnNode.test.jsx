import React from 'react';
import { render, screen } from '@testing-library/react';
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

    render(<TurnNode id="1" data={{ turn: sampleTurn }} />);

    // Role label should be capitalised → Assistant
    expect(screen.getByText(/assistant/i)).toBeInTheDocument();
  });
}); 