# Phase 07: Resume and Polish

Implement wizard resume functionality, edge cases, and final polish for a seamless first-run experience.

## Tasks

- [ ] Create wizard state persistence: save wizard progress to settings or separate storage after each screen completion, store: current step, selected agent, agent name, directory path, conversation history, generated document paths
- [ ] Implement resume detection on app launch: if wizard state exists and is incomplete, show "Resume Setup?" dialog with options "Resume" and "Start Fresh"
- [ ] If user chooses "Resume", restore wizard to the appropriate screen with all previous data
- [ ] If user chooses "Start Fresh", clear wizard state and start from screen 1
- [ ] Clear wizard state when wizard completes successfully
- [ ] Add confirmation dialog when pressing Escape mid-wizard (after screen 1): "Are you sure you want to exit the setup wizard? Your progress will be saved."
- [ ] Handle edge case: user selected directory no longer exists on resume (show error, allow re-selection)
- [ ] Handle edge case: agent no longer available on resume (show error, return to agent selection)
- [ ] Add loading states for all async operations: agent detection, directory validation, agent spawning, document generation, session creation
- [ ] Ensure all wizard screens have consistent padding, spacing, and typography
- [ ] Add subtle fade animations between all screen transitions
- [ ] Test keyboard navigation flow through entire wizard: Tab, Shift+Tab, Enter, Escape, Arrow keys
- [ ] Ensure focus management: each screen should auto-focus the primary interactive element
- [ ] Add screen reader announcements for screen changes and important state updates
- [ ] Test wizard with all themes to ensure proper styling
- [ ] Add telemetry/analytics hooks for wizard completion rate, tour completion rate, average conversation exchanges (optional, respect privacy settings)
- [ ] Create unit tests for WizardContext state management
- [ ] Create unit tests for structured output parser
- [ ] Create integration tests for full wizard flow
- [ ] Update CLAUDE.md with wizard documentation: components, flow, customization points
- [ ] Add wizard to the "What's New" or changelog if applicable
