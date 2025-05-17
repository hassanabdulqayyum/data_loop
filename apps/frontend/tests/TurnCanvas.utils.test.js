/*
TurnCanvas.utils.test.js – unit-tests for calculateNodesAndEdges()
=================================================================
These tests verify the **mathematical contract** that underpins the Script
View layout so front-end regressions are caught even without a browser or
React-Flow runtime.
*/

import { calculateNodesAndEdges, FIRST_NODE_OFFSET_Y, VERTICAL_GAP } from '../src/components/TurnCanvas.utils.js';

// Sample fixture – three visible turns in the correct order.
const sampleTurns = [
  { id: '1', role: 'assistant', text: 'Hello' },
  { id: '2', role: 'user', text: 'Hi there' },
  { id: '3', role: 'assistant', text: 'How are you?' }
];

describe('calculateNodesAndEdges()', () => {
  it('positions the very first node 44 px below the navbar', () => {
    const { nodes } = calculateNodesAndEdges(sampleTurns, 1000);
    expect(nodes[0].position.y).toBe(FIRST_NODE_OFFSET_Y);
  });

  it('keeps a constant vertical gap of 143 px between successive nodes', () => {
    const { nodes } = calculateNodesAndEdges(sampleTurns, 1000);
    const delta1 = nodes[1].position.y - nodes[0].position.y;
    const delta2 = nodes[2].position.y - nodes[1].position.y;
    expect(delta1).toBe(VERTICAL_GAP);
    expect(delta2).toBe(VERTICAL_GAP);
  });

  it('creates a straight 2.5-px #CCCCCC edge between each pair', () => {
    const { edges } = calculateNodesAndEdges(sampleTurns, 1000);
    expect(edges).toHaveLength(2);
    for (const edge of edges) {
      expect(edge.type).toBe('straight');
      expect(edge.style.stroke).toBe('#CCCCCC');
      expect(edge.style.strokeWidth).toBe(2.5);
    }
  });
}); 