import React, { useRef, useEffect, useMemo } from 'react';
import { Activity, X, Sparkles } from 'lucide-react';
import type { Session, Theme, LogEntry } from '../types';
import Convert from 'ansi-to-html';
import DOMPurify from 'dompurify';

interface TerminalOutputProps {
  session: Session;
  theme: Theme;
  activeFocus: string;
  outputSearchOpen: boolean;
  outputSearchQuery: string;
  setOutputSearchOpen: (open: boolean) => void;
  setOutputSearchQuery: (query: string) => void;
  setActiveFocus: (focus: string) => void;
  setLightboxImage: (image: string | null) => void;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  logsEndRef: React.RefObject<HTMLDivElement>;
}

export function TerminalOutput(props: TerminalOutputProps) {
  const {
    session, theme, activeFocus, outputSearchOpen, outputSearchQuery,
    setOutputSearchOpen, setOutputSearchQuery, setActiveFocus, setLightboxImage,
    inputRef, logsEndRef
  } = props;

  const terminalOutputRef = useRef<HTMLDivElement>(null);

  // Auto-focus on search input when opened
  useEffect(() => {
    if (outputSearchOpen) {
      terminalOutputRef.current?.querySelector('input')?.focus();
    }
  }, [outputSearchOpen]);

  // Create ANSI converter with theme-aware colors
  const ansiConverter = useMemo(() => {
    return new Convert({
      fg: theme.colors.textMain,
      bg: theme.colors.bgMain,
      newline: false,
      escapeXML: true,
      stream: false,
      colors: {
        0: theme.colors.textMain,   // black -> textMain
        1: theme.colors.error,       // red -> error
        2: theme.colors.success,     // green -> success
        3: theme.colors.warning,     // yellow -> warning
        4: theme.colors.accent,      // blue -> accent
        5: theme.colors.accentDim,   // magenta -> accentDim
        6: theme.colors.accent,      // cyan -> accent
        7: theme.colors.textDim,     // white -> textDim
      }
    });
  }, [theme]);

  // Filter out bash prompt lines and terminal initialization noise
  const processLogText = (text: string, isTerminal: boolean, isSystemMessage: boolean): string => {
    if (!isTerminal || isSystemMessage) return text;

    // Remove terminal initialization messages and noise
    const lines = text.split('\n');
    const filteredLines = lines.filter(line => {
      const trimmed = line.trim();

      // Skip empty lines
      if (!trimmed) return false;

      // Skip bash prompt lines (e.g., "bash-3.2$", "zsh%", "$", "#")
      if (/^(bash-\d+\.\d+\$|zsh[%#]|\$|#)\s*$/.test(trimmed)) return false;

      // Skip terminal control sequences (any sequence starting with ?)
      if (/^\?[\d\w]+h?$/.test(trimmed)) return false;

      // Skip "The default interactive shell is now zsh" message
      if (trimmed.includes('The default interactive shell is now zsh')) return false;
      if (trimmed.includes('To update your account to use zsh')) return false;
      if (trimmed.includes('For more details, please visit')) return false;
      if (trimmed.includes('support.apple.com')) return false;

      return true;
    });

    return filteredLines.join('\n');
  };

  const activeLogs: LogEntry[] = session.inputMode === 'ai' ? session.aiLogs : session.shellLogs;

  return (
    <div
      ref={terminalOutputRef}
      tabIndex={0}
      className="flex-1 overflow-y-auto p-6 space-y-4 transition-colors outline-none relative"
      style={{ backgroundColor: session.inputMode === 'ai' ? theme.colors.bgMain : theme.colors.bgActivity }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          inputRef.current?.focus();
          setActiveFocus('main');
        }
      }}
    >
      {/* Output Search */}
      {outputSearchOpen && (
        <div className="sticky top-0 z-10 pb-4">
          <input
            type="text"
            value={outputSearchQuery}
            onChange={(e) => setOutputSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation();
                setOutputSearchOpen(false);
                setOutputSearchQuery('');
                terminalOutputRef.current?.focus();
              }
            }}
            placeholder="Filter output... (Esc to close)"
            className="w-full px-3 py-2 rounded border bg-transparent outline-none text-sm"
            style={{ borderColor: theme.colors.accent, color: theme.colors.textMain, backgroundColor: theme.colors.bgSidebar }}
            autoFocus
          />
        </div>
      )}
      {activeLogs.filter(log => {
        if (!outputSearchQuery) return true;
        return log.text.toLowerCase().includes(outputSearchQuery.toLowerCase());
      }).map(log => {
        const isTerminal = session.inputMode === 'terminal';
        const isSystemMessage = log.source === 'system';
        const isUserCommand = log.source === 'user';
        const processedText = processLogText(log.text, isTerminal && !isUserCommand, isSystemMessage);

        // Skip rendering if text is empty after processing
        if (!processedText.trim() && !isUserCommand) return null;

        // Convert ANSI codes to HTML for terminal output and sanitize
        const htmlContent = isTerminal && !isUserCommand && !isSystemMessage
          ? DOMPurify.sanitize(ansiConverter.toHtml(processedText))
          : processedText;

        return (
          <div key={log.id} className="flex flex-col gap-2">
            {/* Timestamp at the top */}
            <div className="text-[10px] opacity-60 font-mono" style={{ color: theme.colors.textDim }}>
              {new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit', hour12: false})}
            </div>

            {/* Message content */}
            <div className={`flex gap-3 items-start`}>
              {/* Icon for system messages */}
              {isSystemMessage && (
                <div className="shrink-0 mt-1">
                  <Sparkles className="w-3.5 h-3.5 opacity-40" style={{ color: theme.colors.textDim }} />
                </div>
              )}

              <div className={`flex-1 p-4 rounded-xl border ${isUserCommand ? 'rounded-tr-none' : 'rounded-tl-none'}`}
                   style={{
                     backgroundColor: isUserCommand ? theme.colors.accent : 'transparent',
                     borderColor: isUserCommand ? theme.colors.accent : theme.colors.border
                   }}>
                {log.images && log.images.length > 0 && (
                  <div className="flex gap-2 mb-2 overflow-x-auto">
                    {log.images.map((img, idx) => (
                      <img key={idx} src={img} className="h-20 rounded border cursor-zoom-in" onClick={() => setLightboxImage(img)} />
                    ))}
                  </div>
                )}

                {/* User commands with $ prefix and contrasting color on accent background */}
                {isUserCommand ? (
                  <div
                    className="whitespace-pre-wrap break-all text-sm font-mono font-semibold"
                    style={{ color: theme.colors.bgMain }}
                  >
                    $ {processedText}
                  </div>
                ) : isTerminal && !isSystemMessage ? (
                  /* Terminal output with ANSI colors - responsive text wrapping */
                  <div
                    className="whitespace-pre-wrap break-words text-sm font-mono"
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                    style={{ color: theme.colors.textMain }}
                  />
                ) : (
                  /* System messages and AI responses */
                  <div
                    className="whitespace-pre-wrap break-words text-sm"
                    style={{ color: isSystemMessage ? theme.colors.textDim : theme.colors.textMain }}
                  >
                    {processedText}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {session.state === 'busy' && (
        <div className="flex items-center justify-center gap-2 text-xs opacity-50 animate-pulse py-4">
          <Activity className="w-4 h-4" />
          {session.inputMode === 'ai' ? 'Claude is thinking...' : 'Executing shell command...'}
        </div>
      )}
      <div ref={logsEndRef} />
    </div>
  );
}
