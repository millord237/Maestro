import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search } from 'lucide-react';
import type { AITab, Theme, Shortcut } from '../types';
import { fuzzyMatchWithScore } from '../utils/search';
import { useLayerStack } from '../contexts/LayerStackContext';
import { MODAL_PRIORITIES } from '../constants/modalPriorities';

interface TabSwitcherModalProps {
  theme: Theme;
  tabs: AITab[];
  activeTabId: string;
  shortcut?: Shortcut;
  onTabSelect: (tabId: string) => void;
  onClose: () => void;
}

/**
 * Format bytes as human-readable size
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Format token count with K suffix for thousands
 */
function formatTokens(tokens: number): string {
  if (tokens >= 1000) {
    return (tokens / 1000).toFixed(1) + 'K';
  }
  return tokens.toString();
}

/**
 * Format cost as USD with appropriate precision
 */
function formatCost(cost: number): string {
  if (cost === 0) return '$0.00';
  if (cost < 0.01) return '<$0.01';
  return '$' + cost.toFixed(2);
}

/**
 * Get context usage percentage from usage stats
 */
function getContextPercentage(tab: AITab): number | null {
  if (!tab.usageStats) return null;
  const { inputTokens, outputTokens, cacheReadInputTokens, cacheCreationInputTokens, contextWindow } = tab.usageStats;
  if (!contextWindow || contextWindow === 0) return null;
  const totalTokens = inputTokens + outputTokens + cacheReadInputTokens + cacheCreationInputTokens;
  return Math.min(100, Math.round((totalTokens / contextWindow) * 100));
}

/**
 * Get the display name for a tab.
 * Priority: name > first UUID octet > "New Session"
 */
function getTabDisplayName(tab: AITab): string {
  if (tab.name) {
    return tab.name;
  }
  if (tab.claudeSessionId) {
    return tab.claudeSessionId.split('-')[0].toUpperCase();
  }
  return 'New Session';
}

/**
 * Get the UUID pill display (first octet of session ID)
 */
function getUuidPill(tab: AITab): string | null {
  if (!tab.claudeSessionId) return null;
  return tab.claudeSessionId.split('-')[0].toUpperCase();
}

/**
 * Tab Switcher Modal - Quick navigation between AI tabs with fuzzy search.
 * Shows context window consumption, cost, custom name, and UUID pill for each tab.
 */
export function TabSwitcherModal({
  theme,
  tabs,
  activeTabId,
  shortcut,
  onTabSelect,
  onClose
}: TabSwitcherModalProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);
  const layerIdRef = useRef<string>();

  const { registerLayer, unregisterLayer, updateLayerHandler } = useLayerStack();

  // Register layer on mount
  useEffect(() => {
    layerIdRef.current = registerLayer({
      type: 'modal',
      priority: MODAL_PRIORITIES.TAB_SWITCHER,
      blocksLowerLayers: true,
      capturesFocus: true,
      focusTrap: 'strict',
      ariaLabel: 'Tab Switcher',
      onEscape: () => onClose()
    });

    return () => {
      if (layerIdRef.current) {
        unregisterLayer(layerIdRef.current);
      }
    };
  }, [registerLayer, unregisterLayer, onClose]);

  // Update handler when onClose changes
  useEffect(() => {
    if (layerIdRef.current) {
      updateLayerHandler(layerIdRef.current, () => {
        onClose();
      });
    }
  }, [onClose, updateLayerHandler]);

  // Focus input on mount
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    selectedItemRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedIndex]);

  // Filter and sort tabs based on search query
  const filteredTabs = useMemo(() => {
    if (!search.trim()) {
      // When no search, show all tabs with active tab first
      const sorted = [...tabs].sort((a, b) => {
        if (a.id === activeTabId) return -1;
        if (b.id === activeTabId) return 1;
        return b.createdAt - a.createdAt; // Most recent first
      });
      return sorted;
    }

    // Fuzzy search on tab name and UUID
    const results = tabs.map(tab => {
      const displayName = getTabDisplayName(tab);
      const uuid = tab.claudeSessionId || '';

      // Score both name and UUID, take the better score
      const nameResult = fuzzyMatchWithScore(displayName, search);
      const uuidResult = fuzzyMatchWithScore(uuid, search);

      const bestScore = Math.max(nameResult.score, uuidResult.score);
      const matches = nameResult.matches || uuidResult.matches;

      return { tab, score: bestScore, matches };
    });

    return results
      .filter(r => r.matches)
      .sort((a, b) => b.score - a.score)
      .map(r => r.tab);
  }, [tabs, search, activeTabId]);

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filteredTabs.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (filteredTabs[selectedIndex]) {
        onTabSelect(filteredTabs[selectedIndex].id);
        onClose();
      }
    } else if (e.metaKey && ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].includes(e.key)) {
      e.preventDefault();
      const number = e.key === '0' ? 10 : parseInt(e.key);
      const targetIndex = number - 1;
      if (filteredTabs[targetIndex]) {
        onTabSelect(filteredTabs[targetIndex].id);
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-32 z-[9999] animate-in fade-in duration-100">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tab Switcher"
        tabIndex={-1}
        className="w-[600px] rounded-xl shadow-2xl border overflow-hidden flex flex-col max-h-[500px] outline-none"
        style={{ backgroundColor: theme.colors.bgActivity, borderColor: theme.colors.border }}
      >
        {/* Search Header */}
        <div className="p-4 border-b flex items-center gap-3" style={{ borderColor: theme.colors.border }}>
          <Search className="w-5 h-5" style={{ color: theme.colors.textDim }} />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent outline-none text-lg placeholder-opacity-50"
            placeholder="Search tabs..."
            style={{ color: theme.colors.textMain }}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="flex items-center gap-2">
            {shortcut && (
              <span className="text-xs font-mono opacity-60" style={{ color: theme.colors.textDim }}>
                {shortcut.keys.join('+')}
              </span>
            )}
            <div
              className="px-2 py-0.5 rounded text-xs font-bold"
              style={{ backgroundColor: theme.colors.bgMain, color: theme.colors.textDim }}
            >
              ESC
            </div>
          </div>
        </div>

        {/* Tab List */}
        <div className="overflow-y-auto py-2 scrollbar-thin">
          {filteredTabs.map((tab, i) => {
            const isActive = tab.id === activeTabId;
            const isSelected = i === selectedIndex;
            const displayName = getTabDisplayName(tab);
            const uuidPill = getUuidPill(tab);
            const contextPct = getContextPercentage(tab);
            const cost = tab.usageStats?.totalCostUsd || 0;

            // Number badge for quick access (Cmd+1-9, Cmd+0 for 10th)
            const showNumber = i < 10;
            const numberBadge = i === 9 ? 0 : i + 1;

            return (
              <button
                key={tab.id}
                ref={isSelected ? selectedItemRef : null}
                onClick={() => {
                  onTabSelect(tab.id);
                  onClose();
                }}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-opacity-10`}
                style={{
                  backgroundColor: isSelected ? theme.colors.accent : 'transparent',
                  color: isSelected ? theme.colors.accentForeground : theme.colors.textMain
                }}
              >
                {/* Number Badge */}
                {showNumber ? (
                  <div
                    className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: theme.colors.bgMain, color: theme.colors.textDim }}
                  >
                    {numberBadge}
                  </div>
                ) : (
                  <div className="flex-shrink-0 w-5 h-5" />
                )}

                {/* Busy/Active Indicator */}
                <div className="flex-shrink-0 w-2 h-2">
                  {tab.state === 'busy' ? (
                    <div
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{ backgroundColor: theme.colors.warning }}
                    />
                  ) : isActive ? (
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: theme.colors.success }}
                    />
                  ) : null}
                </div>

                {/* Tab Info */}
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {/* Custom Name */}
                    <span className="font-medium truncate">{displayName}</span>

                    {/* UUID Pill (only if tab has a custom name, show UUID as secondary) */}
                    {tab.name && uuidPill && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-mono flex-shrink-0"
                        style={{
                          backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : theme.colors.bgMain,
                          color: isSelected ? theme.colors.accentForeground : theme.colors.textDim
                        }}
                      >
                        {uuidPill}
                      </span>
                    )}

                    {/* Starred indicator */}
                    {tab.starred && (
                      <span style={{ color: theme.colors.warning }}>★</span>
                    )}
                  </div>

                  {/* Stats Row */}
                  <div className="flex items-center gap-3 text-[10px] opacity-60">
                    {contextPct !== null && (
                      <span>Context: {contextPct}%</span>
                    )}
                    {tab.usageStats && (
                      <>
                        <span>{formatTokens(tab.usageStats.inputTokens + tab.usageStats.outputTokens)} tokens</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Cost Badge */}
                <div
                  className="flex-shrink-0 text-xs font-mono px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : theme.colors.bgMain,
                    color: isSelected ? theme.colors.accentForeground : theme.colors.textDim
                  }}
                >
                  {formatCost(cost)}
                </div>
              </button>
            );
          })}

          {filteredTabs.length === 0 && (
            <div className="px-4 py-4 text-center opacity-50 text-sm" style={{ color: theme.colors.textDim }}>
              No tabs found
            </div>
          )}
        </div>

        {/* Footer with stats */}
        <div
          className="px-4 py-2 border-t text-xs flex items-center justify-between"
          style={{ borderColor: theme.colors.border, color: theme.colors.textDim }}
        >
          <span>{filteredTabs.length} of {tabs.length} tabs</span>
          <span>↑↓ navigate • Enter select • ⌘1-9 quick select</span>
        </div>
      </div>
    </div>
  );
}
