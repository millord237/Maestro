import { useState, RefObject } from 'react';

/**
 * Focus area identifiers for different sections of the UI
 */
export type FocusArea = 'sidebar' | 'main' | 'right' | 'modal';

/**
 * State object representing a focus location
 */
export interface FocusState {
  /** The UI area to focus */
  area: FocusArea;
  /** Optional ref to the specific element to focus */
  ref?: RefObject<HTMLElement>;
  /** Optional fallback function if ref is unavailable */
  fallback?: () => void;
}

/**
 * API interface for managing focus across the application
 */
export interface FocusManagerAPI {
  /** Current focus state at top of stack */
  currentFocus: FocusState;
  /** Push a new focus state onto the stack */
  pushFocus: (state: FocusState) => void;
  /** Pop the top focus state and restore previous focus */
  popFocus: () => void;
  /** Full focus stack for debugging */
  focusStack: FocusState[];
}

/**
 * Hook for managing focus stack across UI layers
 *
 * The focus manager maintains a stack of focus states that can be pushed
 * when opening modals/overlays and popped when closing them to restore
 * the previous focus location.
 *
 * @returns FocusManagerAPI with methods to manage focus stack
 *
 * @example
 * ```tsx
 * const { pushFocus, popFocus, currentFocus } = useFocusManager();
 *
 * // When opening modal, save current focus
 * const inputRef = useRef<HTMLInputElement>(null);
 * pushFocus({ area: 'modal', ref: modalRef });
 *
 * // When closing modal, restore previous focus
 * popFocus(); // Automatically focuses previous location
 * ```
 */
export function useFocusManager(): FocusManagerAPI {
  // Initialize with main area as default focus
  const [focusStack, setFocusStack] = useState<FocusState[]>([{ area: 'main' }]);

  /**
   * Push a new focus state onto the stack
   * Does not automatically focus - just records the state
   */
  const pushFocus = (state: FocusState) => {
    setFocusStack((prev) => [...prev, state]);
  };

  /**
   * Pop the top focus state and restore focus to previous location
   * Uses setTimeout to ensure DOM is ready after state updates
   */
  const popFocus = () => {
    setFocusStack((prev) => {
      if (prev.length <= 1) {
        // Keep at least one item in stack
        return prev;
      }

      const newStack = prev.slice(0, -1);
      const previousFocus = newStack[newStack.length - 1];

      // Restore focus after state update completes
      setTimeout(() => {
        if (previousFocus.ref?.current) {
          previousFocus.ref.current.focus();
        } else if (previousFocus.fallback) {
          previousFocus.fallback();
        }
      }, 0);

      return newStack;
    });
  };

  const currentFocus = focusStack[focusStack.length - 1];

  return {
    currentFocus,
    pushFocus,
    popFocus,
    focusStack,
  };
}
