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
 *  - onModuleClick (function): Callback when the module breadcrumb is clicked.
 *  - onTopicClick  (function): Callback when the topic breadcrumb is clicked.
 *  - onPersonaClick (function): Callback when the persona breadcrumb is clicked (optional).
 *
 * The breadcrumb adapts based on the deepest selected item.
 * If no module is selected, a default title "Mindfulness Program" is shown.
 */
import React from 'react';
// Bring in the new SVG icons so we can swap the text placeholders for real graphics.
import SearchIcon from '../Icons/SearchIcon.jsx';
import UserIcon from '../Icons/UserIcon.jsx';
import styles from './TopNavBar.module.css';

function TopNavBar({
  selectedModuleNode,
  selectedTopicNode,
  selectedPersonaNode,
  onModuleClick = () => {},
  onTopicClick = () => {},
  onPersonaClick = () => {},
}) {
  /**
   * Generates an array of JSX elements for the breadcrumb, allowing individual styling.
   */
  const renderBreadcrumbElements = () => {
    const elements = [];
    const segmentBaseClass = styles.breadcrumbSegment;

    if (!selectedModuleNode) {
      elements.push(
        <span key="default-title" className={`${segmentBaseClass} ${styles.selected}`}>
          Mindfulness Program
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
        role="button"
        onClick={onModuleClick}
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
          role="button"
          onClick={onTopicClick}
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
            role="button"
            onClick={onPersonaClick}
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
      {/* Left section now holds ONLY the breadcrumb; we removed the search icon
          so there is no visual distraction on the left. */}
      <div className={styles.navSection}>
        {/* Extra left-padding so the breadcrumb does not hug the edge. */}
        <div className={styles.breadcrumbContainer} style={{ marginLeft: '48px' }}>
          {renderBreadcrumbElements()}
        </div>
      </div>

      {/* Right section groups both action icons: search first, profile second. */}
      <div className={`${styles.navSection} ${styles.navRight}`}>
        {/* Magnifying-glass icon – now bigger (36 px) and positioned on the right */}
        <SearchIcon size={36} />
        {/* Space between the two icons for breathing room */}
        <span style={{ width: 24 }} />
        {/* Avatar circle icon – also enlarged to 36 px for consistent sizing */}
        <UserIcon size={36} />
      </div>
    </div>
  );
}

export default TopNavBar; 