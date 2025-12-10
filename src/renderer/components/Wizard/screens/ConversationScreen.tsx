/**
 * ConversationScreen.tsx
 *
 * Third screen of the onboarding wizard - AI-driven conversation
 * for project discovery with confidence meter and structured output parsing.
 *
 * TODO: Full implementation pending - this is a placeholder for module compilation.
 */

import type { Theme } from '../../../types';

interface ConversationScreenProps {
  theme: Theme;
}

/**
 * ConversationScreen - Project discovery conversation
 *
 * Features (to be implemented):
 * - AI Terminal-like interface for familiarity
 * - Confidence progress bar (0-100%, red to yellow to green)
 * - Conversation display area
 * - Input field for user responses
 * - "Let's get started!" button when ready=true and confidence>80
 * - Structured output parsing (confidence, ready, message)
 */
export function ConversationScreen({ theme }: ConversationScreenProps): JSX.Element {
  return (
    <div
      className="flex flex-col items-center justify-center h-full p-8"
      style={{ color: theme.colors.textMain }}
    >
      <div
        className="text-6xl mb-4"
        style={{ color: theme.colors.accent }}
      >
        3
      </div>
      <h3 className="text-xl font-semibold mb-2">Project Discovery</h3>
      <p className="text-sm opacity-60" style={{ color: theme.colors.textDim }}>
        This screen will guide you through a conversation to understand your project.
      </p>
      <p className="text-xs mt-4 opacity-40" style={{ color: theme.colors.textDim }}>
        Implementation pending - see screens/ConversationScreen.tsx task
      </p>
    </div>
  );
}
