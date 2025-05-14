/**
 * layoutUtils.js – tiny helper functions that keep our automatic graph
 * layout code tidy and reusable.
 *
 * Everything lives in this one place so both Load-View *and* future pages
 * can call the exact same logic and stay visually consistent.
 *
 * All comments are intentionally written in normal day-to-day English.  No
 * obscure jargon – we simply explain what the code does so that any future
 * reader (even if they are not a programmer) can make sense of it.
 *
 * Example usage:
 * --------------------------------------------------------------------
 * import { measureChip, makeRows } from './layoutUtils.js';
 *
 * const chipWidth = measureChip('Module 2 – Self-Compassion');
 * const rows = makeRows(['One', 'Two', 'Three'], 500);
 * --------------------------------------------------------------------
 */

/*---------------------------------------------------------------------
  Shared numbers pulled straight from the latest Figma file so we keep
  the spelling *exactly* the same everywhere.
---------------------------------------------------------------------*/
export const CHIP_SIDE_PADDING = 8;   // 8 px left + 8 px right around text
export const CHIP_HORIZONTAL_GAP = 21; // Gap between two chips that sit side-by-side

/* We reuse a single <canvas> element so we are not creating hundreds of
   hidden DOM nodes every time the user opens a new script. */
let _measurementCtx = null;

function getCtx() {
  if (_measurementCtx) return _measurementCtx;
  const canvas = document.createElement('canvas');
  _measurementCtx = canvas.getContext('2d');

  // The chips use 28-px Inter Medium (weight 500) according to design.
  // We set the font once so every subsequent measureText call uses
  // the exact same metrics.
  if (_measurementCtx) {
    _measurementCtx.font = '500 28px Inter, sans-serif';
  }
  return _measurementCtx;
}

/**
 * measureChip(text) → number
 * -------------------------------------------------------------
 * Returns how wide a chip should be (in pixels) once rendered – we
 * add the left and right padding so the caller gets the *full* chip
 * width, not just the text.
 */
export function measureChip(text) {
  const ctx = getCtx();

  /* jsdom (the DOM implementation used by Jest tests) does not yet ship with
     a real <canvas> 2D context.  In that environment ctx may be `null` or
     ctx.measureText may just return 0.  To stay crash-free we fall back to a
     simple approximation: average 14 px per character at this font size. */
  if (!ctx || typeof ctx.measureText !== 'function') {
    return text.length * 14 + CHIP_SIDE_PADDING * 2;
  }

  const textMetrics = ctx.measureText(text);
  return textMetrics.width + CHIP_SIDE_PADDING * 2;
}

/**
 * makeRows(items, maxWidth) → Array<{ chips, width }>
 * -------------------------------------------------------------
 * Splits an array of chip *labels* into as many horizontal rows as
 * needed so that no row exceeds `maxWidth` pixels.
 *
 * Each row object contains:
 *   • chips  – an ordered list where every entry is
 *              { id: <label>, width: <number> }
 *   • width  – the total width of the row *including* the gaps between
 *              chips.  Handy when you need to horizontally centre the
 *              row later on.
 */
export function makeRows(items, maxWidth) {
  const rows = [];
  let currentRow = [];
  let currentRowWidth = 0;

  items.forEach((item) => {
    /* The function accepts either a plain string (the label) **or** an
       object that carries `.id` or `.label`.  This keeps callers flexible
       and avoids needless `.map(x => x.id)` gymnastics. */
    const label = typeof item === 'string' ? item : item.id ?? item.label ?? '';
    const chipWidth = measureChip(label);

    // How much space we would *really* need if we add this chip to the end
    // of the current row.  The first chip in a row does not pay the gap cost.
    const required = currentRow.length === 0 ? chipWidth : chipWidth + CHIP_HORIZONTAL_GAP;

    // Start a new row if adding this chip would overflow the allowed space.
    if (currentRow.length > 0 && currentRowWidth + required > maxWidth) {
      rows.push({ chips: currentRow, width: currentRowWidth });
      currentRow = [];
      currentRowWidth = 0;
    }

    // Add the chip to the ongoing row and update the running width.
    currentRow.push({ id: label, width: chipWidth });
    currentRowWidth += required;
  });

  // Push the final row (if any chips were collected).
  if (currentRow.length) {
    rows.push({ chips: currentRow, width: currentRowWidth });
  }

  return rows;
} 