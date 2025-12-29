import { ipcMain, BrowserWindow, App } from 'electron';
import chokidar, { FSWatcher } from 'chokidar';
import { logger } from '../../utils/logger';
import { createIpcHandler, CreateHandlerOptions } from '../../utils/ipcHandler';

const LOG_CONTEXT = '[DocumentGraph]';

// Helper to create handler options with consistent context
const handlerOpts = (operation: string, logSuccess = true): CreateHandlerOptions => ({
  context: LOG_CONTEXT,
  operation,
  logSuccess,
});

// State managed by this module
const documentGraphWatchers = new Map<string, FSWatcher>();

// Debounce state per root path to prevent rapid event flooding
const debounceTimers = new Map<string, NodeJS.Timeout>();
const pendingEvents = new Map<string, Map<string, 'add' | 'change' | 'unlink'>>();

/** Debounce delay for markdown file changes (ms) */
const DEBOUNCE_DELAY = 500;

/**
 * Dependencies required for document graph handler registration
 */
export interface DocumentGraphHandlerDependencies {
  getMainWindow: () => BrowserWindow | null;
  app: App;
}

/**
 * Register Document Graph-related IPC handlers.
 *
 * These handlers provide file watching for the document graph:
 * - Watch a directory for markdown file changes
 * - Stop watching a directory
 * - Debounced notifications to prevent UI thrashing
 */
export function registerDocumentGraphHandlers(deps: DocumentGraphHandlerDependencies): void {
  const { getMainWindow, app } = deps;

  /**
   * Process pending events for a root path and send to renderer
   */
  const processPendingEvents = (rootPath: string) => {
    const events = pendingEvents.get(rootPath);
    if (!events || events.size === 0) return;

    const mainWindow = getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) {
      events.clear();
      return;
    }

    // Convert Map to array of file change events
    const changes: Array<{ filePath: string; eventType: 'add' | 'change' | 'unlink' }> = [];
    for (const [filePath, eventType] of events) {
      changes.push({ filePath, eventType });
    }

    // Send batched changes to renderer
    mainWindow.webContents.send('documentGraph:filesChanged', {
      rootPath,
      changes,
    });

    logger.info(`Document graph files changed: ${changes.length} file(s) in ${rootPath}`, LOG_CONTEXT);
    events.clear();
  };

  /**
   * Queue an event for debounced processing
   */
  const queueEvent = (rootPath: string, filePath: string, eventType: 'add' | 'change' | 'unlink') => {
    // Initialize pending events map for this root if needed
    if (!pendingEvents.has(rootPath)) {
      pendingEvents.set(rootPath, new Map());
    }
    const events = pendingEvents.get(rootPath)!;

    // For the same file, update the event type (e.g., add->change becomes change)
    events.set(filePath, eventType);

    // Clear existing debounce timer
    const existingTimer = debounceTimers.get(rootPath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new debounce timer
    const timer = setTimeout(() => {
      debounceTimers.delete(rootPath);
      processPendingEvents(rootPath);
    }, DEBOUNCE_DELAY);

    debounceTimers.set(rootPath, timer);
  };

  // Start watching a directory for markdown file changes
  ipcMain.handle(
    'documentGraph:watchFolder',
    createIpcHandler(handlerOpts('watchFolder'), async (rootPath: string) => {
      // Stop any existing watcher for this path
      if (documentGraphWatchers.has(rootPath)) {
        const existingWatcher = documentGraphWatchers.get(rootPath);
        await existingWatcher?.close();
        documentGraphWatchers.delete(rootPath);
        logger.info(`Closed existing document graph watcher for: ${rootPath}`, LOG_CONTEXT);
      }

      // Clear any pending debounce timers
      const existingTimer = debounceTimers.get(rootPath);
      if (existingTimer) {
        clearTimeout(existingTimer);
        debounceTimers.delete(rootPath);
      }
      pendingEvents.delete(rootPath);

      // Create file watcher using chokidar (cross-platform)
      const watcher = chokidar.watch(rootPath, {
        ignored: [
          /(^|[/\\])\../, // Ignore dotfiles
          /node_modules/,
          /dist/,
          /build/,
          /\.git/,
        ],
        persistent: true,
        ignoreInitial: true, // Don't emit events for existing files on startup
        depth: 99, // Recursive watching
      });

      // Handler for file changes - only care about .md files
      const handleFileChange = (eventType: 'add' | 'change' | 'unlink') => (filePath: string) => {
        // Only care about markdown files
        if (!filePath.toLowerCase().endsWith('.md')) {
          return;
        }

        queueEvent(rootPath, filePath, eventType);
      };

      watcher.on('add', handleFileChange('add'));
      watcher.on('change', handleFileChange('change'));
      watcher.on('unlink', handleFileChange('unlink'));

      watcher.on('error', (error) => {
        logger.error(`Document graph watcher error for ${rootPath}`, LOG_CONTEXT, error);
      });

      documentGraphWatchers.set(rootPath, watcher);
      logger.info(`Started watching document graph folder: ${rootPath}`, LOG_CONTEXT);

      return {};
    })
  );

  // Stop watching a directory
  ipcMain.handle(
    'documentGraph:unwatchFolder',
    createIpcHandler(handlerOpts('unwatchFolder', false), async (rootPath: string) => {
      if (documentGraphWatchers.has(rootPath)) {
        const watcher = documentGraphWatchers.get(rootPath);
        await watcher?.close();
        documentGraphWatchers.delete(rootPath);

        // Clear any pending debounce timers
        const existingTimer = debounceTimers.get(rootPath);
        if (existingTimer) {
          clearTimeout(existingTimer);
          debounceTimers.delete(rootPath);
        }
        pendingEvents.delete(rootPath);

        logger.info(`Stopped watching document graph folder: ${rootPath}`, LOG_CONTEXT);
      }
      return {};
    })
  );

  // Clean up all watchers on app quit
  app.on('before-quit', () => {
    for (const [rootPath, watcher] of documentGraphWatchers) {
      watcher.close();
      logger.info(`Cleaned up document graph watcher for: ${rootPath}`, LOG_CONTEXT);
    }
    documentGraphWatchers.clear();

    // Clear all debounce timers
    for (const timer of debounceTimers.values()) {
      clearTimeout(timer);
    }
    debounceTimers.clear();
    pendingEvents.clear();
  });

  logger.debug(`${LOG_CONTEXT} Document Graph IPC handlers registered`);
}

/**
 * Get the current number of active watchers (for testing/debugging)
 */
export function getDocumentGraphWatcherCount(): number {
  return documentGraphWatchers.size;
}
