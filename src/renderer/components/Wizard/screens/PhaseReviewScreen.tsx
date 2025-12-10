/**
 * PhaseReviewScreen.tsx
 *
 * Fourth screen of the onboarding wizard - displays the Phase 1 document
 * with markdown editor, preview mode, and launch options.
 *
 * Features:
 * - Loading state during document generation with "Creating your action plan..."
 * - Error handling with retry option
 * - Phase 1 document preview placeholder (full editor to be implemented)
 * - Task count display
 * - "I'm Ready to Go" and "Walk Me Through" buttons (placeholder)
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import type { Theme } from '../../../types';
import { useWizard } from '../WizardContext';
import { phaseGenerator, AUTO_RUN_FOLDER_NAME } from '../services/phaseGenerator';

interface PhaseReviewScreenProps {
  theme: Theme;
}

/**
 * Loading indicator with animated spinner and message
 */
function LoadingIndicator({
  message,
  theme,
}: {
  message: string;
  theme: Theme;
}): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      {/* Animated spinner */}
      <div className="relative mb-6">
        <div
          className="w-16 h-16 rounded-full border-4 border-t-transparent animate-spin"
          style={{
            borderColor: `${theme.colors.border}`,
            borderTopColor: theme.colors.accent,
          }}
        />
        {/* Inner pulsing circle */}
        <div
          className="absolute inset-0 flex items-center justify-center"
        >
          <div
            className="w-8 h-8 rounded-full animate-pulse"
            style={{ backgroundColor: `${theme.colors.accent}30` }}
          />
        </div>
      </div>

      {/* Message */}
      <h3
        className="text-xl font-semibold mb-2 text-center"
        style={{ color: theme.colors.textMain }}
      >
        {message}
      </h3>

      {/* Subtitle */}
      <p
        className="text-sm text-center max-w-md"
        style={{ color: theme.colors.textDim }}
      >
        This may take a minute or two. We're creating detailed task documents based on your project requirements.
      </p>

      {/* Animated dots */}
      <div className="flex items-center gap-1 mt-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full animate-bounce"
            style={{
              backgroundColor: theme.colors.accent,
              animationDelay: `${i * 150}ms`,
            }}
          />
        ))}
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
        }
        .animate-bounce {
          animation: bounce 0.8s infinite;
        }
      `}</style>
    </div>
  );
}

/**
 * Error display with retry option
 */
function ErrorDisplay({
  error,
  onRetry,
  onSkip,
  theme,
}: {
  error: string;
  onRetry: () => void;
  onSkip: () => void;
  theme: Theme;
}): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      {/* Error icon */}
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
        style={{ backgroundColor: `${theme.colors.error}20` }}
      >
        <svg
          className="w-8 h-8"
          fill="none"
          stroke={theme.colors.error}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      {/* Error message */}
      <h3
        className="text-xl font-semibold mb-2 text-center"
        style={{ color: theme.colors.textMain }}
      >
        Generation Failed
      </h3>
      <p
        className="text-sm text-center max-w-md mb-6"
        style={{ color: theme.colors.error }}
      >
        {error}
      </p>

      {/* Action buttons */}
      <div className="flex items-center gap-4">
        <button
          onClick={onRetry}
          className="px-6 py-2.5 rounded-lg font-medium transition-all hover:scale-105"
          style={{
            backgroundColor: theme.colors.accent,
            color: theme.colors.accentForeground,
          }}
        >
          Try Again
        </button>
        <button
          onClick={onSkip}
          className="px-6 py-2.5 rounded-lg font-medium transition-colors"
          style={{
            backgroundColor: theme.colors.bgActivity,
            color: theme.colors.textDim,
          }}
        >
          Go Back
        </button>
      </div>
    </div>
  );
}

/**
 * Success display - shows generated documents summary
 * This is a placeholder until the full editor is implemented
 */
function GenerationSuccess({
  theme,
}: {
  theme: Theme;
}): JSX.Element {
  const { state } = useWizard();
  const { generatedDocuments } = state;

  const totalTasks = generatedDocuments.reduce((sum, doc) => sum + doc.taskCount, 0);
  const phase1 = generatedDocuments[0];

  return (
    <div className="flex flex-col h-full">
      {/* Success header */}
      <div
        className="px-6 py-4 border-b"
        style={{
          borderColor: theme.colors.border,
          backgroundColor: `${theme.colors.success}10`,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${theme.colors.success}20` }}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke={theme.colors.success}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div>
            <h3
              className="font-semibold"
              style={{ color: theme.colors.textMain }}
            >
              Action Plan Created!
            </h3>
            <p
              className="text-sm"
              style={{ color: theme.colors.textDim }}
            >
              {generatedDocuments.length} phase document{generatedDocuments.length !== 1 ? 's' : ''} with {totalTasks} total tasks
            </p>
          </div>
        </div>
      </div>

      {/* Phase 1 preview */}
      <div className="flex-1 overflow-auto p-6">
        {phase1 && (
          <div>
            <h4
              className="text-lg font-medium mb-3"
              style={{ color: theme.colors.textMain }}
            >
              {phase1.filename}
            </h4>
            <div
              className="text-sm p-4 rounded-lg border overflow-auto max-h-[40vh]"
              style={{
                backgroundColor: theme.colors.bgActivity,
                borderColor: theme.colors.border,
                color: theme.colors.textMain,
              }}
            >
              <pre className="whitespace-pre-wrap font-mono text-xs">
                {phase1.content}
              </pre>
            </div>
            <p
              className="text-xs mt-2"
              style={{ color: theme.colors.textDim }}
            >
              {phase1.taskCount} tasks ready to run
            </p>
          </div>
        )}

        {/* Document list */}
        {generatedDocuments.length > 1 && (
          <div className="mt-6">
            <h4
              className="text-sm font-medium mb-2"
              style={{ color: theme.colors.textDim }}
            >
              Additional Phases
            </h4>
            <div className="space-y-2">
              {generatedDocuments.slice(1).map((doc, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border"
                  style={{
                    backgroundColor: theme.colors.bgSidebar,
                    borderColor: theme.colors.border,
                  }}
                >
                  <span
                    className="text-sm"
                    style={{ color: theme.colors.textMain }}
                  >
                    {doc.filename}
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: theme.colors.textDim }}
                  >
                    {doc.taskCount} tasks
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer with saved location */}
      <div
        className="px-6 py-3 border-t"
        style={{
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.bgSidebar,
        }}
      >
        <p
          className="text-xs text-center"
          style={{ color: theme.colors.textDim }}
        >
          Documents saved to: {state.directoryPath}/{AUTO_RUN_FOLDER_NAME}/
        </p>
      </div>
    </div>
  );
}

/**
 * PhaseReviewScreen - Phase 1 document review and launch
 *
 * This screen handles:
 * 1. Triggering document generation when mounted
 * 2. Showing loading state with "Creating your action plan..."
 * 3. Handling errors with retry option
 * 4. Displaying generated documents when ready
 */
export function PhaseReviewScreen({ theme }: PhaseReviewScreenProps): JSX.Element {
  const {
    state,
    setGeneratingDocuments,
    setGeneratedDocuments,
    setGenerationError,
    previousStep,
  } = useWizard();

  const [progressMessage, setProgressMessage] = useState('Creating your action plan...');
  const generationStartedRef = useRef(false);

  /**
   * Start the document generation process
   */
  const startGeneration = useCallback(async () => {
    // Prevent multiple concurrent generations
    if (phaseGenerator.isGenerationInProgress()) {
      return;
    }

    setGeneratingDocuments(true);
    setGenerationError(null);
    setProgressMessage('Creating your action plan...');

    try {
      // Generate documents
      const result = await phaseGenerator.generateDocuments(
        {
          agentType: state.selectedAgent!,
          directoryPath: state.directoryPath,
          projectName: state.agentName || 'My Project',
          conversationHistory: state.conversationHistory,
        },
        {
          onStart: () => {
            setProgressMessage('Starting document generation...');
          },
          onProgress: (message) => {
            setProgressMessage(message);
          },
          onChunk: () => {
            // Could show streaming output here in the future
          },
          onComplete: async (genResult) => {
            if (genResult.success && genResult.documents) {
              // Save documents to disk
              setProgressMessage('Saving documents...');
              const saveResult = await phaseGenerator.saveDocuments(
                state.directoryPath,
                genResult.documents
              );

              if (saveResult.success) {
                // Update context with generated documents (including saved paths)
                setGeneratedDocuments(genResult.documents);
                setGeneratingDocuments(false);
              } else {
                setGenerationError(saveResult.error || 'Failed to save documents');
                setGeneratingDocuments(false);
              }
            }
          },
          onError: (error) => {
            setGenerationError(error);
            setGeneratingDocuments(false);
          },
        }
      );

      // Handle result if not handled by callbacks
      if (!result.success && result.error) {
        setGenerationError(result.error);
        setGeneratingDocuments(false);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setGenerationError(errorMessage);
      setGeneratingDocuments(false);
    }
  }, [
    state.selectedAgent,
    state.directoryPath,
    state.agentName,
    state.conversationHistory,
    setGeneratingDocuments,
    setGeneratedDocuments,
    setGenerationError,
  ]);

  /**
   * Handle retry after error
   */
  const handleRetry = useCallback(() => {
    setGenerationError(null);
    generationStartedRef.current = false;
    startGeneration();
  }, [startGeneration, setGenerationError]);

  /**
   * Handle going back to conversation
   */
  const handleGoBack = useCallback(() => {
    setGenerationError(null);
    previousStep();
  }, [previousStep, setGenerationError]);

  // Start generation when screen mounts (only once)
  useEffect(() => {
    // Only start if we haven't started yet and don't already have documents
    if (!generationStartedRef.current && state.generatedDocuments.length === 0) {
      generationStartedRef.current = true;
      startGeneration();
    }
  }, [startGeneration, state.generatedDocuments.length]);

  // Render based on current state
  if (state.generationError) {
    return (
      <ErrorDisplay
        error={state.generationError}
        onRetry={handleRetry}
        onSkip={handleGoBack}
        theme={theme}
      />
    );
  }

  if (state.isGeneratingDocuments) {
    return <LoadingIndicator message={progressMessage} theme={theme} />;
  }

  if (state.generatedDocuments.length > 0) {
    return <GenerationSuccess theme={theme} />;
  }

  // Fallback - should not normally reach here
  return <LoadingIndicator message="Preparing..." theme={theme} />;
}
