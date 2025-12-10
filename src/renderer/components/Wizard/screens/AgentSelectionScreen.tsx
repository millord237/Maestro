/**
 * AgentSelectionScreen.tsx
 *
 * First screen of the onboarding wizard - displays available AI agents
 * in a tiled grid layout with agent logos. Users can select an agent
 * and optionally provide a project name.
 *
 * TODO: Full implementation pending - this is a placeholder for module compilation.
 */

import type { Theme } from '../../../types';

interface AgentSelectionScreenProps {
  theme: Theme;
}

/**
 * AgentSelectionScreen - Agent selection with tiled grid view
 *
 * Features (to be implemented):
 * - Tiled grid view of agent logos (Claude Code highlighted, others ghosted)
 * - Optional Name field with placeholder "My Project"
 * - Keyboard navigation (arrow keys, Tab, Enter)
 */
export function AgentSelectionScreen({ theme }: AgentSelectionScreenProps): JSX.Element {
  return (
    <div
      className="flex flex-col items-center justify-center h-full p-8"
      style={{ color: theme.colors.textMain }}
    >
      <div
        className="text-6xl mb-4"
        style={{ color: theme.colors.accent }}
      >
        1
      </div>
      <h3 className="text-xl font-semibold mb-2">Agent Selection</h3>
      <p className="text-sm opacity-60" style={{ color: theme.colors.textDim }}>
        This screen will display available AI agents for selection.
      </p>
      <p className="text-xs mt-4 opacity-40" style={{ color: theme.colors.textDim }}>
        Implementation pending - see screens/AgentSelectionScreen.tsx task
      </p>
    </div>
  );
}
