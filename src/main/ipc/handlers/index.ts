/**
 * IPC Handler Registration Module
 *
 * This module consolidates all IPC handler registrations, extracted from the main index.ts
 * to improve code organization and maintainability.
 *
 * Each handler module exports a register function that sets up the relevant ipcMain.handle calls.
 */

import { BrowserWindow, App } from 'electron';
import Store from 'electron-store';
import { registerGitHandlers } from './git';
import { registerAutorunHandlers } from './autorun';
import { registerPlaybooksHandlers } from './playbooks';
import { registerHistoryHandlers, HistoryHandlerDependencies } from './history';
import { HistoryEntry } from '../../../shared/types';

// Re-export individual handlers for selective registration
export { registerGitHandlers };
export { registerAutorunHandlers };
export { registerPlaybooksHandlers };
export { registerHistoryHandlers };
export type { HistoryHandlerDependencies };

/**
 * Interface for history store data (matches main/index.ts definition)
 */
interface HistoryData {
  entries: HistoryEntry[];
}

/**
 * Dependencies required for handler registration
 */
export interface HandlerDependencies {
  mainWindow: BrowserWindow | null;
  getMainWindow: () => BrowserWindow | null;
  app: App;
  // History-specific dependencies
  historyStore: Store<HistoryData>;
  getHistoryNeedsReload: () => boolean;
  setHistoryNeedsReload: (value: boolean) => void;
}

/**
 * Register all IPC handlers.
 * Call this once during app initialization.
 */
export function registerAllHandlers(deps: HandlerDependencies): void {
  registerGitHandlers();
  registerAutorunHandlers(deps);
  registerPlaybooksHandlers(deps);
  registerHistoryHandlers({
    historyStore: deps.historyStore,
    getHistoryNeedsReload: deps.getHistoryNeedsReload,
    setHistoryNeedsReload: deps.setHistoryNeedsReload,
  });
  // Future handlers will be registered here:
  // registerAgentsHandlers();
  // registerProcessHandlers();
  // registerPersistenceHandlers();
  // registerSystemHandlers();
}
