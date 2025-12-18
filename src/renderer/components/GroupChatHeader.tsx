/**
 * GroupChatHeader.tsx
 *
 * Header bar for the Group Chat view. Displays the chat name with participant count
 * and provides actions for rename, info, and close.
 */

import { X, Info, Edit2 } from 'lucide-react';
import type { Theme } from '../types';

interface GroupChatHeaderProps {
  theme: Theme;
  name: string;
  participantCount: number;
  onClose: () => void;
  onRename: () => void;
  onShowInfo: () => void;
}

export function GroupChatHeader({
  theme,
  name,
  participantCount,
  onClose,
  onRename,
  onShowInfo,
}: GroupChatHeaderProps): JSX.Element {
  return (
    <div
      className="flex items-center justify-between px-4 py-3 border-b"
      style={{
        backgroundColor: theme.colors.bgSidebar,
        borderColor: theme.colors.border,
      }}
    >
      <div className="flex items-center gap-3">
        <h1
          className="text-lg font-semibold cursor-pointer hover:opacity-80"
          style={{ color: theme.colors.textMain }}
          onClick={onRename}
          title="Click to rename"
        >
          {name}
        </h1>
        <button
          onClick={onRename}
          className="p-1 rounded hover:opacity-80"
          style={{ color: theme.colors.textDim }}
          title="Rename"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: theme.colors.border,
            color: theme.colors.textDim,
          }}
        >
          {participantCount} participant{participantCount !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onShowInfo}
          className="p-2 rounded hover:opacity-80"
          style={{ color: theme.colors.textDim }}
          title="Info"
        >
          <Info className="w-5 h-5" />
        </button>
        <button
          onClick={onClose}
          className="p-2 rounded hover:opacity-80"
          style={{ color: theme.colors.textDim }}
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
