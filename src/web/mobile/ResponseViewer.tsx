/**
 * ResponseViewer component for Maestro mobile web interface
 *
 * Full-screen modal for viewing complete AI responses.
 * Features:
 * - Full-screen overlay for immersive reading
 * - Displays the complete response text with proper formatting
 * - Monospace font for code readability
 * - Swipe down to dismiss (task 1.35)
 * - Share/copy functionality (task 1.31)
 * - Scroll to read long responses
 *
 * This component is triggered when users tap the last response preview
 * in the SessionStatusBanner component.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useThemeColors } from '../components/ThemeProvider';
import type { LastResponsePreview } from '../hooks/useSessions';
import { triggerHaptic, HAPTIC_PATTERNS } from './index';

/**
 * Props for ResponseViewer component
 */
export interface ResponseViewerProps {
  /** Whether the viewer is currently open */
  isOpen: boolean;
  /** The response data to display (preview data) */
  response: LastResponsePreview | null;
  /** The full response text (fetched from server) */
  fullText?: string | null;
  /** Whether full text is currently loading */
  isLoading?: boolean;
  /** Callback when the viewer should close */
  onClose: () => void;
  /** Session name for display context */
  sessionName?: string;
}

/**
 * Format timestamp to human-readable string
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * ResponseViewer component
 *
 * Renders a full-screen modal overlay for viewing complete AI responses.
 * Supports swipe-down gesture to dismiss.
 */
export function ResponseViewer({
  isOpen,
  response,
  fullText,
  isLoading = false,
  onClose,
  sessionName,
}: ResponseViewerProps) {
  const colors = useThemeColors();
  const contentRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchDelta, setTouchDelta] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Threshold for swipe-to-dismiss (pixels)
  const DISMISS_THRESHOLD = 100;

  // Handle touch start for swipe-to-dismiss
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only track swipe if at the top of the content
    if (contentRef.current && contentRef.current.scrollTop === 0) {
      setTouchStart(e.touches[0].clientY);
      setIsDragging(true);
    }
  }, []);

  // Handle touch move for swipe-to-dismiss
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStart === null || !isDragging) return;

    const currentY = e.touches[0].clientY;
    const delta = currentY - touchStart;

    // Only allow downward swipe
    if (delta > 0) {
      setTouchDelta(delta);
      // Prevent scroll while swiping
      e.preventDefault();
    }
  }, [touchStart, isDragging]);

  // Handle touch end for swipe-to-dismiss
  const handleTouchEnd = useCallback(() => {
    if (touchDelta > DISMISS_THRESHOLD) {
      // Dismiss the viewer
      triggerHaptic(HAPTIC_PATTERNS.tap);
      onClose();
    }
    // Reset touch state
    setTouchStart(null);
    setTouchDelta(0);
    setIsDragging(false);
  }, [touchDelta, onClose]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Don't render if not open
  if (!isOpen || !response) {
    return null;
  }

  // Display text - use full text if available, otherwise preview
  const displayText = fullText || response.text;
  const hasMoreContent = !fullText && response.fullLength > response.text.length;

  // Calculate opacity based on swipe progress
  const backdropOpacity = Math.max(0, 1 - touchDelta / (DISMISS_THRESHOLD * 2));

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: `rgba(0, 0, 0, ${0.9 * backdropOpacity})`,
        transform: `translateY(${touchDelta}px)`,
        transition: isDragging ? 'none' : 'transform 0.3s ease-out, background-color 0.3s ease-out',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-modal="true"
      role="dialog"
      aria-label="Full response viewer"
    >
      {/* Header bar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          paddingTop: 'max(12px, env(safe-area-inset-top))',
          backgroundColor: colors.bgSidebar,
          borderBottom: `1px solid ${colors.border}`,
          minHeight: '56px',
          flexShrink: 0,
        }}
      >
        {/* Left side: Title and session info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: colors.textMain,
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            Response
          </h2>
          <div
            style={{
              fontSize: '12px',
              color: colors.textDim,
              marginTop: '2px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {sessionName && (
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {sessionName}
              </span>
            )}
            <span style={{ opacity: 0.7 }}>
              {formatTimestamp(response.timestamp)}
            </span>
          </div>
        </div>

        {/* Right side: Close button */}
        <button
          onClick={() => {
            triggerHaptic(HAPTIC_PATTERNS.tap);
            onClose();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: `${colors.textDim}20`,
            border: 'none',
            cursor: 'pointer',
            color: colors.textMain,
            fontSize: '18px',
            fontWeight: 500,
            marginLeft: '12px',
            flexShrink: 0,
          }}
          aria-label="Close response viewer"
        >
          ×
        </button>
      </header>

      {/* Swipe indicator */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '8px 0',
          backgroundColor: colors.bgMain,
        }}
      >
        <div
          style={{
            width: '36px',
            height: '4px',
            borderRadius: '2px',
            backgroundColor: `${colors.textDim}40`,
          }}
          aria-hidden="true"
        />
      </div>

      {/* Content area */}
      <div
        ref={contentRef}
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '16px',
          backgroundColor: colors.bgMain,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {isLoading ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: colors.textDim,
              fontSize: '14px',
            }}
          >
            Loading full response...
          </div>
        ) : (
          <>
            {/* Response text */}
            <div
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                fontSize: '13px',
                lineHeight: 1.6,
                color: colors.textMain,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {displayText}
            </div>

            {/* Truncation notice */}
            {hasMoreContent && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: `${colors.warning}15`,
                  border: `1px solid ${colors.warning}30`,
                  color: colors.textDim,
                  fontSize: '12px',
                  textAlign: 'center',
                }}
              >
                Showing preview ({response.text.length} of {response.fullLength} characters).
                <br />
                Full response loading not available.
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer with safe area padding */}
      <footer
        style={{
          padding: '12px 16px',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
          backgroundColor: colors.bgSidebar,
          borderTop: `1px solid ${colors.border}`,
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: '11px',
            color: colors.textDim,
          }}
        >
          Swipe down to dismiss
        </span>
      </footer>
    </div>
  );
}

export default ResponseViewer;
