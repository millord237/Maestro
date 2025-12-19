/**
 * ParticipantCard.tsx
 *
 * Displays a single group chat participant with their status,
 * agent type, context usage, stats, and last activity summary.
 */

import { Clock, MessageSquare, Zap } from 'lucide-react';
import type { Theme, GroupChatParticipant, SessionState } from '../types';

interface ParticipantCardProps {
  theme: Theme;
  participant: GroupChatParticipant;
  state: SessionState;
  color?: string;
}

/**
 * Format milliseconds as a human-readable duration.
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

/**
 * Format token count with K/M suffix for large numbers.
 */
function formatTokens(tokens: number): string {
  if (tokens < 1000) return tokens.toString();
  if (tokens < 1000000) return `${(tokens / 1000).toFixed(1)}K`;
  return `${(tokens / 1000000).toFixed(1)}M`;
}

export function ParticipantCard({
  theme,
  participant,
  state,
  color,
}: ParticipantCardProps): JSX.Element {
  const getStatusColor = (): string => {
    switch (state) {
      case 'busy':
        return theme.colors.warning;
      case 'error':
        return theme.colors.error;
      case 'connecting':
        return theme.colors.warning;
      default:
        return theme.colors.success;
    }
  };

  const getStatusLabel = (): string => {
    switch (state) {
      case 'busy':
        return 'Working';
      case 'error':
        return 'Error';
      case 'connecting':
        return 'Connecting';
      default:
        return 'Idle';
    }
  };

  return (
    <div
      className="rounded-lg border p-3"
      style={{
        backgroundColor: theme.colors.bgMain,
        borderColor: theme.colors.border,
        borderLeftWidth: '3px',
        borderLeftColor: color || theme.colors.accent,
      }}
    >
      {/* Header row: name and status */}
      <div className="flex items-center justify-between">
        <span
          className="font-medium"
          style={{ color: color || theme.colors.textMain }}
        >
          {participant.name}
        </span>
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: getStatusColor() }}
          title={getStatusLabel()}
        />
      </div>

      {/* Agent type */}
      <div
        className="text-xs mt-1"
        style={{ color: theme.colors.textDim }}
      >
        {participant.agentId}
      </div>

      {/* Stats row */}
      {(participant.messageCount || participant.tokenCount || participant.processingTimeMs) && (
        <div
          className="text-xs mt-2 flex items-center gap-3"
          style={{ color: theme.colors.textDim }}
        >
          {(participant.messageCount !== undefined && participant.messageCount > 0) && (
            <span className="flex items-center gap-1" title="Messages sent">
              <MessageSquare className="w-3 h-3" />
              {participant.messageCount}
            </span>
          )}
          {(participant.tokenCount !== undefined && participant.tokenCount > 0) && (
            <span className="flex items-center gap-1" title="Tokens used">
              <Zap className="w-3 h-3" />
              {formatTokens(participant.tokenCount)}
            </span>
          )}
          {(participant.processingTimeMs !== undefined && participant.processingTimeMs > 0) && (
            <span className="flex items-center gap-1" title="Processing time">
              <Clock className="w-3 h-3" />
              {formatDuration(participant.processingTimeMs)}
            </span>
          )}
        </div>
      )}

      {/* Context usage bar */}
      {participant.contextUsage !== undefined && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-1">
            <span
              className="text-xs"
              style={{ color: theme.colors.textDim }}
            >
              Context
            </span>
            <span
              className="text-xs"
              style={{ color: theme.colors.textDim }}
            >
              {participant.contextUsage}%
            </span>
          </div>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: theme.colors.border }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${participant.contextUsage}%`,
                backgroundColor:
                  participant.contextUsage > 80
                    ? theme.colors.warning
                    : theme.colors.accent,
              }}
            />
          </div>
        </div>
      )}

      {/* Last activity summary - always visible */}
      {participant.lastSummary && (
        <div
          className="mt-2 text-xs p-2 rounded"
          style={{
            backgroundColor: theme.colors.bgSidebar,
            color: theme.colors.textDim,
          }}
        >
          <span style={{ color: theme.colors.textMain }}>Last:</span>{' '}
          {participant.lastSummary}
        </div>
      )}

      {/* Last activity time */}
      {participant.lastActivity && (
        <div
          className="mt-1 text-[10px]"
          style={{ color: theme.colors.textDim }}
        >
          {new Date(participant.lastActivity).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
