# Phase 05: Tour Overlay System

Build the spotlight tour overlay that guides users through the interface with visual walkthroughs.

## Tasks

- [ ] Create `tour/TourOverlay.tsx` component that renders a full-screen dark overlay with a "cutout" for the spotlighted area
- [ ] Implement spotlight cutout using CSS clip-path or SVG mask to create a transparent window in the dark overlay
- [ ] Ensure overlay covers the entire viewport with semi-transparent dark background (similar to modal backdrop)
- [ ] Create `tour/TourStep.tsx` component for individual tour step with: spotlight position/size, title text, description text, "Continue Tour" button, step indicator (e.g., "3 of 8")
- [ ] Position tour step tooltip near the spotlighted element (above, below, left, or right based on available space)
- [ ] Add arrow/pointer from tooltip to spotlighted element for visual connection
- [ ] Create `tour/tourSteps.ts` defining all tour steps with: element selector or ref to spotlight, title, description, position preference for tooltip
- [ ] Define tour step sequence: 1) Auto Run panel - explain what's running right now, 2) Auto Run document selector - show other phase documents created, 3) Files tab - show file explorer, 4) History tab - explain auto vs manual entries, 5) Left panel hamburger menu - show menu options, 6) Left panel session list - explain sessions and groups, 7) Main terminal area - explain AI Terminal vs Command Terminal, 8) Input area - explain read-only during Auto Run, 9) Header area - explain status indicators and controls, 10) Keyboard shortcuts hint - mention Cmd+Shift+? for all shortcuts
- [ ] Implement `useTour` hook to manage tour state: current step, total steps, next/previous/skip functions
- [ ] Add smooth transitions between tour steps (fade out spotlight, fade in at new position)
- [ ] Implement keyboard support: Enter or Space to advance, Escape to exit tour entirely
- [ ] Before each spotlight, programmatically switch to the correct UI state: switch to Auto Run tab before spotlighting it, switch to Files tab before spotlighting it, switch to History tab before spotlighting it, open hamburger menu before spotlighting menu items
- [ ] Disable all interactions outside the spotlight area (pointer-events: none on overlay, pointer-events: auto on spotlight... actually NO - make spotlight view-only too for simplicity)
- [ ] Actually, make the entire tour view-only: spotlight highlights areas but clicking does nothing, only "Continue Tour" button advances
- [ ] Add "Skip Tour" link in tour tooltip for users who want to exit early
- [ ] When tour completes, show brief completion message and dismiss overlay
- [ ] Set `tourCompleted: true` in settings when tour finishes or is skipped
- [ ] Ensure tour works correctly regardless of current window size (responsive spotlight positioning)
