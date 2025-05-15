import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import RightSidePanel from '../src/components/RightSidePanel.jsx';
import useScriptStore, { initialState } from '../src/store/useScriptStore.js';

/*
Tests that the panel shows the *idle* placeholder when no turn is selected and
we are not editing.
*/

describe('<RightSidePanel />', () => {
  beforeEach(() => {
    // Reset store to default state so the panel believes nothing is selected.
    useScriptStore.setState(initialState);
  });

  it('renders idle stub by default', () => {
    render(<RightSidePanel />);
    expect(screen.getByText(/nothing selected/i)).toBeInTheDocument();
  });
}); 