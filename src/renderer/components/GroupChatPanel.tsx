/**
 * GroupChatPanel.tsx
 *
 * Main container for the Group Chat view. Composes the header, messages,
 * and input components into a full chat interface. This panel replaces
 * the MainPanel when a group chat is active.
 */

import type { Theme, GroupChat, GroupChatMessage, GroupChatState } from '../types';
import { GroupChatHeader } from './GroupChatHeader';
import { GroupChatMessages } from './GroupChatMessages';
import { GroupChatInput } from './GroupChatInput';

interface GroupChatPanelProps {
  theme: Theme;
  groupChat: GroupChat;
  messages: GroupChatMessage[];
  state: GroupChatState;
  onSendMessage: (content: string, images?: string[]) => void;
  onClose: () => void;
  onRename: () => void;
  onShowInfo: () => void;
}

export function GroupChatPanel({
  theme,
  groupChat,
  messages,
  state,
  onSendMessage,
  onClose,
  onRename,
  onShowInfo,
}: GroupChatPanelProps): JSX.Element {
  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: theme.colors.bgMain }}
    >
      <GroupChatHeader
        theme={theme}
        name={groupChat.name}
        participantCount={groupChat.participants.length}
        onClose={onClose}
        onRename={onRename}
        onShowInfo={onShowInfo}
      />

      <GroupChatMessages
        theme={theme}
        messages={messages}
        participants={groupChat.participants}
        state={state}
      />

      <GroupChatInput
        theme={theme}
        state={state}
        onSend={onSendMessage}
        participants={groupChat.participants}
      />
    </div>
  );
}
