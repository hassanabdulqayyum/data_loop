/*
setupTests.js – runs before every Jest test in the frontend.
Right now we only import jest-dom so we can use handy matchers.
*/
import '@testing-library/jest-dom';

// ---------------------------------------------------------------------------
// JSDOM does not implement the browser `ResizeObserver` API that React-Flow
// depends on for layout calculations.  A *very* light stub is sufficient for
// unit-tests because we never care about real re-size behaviour – we just need
// the constructor to exist so the library doesn't throw at import-time.
// ---------------------------------------------------------------------------
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserver; 