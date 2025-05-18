/**
 * cypress/e2e/load_view_spec.cy.js
 * ==================================
 * Basic smoke test for the LoadView page.
 *
 * In plain English:
 * 1. This test opens the "/load" page of the application.
 * 2. It waits for the main hierarchy graph to appear, which indicates that
 *    the initial data loading process has likely completed.
 * 3. It checks if an element that typically displays a program name (e.g., containing "Program")
 *    is visible on the page. This confirms the core content of LoadView is rendering.
 */
describe('LoadView Page Smoke Test', () => {
  it('successfully loads and displays the hierarchy graph area and a program', () => {
    // Visit the LoadView page
    cy.visit('/load');

    // Wait for a general container for the graph to be visible.
    // This assumes HierarchyGraph or its wrapper div will eventually be rendered.
    // A more specific selector for HierarchyGraph's container would be better if available.
    // For now, we check for the canvas wrapper we know is part of ThreePaneLayout.
    cy.get('div[style*="grid-template-columns: 2fr 1fr"] > div:first-child', { timeout: 10000 })
      .should('be.visible');

    // Check if an element containing the text "Program" (case-insensitive) becomes visible.
    // This is a less brittle check than a specific program ID if the data changes.
    // We give it a timeout because data fetching might take a moment.
    cy.contains(/program/i, { timeout: 15000 }).should('be.visible');

    // Additionally, check for the right-side panel's helper text as a basic structural check
    cy.contains(/Select a module to begin/i, { timeout: 5000 }).should('be.visible');
  });
}); 