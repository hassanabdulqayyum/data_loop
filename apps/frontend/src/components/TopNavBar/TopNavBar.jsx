/**
 * TopNavBar.jsx - Global navigation bar for the application.
 * =================================================================
 * This component displays a fixed navigation bar at the top of the view.
 * It includes:
 * - A placeholder for a search icon/functionality on the left.
 * - A dynamic breadcrumb title in the center, reflecting the user's
 *   current location within the program hierarchy (e.g., Module / Topic / Persona).
 * - A placeholder for a user/profile icon on the right.
 *
 * Props:
 *  - selectedModuleNode (object|null): The currently selected module node
 *    (e.g., { id: 'module1', name: 'Module 1: Defusion' }). Null if no module selected.
 *  - selectedTopicNode (object|null): The currently selected topic node
 *    (e.g., { id: 'topic1', name: 'Topic 1: Intro' }). Null if no topic selected.
 *  - selectedPersonaNode (object|null): The currently selected persona node
 *    (e.g., { id: 'persona1', name: 'Persona 1 - Focus' }). Null if no persona selected.
 *
 * The breadcrumb adapts based on the deepest selected item.
 * If no module is selected, a default title "Data Loop" is shown.
 */
import React from 'react';
import styles from './TopNavBar.module.css';

function TopNavBar({ selectedModuleNode, selectedTopicNode, selectedPersonaNode }) {
  /**
   * Generates an array of JSX elements for the breadcrumb, allowing individual styling.
   */
  const renderBreadcrumbElements = () => {
    const elements = [];
    const segmentBaseClass = styles.breadcrumbSegment;

    if (!selectedModuleNode) {
      elements.push(
        <span key="default-title" className={`${segmentBaseClass} ${styles.selected}`}>
          Data Loop
        </span>
      );
      return elements;
    }

    // Module part
    const moduleName = selectedModuleNode.name || selectedModuleNode.id;
    const isModuleLast = !selectedTopicNode; // Module is the last/selected part if no topic is selected
    elements.push(
      <span
        key="module"
        className={`${segmentBaseClass} ${isModuleLast ? styles.selected : styles.nonSelected}`}
      >
        {moduleName}
      </span>
    );

    // Topic part (if selected)
    if (selectedTopicNode) {
      elements.push(
        <span key="separator-1" className={styles.breadcrumbSeparator}>
          {' / '}
        </span>
      );
      const topicName = selectedTopicNode.name || selectedTopicNode.id;
      const isTopicLast = !selectedPersonaNode; // Topic is last/selected if no persona is selected
      elements.push(
        <span
          key="topic"
          className={`${segmentBaseClass} ${isTopicLast ? styles.selected : styles.nonSelected}`}
        >
          {topicName}
        </span>
      );

      // Persona part (if selected)
      if (selectedPersonaNode) {
        elements.push(
          <span key="separator-2" className={styles.breadcrumbSeparator}>
            {' / '}
          </span>
        );
        const personaName = selectedPersonaNode.name || selectedPersonaNode.id;
        // Persona is always the last/selected part if it exists
        elements.push(
          <span
            key="persona"
            className={`${segmentBaseClass} ${styles.selected}`}
          >
            {personaName}
          </span>
        );
      }
    }
    return elements;
  };

  return (
    <div className={styles.navBar}>
      <div className={styles.navSection}>
        {/* Placeholder for Search Icon/Input */}
        <span className={styles.iconPlaceholder}>[S]</span>
      </div>
      <div className={`${styles.navSection} ${styles.navCenter}`}>
        {/* Changed from a single span to a div container for multiple breadcrumb elements */}
        <div className={styles.breadcrumbContainer}>{renderBreadcrumbElements()}</div>
      </div>
      <div className={`${styles.navSection} ${styles.navRight}`}>
        {/* Placeholder for User/Profile Icon */}
        <span className={styles.iconPlaceholder}>[U]</span>
      </div>
    </div>
  );
}

export default TopNavBar; 