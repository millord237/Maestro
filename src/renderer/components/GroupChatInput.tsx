/**
 * GroupChatInput.tsx
 *
 * Input area for the Group Chat view. Supports:
 * - Text input with Enter to send
 * - @mention autocomplete for participants
 * - Attach image button (placeholder for future)
 * - Disabled state when moderator/agent is working
 */

import { useState, useRef, useCallback } from 'react';
import { Send, Paperclip } from 'lucide-react';
import type { Theme, GroupChatParticipant, GroupChatState } from '../types';

interface GroupChatInputProps {
  theme: Theme;
  state: GroupChatState;
  onSend: (content: string, images?: string[]) => void;
  participants: GroupChatParticipant[];
}

export function GroupChatInput({
  theme,
  state,
  onSend,
  participants,
}: GroupChatInputProps): JSX.Element {
  const [message, setMessage] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    if (message.trim() && state === 'idle') {
      onSend(message.trim());
      setMessage('');
    }
  }, [message, state, onSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Escape closes mention dropdown
    if (e.key === 'Escape' && showMentions) {
      e.preventDefault();
      setShowMentions(false);
    }
  }, [handleSend, showMentions]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Check for @mention trigger
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1 && lastAtIndex === value.length - 1) {
      setShowMentions(true);
      setMentionFilter('');
    } else if (lastAtIndex !== -1) {
      const afterAt = value.slice(lastAtIndex + 1);
      if (!/\s/.test(afterAt)) {
        setShowMentions(true);
        setMentionFilter(afterAt.toLowerCase());
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  }, []);

  const insertMention = useCallback((name: string) => {
    const lastAtIndex = message.lastIndexOf('@');
    const newMessage = message.slice(0, lastAtIndex) + `@${name} `;
    setMessage(newMessage);
    setShowMentions(false);
    inputRef.current?.focus();
  }, [message]);

  const filteredParticipants = participants.filter(p =>
    p.name.toLowerCase().includes(mentionFilter)
  );

  const isDisabled = state !== 'idle';

  return (
    <div
      className="border-t px-4 py-3"
      style={{ borderColor: theme.colors.border }}
    >
      {/* Mention dropdown */}
      {showMentions && filteredParticipants.length > 0 && (
        <div
          className="mb-2 rounded-lg border p-1"
          style={{
            backgroundColor: theme.colors.bgSidebar,
            borderColor: theme.colors.border,
          }}
        >
          {filteredParticipants.map((p) => (
            <button
              key={p.name}
              onClick={() => insertMention(p.name)}
              className="w-full text-left px-3 py-1.5 rounded text-sm hover:opacity-80"
              style={{ color: theme.colors.textMain }}
            >
              @{p.name}
              <span
                className="ml-2 text-xs"
                style={{ color: theme.colors.textDim }}
              >
                ({p.agentId})
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <button
          className="p-2 rounded hover:opacity-80"
          style={{ color: theme.colors.textDim }}
          title="Attach image"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <textarea
          ref={inputRef}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={isDisabled ? 'Waiting for response...' : 'Type a message... (@ to mention)'}
          disabled={isDisabled}
          rows={1}
          className="flex-1 px-4 py-2.5 rounded-lg border outline-none resize-none"
          style={{
            backgroundColor: theme.colors.bgMain,
            borderColor: theme.colors.border,
            color: theme.colors.textMain,
            opacity: isDisabled ? 0.6 : 1,
          }}
        />

        <button
          onClick={handleSend}
          disabled={!message.trim() || isDisabled}
          className="p-2.5 rounded-lg transition-colors"
          style={{
            backgroundColor: message.trim() && !isDisabled
              ? theme.colors.accent
              : theme.colors.border,
            color: message.trim() && !isDisabled
              ? '#ffffff'
              : theme.colors.textDim,
          }}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
