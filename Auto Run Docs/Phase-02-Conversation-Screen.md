# Phase 02: Conversation Screen

Build the AI-driven conversation screen with structured output parsing, confidence meter, and project discovery flow.

## Tasks

- [ ] Create `services/wizardPrompts.ts` with the system prompt template that includes: agent name interpolation `{{AGENT_NAME}}`, agent path interpolation `{{AGENT_PATH}}`, instruction to only create/modify files in that directory, instruction to ask clarifying questions about project type (coding, research, analysis, etc.), instruction to keep exchanges minimal but gather enough clarity, instruction to respond in structured JSON format
- [ ] Define structured output JSON schema in `wizardPrompts.ts`: `{"confidence": number (0-100), "ready": boolean, "message": string}`
- [ ] Create response parser utility in `services/wizardPrompts.ts` that extracts confidence, ready status, and message from agent responses, with fallback handling if agent doesn't follow format
- [ ] Create `services/conversationManager.ts` to handle the back-and-forth conversation flow: sending messages to agent, appending structured output reminder to each user message, parsing responses, tracking conversation history
- [ ] Create `screens/ConversationScreen.tsx` with AI Terminal-like interface for familiarity, confidence progress bar at top showing 0-100% with smooth animations, conversation display area showing exchange history, input field at bottom for user responses, "Let's get started!" button that appears when ready=true and confidence>80
- [ ] Style the confidence meter as a horizontal progress bar with gradient fill (red to yellow to green as confidence increases)
- [ ] Add visual indicator when agent is "thinking" (typing indicator or spinner)
- [ ] Implement the initial static question display: "What would you like to build? A coding project? Research notes? Something else entirely?" shown before first agent response arrives
- [ ] Wire up conversation to actual agent process: spawn agent with wizard system prompt, send user messages with structured output suffix, parse and display responses
- [ ] Create prompt suffix constant that reminds agent to respond in JSON format with confidence score after each user message
- [ ] Handle edge cases: agent not responding (show retry option), agent not following format (extract message best-effort, assume low confidence), agent errors (show error state with retry)
- [ ] Add keyboard support: Enter to send message, Escape to go back to previous screen (with confirmation if conversation started)
- [ ] Store conversation history in WizardContext for later use in document generation
- [ ] When ready=true and confidence>80, show transition prompt: "I think I have a good understanding of your project. Ready to create your action plan?" with "Let's Go!" button
- [ ] Ensure conversation will become the "Project Discovery" tab content after wizard completes
