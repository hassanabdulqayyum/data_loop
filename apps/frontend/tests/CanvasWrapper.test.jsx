/*
CanvasWrapper.test.jsx – unit tests
==================================
These tests stub React-Flow's `useReactFlow()` hook so we can assert that
`fitView()` is invoked exactly when we expect.
*/

import React from 'react';
import { render, act } from '@testing-library/react';
import CanvasWrapper from '../src/components/layout/CanvasWrapper.jsx';

// ---------------------------------------------------------------------------
// Jest mock for reactflow.  We only need `useReactFlow` to return the methods
// used by CanvasWrapper (getNodes + fitView).
// ---------------------------------------------------------------------------
jest.mock('reactflow', () => ({
  useReactFlow: () => mockReactFlowInstance
}));

const mockReactFlowInstance = {
  getNodes: jest.fn(() => [{ id: '1' }]),
  fitView: jest.fn()
};

afterEach(() => {
  jest.clearAllMocks();
});

describe('CanvasWrapper', () => {
  test('calls fitView on mount when nodes exist', () => {
    render(
      <CanvasWrapper>
        <div>dummy</div>
      </CanvasWrapper>
    );
    expect(mockReactFlowInstance.fitView).toHaveBeenCalledTimes(1);
  });

  test('does not crash when no nodes – fitView not called', () => {
    mockReactFlowInstance.getNodes.mockReturnValueOnce([]); // empty array
    render(
      <CanvasWrapper>
        <div>dummy</div>
      </CanvasWrapper>
    );
    expect(mockReactFlowInstance.fitView).not.toHaveBeenCalled();
  });

  test('re-runs fitView when deps change', () => {
    const { rerender } = render(
      <CanvasWrapper deps={[0]}>
        <div>dummy</div>
      </CanvasWrapper>
    );
    expect(mockReactFlowInstance.fitView).toHaveBeenCalledTimes(1);

    // Change dep value
    rerender(
      <CanvasWrapper deps={[1]}>
        <div>dummy</div>
      </CanvasWrapper>
    );

    expect(mockReactFlowInstance.fitView).toHaveBeenCalledTimes(2);
  });
}); 