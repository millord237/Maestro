/**
 * PhaseReviewScreen.tsx
 *
 * Fourth screen of the onboarding wizard - displays the Phase 1 document
 * with markdown editor, preview mode, and launch options.
 *
 * TODO: Full implementation pending - this is a placeholder for module compilation.
 */

import type { Theme } from '../../../types';

interface PhaseReviewScreenProps {
  theme: Theme;
}

/**
 * PhaseReviewScreen - Phase 1 document review and launch
 *
 * Features (to be implemented):
 * - Full-width markdown editor (same as Auto Run editor)
 * - Edit/Preview toggle matching Auto Run style
 * - Image attachment support
 * - Task count display
 * - "I'm Ready to Go" primary button
 * - "I'm Ready, But Walk Me Through the Interface" secondary button
 */
export function PhaseReviewScreen({ theme }: PhaseReviewScreenProps): JSX.Element {
  return (
    <div
      className="flex flex-col items-center justify-center h-full p-8"
      style={{ color: theme.colors.textMain }}
    >
      <div
        className="text-6xl mb-4"
        style={{ color: theme.colors.accent }}
      >
        4
      </div>
      <h3 className="text-xl font-semibold mb-2">Review Your Action Plan</h3>
      <p className="text-sm opacity-60" style={{ color: theme.colors.textDim }}>
        This screen will show your generated Phase 1 document for review.
      </p>
      <p className="text-xs mt-4 opacity-40" style={{ color: theme.colors.textDim }}>
        Implementation pending - see screens/PhaseReviewScreen.tsx task
      </p>
    </div>
  );
}
