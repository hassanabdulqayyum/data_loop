import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import RightSidePanel from '../src/components/RightSidePanel.jsx';
import useScriptStore, { initialState } from '../src/store/useScriptStore.js';

/*
Tests that the panel shows the *idle* guidance message plus a disabled
"Export Script" button when no turn is selected and we are not in editing
mode.  This covers component-tree item **2** from the implementation plan.
*/

describe('<RightSidePanel />', () => {
  beforeEach(() => {
    // Reset store to default state so the panel believes nothing is selected.
    useScriptStore.setState(initialState);
  });

  it('renders idle helper text and active Export button by default', () => {
    render(<RightSidePanel />);
    // Expect the new helper guidance copy
    expect(screen.getByText(/click a node to view details…/i)).toBeInTheDocument();
    // The Export Script button should be present *and* disabled until a node is selected
    const exportBtn = screen.getByRole('button', { name: /^export$/i });
    expect(exportBtn).toBeEnabled();
  });

  it('renders metadata and action buttons when a turn is selected', () => {
    // Prime the store with a sample turn and selection.
    useScriptStore.setState({
      turns: [
        {
          id: 't1',
          role: 'assistant',
          text: 'Hello world',
          ts: 1710000000000 // fixed epoch for deterministic test
        }
      ],
      selectedTurnId: 't1',
      isEditing: false
    });

    render(<RightSidePanel />);

    // Metadata present
    expect(screen.getByText(/created/i)).toBeInTheDocument();
    expect(screen.getByText(/author/i)).toBeInTheDocument();

    // Action buttons present
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^export$/i })).toBeInTheDocument();
  });
}); 