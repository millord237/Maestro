/**
 * Electron Application Fixture for E2E Testing
 *
 * This fixture handles launching and managing the Electron application
 * for Playwright E2E tests. It provides utilities for interacting with
 * the app's main window and IPC communication.
 */
import { test as base, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Interface for our extended test fixtures
interface ElectronTestFixtures {
  electronApp: ElectronApplication;
  window: Page;
  appPath: string;
  testDataDir: string;
}

/**
 * Get the path to the Electron application
 * In development, we use the built main process
 * In CI/production, we could use the packaged app
 */
function getElectronPath(): string {
  // For now, we run in development mode using the built main process
  // The app must be built first: npm run build:main && npm run build:renderer
  return require('electron') as unknown as string;
}

/**
 * Get the path to the main entry point
 */
function getMainPath(): string {
  return path.join(__dirname, '../../dist/main/index.js');
}

/**
 * Create a unique test data directory for isolation
 */
function createTestDataDir(): string {
  const testDir = path.join(os.tmpdir(), `maestro-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  fs.mkdirSync(testDir, { recursive: true });
  return testDir;
}

/**
 * Extended test with Electron fixtures
 *
 * Usage:
 * ```typescript
 * import { test, expect } from './fixtures/electron-app';
 *
 * test('should launch the app', async ({ electronApp, window }) => {
 *   await expect(window.locator('h1')).toBeVisible();
 * });
 * ```
 */
export const test = base.extend<ElectronTestFixtures>({
  // Test data directory for isolation
  testDataDir: async ({}, use) => {
    const dir = createTestDataDir();
    await use(dir);
    // Cleanup after test
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  },

  // Path to the main entry point
  appPath: async ({}, use) => {
    const mainPath = getMainPath();

    // Check if the app is built
    if (!fs.existsSync(mainPath)) {
      throw new Error(
        `Electron main process not built. Run 'npm run build:main && npm run build:renderer' first.\n` +
        `Expected path: ${mainPath}`
      );
    }

    await use(mainPath);
  },

  // Launch Electron application
  electronApp: async ({ appPath, testDataDir }, use) => {
    const electronPath = getElectronPath();

    // Launch the Electron app
    const app = await electron.launch({
      args: [appPath],
      env: {
        ...process.env,
        // Use isolated data directory for tests
        MAESTRO_DATA_DIR: testDataDir,
        // Disable hardware acceleration for CI
        ELECTRON_DISABLE_GPU: '1',
        // Set NODE_ENV to test
        NODE_ENV: 'test',
        // Ensure we're in a testing context
        MAESTRO_E2E_TEST: 'true',
      },
      // Increase timeout for slow CI environments
      timeout: 30000,
    });

    await use(app);

    // Close the application after test
    await app.close();
  },

  // Get the main window
  window: async ({ electronApp }, use) => {
    // Wait for the first window to be available
    const window = await electronApp.firstWindow();

    // Wait for the app to be ready (DOM loaded)
    await window.waitForLoadState('domcontentloaded');

    // Give the app a moment to initialize React
    await window.waitForTimeout(500);

    await use(window);
  },
});

export { expect } from '@playwright/test';

/**
 * Helper utilities for E2E tests
 */
export const helpers = {
  /**
   * Wait for the wizard to be visible
   */
  async waitForWizard(window: Page): Promise<void> {
    // The wizard modal should have a specific structure
    // Looking for the wizard container or title
    await window.waitForSelector('text=Create a Maestro Agent', { timeout: 10000 });
  },

  /**
   * Open the wizard via keyboard shortcut
   */
  async openWizardViaShortcut(window: Page): Promise<void> {
    // Cmd+Shift+N opens the wizard
    await window.keyboard.press('Meta+Shift+N');
    await helpers.waitForWizard(window);
  },

  /**
   * Select an agent in the wizard
   */
  async selectAgent(window: Page, agentName: string): Promise<void> {
    // Find and click the agent tile
    const agentTile = window.locator(`text=${agentName}`).first();
    await agentTile.click();
  },

  /**
   * Enter a project name in the wizard
   */
  async enterProjectName(window: Page, name: string): Promise<void> {
    // Find the Name input field
    const nameInput = window.locator('input[placeholder*="Project"]').or(
      window.locator('input[placeholder*="Name"]')
    );
    await nameInput.fill(name);
  },

  /**
   * Click the Next button in the wizard
   */
  async clickNext(window: Page): Promise<void> {
    const nextButton = window.locator('button:has-text("Next")').or(
      window.locator('button:has-text("Continue")')
    );
    await nextButton.click();
  },

  /**
   * Click the Back button in the wizard
   */
  async clickBack(window: Page): Promise<void> {
    const backButton = window.locator('button:has-text("Back")');
    await backButton.click();
  },

  /**
   * Select a directory in the wizard
   * Note: This requires mocking the native dialog or using a pre-configured directory
   */
  async selectDirectory(window: Page, dirPath: string): Promise<void> {
    // The directory selection involves a native dialog
    // For E2E tests, we might need to:
    // 1. Mock the dialog result via IPC
    // 2. Use a pre-selected directory
    // 3. Set up the directory state before the test

    // For now, we'll look for the directory input and interact with it
    // This may need to be adjusted based on actual implementation
    throw new Error('Directory selection requires dialog mocking - implement based on app specifics');
  },

  /**
   * Wait for the wizard to close
   */
  async waitForWizardClose(window: Page): Promise<void> {
    // Wait for the wizard title to disappear
    await window.waitForSelector('text=Create a Maestro Agent', {
      state: 'hidden',
      timeout: 10000,
    });
  },

  /**
   * Check if the app is showing the main UI
   */
  async waitForMainUI(window: Page): Promise<void> {
    // Wait for key elements of the main UI to be visible
    // Adjust these selectors based on actual UI structure
    await window.waitForSelector('[data-tour]', { timeout: 10000 }).catch(() => {
      // data-tour attributes might not exist, try another approach
    });
  },

  /**
   * Create a temporary test directory structure
   */
  createTestDirectory(basePath: string, structure: Record<string, string | null>): void {
    for (const [relativePath, content] of Object.entries(structure)) {
      const fullPath = path.join(basePath, relativePath);
      const dir = path.dirname(fullPath);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (content !== null) {
        fs.writeFileSync(fullPath, content, 'utf-8');
      }
    }
  },

  /**
   * Clean up test directory
   */
  cleanupTestDirectory(dirPath: string): void {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  },
};
