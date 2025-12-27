---
description: Execute OpenSpec tasks using Maestro's Auto Run feature with optional git worktree support for parallel implementation.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Overview

This command bridges OpenSpec with Maestro's Auto Run feature. It converts your OpenSpec tasks into Auto Run documents that Maestro can execute autonomously, enabling automated implementation with parallel execution support.

## Implementation Workflow

### Step 1: Locate Your OpenSpec Change

Your OpenSpec change is located at:
```
openspec/changes/<change-id>/
├── proposal.md    # What and why
├── tasks.md       # Implementation checklist
├── design.md      # Optional: technical decisions
└── specs/         # Spec deltas
```

Verify the change exists and tasks are ready:
```bash
openspec show <change-id>
```

### Step 2: Review Before Converting

Before converting to Auto Run:

1. **Confirm proposal is approved** - Don't automate unapproved changes
2. **Review tasks.md** - Understand what will be executed
3. **Check for dependencies** - Note which tasks must run sequentially

### Step 3: Convert to Auto Run Document

Create an Auto Run document from your OpenSpec tasks:

1. **Read `tasks.md`** from the change directory
2. **Group tasks by phase** (Setup, Core, Testing, etc.)
3. **Convert to Auto Run checkbox format**
4. **Save to `Auto Run Docs/`** with descriptive filename

**Auto Run Document Format:**

```markdown
# [Change Title] - Implementation Tasks

## Context

This document implements OpenSpec change: `<change-id>`

**Proposal:** openspec/changes/<change-id>/proposal.md
**Design:** openspec/changes/<change-id>/design.md (if exists)

## Phase 1: Setup

- [ ] T001 Initial configuration
- [ ] T002 Database migrations

## Phase 2: Core Implementation

- [ ] T003 Main feature implementation
- [ ] T004 Supporting functionality

## Phase 3: Testing & Documentation

- [ ] T005 Add unit tests
- [ ] T006 Update documentation

## Completion Checklist

After all tasks complete:
- [ ] Run `openspec validate <change-id> --strict`
- [ ] Review changes and create PR
- [ ] After deployment, run `/openspec.archive`
```

### Step 4: Configure Auto Run

1. **Open the Right Bar** in Maestro (`Cmd/Ctrl + B`)
2. **Select the "Auto Run" tab**
3. **Set the Auto Run folder** to `Auto Run Docs/`
4. **Select your generated document** from the list

### Step 5: Start Automated Implementation

Auto Run will:
- Read each task from the document
- Execute tasks sequentially (respecting phase order)
- Mark tasks as completed (`[x]`) with implementation notes
- Handle parallel tasks when marked with `[P]`

**To start:** Click "Run" or press `Cmd/Ctrl + Enter` in the Auto Run panel.

## Advanced: Parallel Implementation with Git Worktrees

For larger changes with independent components, use git worktrees to implement multiple phases in parallel.

### What are Worktrees?

Git worktrees let you have multiple working directories for the same repository:
- Multiple AI agents working on different branches simultaneously
- Isolated changes that won't conflict during development
- Easy merging when components are complete

### Setting Up Parallel Implementation

1. **Identify Independent Phases**: Look for phases that don't depend on each other

2. **Enable Worktree Mode in Auto Run**:
   - Toggle the worktree option in the Auto Run panel
   - Maestro creates an isolated working directory for each session
   - Each session gets its own feature branch

3. **Assign Phases to Sessions**:
   ```
   Session 1: Phase 1 (Setup) + Phase 2a (Core API)
   Session 2: Phase 2b (Core UI) - if independent from API
   Session 3: Phase 3 (Testing) - after Phases 2a and 2b merge
   ```

4. **Merge When Complete**:
   - Each session commits to its feature branch
   - Use Maestro's git integration to merge branches
   - Resolve any conflicts before final merge

### Worktree Commands

Maestro handles worktrees automatically, but for reference:

```bash
# Create a worktree for a feature branch
git worktree add ../openspec-<change-id>-worktree <branch-name>

# List existing worktrees
git worktree list

# Remove a worktree when done
git worktree remove ../openspec-<change-id>-worktree
```

## Task Markers

Auto Run understands these markers from OpenSpec:

| Marker | Meaning |
|--------|---------|
| `- [ ]` | Incomplete task |
| `- [x]` | Completed task |
| `[P]` | Parallelizable (can run with other `[P]` tasks) |
| `T001` | Task identifier (preserves OpenSpec numbering) |

**Example:**
```markdown
- [ ] T001 Setup project structure
- [ ] T002 [P] Configure database connection
- [ ] T003 [P] Configure cache layer
- [ ] T004 Integrate database and cache
```

Tasks T002 and T003 can run in parallel, but T004 waits for both to complete.

## Best Practices

1. **Complete Setup Phase First**: Always complete Phase 1 before parallelizing later phases

2. **Respect Dependencies**: Tasks without `[P]` should run sequentially

3. **Validate After Each Phase**: Run `openspec validate` to catch issues early

4. **Keep Tasks Atomic**: Each task should be independently testable

5. **Reference Specs**: Include links to relevant spec files for context

6. **Document Decisions**: Add notes when implementation deviates from original plan

## Integration with OpenSpec Workflow

After Auto Run completes all tasks:

1. **Run validation:**
   ```bash
   openspec validate <change-id> --strict
   ```

2. **Create pull request** with all changes

3. **After deployment**, archive the change:
   ```bash
   openspec archive <change-id> --yes
   ```

## Troubleshooting

### Tasks Not Executing

- Check Auto Run is pointed to the correct document
- Verify tasks use proper checkbox format `- [ ]`
- Ensure no syntax errors in the markdown

### Worktree Conflicts

- Merge main branch into worktree before starting
- Keep worktree branches short-lived
- Clean up worktrees promptly after merging

### Validation Failures

- Review spec deltas match implementation
- Ensure all scenarios are satisfied
- Check for missing requirements

---

*This implement command is a Maestro-specific addition to the OpenSpec workflow.*
