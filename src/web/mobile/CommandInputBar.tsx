/**
 * CommandInputBar - Sticky bottom input bar for mobile web interface
 *
 * A touch-friendly command input component that stays fixed at the bottom
 * of the viewport and properly handles mobile keyboard appearance.
 *
 * Features:
 * - Always visible at bottom of screen
 * - Adjusts position when mobile keyboard appears (using visualViewport API)
 * - Supports safe area insets for notched devices
 * - Disabled state when disconnected or offline
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useThemeColors } from '../components/ThemeProvider';

export interface CommandInputBarProps {
  /** Whether the device is offline */
  isOffline: boolean;
  /** Whether connected to the server */
  isConnected: boolean;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Callback when command is submitted */
  onSubmit?: (command: string) => void;
  /** Callback when input value changes */
  onChange?: (value: string) => void;
  /** Current input value (controlled) */
  value?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
}

/**
 * CommandInputBar component
 *
 * Provides a sticky bottom input bar optimized for mobile devices.
 * Uses the Visual Viewport API to stay above the keyboard.
 */
export function CommandInputBar({
  isOffline,
  isConnected,
  placeholder,
  onSubmit,
  onChange,
  value: controlledValue,
  disabled: externalDisabled,
}: CommandInputBarProps) {
  const colors = useThemeColors();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track keyboard visibility for positioning
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Internal state for uncontrolled mode
  const [internalValue, setInternalValue] = useState('');
  const value = controlledValue !== undefined ? controlledValue : internalValue;

  // Determine if input should be disabled
  const isDisabled = externalDisabled || isOffline || !isConnected;

  // Get placeholder text based on state
  const getPlaceholder = () => {
    if (isOffline) return 'Offline...';
    if (!isConnected) return 'Connecting...';
    return placeholder || 'Enter command...';
  };

  /**
   * Handle Visual Viewport resize for keyboard detection
   * This is the modern way to handle mobile keyboard appearance
   */
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const handleResize = () => {
      // Calculate the offset caused by keyboard
      const windowHeight = window.innerHeight;
      const viewportHeight = viewport.height;
      const offset = windowHeight - viewportHeight - viewport.offsetTop;

      // Only update if there's a significant change (keyboard appearing/disappearing)
      if (offset > 50) {
        setKeyboardOffset(offset);
        setIsKeyboardVisible(true);
      } else {
        setKeyboardOffset(0);
        setIsKeyboardVisible(false);
      }
    };

    const handleScroll = () => {
      // Re-adjust on scroll to keep the bar in view
      if (containerRef.current && isKeyboardVisible) {
        // Force the container to stay at the bottom of the visible area
        handleResize();
      }
    };

    viewport.addEventListener('resize', handleResize);
    viewport.addEventListener('scroll', handleScroll);

    // Initial check
    handleResize();

    return () => {
      viewport.removeEventListener('resize', handleResize);
      viewport.removeEventListener('scroll', handleScroll);
    };
  }, [isKeyboardVisible]);

  /**
   * Handle input change
   */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      if (controlledValue === undefined) {
        setInternalValue(newValue);
      }
      onChange?.(newValue);
    },
    [controlledValue, onChange]
  );

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!value.trim() || isDisabled) return;

      onSubmit?.(value.trim());

      // Clear input after submit (for uncontrolled mode)
      if (controlledValue === undefined) {
        setInternalValue('');
      }

      // Keep focus on input after submit
      inputRef.current?.focus();
    },
    [value, isDisabled, onSubmit, controlledValue]
  );

  /**
   * Handle key press events
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Submit on Enter (without shift for single line)
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
      }
    },
    [handleSubmit]
  );

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: keyboardOffset,
        zIndex: 100,
        // Safe area padding for notched devices
        paddingBottom: isKeyboardVisible ? '0' : 'max(12px, env(safe-area-inset-bottom))',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
        paddingTop: '12px',
        backgroundColor: colors.bgSidebar,
        borderTop: `1px solid ${colors.border}`,
        // Smooth transition when keyboard appears/disappears
        transition: isKeyboardVisible ? 'none' : 'bottom 0.15s ease-out',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}
      >
        {/* Command input field */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={getPlaceholder()}
          disabled={isDisabled}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="send"
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: colors.bgMain,
            border: `1px solid ${colors.border}`,
            color: isDisabled ? colors.textDim : colors.textMain,
            fontSize: '16px', // 16px minimum prevents iOS zoom on focus
            fontFamily: 'inherit',
            opacity: isDisabled ? 0.5 : 1,
            outline: 'none',
            // Reset appearance for consistent styling
            WebkitAppearance: 'none',
            appearance: 'none',
            // Smooth transitions
            transition: 'border-color 150ms ease, opacity 150ms ease',
          }}
          aria-label="Command input"
          aria-disabled={isDisabled}
        />

        {/* Send button */}
        <button
          type="submit"
          disabled={isDisabled || !value.trim()}
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: colors.accent,
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 500,
            border: 'none',
            cursor: isDisabled || !value.trim() ? 'default' : 'pointer',
            opacity: isDisabled || !value.trim() ? 0.5 : 1,
            // Touch-friendly minimum size
            minWidth: '64px',
            minHeight: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            // Smooth transitions
            transition: 'opacity 150ms ease, background-color 150ms ease',
            // Prevent button from shrinking
            flexShrink: 0,
          }}
          aria-label="Send command"
        >
          {/* Arrow up icon for send */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </svg>
        </button>
      </form>
    </div>
  );
}

export default CommandInputBar;
