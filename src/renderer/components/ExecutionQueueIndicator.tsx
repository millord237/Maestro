import React from 'react';
import { ListOrdered, Command, MessageSquare } from 'lucide-react';
import type { Session, Theme, QueuedItem } from '../types';

interface ExecutionQueueIndicatorProps {
  session: Session;
  theme: Theme;
  onClick: () => void;  // Opens the ExecutionQueueBrowser modal
}

/**
 * Compact indicator showing the number of items queued for execution.
 * Appears above the input area when items are queued.
 * Clicking opens the ExecutionQueueBrowser modal for full queue management.
 */
export function ExecutionQueueIndicator({ session, theme, onClick }: ExecutionQueueIndicatorProps) {
  const queue = session.executionQueue || [];

  if (queue.length === 0) {
    return null;
  }

  // Count items by type
  const messageCount = queue.filter(item => item.type === 'message').length;
  const commandCount = queue.filter(item => item.type === 'command').length;

  // Group by tab to show tab-specific counts
  const tabCounts = queue.reduce((acc, item) => {
    const tabName = item.tabName || 'Unknown';
    acc[tabName] = (acc[tabName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const tabNames = Object.keys(tabCounts);

  return (
    <button
      onClick={onClick}
      className="w-full mb-2 px-3 py-2 rounded-lg border flex items-center gap-2 text-sm transition-all hover:opacity-90"
      style={{
        backgroundColor: theme.colors.bgActivity,
        borderColor: theme.colors.border,
        color: theme.colors.textMain
      }}
    >
      <ListOrdered className="w-4 h-4 flex-shrink-0" style={{ color: theme.colors.warning }} />

      <span className="flex-1 text-left">
        <span className="font-semibold">{queue.length}</span>
        {' '}
        {queue.length === 1 ? 'item' : 'items'} queued
      </span>

      {/* Item type breakdown */}
      <div className="flex items-center gap-2 text-xs opacity-70">
        {messageCount > 0 && (
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            {messageCount}
          </span>
        )}
        {commandCount > 0 && (
          <span className="flex items-center gap-1">
            <Command className="w-3 h-3" />
            {commandCount}
          </span>
        )}
      </div>

      {/* Tab pills - show first 2 tabs, then +N more */}
      <div className="flex items-center gap-1">
        {tabNames.slice(0, 2).map(tabName => (
          <span
            key={tabName}
            className="px-1.5 py-0.5 rounded text-xs font-mono"
            style={{
              backgroundColor: theme.colors.accent + '30',
              color: theme.colors.textMain
            }}
          >
            {tabName.length > 8 ? tabName.slice(0, 8) + '...' : tabName}
            {tabCounts[tabName] > 1 && ` (${tabCounts[tabName]})`}
          </span>
        ))}
        {tabNames.length > 2 && (
          <span
            className="px-1.5 py-0.5 rounded text-xs"
            style={{ color: theme.colors.textDim }}
          >
            +{tabNames.length - 2}
          </span>
        )}
      </div>

      <span className="text-xs opacity-50">Click to view</span>
    </button>
  );
}
