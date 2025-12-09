# Phase 04: Phase Review Screen

Build the Phase 1 document review screen with markdown editor, preview mode, and launch options.

## Tasks

- [ ] Create `screens/PhaseReviewScreen.tsx` that displays Phase 1 markdown document in full modal width
- [ ] Integrate the same markdown editor component used in Auto Run (`AutoRunEditor` or equivalent) for consistency and user familiarity
- [ ] Add Edit/Preview toggle buttons matching the Auto Run interface style
- [ ] Add image attachment support matching Auto Run interface (attach button, drag-drop zone)
- [ ] Implement markdown preview rendering with proper styling for task checkboxes
- [ ] Allow user to edit the Phase 1 document directly before proceeding
- [ ] Auto-save edits back to the file as user makes changes (debounced)
- [ ] Display document title prominently at top of the screen
- [ ] Show count of tasks in the document (e.g., "12 tasks ready to run")
- [ ] Create two large action buttons at bottom: "I'm Ready to Go" (primary, default focus) and "I'm Ready, But Walk Me Through the Interface" (secondary)
- [ ] Style buttons to be visually prominent and easily distinguishable
- [ ] Wire "I'm Ready to Go" button to: create session with configured agent and directory, set first tab name to "Project Discovery", populate tab with conversation history, select Phase 1 document in Auto Run, start Auto Run execution, close wizard
- [ ] Wire "Walk Me Through" button to: do everything above, then trigger tour overlay
- [ ] Add keyboard support: Tab between buttons, Enter to activate focused button, Escape to go back (with confirmation since documents are generated)
- [ ] Show loading state while session is being created and Auto Run is starting
- [ ] Handle errors during session creation or Auto Run start gracefully
- [ ] Store user's choice (tour or no tour) for analytics/future reference
