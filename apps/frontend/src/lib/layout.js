/**
 * layout.js – Tiny helpers for 1-D chip layout
 * =================================================
 * This file houses helper functions that deal with laying out an arbitrary
 * number of **chips** (our grey rounded rectangles) inside a fixed-width
 * area – e.g. the graph view on the hierarchy canvas.
 *
 * The flagship helper is `packIntoRows` which takes an array of items (each
 * with a pre-measured pixel width) and breaks them into rows so that **every
 * row is as full as possible** without exceeding the available width.  Think
 * of it like left-to-right word-wrapping in a text editor, only for UI
 * elements instead of characters.
 *
 * All maths is plain JavaScript so the function can be unit-tested in total
 * isolation – it does not rely on React, the DOM, or any browser APIs.
 *
 * Example
 * -------
 * ```js
 * import { packIntoRows } from './layout.js';
 *
 * const chips = [
 *   { id: 'Module 1',  width: 180 },
 *   { id: 'Module 2',  width: 180 },
 *   { id: 'Module 10', width: 200 }
 * ];
 *
 * // Given 500 px to play with and 21-px gaps between chips the call below
 * // returns **one** row because 180 + 21 + 180 + 21 + 200 = 602 > 500 so
 * // the last chip has to spill onto a second line.
 * const rows = packIntoRows(chips, 21, 500);
 *
 * // rows → [
 * //   { chips:[ {…},{…} ], rowWidth: 381 },
 * //   { chips:[ {…} ],      rowWidth: 200 }
 * // ]
 * ```
 *
 * Parameters
 * ----------
 * items          – Array of `{ id:any, width:number }`.  *Width* must be the
 *                  **full pixel width** of the chip including its left *and*
 *                  right padding so the maths stays true to what the user
 *                  will see on screen.
 * chipGap        – Horizontal space (in px) that should exist **between the
 *                  borders of adjacent chips**.  The very first chip in a
 *                  row gets *no* left-hand gap; all others do.
 * availableWidth – Total horizontal real-estate we can fill (in px).
 *
 * Returns
 * -------
 * Array of **rows**.  Each row is an object: `{ chips:[ … ], rowWidth:number
 * }` where `chips` is the ordered subset of items that fit and `rowWidth`
 * already includes the inter-chip gaps so you can centre the row by simple
 * subtraction: `rowStartX = midX - rowWidth / 2`.
 */
export function packIntoRows(items, chipGap, availableWidth) {
  // Guard against nonsense inputs so calling code never explodes.
  if (!Array.isArray(items) || items.length === 0) return [];
  if (typeof availableWidth !== 'number' || availableWidth <= 0) return [];

  const rows = [];
  let currentRow = [];
  let currentRowWidth = 0;

  items.forEach((chip) => {
    if (!chip || typeof chip.width !== 'number') return; // Skip malformed.

    // How much horizontal space would this chip *really* need if we append it
    // to the current row?  The first chip pays no left-gap; all others pay it.
    const extra = currentRow.length === 0 ? chip.width : chip.width + chipGap;

    // If adding the chip would overflow the max width we close off the row and
    // start a brand-new one.
    if (currentRowWidth + extra > availableWidth && currentRow.length > 0) {
      rows.push({ chips: currentRow, width: currentRowWidth });
      currentRow = [];
      currentRowWidth = 0;
    }

    // Now it definitely fits (either on the fresh row or the existing one).
    currentRow.push(chip);
    currentRowWidth += extra;
  });

  // Push whatever remains so the caller never misses the last batch.
  if (currentRow.length) {
    rows.push({ chips: currentRow, width: currentRowWidth });
  }

  return rows;
} 