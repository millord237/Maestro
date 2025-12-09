# Phase 06: First Run Celebration

Build the celebratory experience for first Auto Run completion with confetti, achievement modal, and next steps guidance.

## Tasks

- [ ] Create `components/FirstRunCelebration.tsx` modal component for the first Auto Run completion celebration
- [ ] Add confetti animation library or implement simple confetti effect using CSS animations or canvas
- [ ] Design celebration modal with: confetti animation in background, "Congratulations!" header, duration of the Auto Run displayed (e.g., "Your first Auto Run completed in 4 minutes 32 seconds"), encouraging message about Auto Run capabilities ("A properly configured Auto Run can go on for hours if not days"), next steps section
- [ ] Create next steps content: "Explore the additional phase documents we created", "Each phase builds on the previous one", "Select a document in the Auto Run tab to continue building your project", link or button to Auto Run documentation
- [ ] Add "Got It!" primary button to dismiss the modal
- [ ] Implement confetti animation that triggers when modal appears and runs for 3-5 seconds
- [ ] Add `firstAutoRunCompleted` flag to settings to ensure celebration only shows once ever
- [ ] Hook celebration trigger into Auto Run completion detection: when an Auto Run completes AND `firstAutoRunCompleted` is false, show celebration modal, set `firstAutoRunCompleted` to true
- [ ] Add special "Standing Ovation" achievement variation if first Auto Run exceeds 15 minutes with extra celebratory messaging like "Your AI worked autonomously for over 15 minutes!"
- [ ] Ensure celebration modal has proper priority in LayerStack (above normal modals)
- [ ] Add keyboard support: Enter or Escape to dismiss
- [ ] Make confetti respect reduced motion preferences (disable if user prefers reduced motion)
- [ ] Style modal to feel special and celebratory while maintaining Maestro's design language
- [ ] After dismissing celebration, ensure user can easily find and select other phase documents
