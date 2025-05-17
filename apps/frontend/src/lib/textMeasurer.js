/**
 * textMeasurer.js – Accurate chip-width measurement helper
 * ========================================================
 * Every chip in the hierarchy (Program, Module, Topic, Persona) needs to know
 * its **rendered** width so we can centre whole rows.  A canvas-based
 * `ctx.measureText()` call gets close, but it ignores CSS rules such as
 * `letter-spacing`.  That ~5 % error is enough to make single-chip rows look
 * off-centre.
 *
 * The helper below renders the label inside an **off-screen span** that carries
 * exactly the same CSS as the real chip.  We then grab
 * `getBoundingClientRect().width`, which is the browser's own measurement of
 * what will actually appear on screen.
 *
 * Because the ruler span lives only once per tab and results are memoised in a
 * Map, the performance overhead is negligible.
 *
 * Example
 * -------
 * ```js
 * import { measureChipWidth } from '../lib/textMeasurer.js';
 * const w = measureChipWidth('Module 1: Defusion');
 * ```
 */

// Cache prevents re-flow on repeated identical labels.
const widthCache = new Map();
let ruler; // DOM span created lazily.

function createRuler(font = '500 28px Inter', paddingX = 16) {
  ruler = document.createElement('span');
  ruler.style.position = 'absolute';
  ruler.style.visibility = 'hidden';
  ruler.style.whiteSpace = 'nowrap';
  // ------------------------------------------------------------------
  // Mirror **exactly** the chip's typography so the width matches 1-for-1.
  // ------------------------------------------------------------------
  const [weight, size, ...familyParts] = font.split(' ');
  ruler.style.fontFamily = familyParts.join(' ');
  ruler.style.fontSize = size;
  ruler.style.fontWeight = weight;
  ruler.style.letterSpacing = '-0.05em';
  ruler.style.padding = `0 ${paddingX / 2}px`; // Apply half to each side
  document.body.appendChild(ruler);
}

export function measureTextWidth(label = '', font = '500 28px Inter', paddingX = 16) {
  const cacheKey = `${label}_${font}_${paddingX}`;
  if (widthCache.has(cacheKey)) return widthCache.get(cacheKey);

  // Lazily create the ruler the first time we're called *in the browser*.
  if (typeof document !== 'undefined') {
    if (!ruler) {
      createRuler(font, paddingX);
    } else {
      // Update existing ruler's style to match current parameters
      const [weight, size, ...familyParts] = font.split(' ');
      ruler.style.fontFamily = familyParts.join(' ');
      ruler.style.fontSize = size;
      ruler.style.fontWeight = weight;
      ruler.style.padding = `0 ${paddingX / 2}px`;
    }
  }

  // During SSR or Jest tests there is no `document`.  Fall back to a rough
  // canvas estimate so unit-tests don't explode – slight centring error is OK
  if (typeof document === 'undefined') {
    if (typeof OffscreenCanvas !== 'undefined') {
      const ctx = new OffscreenCanvas(1, 1).getContext('2d');
      ctx.font = font;
      const w = ctx.measureText(label).width + paddingX;
      widthCache.set(cacheKey, w);
      return w;
    }
    // Last-ditch: assume 10 px per character.
    const w = label.length * 10 + paddingX;
    widthCache.set(cacheKey, w);
    return w;
  }

  ruler.textContent = label;
  const width = ruler.getBoundingClientRect().width;
  widthCache.set(cacheKey, width);
  return width;
}

// Backwards-compat wrapper for existing calls
export function measureChipWidth(label='') {
  return measureTextWidth(label);
} 