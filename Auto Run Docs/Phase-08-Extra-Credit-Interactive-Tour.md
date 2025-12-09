# Phase 08: Extra Credit - Interactive Tour

OPTIONAL: Enhance the tour with actual interactive elements where users perform actions rather than just viewing.

## Tasks

- [ ] Identify safe interaction points in the tour where user actions won't break the flow
- [ ] Modify TourOverlay to allow pointer events on spotlighted elements for specific interactive steps
- [ ] Create interactive tour step for hamburger menu: spotlight menu button, prompt user "Click to open the menu", wait for menu open event, advance to next step showing menu contents
- [ ] Create interactive tour step for tab switching: spotlight the tabs, prompt user "Click on Files to explore your project", wait for tab change event, advance after brief exploration time or user clicks continue
- [ ] Create interactive tour step for keyboard shortcut: prompt user "Press Cmd+T to switch between AI and Terminal mode", listen for the keypress, show success feedback, advance
- [ ] Add visual feedback for successful interactions: green checkmark, brief highlight, subtle sound (optional)
- [ ] Handle failed interactions gracefully: if user doesn't interact within 10 seconds, show "Skip this step?" option
- [ ] Add "Let me do it" vs "Show me" options for each interactive step for users who prefer passive learning
- [ ] Track which interactions the user completed vs skipped for potential onboarding improvements
- [ ] Ensure interactive tour doesn't interfere with ongoing Auto Run execution
- [ ] Add safeguards to prevent user from navigating away from current session during interactive tour
- [ ] Test interactive elements with keyboard-only navigation (not just mouse clicks)
- [ ] Consider adding practice mode where user can try multiple times before moving on
