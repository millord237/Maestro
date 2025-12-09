# Phase 01: Wizard Foundation

Build the core wizard infrastructure, context management, and the first two screens (Agent Selection and Directory Selection).

## Tasks

- [ ] Create wizard directory structure at `src/renderer/components/Wizard/`
- [ ] Create `WizardContext.tsx` with state management for multi-screen flow including: current step, total steps, agent selection, agent name, directory path, conversation history, confidence level, generated documents, and tour preference
- [ ] Create `MaestroWizard.tsx` as the main orchestrator component that renders the appropriate screen based on current step
- [ ] Add wizard modal priority to `src/renderer/constants/modalPriorities.ts` (should be high priority, above most other modals)
- [ ] Register wizard with LayerStackContext for proper Escape key handling (Escape should close wizard at any step with confirmation if past step 1)
- [ ] Create `WizardModal.tsx` base component with consistent sizing (same as PromptComposer), step indicator "Step X of Y", fade animations between screens, and keyboard navigation support
- [ ] Create `screens/AgentSelectionScreen.tsx` with tiled grid view of agent logos (Claude Code highlighted/selectable, others ghosted out), optional Name field with placeholder "My Project", keyboard navigation (arrow keys to move between tiles, Tab to Name field, Enter to proceed)
- [ ] Add agent logo assets to `src/renderer/assets/` for Claude Code, OpenAI Codex (ghosted), Gemini CLI (ghosted), Qwen3 Coder (ghosted), Aider (ghosted)
- [ ] Create `screens/DirectorySelectionScreen.tsx` with directory path input field, Browse button that opens native folder picker via `window.maestro.dialog.selectFolder()`, auto-detection of agent path using `window.maestro.agents.get()`, display of whether selected path is a Git repo, keyboard support (Tab between fields, Enter to proceed, Escape to go back)
- [ ] Add keyboard shortcut `Cmd+Shift+N` to `src/renderer/constants/shortcuts.ts` for opening wizard (make it configurable)
- [ ] Add wizard trigger to Command K menu in `src/renderer/components/CommandPalette.tsx` as "New Project Wizard"
- [ ] Add wizard trigger to hamburger menu in `src/renderer/components/HamburgerMenu.tsx` as "New Project Wizard..."
- [ ] Add "Introductory Tour" option to hamburger menu for re-running the tour
- [ ] Modify first-run detection logic: if no agents/sessions exist, show wizard instead of new agent modal
- [ ] Add `wizardCompleted` and `tourCompleted` flags to settings via `useSettings.ts`
- [ ] Create fade transition animation CSS in wizard styles
- [ ] Ensure all wizard screens have proper `tabIndex` management for keyboard-first navigation
