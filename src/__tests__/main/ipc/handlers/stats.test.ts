/**
 * Tests for the Stats IPC handlers
 *
 * These tests verify that the stats:updated event is broadcast correctly
 * after each database write operation, ensuring real-time dashboard updates.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain, BrowserWindow } from 'electron';
import { registerStatsHandlers } from '../../../../main/ipc/handlers/stats';
import * as statsDbModule from '../../../../main/stats-db';
import type { StatsDB } from '../../../../main/stats-db';

// Mock electron's ipcMain and BrowserWindow
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
  BrowserWindow: vi.fn(),
}));

// Mock the stats-db module
vi.mock('../../../../main/stats-db', () => ({
  getStatsDB: vi.fn(),
}));

// Mock the logger
vi.mock('../../../../main/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('stats IPC handlers', () => {
  let handlers: Map<string, Function>;
  let mockStatsDB: Partial<StatsDB>;
  let mockMainWindow: { webContents: { send: ReturnType<typeof vi.fn> }; isDestroyed: ReturnType<typeof vi.fn> };
  let getMainWindow: () => typeof mockMainWindow | null;

  beforeEach(() => {
    // Clear mocks
    vi.clearAllMocks();

    // Create mock stats database
    mockStatsDB = {
      insertQueryEvent: vi.fn().mockReturnValue('query-event-id'),
      insertAutoRunSession: vi.fn().mockReturnValue('autorun-session-id'),
      updateAutoRunSession: vi.fn().mockReturnValue(true),
      insertAutoRunTask: vi.fn().mockReturnValue('autorun-task-id'),
      getQueryEvents: vi.fn().mockReturnValue([]),
      getAutoRunSessions: vi.fn().mockReturnValue([]),
      getAutoRunTasks: vi.fn().mockReturnValue([]),
      getAggregatedStats: vi.fn().mockReturnValue({
        totalQueries: 0,
        totalDuration: 0,
        avgDuration: 0,
        byAgent: {},
        bySource: { user: 0, auto: 0 },
        byDay: [],
      }),
      exportToCsv: vi.fn().mockReturnValue('id,sessionId,...'),
    };

    vi.mocked(statsDbModule.getStatsDB).mockReturnValue(mockStatsDB as unknown as StatsDB);

    // Create mock main window with webContents.send
    mockMainWindow = {
      webContents: {
        send: vi.fn(),
      },
      isDestroyed: vi.fn().mockReturnValue(false),
    };

    getMainWindow = () => mockMainWindow;

    // Capture all registered handlers
    handlers = new Map();
    vi.mocked(ipcMain.handle).mockImplementation((channel, handler) => {
      handlers.set(channel, handler);
    });

    // Register handlers with our mock getMainWindow
    registerStatsHandlers({ getMainWindow });
  });

  afterEach(() => {
    handlers.clear();
  });

  describe('registration', () => {
    it('should register all stats handlers', () => {
      const expectedChannels = [
        'stats:record-query',
        'stats:start-autorun',
        'stats:end-autorun',
        'stats:record-task',
        'stats:get-stats',
        'stats:get-autorun-sessions',
        'stats:get-autorun-tasks',
        'stats:get-aggregation',
        'stats:export-csv',
      ];

      for (const channel of expectedChannels) {
        expect(handlers.has(channel)).toBe(true);
      }
    });
  });

  describe('stats:updated broadcast verification', () => {
    describe('stats:record-query', () => {
      it('should broadcast stats:updated after recording a query event', async () => {
        const handler = handlers.get('stats:record-query');
        const queryEvent = {
          sessionId: 'session-1',
          agentType: 'claude-code',
          source: 'user' as const,
          startTime: Date.now(),
          duration: 5000,
          projectPath: '/test/project',
          tabId: 'tab-1',
        };

        await handler!({} as any, queryEvent);

        expect(mockStatsDB.insertQueryEvent).toHaveBeenCalledWith(queryEvent);
        expect(mockMainWindow.webContents.send).toHaveBeenCalledWith('stats:updated');
        expect(mockMainWindow.webContents.send).toHaveBeenCalledTimes(1);
      });

      it('should not broadcast when main window is null', async () => {
        const nullWindowGetMainWindow = () => null;
        handlers.clear();
        vi.mocked(ipcMain.handle).mockImplementation((channel, handler) => {
          handlers.set(channel, handler);
        });
        registerStatsHandlers({ getMainWindow: nullWindowGetMainWindow });

        const handler = handlers.get('stats:record-query');
        const queryEvent = {
          sessionId: 'session-1',
          agentType: 'claude-code',
          source: 'user' as const,
          startTime: Date.now(),
          duration: 5000,
        };

        await handler!({} as any, queryEvent);

        // No error should be thrown, and no send should happen
        expect(mockStatsDB.insertQueryEvent).toHaveBeenCalled();
        expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
      });

      it('should not broadcast when main window is destroyed', async () => {
        mockMainWindow.isDestroyed.mockReturnValue(true);

        const handler = handlers.get('stats:record-query');
        const queryEvent = {
          sessionId: 'session-1',
          agentType: 'claude-code',
          source: 'user' as const,
          startTime: Date.now(),
          duration: 5000,
        };

        await handler!({} as any, queryEvent);

        expect(mockStatsDB.insertQueryEvent).toHaveBeenCalled();
        expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
      });
    });

    describe('stats:start-autorun', () => {
      it('should broadcast stats:updated after starting an Auto Run session', async () => {
        const handler = handlers.get('stats:start-autorun');
        const autoRunSession = {
          sessionId: 'session-1',
          agentType: 'claude-code',
          documentPath: '/docs/task.md',
          startTime: Date.now(),
          tasksTotal: 5,
          projectPath: '/test/project',
        };

        const result = await handler!({} as any, autoRunSession);

        expect(result).toBe('autorun-session-id');
        expect(mockStatsDB.insertAutoRunSession).toHaveBeenCalled();
        expect(mockMainWindow.webContents.send).toHaveBeenCalledWith('stats:updated');
        expect(mockMainWindow.webContents.send).toHaveBeenCalledTimes(1);
      });
    });

    describe('stats:end-autorun', () => {
      it('should broadcast stats:updated after ending an Auto Run session', async () => {
        const handler = handlers.get('stats:end-autorun');

        const result = await handler!({} as any, 'autorun-session-id', 60000, 4);

        expect(result).toBe(true);
        expect(mockStatsDB.updateAutoRunSession).toHaveBeenCalledWith('autorun-session-id', {
          duration: 60000,
          tasksCompleted: 4,
        });
        expect(mockMainWindow.webContents.send).toHaveBeenCalledWith('stats:updated');
        expect(mockMainWindow.webContents.send).toHaveBeenCalledTimes(1);
      });

      it('should broadcast stats:updated even when session not found', async () => {
        vi.mocked(mockStatsDB.updateAutoRunSession).mockReturnValue(false);

        const handler = handlers.get('stats:end-autorun');
        const result = await handler!({} as any, 'nonexistent-id', 60000, 4);

        expect(result).toBe(false);
        // Should still broadcast - UI may need to refresh regardless
        expect(mockMainWindow.webContents.send).toHaveBeenCalledWith('stats:updated');
      });
    });

    describe('stats:record-task', () => {
      it('should broadcast stats:updated after recording an Auto Run task', async () => {
        const handler = handlers.get('stats:record-task');
        const task = {
          autoRunSessionId: 'autorun-session-1',
          sessionId: 'session-1',
          agentType: 'claude-code',
          taskIndex: 0,
          taskContent: 'First task',
          startTime: Date.now(),
          duration: 10000,
          success: true,
        };

        const result = await handler!({} as any, task);

        expect(result).toBe('autorun-task-id');
        expect(mockStatsDB.insertAutoRunTask).toHaveBeenCalledWith(task);
        expect(mockMainWindow.webContents.send).toHaveBeenCalledWith('stats:updated');
        expect(mockMainWindow.webContents.send).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('read-only operations should not broadcast', () => {
    describe('stats:get-stats', () => {
      it('should not broadcast stats:updated when getting stats', async () => {
        const handler = handlers.get('stats:get-stats');

        await handler!({} as any, 'week', { agentType: 'claude-code' });

        expect(mockStatsDB.getQueryEvents).toHaveBeenCalledWith('week', { agentType: 'claude-code' });
        expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
      });
    });

    describe('stats:get-autorun-sessions', () => {
      it('should not broadcast stats:updated when getting Auto Run sessions', async () => {
        const handler = handlers.get('stats:get-autorun-sessions');

        await handler!({} as any, 'month');

        expect(mockStatsDB.getAutoRunSessions).toHaveBeenCalledWith('month');
        expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
      });
    });

    describe('stats:get-autorun-tasks', () => {
      it('should not broadcast stats:updated when getting Auto Run tasks', async () => {
        const handler = handlers.get('stats:get-autorun-tasks');

        await handler!({} as any, 'autorun-session-1');

        expect(mockStatsDB.getAutoRunTasks).toHaveBeenCalledWith('autorun-session-1');
        expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
      });
    });

    describe('stats:get-aggregation', () => {
      it('should not broadcast stats:updated when getting aggregation', async () => {
        const handler = handlers.get('stats:get-aggregation');

        await handler!({} as any, 'year');

        expect(mockStatsDB.getAggregatedStats).toHaveBeenCalledWith('year');
        expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
      });
    });

    describe('stats:export-csv', () => {
      it('should not broadcast stats:updated when exporting CSV', async () => {
        const handler = handlers.get('stats:export-csv');

        await handler!({} as any, 'all');

        expect(mockStatsDB.exportToCsv).toHaveBeenCalledWith('all');
        expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
      });
    });
  });

  describe('broadcast timing', () => {
    it('should broadcast after database write completes', async () => {
      const executionOrder: string[] = [];

      vi.mocked(mockStatsDB.insertQueryEvent).mockImplementation(() => {
        executionOrder.push('db-write');
        return 'query-event-id';
      });

      mockMainWindow.webContents.send = vi.fn().mockImplementation(() => {
        executionOrder.push('broadcast');
      });

      const handler = handlers.get('stats:record-query');
      await handler!({} as any, {
        sessionId: 'session-1',
        agentType: 'claude-code',
        source: 'user' as const,
        startTime: Date.now(),
        duration: 5000,
      });

      expect(executionOrder).toEqual(['db-write', 'broadcast']);
    });
  });

  describe('multiple write operations', () => {
    it('should broadcast once per write operation', async () => {
      // Record query
      const recordQueryHandler = handlers.get('stats:record-query');
      await recordQueryHandler!({} as any, {
        sessionId: 'session-1',
        agentType: 'claude-code',
        source: 'user' as const,
        startTime: Date.now(),
        duration: 5000,
      });

      // Start auto run
      const startAutoRunHandler = handlers.get('stats:start-autorun');
      await startAutoRunHandler!({} as any, {
        sessionId: 'session-1',
        agentType: 'claude-code',
        startTime: Date.now(),
        tasksTotal: 3,
      });

      // Record task
      const recordTaskHandler = handlers.get('stats:record-task');
      await recordTaskHandler!({} as any, {
        autoRunSessionId: 'autorun-session-id',
        sessionId: 'session-1',
        agentType: 'claude-code',
        taskIndex: 0,
        startTime: Date.now(),
        duration: 10000,
        success: true,
      });

      // End auto run
      const endAutoRunHandler = handlers.get('stats:end-autorun');
      await endAutoRunHandler!({} as any, 'autorun-session-id', 60000, 3);

      // Should have broadcast 4 times (once per write operation)
      expect(mockMainWindow.webContents.send).toHaveBeenCalledTimes(4);
      expect(mockMainWindow.webContents.send).toHaveBeenNthCalledWith(1, 'stats:updated');
      expect(mockMainWindow.webContents.send).toHaveBeenNthCalledWith(2, 'stats:updated');
      expect(mockMainWindow.webContents.send).toHaveBeenNthCalledWith(3, 'stats:updated');
      expect(mockMainWindow.webContents.send).toHaveBeenNthCalledWith(4, 'stats:updated');
    });
  });
});
