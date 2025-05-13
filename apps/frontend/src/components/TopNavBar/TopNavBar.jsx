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
   * Constructs the breadcrumb string based on the currently selected nodes.
   * Examples:
   * - "Module 1: Defusion /"
   * - "Module 1: Defusion / Topic 1: Intro /"
   * - "Module 1: Defusion / Topic 1: Intro / Persona 1 - Focus"
   * If no module is selected, it defaults to "Data Loop".
   */
  const buildBreadcrumb = () => {
    if (!selectedModuleNode) {
      return 'Data Loop'; // Default title
    }

    let path = `${selectedModuleNode.name} /`;

    if (selectedTopicNode) {
      path += ` ${selectedTopicNode.name} /`;
      if (selectedPersonaNode) {
        // No trailing slash if persona is the last element
        path = `${selectedModuleNode.name} / ${selectedTopicNode.name} / ${selectedPersonaNode.name}`;
      }
    }
    return path;
  };

  return (
    <div className={styles.navBar}>
      <div className={styles.navSection}>
        {/* Placeholder for Search Icon/Input */}
        <span className={styles.iconPlaceholder}>[S]</span>
      </div>
      <div className={`${styles.navSection} ${styles.navCenter}`}>
        <span className={styles.breadcrumbTitle}>{buildBreadcrumb()}</span>
      </div>
      <div className={`${styles.navSection} ${styles.navRight}`}>
        {/* Placeholder for User/Profile Icon */}
        <span className={styles.iconPlaceholder}>[U]</span>
      </div>
    </div>
  );
}

export default TopNavBar; 