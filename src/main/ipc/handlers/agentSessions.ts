/**
 * Agent Sessions IPC Handlers
 *
 * This module provides generic IPC handlers for agent session management
 * that work with any agent supporting the AgentSessionStorage interface.
 *
 * This is the preferred API for new code. The window.maestro.claude.* API
 * remains for backwards compatibility but logs deprecation warnings.
 *
 * Usage:
 * - window.maestro.agentSessions.list(agentId, projectPath)
 * - window.maestro.agentSessions.read(agentId, projectPath, sessionId)
 * - window.maestro.agentSessions.search(agentId, projectPath, query, mode)
 */

import { ipcMain } from 'electron';
import { logger } from '../../utils/logger';
import { withIpcErrorLogging } from '../../utils/ipcHandler';
import {
  getSessionStorage,
  hasSessionStorage,
  getAllSessionStorages,
} from '../../agent-session-storage';
import type {
  AgentSessionInfo,
  PaginatedSessionsResult,
  SessionMessagesResult,
  SessionSearchResult,
  SessionSearchMode,
  SessionListOptions,
  SessionReadOptions,
} from '../../agent-session-storage';

const LOG_CONTEXT = '[AgentSessions]';

/**
 * Helper function to create consistent handler options
 */
function handlerOpts(operation: string) {
  return { context: LOG_CONTEXT, operation, logSuccess: false };
}

/**
 * Register all agent sessions IPC handlers.
 */
export function registerAgentSessionsHandlers(): void {
  // ============ List Sessions ============

  ipcMain.handle(
    'agentSessions:list',
    withIpcErrorLogging(
      handlerOpts('list'),
      async (agentId: string, projectPath: string): Promise<AgentSessionInfo[]> => {
        const storage = getSessionStorage(agentId);
        if (!storage) {
          logger.warn(`No session storage available for agent: ${agentId}`, LOG_CONTEXT);
          return [];
        }

        const sessions = await storage.listSessions(projectPath);
        logger.info(
          `Listed ${sessions.length} sessions for agent ${agentId} at ${projectPath}`,
          LOG_CONTEXT
        );
        return sessions;
      }
    )
  );

  // ============ List Sessions Paginated ============

  ipcMain.handle(
    'agentSessions:listPaginated',
    withIpcErrorLogging(
      handlerOpts('listPaginated'),
      async (
        agentId: string,
        projectPath: string,
        options?: SessionListOptions
      ): Promise<PaginatedSessionsResult> => {
        const storage = getSessionStorage(agentId);
        if (!storage) {
          logger.warn(`No session storage available for agent: ${agentId}`, LOG_CONTEXT);
          return { sessions: [], hasMore: false, totalCount: 0, nextCursor: null };
        }

        const result = await storage.listSessionsPaginated(projectPath, options);
        logger.info(
          `Listed paginated sessions for agent ${agentId}: ${result.sessions.length} of ${result.totalCount}`,
          LOG_CONTEXT
        );
        return result;
      }
    )
  );

  // ============ Read Session Messages ============

  ipcMain.handle(
    'agentSessions:read',
    withIpcErrorLogging(
      handlerOpts('read'),
      async (
        agentId: string,
        projectPath: string,
        sessionId: string,
        options?: SessionReadOptions
      ): Promise<SessionMessagesResult> => {
        const storage = getSessionStorage(agentId);
        if (!storage) {
          logger.warn(`No session storage available for agent: ${agentId}`, LOG_CONTEXT);
          return { messages: [], total: 0, hasMore: false };
        }

        const result = await storage.readSessionMessages(projectPath, sessionId, options);
        logger.info(
          `Read ${result.messages.length} messages for session ${sessionId} (agent: ${agentId})`,
          LOG_CONTEXT
        );
        return result;
      }
    )
  );

  // ============ Search Sessions ============

  ipcMain.handle(
    'agentSessions:search',
    withIpcErrorLogging(
      handlerOpts('search'),
      async (
        agentId: string,
        projectPath: string,
        query: string,
        searchMode: SessionSearchMode
      ): Promise<SessionSearchResult[]> => {
        const storage = getSessionStorage(agentId);
        if (!storage) {
          logger.warn(`No session storage available for agent: ${agentId}`, LOG_CONTEXT);
          return [];
        }

        const results = await storage.searchSessions(projectPath, query, searchMode);
        logger.info(
          `Found ${results.length} matching sessions for query "${query}" (agent: ${agentId})`,
          LOG_CONTEXT
        );
        return results;
      }
    )
  );

  // ============ Get Session Path ============

  ipcMain.handle(
    'agentSessions:getPath',
    withIpcErrorLogging(
      handlerOpts('getPath'),
      async (agentId: string, projectPath: string, sessionId: string): Promise<string | null> => {
        const storage = getSessionStorage(agentId);
        if (!storage) {
          logger.warn(`No session storage available for agent: ${agentId}`, LOG_CONTEXT);
          return null;
        }

        return storage.getSessionPath(projectPath, sessionId);
      }
    )
  );

  // ============ Delete Message Pair ============

  ipcMain.handle(
    'agentSessions:deleteMessagePair',
    withIpcErrorLogging(
      handlerOpts('deleteMessagePair'),
      async (
        agentId: string,
        projectPath: string,
        sessionId: string,
        userMessageUuid: string,
        fallbackContent?: string
      ): Promise<{ success: boolean; error?: string; linesRemoved?: number }> => {
        const storage = getSessionStorage(agentId);
        if (!storage) {
          logger.warn(`No session storage available for agent: ${agentId}`, LOG_CONTEXT);
          return { success: false, error: `No session storage available for agent: ${agentId}` };
        }

        return storage.deleteMessagePair(projectPath, sessionId, userMessageUuid, fallbackContent);
      }
    )
  );

  // ============ Check Storage Availability ============

  ipcMain.handle(
    'agentSessions:hasStorage',
    withIpcErrorLogging(handlerOpts('hasStorage'), async (agentId: string): Promise<boolean> => {
      return hasSessionStorage(agentId);
    })
  );

  // ============ Get Available Storages ============

  ipcMain.handle(
    'agentSessions:getAvailableStorages',
    withIpcErrorLogging(handlerOpts('getAvailableStorages'), async (): Promise<string[]> => {
      const storages = getAllSessionStorages();
      return storages.map((s) => s.agentId);
    })
  );
}
