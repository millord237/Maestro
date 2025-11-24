# App.tsx Refactoring Plan

**Current Status**: 2,988 lines (down from 3,091)
**Target**: <500 lines
**Remaining Reduction Needed**: ~2,488 lines (~83%)

This document outlines a systematic plan to continue refactoring App.tsx by extracting components, hooks, and utilities.

---

## Phase 1: Extract Major UI Components (High Impact)

### 1. TerminalOutput Component
**Estimated Line Reduction**: ~400-500 lines

**What to Extract:**
- Terminal/AI output rendering logic
- Output search/filter functionality
- Scroll handling and auto-scroll behavior
- Log rendering (with markdown, code blocks, images)
- Context menu and interactions

**Props Needed:**
```typescript
interface TerminalOutputProps {
  session: Session;
  theme: Theme;
  outputSearchOpen: boolean;
  outputSearchQuery: string;
  setOutputSearchOpen: (open: boolean) => void;
  setOutputSearchQuery: (query: string) => void;
  terminalOutputRef: React.RefObject<HTMLDivElement>;
  activeFocus: FocusArea;
  setActiveFocus: (focus: FocusArea) => void;
  markdownRawMode: boolean;
}
```

**Location in App.tsx**: Lines ~2750-3200 (main panel top section)

---

### 2. InputArea Component
**Estimated Line Reduction**: ~300-400 lines

**What to Extract:**
- Input textarea and controls
- Image staging area
- Command history modal trigger
- Enter-to-send logic
- Input mode indicator (AI vs Terminal)
- Paste and drop handlers

**Props Needed:**
```typescript
interface InputAreaProps {
  session: Session;
  theme: Theme;
  inputValue: string;
  setInputValue: (value: string) => void;
  stagedImages: string[];
  setStagedImages: (images: string[]) => void;
  processInput: () => void;
  enterToSend: boolean;
  shortcuts: Record<string, Shortcut>;
  commandHistoryOpen: boolean;
  setCommandHistoryOpen: (open: boolean) => void;
  handleInputKeyDown: (e: React.KeyboardEvent) => void;
  handlePaste: (e: React.ClipboardEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
}
```

**Location in App.tsx**: Lines ~2950-3100 (main panel bottom section)

---

### 3. RightPanel Component
**Estimated Line Reduction**: ~400-500 lines

**What to Extract:**
- Tab navigation (Files, History, Scratchpad)
- Panel resize logic
- Tab content rendering
- Panel collapse/expand

**Subcomponents to create:**
- `FileExplorerPanel` - Uses useFileExplorer hook
- `HistoryPanel` - Shows changed files and work log
- Keep `Scratchpad` as is (already separate)

**Props Needed:**
```typescript
interface RightPanelProps {
  session: Session | null;
  theme: Theme;
  activeRightTab: RightPanelTab;
  setActiveRightTab: (tab: RightPanelTab) => void;
  rightPanelOpen: boolean;
  setRightPanelOpen: (open: boolean) => void;
  rightPanelWidth: number;
  setRightPanelWidth: (width: number) => void;
  activeFocus: FocusArea;
  setActiveFocus: (focus: FocusArea) => void;
  // ... file explorer props
  // ... scratchpad props
}
```

**Location in App.tsx**: Lines ~3100-3400 (right column)

---

## Phase 2: Extract Modals (Medium Impact)

### 4. Extract Modal Components
**Estimated Line Reduction**: ~400-600 lines

**Modals to Extract:**

#### QuickActionModal
- Command palette functionality
- Action list with keyboard navigation
- Fuzzy search
- Mode switching (main vs move-to-group)

#### ConfirmModal
- Generic confirmation dialog
- Used for deletions and destructive actions

#### RenameInstanceModal / RenameGroupModal
- Inline editing interfaces
- Emoji picker integration

#### CreateGroupModal
- Group creation form
- Emoji picker
- Option to move current session

#### CommandHistoryModal
- Command history with search
- Keyboard navigation
- Execute previous commands

#### AboutModal
- App information
- Version display

#### ShortcutsHelpModal
- Keyboard shortcuts reference
- Search functionality

**Location in App.tsx**: Scattered throughout, mostly lines 1700-2300

---

## Phase 3: Extract Hooks (Medium Impact)

### 5. useProcessInput Hook
**Estimated Line Reduction**: ~100-150 lines

**What to Extract:**
- Input processing logic
- AI vs terminal mode routing
- Shell CWD tracking (cd command detection)
- Command history management
- Image attachment handling

**Usage:**
```typescript
const processInput = useProcessInput(
  activeSession,
  inputValue,
  stagedImages,
  setSessions
);
```

---

### 6. useKeyboardShortcuts Hook (Optional)
**Estimated Line Reduction**: ~200-300 lines (if feasible)

**Challenge**: Keyboard shortcuts are tightly coupled to many state variables and actions.

**Approach**:
1. Create a registry of shortcut handlers
2. Pass all necessary callbacks and state
3. Return a single onKeyDown handler
4. May not be worth the complexity

**Alternative**: Leave in App.tsx but comment and organize better

---

## Phase 4: Extract Utilities (Low Impact, High Value)

### 7. Extract Helper Functions
**Estimated Line Reduction**: ~50-100 lines

**Functions to Extract:**

#### `src/renderer/utils/fileIcons.ts`
```typescript
export function getFileIcon(type: FileChangeType, theme: Theme): JSX.Element
```

#### `src/renderer/utils/fileOperations.ts`
```typescript
export function shouldOpenExternally(filename: string): boolean
```

#### `src/renderer/utils/sessionUtils.ts`
```typescript
export function getFilteredSessions(sessions: Session[], query: string): Session[]
```

**Location in App.tsx**: Lines ~390-400, scattered helper functions

---

## Phase 5: Create Composite Components (High Impact)

### 8. MainWorkspace Component
**Estimated Line Reduction**: ~200-300 lines

**What to Extract:**
- "No session" state
- Active session view layout
- Combines TerminalOutput and InputArea
- Top toolbar with session info

**Props Needed:**
```typescript
interface MainWorkspaceProps {
  session: Session | null;
  theme: Theme;
  // ... TerminalOutput props
  // ... InputArea props
  // ... toolbar props
}
```

This is a higher-level component that combines other extracted components.

---

## Prioritized Execution Order

For maximum impact with minimum risk, follow this order:

### Round 1: Foundation (Already Complete ✅)
- ✅ Create custom hooks (useSettings, useSessionManager, useFileExplorer)
- ✅ Create services (git, process)
- ✅ Extract SessionList component

### Round 2: Right Panel (~400-500 lines)
1. Extract `FileExplorerPanel` component
2. Extract `HistoryPanel` component
3. Extract `RightPanel` wrapper component
4. **Result**: App.tsx → ~2,500 lines

### Round 3: Main Content Area (~700-900 lines)
1. Extract `TerminalOutput` component
2. Extract `InputArea` component
3. Extract `MainWorkspace` wrapper component
4. **Result**: App.tsx → ~1,600-1,800 lines

### Round 4: Modals (~400-600 lines)
1. Extract all modal components
2. Create a `modals/` directory
3. **Result**: App.tsx → ~1,000-1,400 lines

### Round 5: Refinement (~300-500 lines)
1. Extract `useProcessInput` hook
2. Extract helper functions to utils
3. Clean up remaining code
4. **Result**: App.tsx → ~500-900 lines

### Round 6: Polish (if needed)
1. Consider extracting keyboard handler if feasible
2. Further component composition
3. **Target**: App.tsx → <500 lines

---

## Testing Strategy

After each extraction:

1. **Build Check**: `npm run build` must succeed
2. **Visual Check**: Run `npm run dev` and verify UI looks correct
3. **Functional Check**: Test the extracted feature works as before
4. **Git Commit**: Commit each extraction separately for easy rollback

---

## Estimated Timeline

- **Round 2** (Right Panel): 2-3 hours
- **Round 3** (Main Content): 3-4 hours
- **Round 4** (Modals): 3-4 hours
- **Round 5** (Refinement): 2-3 hours
- **Round 6** (Polish): 1-2 hours

**Total**: 11-16 hours remaining to reach <500 line target

---

## Current Progress

- **Lines Reduced**: 103 (3.3%)
- **Components Created**: 1 (SessionList)
- **Hooks Created**: 3 (useSettings, useSessionManager, useFileExplorer)
- **Services Created**: 2 (git, process)
- **Rounds Complete**: 1/6

---

## Notes

- Each extraction should be its own commit
- Test thoroughly between extractions
- Update CLAUDE.md after major changes
- Don't over-engineer - keep components simple and focused
- Prioritize readability over clever abstractions
