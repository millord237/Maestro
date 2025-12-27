# OpenSpec Apply - Stage 2: Implementing Changes

You are helping the user implement an approved OpenSpec change proposal. This is Stage 2 of the OpenSpec workflow.

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Prerequisites

**IMPORTANT: Do not start implementation until the proposal is reviewed and approved.**

The approval gate ensures alignment between stakeholders before coding begins. If the proposal hasn't been approved yet, remind the user to get approval first.

## Implementation Workflow

### Step 1: Review the Proposal

Read `proposal.md` to understand:
- **Why** - The problem or opportunity being addressed
- **What** - The specific changes being made
- **Impact** - Which specs, code, and systems are affected

```bash
openspec show <change-id>
```

### Step 2: Review Technical Decisions

If `design.md` exists, review it for:
- Key architectural decisions
- Chosen approaches and trade-offs
- Migration plan (if applicable)
- Known risks to watch for

### Step 3: Study the Tasks

Read `tasks.md` for the implementation checklist:
- Tasks are numbered and ordered by dependency
- Each phase should be completed before moving to the next
- Tasks with `[P]` marker can run in parallel

### Step 4: Execute Tasks Sequentially

For each task in `tasks.md`:

1. **Read the task description** carefully
2. **Implement the required changes**
3. **Verify the implementation** works as expected
4. **Test related functionality** to catch regressions
5. **Mark the task complete** by changing `- [ ]` to `- [x]`

```markdown
# Before
- [ ] T001 Implement user authentication endpoint

# After
- [x] T001 Implement user authentication endpoint
```

### Step 5: Confirm Completion

Before marking the change as complete:

1. **Verify every task** is checked (`- [x]`)
2. **Run validation** to ensure specs are consistent:
   ```bash
   openspec validate <change-id> --strict
   ```
3. **Run project tests** to verify no regressions
4. **Review the spec deltas** match what was implemented

## Implementation Guidelines

### Following Task Order

Tasks are dependency-ordered. Complete them in sequence unless marked with `[P]`:

```markdown
- [x] T001 Setup database migration       # Do first
- [x] T002 Create User model              # Do second
- [x] T003 [P] Add unit tests             # Can run parallel with T004
- [x] T004 [P] Add integration tests      # Can run parallel with T003
- [x] T005 Update API documentation       # Do after T003 & T004
```

### Handling Blockers

If you encounter a blocker:

1. **Document the issue** in the task notes
2. **Ask clarifying questions** if requirements are unclear
3. **Update the proposal** if scope needs adjustment (requires re-approval)
4. **Don't skip tasks** - blockers should be resolved, not bypassed

### Quality Checks

For each task:

- **Code quality** - Follow project conventions from `openspec/project.md`
- **Test coverage** - Add tests for new functionality
- **Documentation** - Update docs if behavior changes
- **Type safety** - Ensure type definitions are complete

## Helpful Commands

| Command | Purpose |
|---------|---------|
| `openspec show <change-id>` | Display full change details |
| `openspec validate <change-id> --strict` | Validate change consistency |
| `openspec list` | View all active changes |
| `openspec diff <change-id>` | Show spec differences |

## When Implementation is Complete

Once all tasks are marked `[x]` and validation passes:

1. **Commit your changes** with a descriptive message referencing the change-id
2. **Create a pull request** for review
3. **Wait for deployment** before proceeding to Stage 3 (Archive)

```bash
git add .
git commit -m "feat: implement <change-id> - <brief description>"
```

## Key Principles

- **Complete tasks in order** - Dependencies exist for a reason
- **Verify before marking done** - Each `[x]` represents tested, working code
- **Don't shortcut** - If something is unclear, ask rather than assume
- **Keep specs in sync** - Implemented behavior should match spec deltas
