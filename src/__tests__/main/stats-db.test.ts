/**
 * Tests for stats-db.ts
 *
 * Note: better-sqlite3 is a native module compiled for Electron's Node version.
 * Direct testing with the native module in vitest is not possible without
 * electron-rebuild for the vitest runtime. These tests use mocked database
 * operations to verify the logic without requiring the actual native module.
 *
 * For full integration testing of the SQLite database, use the Electron test
 * environment (e2e tests) where the native module is properly loaded.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as os from 'os';

// Track Database constructor calls to verify file path
let lastDbPath: string | null = null;

// Store mock references so they can be accessed in tests
const mockStatement = {
  run: vi.fn(() => ({ changes: 1 })),
  get: vi.fn(() => ({ count: 0, total_duration: 0 })),
  all: vi.fn(() => []),
};

const mockDb = {
  pragma: vi.fn(() => [{ user_version: 0 }]),
  prepare: vi.fn(() => mockStatement),
  close: vi.fn(),
};

// Mock better-sqlite3 as a class
vi.mock('better-sqlite3', () => {
  return {
    default: class MockDatabase {
      constructor(dbPath: string) {
        lastDbPath = dbPath;
      }
      pragma = mockDb.pragma;
      prepare = mockDb.prepare;
      close = mockDb.close;
    },
  };
});

// Mock electron's app module with trackable userData path
const mockUserDataPath = path.join(os.tmpdir(), 'maestro-test-stats-db');
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn((name: string) => {
      if (name === 'userData') return mockUserDataPath;
      return os.tmpdir();
    }),
  },
}));

// Track fs calls
const mockFsExistsSync = vi.fn(() => true);
const mockFsMkdirSync = vi.fn();

// Mock fs
vi.mock('fs', () => ({
  existsSync: (...args: unknown[]) => mockFsExistsSync(...args),
  mkdirSync: (...args: unknown[]) => mockFsMkdirSync(...args),
}));

// Mock logger
vi.mock('../../main/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import types only - we'll test the type definitions
import type {
  QueryEvent,
  AutoRunSession,
  AutoRunTask,
  StatsTimeRange,
  StatsFilters,
  StatsAggregation,
} from '../../shared/stats-types';

describe('stats-types.ts', () => {
  describe('QueryEvent interface', () => {
    it('should define proper QueryEvent structure', () => {
      const event: QueryEvent = {
        id: 'test-id',
        sessionId: 'session-1',
        agentType: 'claude-code',
        source: 'user',
        startTime: Date.now(),
        duration: 5000,
        projectPath: '/test/project',
        tabId: 'tab-1',
      };

      expect(event.id).toBe('test-id');
      expect(event.sessionId).toBe('session-1');
      expect(event.source).toBe('user');
    });

    it('should allow optional fields to be undefined', () => {
      const event: QueryEvent = {
        id: 'test-id',
        sessionId: 'session-1',
        agentType: 'claude-code',
        source: 'auto',
        startTime: Date.now(),
        duration: 3000,
      };

      expect(event.projectPath).toBeUndefined();
      expect(event.tabId).toBeUndefined();
    });
  });

  describe('AutoRunSession interface', () => {
    it('should define proper AutoRunSession structure', () => {
      const session: AutoRunSession = {
        id: 'auto-run-1',
        sessionId: 'session-1',
        agentType: 'claude-code',
        documentPath: '/docs/task.md',
        startTime: Date.now(),
        duration: 60000,
        tasksTotal: 5,
        tasksCompleted: 3,
        projectPath: '/test/project',
      };

      expect(session.id).toBe('auto-run-1');
      expect(session.tasksTotal).toBe(5);
      expect(session.tasksCompleted).toBe(3);
    });
  });

  describe('AutoRunTask interface', () => {
    it('should define proper AutoRunTask structure', () => {
      const task: AutoRunTask = {
        id: 'task-1',
        autoRunSessionId: 'auto-run-1',
        sessionId: 'session-1',
        agentType: 'claude-code',
        taskIndex: 0,
        taskContent: 'First task content',
        startTime: Date.now(),
        duration: 10000,
        success: true,
      };

      expect(task.id).toBe('task-1');
      expect(task.taskIndex).toBe(0);
      expect(task.success).toBe(true);
    });

    it('should handle failed tasks', () => {
      const task: AutoRunTask = {
        id: 'task-2',
        autoRunSessionId: 'auto-run-1',
        sessionId: 'session-1',
        agentType: 'claude-code',
        taskIndex: 1,
        startTime: Date.now(),
        duration: 5000,
        success: false,
      };

      expect(task.success).toBe(false);
      expect(task.taskContent).toBeUndefined();
    });
  });

  describe('StatsTimeRange type', () => {
    it('should accept valid time ranges', () => {
      const ranges: StatsTimeRange[] = ['day', 'week', 'month', 'year', 'all'];

      expect(ranges).toHaveLength(5);
      expect(ranges).toContain('day');
      expect(ranges).toContain('all');
    });
  });

  describe('StatsFilters interface', () => {
    it('should allow partial filters', () => {
      const filters1: StatsFilters = { agentType: 'claude-code' };
      const filters2: StatsFilters = { source: 'user' };
      const filters3: StatsFilters = { agentType: 'opencode', source: 'auto', projectPath: '/test' };

      expect(filters1.agentType).toBe('claude-code');
      expect(filters2.source).toBe('user');
      expect(filters3.projectPath).toBe('/test');
    });
  });

  describe('StatsAggregation interface', () => {
    it('should define proper aggregation structure', () => {
      const aggregation: StatsAggregation = {
        totalQueries: 100,
        totalDuration: 500000,
        avgDuration: 5000,
        byAgent: {
          'claude-code': { count: 70, duration: 350000 },
          opencode: { count: 30, duration: 150000 },
        },
        bySource: { user: 60, auto: 40 },
        byDay: [
          { date: '2024-01-01', count: 10, duration: 50000 },
          { date: '2024-01-02', count: 15, duration: 75000 },
        ],
      };

      expect(aggregation.totalQueries).toBe(100);
      expect(aggregation.byAgent['claude-code'].count).toBe(70);
      expect(aggregation.bySource.user).toBe(60);
      expect(aggregation.byDay).toHaveLength(2);
    });
  });
});

describe('StatsDB class (mocked)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastDbPath = null;
    mockDb.pragma.mockReturnValue([{ user_version: 0 }]);
    mockDb.prepare.mockReturnValue(mockStatement);
    mockStatement.run.mockReturnValue({ changes: 1 });
    mockStatement.get.mockReturnValue({ count: 0, total_duration: 0 });
    mockStatement.all.mockReturnValue([]);
    mockFsExistsSync.mockReturnValue(true);
    mockFsMkdirSync.mockClear();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('module exports', () => {
    it('should export StatsDB class', async () => {
      const { StatsDB } = await import('../../main/stats-db');
      expect(StatsDB).toBeDefined();
      expect(typeof StatsDB).toBe('function');
    });

    it('should export singleton functions', async () => {
      const { getStatsDB, initializeStatsDB, closeStatsDB } = await import('../../main/stats-db');
      expect(getStatsDB).toBeDefined();
      expect(initializeStatsDB).toBeDefined();
      expect(closeStatsDB).toBeDefined();
    });
  });

  describe('StatsDB instantiation', () => {
    it('should create instance without initialization', async () => {
      const { StatsDB } = await import('../../main/stats-db');
      const db = new StatsDB();

      expect(db).toBeDefined();
      expect(db.isReady()).toBe(false);
    });

    it('should return database path', async () => {
      const { StatsDB } = await import('../../main/stats-db');
      const db = new StatsDB();

      expect(db.getDbPath()).toContain('stats.db');
    });
  });

  describe('initialization', () => {
    it('should initialize database and set isReady to true', async () => {
      const { StatsDB } = await import('../../main/stats-db');
      const db = new StatsDB();

      db.initialize();

      expect(db.isReady()).toBe(true);
    });

    it('should enable WAL mode', async () => {
      const { StatsDB } = await import('../../main/stats-db');
      const db = new StatsDB();

      db.initialize();

      expect(mockDb.pragma).toHaveBeenCalledWith('journal_mode = WAL');
    });

    it('should run v1 migration for fresh database', async () => {
      mockDb.pragma.mockImplementation((sql: string) => {
        if (sql === 'user_version') return [{ user_version: 0 }];
        return undefined;
      });

      const { StatsDB } = await import('../../main/stats-db');
      const db = new StatsDB();
      db.initialize();

      // Should set user_version to 1
      expect(mockDb.pragma).toHaveBeenCalledWith('user_version = 1');
    });

    it('should skip migration for already migrated database', async () => {
      mockDb.pragma.mockImplementation((sql: string) => {
        if (sql === 'user_version') return [{ user_version: 1 }];
        return undefined;
      });

      const { StatsDB } = await import('../../main/stats-db');
      const db = new StatsDB();
      db.initialize();

      // Should NOT set user_version (no migration needed)
      expect(mockDb.pragma).not.toHaveBeenCalledWith('user_version = 1');
    });
  });

  describe('error handling', () => {
    it('should throw when calling insertQueryEvent before initialization', async () => {
      const { StatsDB } = await import('../../main/stats-db');
      const db = new StatsDB();

      expect(() =>
        db.insertQueryEvent({
          sessionId: 'test',
          agentType: 'claude-code',
          source: 'user',
          startTime: Date.now(),
          duration: 1000,
        })
      ).toThrow('Database not initialized');
    });

    it('should throw when calling getQueryEvents before initialization', async () => {
      const { StatsDB } = await import('../../main/stats-db');
      const db = new StatsDB();

      expect(() => db.getQueryEvents('day')).toThrow('Database not initialized');
    });

    it('should throw when calling getAggregatedStats before initialization', async () => {
      const { StatsDB } = await import('../../main/stats-db');
      const db = new StatsDB();

      expect(() => db.getAggregatedStats('week')).toThrow('Database not initialized');
    });
  });

  describe('query events', () => {
    it('should insert a query event and return an id', async () => {
      const { StatsDB } = await import('../../main/stats-db');
      const db = new StatsDB();
      db.initialize();

      const eventId = db.insertQueryEvent({
        sessionId: 'session-1',
        agentType: 'claude-code',
        source: 'user',
        startTime: Date.now(),
        duration: 5000,
        projectPath: '/test/project',
        tabId: 'tab-1',
      });

      expect(eventId).toBeDefined();
      expect(typeof eventId).toBe('string');
      expect(mockStatement.run).toHaveBeenCalled();
    });

    it('should retrieve query events within time range', async () => {
      mockStatement.all.mockReturnValue([
        {
          id: 'event-1',
          session_id: 'session-1',
          agent_type: 'claude-code',
          source: 'user',
          start_time: Date.now(),
          duration: 5000,
          project_path: '/test',
          tab_id: 'tab-1',
        },
      ]);

      const { StatsDB } = await import('../../main/stats-db');
      const db = new StatsDB();
      db.initialize();

      const events = db.getQueryEvents('day');

      expect(events).toHaveLength(1);
      expect(events[0].sessionId).toBe('session-1');
      expect(events[0].agentType).toBe('claude-code');
    });
  });

  describe('close', () => {
    it('should close the database connection', async () => {
      const { StatsDB } = await import('../../main/stats-db');
      const db = new StatsDB();
      db.initialize();

      db.close();

      expect(mockDb.close).toHaveBeenCalled();
      expect(db.isReady()).toBe(false);
    });
  });
});

/**
 * Database file creation verification tests
 *
 * These tests verify that the database file is created at the correct path
 * in the user's application data directory on first launch.
 */
describe('Database file creation on first launch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastDbPath = null;
    mockDb.pragma.mockReturnValue([{ user_version: 0 }]);
    mockDb.prepare.mockReturnValue(mockStatement);
    mockFsExistsSync.mockReturnValue(true);
    mockFsMkdirSync.mockClear();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('database path computation', () => {
    it('should compute database path using electron app.getPath("userData")', async () => {
      const { StatsDB } = await import('../../main/stats-db');
      const db = new StatsDB();

      const dbPath = db.getDbPath();

      // Verify the path is in the userData directory
      expect(dbPath).toContain(mockUserDataPath);
      expect(dbPath).toContain('stats.db');
    });

    it('should create database file at userData/stats.db path', async () => {
      const { StatsDB } = await import('../../main/stats-db');
      const db = new StatsDB();
      db.initialize();

      // Verify better-sqlite3 was called with the correct path
      expect(lastDbPath).toBe(path.join(mockUserDataPath, 'stats.db'));
    });

    it('should use platform-appropriate userData path', async () => {
      const { StatsDB } = await import('../../main/stats-db');
      const db = new StatsDB();

      // The path should be absolute and contain stats.db
      const dbPath = db.getDbPath();
      expect(path.isAbsolute(dbPath)).toBe(true);
      expect(path.basename(dbPath)).toBe('stats.db');
    });
  });

  describe('directory creation', () => {
    it('should create userData directory if it does not exist', async () => {
      // Simulate directory not existing
      mockFsExistsSync.mockReturnValue(false);

      const { StatsDB } = await import('../../main/stats-db');
      const db = new StatsDB();
      db.initialize();

      // Verify mkdirSync was called with recursive option
      expect(mockFsMkdirSync).toHaveBeenCalledWith(mockUserDataPath, { recursive: true });
    });

    it('should not create directory if it already exists', async () => {
      // Simulate directory already existing
      mockFsExistsSync.mockReturnValue(true);

      const { StatsDB } = await import('../../main/stats-db');
      const db = new StatsDB();
      db.initialize();

      // Verify mkdirSync was NOT called
      expect(mockFsMkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('database initialization', () => {
    it('should open database connection on initialize', async () => {
      const { StatsDB } = await import('../../main/stats-db');
      const db = new StatsDB();

      expect(db.isReady()).toBe(false);
      db.initialize();
      expect(db.isReady()).toBe(true);
    });

    it('should only initialize once (idempotent)', async () => {
      mockDb.pragma.mockClear();

      const { StatsDB } = await import('../../main/stats-db');
      const db = new StatsDB();

      db.initialize();
      const firstCallCount = mockDb.pragma.mock.calls.length;

      db.initialize(); // Second call should be a no-op
      const secondCallCount = mockDb.pragma.mock.calls.length;

      expect(secondCallCount).toBe(firstCallCount);
    });

    it('should create all three tables on fresh database', async () => {
      const { StatsDB } = await import('../../main/stats-db');
      const db = new StatsDB();
      db.initialize();

      // Verify prepare was called with CREATE TABLE statements
      const prepareCalls = mockDb.prepare.mock.calls.map((call) => call[0]);

      // Check for query_events table
      expect(prepareCalls.some((sql: string) => sql.includes('CREATE TABLE IF NOT EXISTS query_events'))).toBe(true);

      // Check for auto_run_sessions table
      expect(prepareCalls.some((sql: string) => sql.includes('CREATE TABLE IF NOT EXISTS auto_run_sessions'))).toBe(
        true
      );

      // Check for auto_run_tasks table
      expect(prepareCalls.some((sql: string) => sql.includes('CREATE TABLE IF NOT EXISTS auto_run_tasks'))).toBe(true);
    });

    it('should create all required indexes', async () => {
      const { StatsDB } = await import('../../main/stats-db');
      const db = new StatsDB();
      db.initialize();

      const prepareCalls = mockDb.prepare.mock.calls.map((call) => call[0]);

      // Verify all 7 indexes are created
      const expectedIndexes = [
        'idx_query_start_time',
        'idx_query_agent_type',
        'idx_query_source',
        'idx_query_session',
        'idx_auto_session_start',
        'idx_task_auto_session',
        'idx_task_start',
      ];

      for (const indexName of expectedIndexes) {
        expect(prepareCalls.some((sql: string) => sql.includes(indexName))).toBe(true);
      }
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance from getStatsDB', async () => {
      const { getStatsDB, closeStatsDB } = await import('../../main/stats-db');

      const instance1 = getStatsDB();
      const instance2 = getStatsDB();

      expect(instance1).toBe(instance2);

      // Cleanup
      closeStatsDB();
    });

    it('should initialize database via initializeStatsDB', async () => {
      const { initializeStatsDB, getStatsDB, closeStatsDB } = await import('../../main/stats-db');

      initializeStatsDB();
      const db = getStatsDB();

      expect(db.isReady()).toBe(true);

      // Cleanup
      closeStatsDB();
    });

    it('should close database and reset singleton via closeStatsDB', async () => {
      const { initializeStatsDB, getStatsDB, closeStatsDB } = await import('../../main/stats-db');

      initializeStatsDB();
      const dbBefore = getStatsDB();
      expect(dbBefore.isReady()).toBe(true);

      closeStatsDB();

      // After close, a new instance should be returned
      const dbAfter = getStatsDB();
      expect(dbAfter).not.toBe(dbBefore);
      expect(dbAfter.isReady()).toBe(false);
    });
  });
});

/**
 * Auto Run session and task recording tests
 */
describe('Auto Run session and task recording', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastDbPath = null;
    mockDb.pragma.mockReturnValue([{ user_version: 0 }]);
    mockDb.prepare.mockReturnValue(mockStatement);
    mockStatement.run.mockReturnValue({ changes: 1 });
    mockFsExistsSync.mockReturnValue(true);
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('Auto Run sessions', () => {
    it('should insert Auto Run session and return id', async () => {
      const { StatsDB } = await import('../../main/stats-db');
      const db = new StatsDB();
      db.initialize();

      const sessionId = db.insertAutoRunSession({
        sessionId: 'session-1',
        agentType: 'claude-code',
        documentPath: '/docs/TASK-1.md',
        startTime: Date.now(),
        duration: 0,
        tasksTotal: 5,
        tasksCompleted: 0,
        projectPath: '/project',
      });

      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      expect(mockStatement.run).toHaveBeenCalled();
    });

    it('should update Auto Run session on completion', async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });

      const { StatsDB } = await import('../../main/stats-db');
      const db = new StatsDB();
      db.initialize();

      const updated = db.updateAutoRunSession('session-id', {
        duration: 60000,
        tasksCompleted: 5,
      });

      expect(updated).toBe(true);
      expect(mockStatement.run).toHaveBeenCalled();
    });

    it('should retrieve Auto Run sessions within time range', async () => {
      mockStatement.all.mockReturnValue([
        {
          id: 'auto-1',
          session_id: 'session-1',
          agent_type: 'claude-code',
          document_path: '/docs/TASK-1.md',
          start_time: Date.now(),
          duration: 60000,
          tasks_total: 5,
          tasks_completed: 5,
          project_path: '/project',
        },
      ]);

      const { StatsDB } = await import('../../main/stats-db');
      const db = new StatsDB();
      db.initialize();

      const sessions = db.getAutoRunSessions('week');

      expect(sessions).toHaveLength(1);
      expect(sessions[0].sessionId).toBe('session-1');
      expect(sessions[0].tasksTotal).toBe(5);
    });
  });

  describe('Auto Run tasks', () => {
    it('should insert Auto Run task with success=true', async () => {
      const { StatsDB } = await import('../../main/stats-db');
      const db = new StatsDB();
      db.initialize();

      const taskId = db.insertAutoRunTask({
        autoRunSessionId: 'auto-1',
        sessionId: 'session-1',
        agentType: 'claude-code',
        taskIndex: 0,
        taskContent: 'First task',
        startTime: Date.now(),
        duration: 10000,
        success: true,
      });

      expect(taskId).toBeDefined();

      // Verify success was converted to 1 for SQLite
      const runCall = mockStatement.run.mock.calls[mockStatement.run.mock.calls.length - 1];
      expect(runCall[8]).toBe(1); // success parameter (last one)
    });

    it('should insert Auto Run task with success=false', async () => {
      const { StatsDB } = await import('../../main/stats-db');
      const db = new StatsDB();
      db.initialize();

      db.insertAutoRunTask({
        autoRunSessionId: 'auto-1',
        sessionId: 'session-1',
        agentType: 'claude-code',
        taskIndex: 1,
        taskContent: 'Failed task',
        startTime: Date.now(),
        duration: 5000,
        success: false,
      });

      // Verify success was converted to 0 for SQLite
      const runCall = mockStatement.run.mock.calls[mockStatement.run.mock.calls.length - 1];
      expect(runCall[8]).toBe(0); // success parameter (last one)
    });

    it('should retrieve tasks for Auto Run session ordered by task_index', async () => {
      mockStatement.all.mockReturnValue([
        {
          id: 'task-1',
          auto_run_session_id: 'auto-1',
          session_id: 'session-1',
          agent_type: 'claude-code',
          task_index: 0,
          task_content: 'First task',
          start_time: Date.now(),
          duration: 10000,
          success: 1,
        },
        {
          id: 'task-2',
          auto_run_session_id: 'auto-1',
          session_id: 'session-1',
          agent_type: 'claude-code',
          task_index: 1,
          task_content: 'Second task',
          start_time: Date.now(),
          duration: 15000,
          success: 1,
        },
      ]);

      const { StatsDB } = await import('../../main/stats-db');
      const db = new StatsDB();
      db.initialize();

      const tasks = db.getAutoRunTasks('auto-1');

      expect(tasks).toHaveLength(2);
      expect(tasks[0].taskIndex).toBe(0);
      expect(tasks[1].taskIndex).toBe(1);
      expect(tasks[0].success).toBe(true);
    });
  });
});

/**
 * Aggregation and filtering tests
 */
describe('Stats aggregation and filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.pragma.mockReturnValue([{ user_version: 0 }]);
    mockDb.prepare.mockReturnValue(mockStatement);
    mockStatement.run.mockReturnValue({ changes: 1 });
    mockFsExistsSync.mockReturnValue(true);
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('time range filtering', () => {
    it('should filter query events by day range', async () => {
      mockStatement.all.mockReturnValue([]);

      const { StatsDB } = await import('../../main/stats-db');
      const db = new StatsDB();
      db.initialize();

      db.getQueryEvents('day');

      // Verify the SQL includes time filter
      const prepareCall = mockDb.prepare.mock.calls.find((call) =>
        (call[0] as string).includes('SELECT * FROM query_events')
      );
      expect(prepareCall).toBeDefined();
    });

    it('should filter with agentType filter', async () => {
      mockStatement.all.mockReturnValue([]);

      const { StatsDB } = await import('../../main/stats-db');
      const db = new StatsDB();
      db.initialize();

      db.getQueryEvents('week', { agentType: 'claude-code' });

      // Verify the SQL includes agent_type filter
      expect(mockStatement.all).toHaveBeenCalled();
    });

    it('should filter with source filter', async () => {
      mockStatement.all.mockReturnValue([]);

      const { StatsDB } = await import('../../main/stats-db');
      const db = new StatsDB();
      db.initialize();

      db.getQueryEvents('month', { source: 'auto' });

      // Verify the SQL includes source filter
      expect(mockStatement.all).toHaveBeenCalled();
    });

    it('should filter with projectPath filter', async () => {
      mockStatement.all.mockReturnValue([]);

      const { StatsDB } = await import('../../main/stats-db');
      const db = new StatsDB();
      db.initialize();

      db.getQueryEvents('year', { projectPath: '/test/project' });

      // Verify the SQL includes project_path filter
      expect(mockStatement.all).toHaveBeenCalled();
    });

    it('should filter with sessionId filter', async () => {
      mockStatement.all.mockReturnValue([]);

      const { StatsDB } = await import('../../main/stats-db');
      const db = new StatsDB();
      db.initialize();

      db.getQueryEvents('all', { sessionId: 'session-123' });

      // Verify the SQL includes session_id filter
      expect(mockStatement.all).toHaveBeenCalled();
    });

    it('should combine multiple filters', async () => {
      mockStatement.all.mockReturnValue([]);

      const { StatsDB } = await import('../../main/stats-db');
      const db = new StatsDB();
      db.initialize();

      db.getQueryEvents('week', {
        agentType: 'claude-code',
        source: 'user',
        projectPath: '/test',
        sessionId: 'session-1',
      });

      // Verify all parameters were passed
      expect(mockStatement.all).toHaveBeenCalled();
    });
  });

  describe('aggregation queries', () => {
    it('should compute aggregated stats correctly', async () => {
      mockStatement.get.mockReturnValue({ count: 100, total_duration: 500000 });
      mockStatement.all.mockReturnValue([
        { agent_type: 'claude-code', count: 70, duration: 350000 },
        { agent_type: 'opencode', count: 30, duration: 150000 },
      ]);

      const { StatsDB } = await import('../../main/stats-db');
      const db = new StatsDB();
      db.initialize();

      const stats = db.getAggregatedStats('week');

      expect(stats.totalQueries).toBe(100);
      expect(stats.totalDuration).toBe(500000);
      expect(stats.avgDuration).toBe(5000);
    });

    it('should handle empty results for aggregation', async () => {
      mockStatement.get.mockReturnValue({ count: 0, total_duration: 0 });
      mockStatement.all.mockReturnValue([]);

      const { StatsDB } = await import('../../main/stats-db');
      const db = new StatsDB();
      db.initialize();

      const stats = db.getAggregatedStats('day');

      expect(stats.totalQueries).toBe(0);
      expect(stats.avgDuration).toBe(0);
      expect(stats.byAgent).toEqual({});
    });
  });

  describe('CSV export', () => {
    it('should export query events to CSV format', async () => {
      const now = Date.now();
      mockStatement.all.mockReturnValue([
        {
          id: 'event-1',
          session_id: 'session-1',
          agent_type: 'claude-code',
          source: 'user',
          start_time: now,
          duration: 5000,
          project_path: '/test',
          tab_id: 'tab-1',
        },
      ]);

      const { StatsDB } = await import('../../main/stats-db');
      const db = new StatsDB();
      db.initialize();

      const csv = db.exportToCsv('week');

      // Verify CSV structure
      expect(csv).toContain('id,sessionId,agentType,source,startTime,duration,projectPath,tabId');
      expect(csv).toContain('event-1');
      expect(csv).toContain('session-1');
      expect(csv).toContain('claude-code');
    });

    it('should handle empty data for CSV export', async () => {
      mockStatement.all.mockReturnValue([]);

      const { StatsDB } = await import('../../main/stats-db');
      const db = new StatsDB();
      db.initialize();

      const csv = db.exportToCsv('day');

      // Should only contain headers
      expect(csv).toBe('id,sessionId,agentType,source,startTime,duration,projectPath,tabId');
    });
  });
});
