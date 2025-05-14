import { makeRows, measureChip, CHIP_HORIZONTAL_GAP } from '../src/lib/layoutUtils.js';

/**
 * layoutUtils.test.js – verifies that our tiny auto-layout helpers behave as
 * claimed in their docstrings.
 */

describe('makeRows helper', () => {
  it('splits chips into multiple rows when the width is exceeded', () => {
    const labels = ['Alpha', 'Bravo', 'Charlie', 'Delta'];

    // Compute an intentionally small maxWidth so we *know* we will need at
    // least two rows.  We pick just the width of the first chip plus the gap.
    const firstChipWidth = measureChip(labels[0]);
    const maxWidth = firstChipWidth + 1; // force wrap

    const rows = makeRows(labels, maxWidth);

    // We expect more than one row because maxWidth cannot fit even two chips.
    expect(rows.length).toBeGreaterThan(1);
  });

  it('reports correct row width including the inter-chip gaps', () => {
    const labels = ['One', 'Two'];
    const rows = makeRows(labels, 1000); // Large width so everything fits one row

    // The helper should return exactly one row in this case.
    expect(rows.length).toBe(1);

    const expectedWidth =
      measureChip('One') + // chip 1
      CHIP_HORIZONTAL_GAP +
      measureChip('Two'); // chip 2

    expect(rows[0].width).toBeCloseTo(expectedWidth, 1);
  });
}); 