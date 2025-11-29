// Tab helper functions for AI multi-tab support
// These helpers manage AITab state within Maestro sessions

import { Session, AITab, ClosedTab, LogEntry, UsageStats } from '../types';
import { generateId } from './ids';

// Maximum number of closed tabs to keep in history
const MAX_CLOSED_TAB_HISTORY = 25;

/**
 * Get the currently active AI tab for a session.
 * Returns the tab matching activeTabId, or the first tab if not found.
 * Returns undefined if the session has no tabs.
 *
 * @param session - The Maestro session
 * @returns The active AITab or undefined if no tabs exist
 */
export function getActiveTab(session: Session): AITab | undefined {
  if (!session.aiTabs || session.aiTabs.length === 0) {
    return undefined;
  }

  const activeTab = session.aiTabs.find(tab => tab.id === session.activeTabId);

  // Fallback to first tab if activeTabId doesn't match any tab
  // (can happen after tab deletion or data corruption)
  return activeTab ?? session.aiTabs[0];
}

/**
 * Options for creating a new AI tab.
 */
export interface CreateTabOptions {
  claudeSessionId?: string | null;  // Claude Code session UUID (null for new tabs)
  logs?: LogEntry[];                // Initial conversation history
  name?: string | null;             // User-defined name (null = show UUID octet)
  starred?: boolean;                // Whether session is starred
  usageStats?: UsageStats;          // Token usage stats
}

/**
 * Result of creating a new tab - contains both the new tab and updated session.
 */
export interface CreateTabResult {
  tab: AITab;                       // The newly created tab
  session: Session;                 // Updated session with the new tab added and set as active
}

/**
 * Create a new AI tab for a session.
 * The new tab is appended to the session's aiTabs array and set as the active tab.
 *
 * @param session - The Maestro session to add the tab to
 * @param options - Optional tab configuration (claudeSessionId, logs, name, starred)
 * @returns Object containing the new tab and updated session
 *
 * @example
 * // Create a new empty tab
 * const { tab, session: updatedSession } = createTab(session);
 *
 * @example
 * // Create a tab for an existing Claude session
 * const { tab, session: updatedSession } = createTab(session, {
 *   claudeSessionId: 'abc123',
 *   name: 'My Feature',
 *   starred: true,
 *   logs: existingLogs
 * });
 */
export function createTab(session: Session, options: CreateTabOptions = {}): CreateTabResult {
  const {
    claudeSessionId = null,
    logs = [],
    name = null,
    starred = false,
    usageStats
  } = options;

  // Create the new tab with default values
  const newTab: AITab = {
    id: generateId(),
    claudeSessionId,
    name,
    starred,
    logs,
    messageQueue: [],
    inputValue: '',
    usageStats,
    createdAt: Date.now(),
    state: 'idle'
  };

  // Update the session with the new tab added and set as active
  const updatedSession: Session = {
    ...session,
    aiTabs: [...(session.aiTabs || []), newTab],
    activeTabId: newTab.id
  };

  return {
    tab: newTab,
    session: updatedSession
  };
}

/**
 * Result of closing a tab - contains the closed tab info and updated session.
 */
export interface CloseTabResult {
  closedTab: ClosedTab;           // The closed tab data with original index
  session: Session;               // Updated session with tab removed
}

/**
 * Close an AI tab and add it to the closed tab history.
 * The closed tab is stored in closedTabHistory for potential restoration via Cmd+Shift+T.
 * If the closed tab was active, the next tab (or previous if at end) becomes active.
 *
 * @param session - The Maestro session containing the tab
 * @param tabId - The ID of the tab to close
 * @returns Object containing the closed tab info and updated session, or null if tab not found or is the only tab
 *
 * @example
 * const result = closeTab(session, 'tab-123');
 * if (result) {
 *   const { closedTab, session: updatedSession } = result;
 *   console.log(`Closed tab at index ${closedTab.index}`);
 * }
 */
export function closeTab(session: Session, tabId: string): CloseTabResult | null {
  // Don't allow closing the only tab
  if (!session.aiTabs || session.aiTabs.length <= 1) {
    return null;
  }

  // Find the tab to close
  const tabIndex = session.aiTabs.findIndex(tab => tab.id === tabId);
  if (tabIndex === -1) {
    return null;
  }

  const tabToClose = session.aiTabs[tabIndex];

  // Create closed tab entry with original index
  const closedTab: ClosedTab = {
    tab: { ...tabToClose },
    index: tabIndex,
    closedAt: Date.now()
  };

  // Remove tab from aiTabs
  const updatedTabs = session.aiTabs.filter(tab => tab.id !== tabId);

  // Determine new active tab if the closed tab was active
  let newActiveTabId = session.activeTabId;
  if (session.activeTabId === tabId) {
    // If we closed the active tab, select the next tab or the previous one if at end
    const newIndex = Math.min(tabIndex, updatedTabs.length - 1);
    newActiveTabId = updatedTabs[newIndex].id;
  }

  // Add to closed tab history, maintaining max size
  const updatedHistory = [closedTab, ...(session.closedTabHistory || [])].slice(0, MAX_CLOSED_TAB_HISTORY);

  // Create updated session
  const updatedSession: Session = {
    ...session,
    aiTabs: updatedTabs,
    activeTabId: newActiveTabId,
    closedTabHistory: updatedHistory
  };

  return {
    closedTab,
    session: updatedSession
  };
}
