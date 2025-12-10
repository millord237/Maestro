/**
 * DirectorySelectionScreen.tsx
 *
 * Second screen of the onboarding wizard - allows users to select
 * a project directory with browse functionality and Git repo detection.
 *
 * TODO: Full implementation pending - this is a placeholder for module compilation.
 */

import type { Theme } from '../../../types';

interface DirectorySelectionScreenProps {
  theme: Theme;
}

/**
 * DirectorySelectionScreen - Project directory selection
 *
 * Features (to be implemented):
 * - Directory path input field
 * - Browse button (native folder picker via window.maestro.dialog.selectFolder())
 * - Auto-detection of agent path
 * - Git repo indicator
 * - Keyboard support (Tab, Enter, Escape)
 */
export function DirectorySelectionScreen({ theme }: DirectorySelectionScreenProps): JSX.Element {
  return (
    <div
      className="flex flex-col items-center justify-center h-full p-8"
      style={{ color: theme.colors.textMain }}
    >
      <div
        className="text-6xl mb-4"
        style={{ color: theme.colors.accent }}
      >
        2
      </div>
      <h3 className="text-xl font-semibold mb-2">Directory Selection</h3>
      <p className="text-sm opacity-60" style={{ color: theme.colors.textDim }}>
        This screen will allow you to choose your project directory.
      </p>
      <p className="text-xs mt-4 opacity-40" style={{ color: theme.colors.textDim }}>
        Implementation pending - see screens/DirectorySelectionScreen.tsx task
      </p>
    </div>
  );
}
