# Phase 03: Document Generation

Build the phased document generation system that creates Auto Run markdown files based on the conversation.

## Tasks

- [ ] Create `services/phaseGenerator.ts` with the document generation prompt template that instructs agent to: create multiple phased markdown documents, make Phase 1 achievable without user input, make Phase 1 deliver a working prototype that excites the user, use checkbox task format `- [ ] Task description`, name files as `Phase-XX-Description.md`, focus on actionable tasks not documentation
- [ ] Design the generation prompt to emphasize: Phase 1 should be completable in a single Auto Run session, each phase should build on the previous, tasks should be specific and unambiguous, avoid tasks that require user decisions mid-execution
- [ ] Implement document generation flow: send generation prompt with full conversation context, parse response to extract individual markdown documents, validate each document has proper task format
- [ ] Create `Auto Run Docs` folder in the agent's configured directory if it doesn't exist using `window.maestro.fs` or appropriate IPC
- [ ] Save generated documents to the Auto Run Docs folder with proper naming: `Phase-01-*.md`, `Phase-02-*.md`, etc.
- [ ] Add IPC handler in `src/main/index.ts` for creating directories if not already available
- [ ] Add IPC handler for writing files to arbitrary paths (within agent directory) if not already available
- [ ] Implement loading state UI during document generation with message "Creating your action plan..."
- [ ] Handle generation errors gracefully: show error message, offer retry, allow manual progression
- [ ] Store generated document paths in WizardContext for the next screen
- [ ] Parse Phase 1 document content for display in the review screen
- [ ] Validate generated documents have at least one task each
- [ ] If agent generates a single large document, intelligently split it into phases or accept as single phase
- [ ] Add generation timeout handling (generous timeout, 2+ minutes) with progress indication
