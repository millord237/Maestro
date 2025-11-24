/**
 * Utility functions for cleaning and filtering terminal output
 * Removes control sequences, escape codes, and other non-visible content
 */

/**
 * Strip terminal control sequences from raw PTY output
 * This removes:
 * - OSC sequences (Operating System Commands) like title changes
 * - CSI sequences (Control Sequence Introducer) like cursor positioning
 * - SGR sequences (Select Graphic Rendition) that aren't visible content
 * - Shell prompt markers and other non-content control codes
 *
 * Note: This preserves ANSI color codes which are handled by ansi-to-html in the renderer
 */
export function stripControlSequences(text: string): string {
  let cleaned = text;

  // Remove OSC (Operating System Command) sequences
  // Format: ESC ] ... (BEL or ST)
  // Examples: window title changes, hyperlinks, custom sequences
  cleaned = cleaned.replace(/\x1b\][^\x07\x1b]*(\x07|\x1b\\)/g, '');

  // Remove CSI (Control Sequence Introducer) sequences that aren't color codes
  // Format: ESC [ ... letter
  // Keep: SGR color codes (end with 'm')
  // Remove: cursor movement, scrolling, etc.
  cleaned = cleaned.replace(/\x1b\[[\d;]*[A-KSTfHJhlp]/gi, '');

  // Remove shell integration markers (VSCode, iTerm2, etc.)
  // Format: ESC ] 133 ; ... BEL/ST
  cleaned = cleaned.replace(/\x1b\]133;[^\x07\x1b]*(\x07|\x1b\\)/g, '');
  cleaned = cleaned.replace(/\x1b\]1337;[^\x07\x1b]*(\x07|\x1b\\)/g, '');
  cleaned = cleaned.replace(/\x1b\]7;[^\x07\x1b]*(\x07|\x1b\\)/g, '');

  // Remove other OSC sequences by number
  cleaned = cleaned.replace(/\x1b\][0-9];[^\x07\x1b]*(\x07|\x1b\\)/g, '');

  // Remove soft hyphen and other invisible formatting
  cleaned = cleaned.replace(/\u00AD/g, '');

  // Remove carriage returns that are followed by newlines (Windows-style)
  // But keep standalone \r for terminal overwrites
  cleaned = cleaned.replace(/\r\n/g, '\n');

  // Remove any remaining standalone escape sequences without parameters
  cleaned = cleaned.replace(/\x1b[()][AB012]/g, '');

  // Remove BEL (bell) character
  cleaned = cleaned.replace(/\x07/g, '');

  // Remove other control characters except newline, tab, and ANSI escape start
  cleaned = cleaned.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1A\x1C-\x1F]/g, '');

  return cleaned;
}

/**
 * Detect if a line is likely a command echo in terminal output
 * This helps identify when the terminal is echoing back the command the user typed
 */
export function isCommandEcho(line: string, lastCommand?: string): boolean {
  if (!lastCommand) return false;

  const trimmedLine = line.trim();
  const trimmedCommand = lastCommand.trim();

  // Exact match
  if (trimmedLine === trimmedCommand) return true;

  // Line starts with the command (may have prompt prefix)
  if (trimmedLine.endsWith(trimmedCommand)) return true;

  return false;
}

/**
 * Extract the actual command from user input (without prompt)
 */
export function extractCommand(input: string): string {
  // Remove common prompt patterns from the beginning
  const withoutPrompt = input.replace(/^[^$#%>]*[$#%>]\s*/, '');
  return withoutPrompt.trim();
}
