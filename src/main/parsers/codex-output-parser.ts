/**
 * Codex CLI Output Parser
 *
 * Parses JSON output from OpenAI Codex CLI (`codex exec --json`).
 * Codex outputs JSONL with the following message types:
 *
 * - thread.started: Thread initialization (contains thread_id for resume)
 * - turn.started: Beginning of a turn (agent is processing)
 * - item.completed: Completed item (reasoning, agent_message, tool_call, tool_result)
 * - turn.completed: End of turn (contains usage stats)
 *
 * Key schema details:
 * - Session IDs are called thread_id (not session_id like Claude)
 * - Text content is in item.text for reasoning and agent_message items
 * - Token stats are in usage: { input_tokens, output_tokens, cached_input_tokens }
 * - reasoning_output_tokens tracked separately from output_tokens
 * - Tool calls have item.type: "tool_call" with tool name and args
 * - Tool results have item.type: "tool_result" with output
 *
 * Verified against Codex CLI v0.73.0+ output schema
 * @see https://github.com/openai/codex
 */

import type { ToolType, AgentError } from '../../shared/types';
import type { AgentOutputParser, ParsedEvent } from './agent-output-parser';
import { getErrorPatterns, matchErrorPattern } from './error-patterns';

/**
 * Raw message structure from Codex JSON output
 * Based on verified Codex CLI v0.73.0+ output
 */
interface CodexRawMessage {
  type?:
    | 'thread.started'
    | 'turn.started'
    | 'item.completed'
    | 'turn.completed'
    | 'error';
  thread_id?: string;
  item?: CodexItem;
  usage?: CodexUsage;
  error?: string;
}

/**
 * Item structure for item.completed events
 */
interface CodexItem {
  id?: string;
  type?: 'reasoning' | 'agent_message' | 'tool_call' | 'tool_result';
  text?: string;
  tool?: string;
  args?: Record<string, unknown>;
  output?: string | number[];
}

/**
 * Usage statistics from turn.completed events
 */
interface CodexUsage {
  input_tokens?: number;
  output_tokens?: number;
  cached_input_tokens?: number;
  reasoning_output_tokens?: number;
}

/**
 * Codex CLI Output Parser Implementation
 *
 * Transforms Codex's JSON format into normalized ParsedEvents.
 * Verified against Codex CLI v0.73.0+ output schema.
 */
export class CodexOutputParser implements AgentOutputParser {
  readonly agentId: ToolType = 'codex';

  /**
   * Parse a single JSON line from Codex output
   *
   * Codex message types (verified v0.73.0+):
   * - { type: 'thread.started', thread_id: 'uuid' }
   * - { type: 'turn.started' }
   * - { type: 'item.completed', item: { id, type, text|tool|args|output } }
   * - { type: 'turn.completed', usage: { input_tokens, output_tokens, cached_input_tokens } }
   */
  parseJsonLine(line: string): ParsedEvent | null {
    if (!line.trim()) {
      return null;
    }

    try {
      const msg: CodexRawMessage = JSON.parse(line);
      return this.transformMessage(msg);
    } catch {
      // Not valid JSON - return as raw text event
      return {
        type: 'text',
        text: line,
        raw: line,
      };
    }
  }

  /**
   * Transform a parsed Codex message into a normalized ParsedEvent
   */
  private transformMessage(msg: CodexRawMessage): ParsedEvent {
    // Handle thread.started (session initialization with thread_id)
    if (msg.type === 'thread.started') {
      return {
        type: 'init',
        sessionId: msg.thread_id,
        raw: msg,
      };
    }

    // Handle turn.started (agent is processing)
    if (msg.type === 'turn.started') {
      return {
        type: 'system',
        raw: msg,
      };
    }

    // Handle item.completed events (reasoning, agent_message, tool_call, tool_result)
    if (msg.type === 'item.completed' && msg.item) {
      return this.transformItemCompleted(msg.item, msg);
    }

    // Handle turn.completed (end of turn with usage stats)
    // Note: This is NOT the result message - actual text comes from agent_message items
    // This event only contains usage statistics
    if (msg.type === 'turn.completed') {
      const event: ParsedEvent = {
        type: 'usage',  // Mark as 'usage' type, not 'result'
        raw: msg,
      };

      // Extract usage stats if present
      const usage = this.extractUsageFromRaw(msg);
      if (usage) {
        event.usage = usage;
      }

      return event;
    }

    // Handle error messages
    if (msg.type === 'error' || msg.error) {
      return {
        type: 'error',
        text: msg.error || 'Unknown error',
        raw: msg,
      };
    }

    // Default: preserve as system event
    return {
      type: 'system',
      raw: msg,
    };
  }

  /**
   * Transform an item.completed event based on item type
   */
  private transformItemCompleted(
    item: CodexItem,
    msg: CodexRawMessage
  ): ParsedEvent {
    switch (item.type) {
      case 'reasoning':
        // Reasoning shows model's thinking process
        // Emit as text but mark it as partial/streaming
        return {
          type: 'text',
          text: item.text || '',
          isPartial: true,
          raw: msg,
        };

      case 'agent_message':
        // Final text response from agent - mark as 'result' so it gets emitted
        // This is the actual response text (not reasoning or tool output)
        return {
          type: 'result',
          text: item.text || '',
          isPartial: false,
          raw: msg,
        };

      case 'tool_call':
        // Agent is using a tool
        return {
          type: 'tool_use',
          toolName: item.tool,
          toolState: {
            status: 'running',
            input: item.args,
          },
          raw: msg,
        };

      case 'tool_result':
        // Tool execution completed
        return {
          type: 'tool_use',
          toolState: {
            status: 'completed',
            output: this.decodeToolOutput(item.output),
          },
          raw: msg,
        };

      default:
        // Unknown item type - preserve as system event
        return {
          type: 'system',
          raw: msg,
        };
    }
  }

  /**
   * Decode tool output which may be a string or byte array
   * Codex sometimes returns command output as byte arrays
   */
  private decodeToolOutput(output: string | number[] | undefined): string {
    if (output === undefined) {
      return '';
    }

    if (typeof output === 'string') {
      return output;
    }

    // Byte array - decode to string
    // Note: Using Buffer.from instead of String.fromCharCode(...output) to avoid
    // stack overflow on large arrays (spread operator has argument limit ~10K)
    if (Array.isArray(output)) {
      try {
        return Buffer.from(output).toString('utf-8');
      } catch {
        return output.toString();
      }
    }

    return String(output);
  }

  /**
   * Extract usage statistics from raw Codex message
   * Codex usage structure: { input_tokens, output_tokens, cached_input_tokens, reasoning_output_tokens }
   * Note: Cost tracking is not supported - Codex doesn't provide cost and pricing varies by model
   */
  private extractUsageFromRaw(msg: CodexRawMessage): ParsedEvent['usage'] | null {
    if (!msg.usage) {
      return null;
    }

    const usage = msg.usage;

    const inputTokens = usage.input_tokens || 0;
    const outputTokens = usage.output_tokens || 0;
    const cachedInputTokens = usage.cached_input_tokens || 0;
    const reasoningOutputTokens = usage.reasoning_output_tokens || 0;

    // Total output tokens = output_tokens + reasoning_output_tokens
    const totalOutputTokens = outputTokens + reasoningOutputTokens;

    return {
      inputTokens,
      outputTokens: totalOutputTokens,
      cacheReadTokens: cachedInputTokens,
      // Note: Codex doesn't report cache creation tokens
      cacheCreationTokens: 0,
      // Note: costUsd omitted - Codex doesn't provide cost and pricing varies by model
      // Store reasoning tokens separately for UI display
      reasoningTokens: reasoningOutputTokens,
    };
  }

  /**
   * Check if an event is a final result message
   * For Codex, agent_message items contain the actual response text
   * We check for 'result' type which agent_message events are now marked as
   */
  isResultMessage(event: ParsedEvent): boolean {
    return event.type === 'result' && !!event.text;
  }

  /**
   * Extract session ID from an event
   * Codex uses thread_id for session continuity
   */
  extractSessionId(event: ParsedEvent): string | null {
    return event.sessionId || null;
  }

  /**
   * Extract usage statistics from an event
   */
  extractUsage(event: ParsedEvent): ParsedEvent['usage'] | null {
    return event.usage || null;
  }

  /**
   * Extract slash commands from an event
   * NOTE: Codex does not support slash commands
   */
  extractSlashCommands(_event: ParsedEvent): string[] | null {
    // Codex doesn't have discoverable slash commands
    return null;
  }

  /**
   * Detect an error from a line of agent output
   */
  detectErrorFromLine(line: string): AgentError | null {
    // Skip empty lines
    if (!line.trim()) {
      return null;
    }

    // Try to parse as JSON first to check for error messages in structured output
    let textToCheck = line;
    try {
      const parsed = JSON.parse(line);
      // Check for error type messages
      if (parsed.type === 'error' && parsed.error) {
        textToCheck = parsed.error;
      } else if (parsed.error) {
        textToCheck =
          typeof parsed.error === 'string'
            ? parsed.error
            : JSON.stringify(parsed.error);
      }
    } catch {
      // Not JSON, check the raw line
    }

    // Match against error patterns
    const patterns = getErrorPatterns(this.agentId);
    const match = matchErrorPattern(patterns, textToCheck);

    if (match) {
      return {
        type: match.type,
        message: match.message,
        recoverable: match.recoverable,
        agentId: this.agentId,
        timestamp: Date.now(),
        raw: {
          errorLine: line,
        },
      };
    }

    return null;
  }

  /**
   * Detect an error from process exit information
   */
  detectErrorFromExit(
    exitCode: number,
    stderr: string,
    stdout: string
  ): AgentError | null {
    // Exit code 0 is success
    if (exitCode === 0) {
      return null;
    }

    // Check stderr and stdout for error patterns
    const combined = `${stderr}\n${stdout}`;
    const patterns = getErrorPatterns(this.agentId);
    const match = matchErrorPattern(patterns, combined);

    if (match) {
      return {
        type: match.type,
        message: match.message,
        recoverable: match.recoverable,
        agentId: this.agentId,
        timestamp: Date.now(),
        raw: {
          exitCode,
          stderr,
          stdout,
        },
      };
    }

    // Non-zero exit with no recognized pattern - treat as crash
    return {
      type: 'agent_crashed',
      message: `Agent exited with code ${exitCode}`,
      recoverable: true,
      agentId: this.agentId,
      timestamp: Date.now(),
      raw: {
        exitCode,
        stderr,
        stdout,
      },
    };
  }
}
