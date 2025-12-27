# OpenSpec Proposal - Stage 1: Creating Changes

You are helping the user create an OpenSpec change proposal. This is Stage 1 of the OpenSpec workflow.

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## When to Create a Proposal

Create a proposal when making substantial modifications:

- Adding new features or functionality
- Implementing breaking changes (APIs, schemas)
- Changing architectural patterns
- Optimizing performance that affects behavior
- Updating security patterns

**Skip proposal for:** bug fixes, typos, comments, non-breaking dependency updates, and configuration-only changes.

## Stage 1 Workflow

Follow these steps to create a complete change proposal:

### Step 1: Review Existing Context

Before creating a proposal:

1. **Check `openspec/project.md`** for project conventions and context
2. **Run `openspec list`** to see active changes (avoid conflicts)
3. **Run `openspec list --specs`** to view existing capabilities
4. **Use `openspec show [spec]`** to review current specification state

### Step 2: Choose a Unique Change-ID

- Use **kebab-case** naming
- Use **verb-led** format:
  - `add-` for new features
  - `update-` for modifications
  - `remove-` for deprecations
  - `refactor-` for structural changes
- Ensure uniqueness (append `-2` or `-3` if needed)

**Examples:** `add-user-authentication`, `update-api-v2-endpoints`, `remove-legacy-cache`

### Step 3: Scaffold Directory Structure

Create the following structure:

```
openspec/changes/[change-id]/
├── proposal.md           # What and why
├── tasks.md              # Implementation checklist
├── design.md             # Optional: technical decisions
└── specs/                # Spec deltas
    └── [capability]/
        └── spec.md
```

### Step 4: Write proposal.md

Create `proposal.md` with these sections:

```markdown
# [Change Title]

## Why

1–2 sentences explaining the problem or opportunity this addresses.

## What Changes

- Bulleted list of modifications
- Mark breaking changes as **BREAKING**
- Be specific about affected components

## Impact

- List affected specs
- List affected code modules
- List affected external systems
```

### Step 5: Create Spec Deltas

In `specs/[capability]/spec.md`, use operation headers:

```markdown
## ADDED Requirements

New, standalone capabilities that don't exist yet.

### REQ-001: Requirement Title

Description of the new requirement.

#### Scenario: Success case
- **WHEN** specific conditions are met
- **THEN** expected outcome occurs

## MODIFIED Requirements

Changed behavior or scope of existing requirements.

### REQ-002: Existing Requirement (Modified)

Updated description reflecting new behavior.

#### Scenario: Updated behavior
- **WHEN** new conditions apply
- **THEN** new outcome expected

## REMOVED Requirements

Deprecated features being removed.

### REQ-003: Deprecated Feature

**Reason:** Explain why this is being removed
**Migration:** Describe how users should migrate

## RENAMED Requirements

Name-only changes (no behavior change).

### REQ-004: Old Name → New Name
```

**Critical Rules:**
- Include at least one `#### Scenario:` per requirement (use 4 hashtags)
- Use `**WHEN**` and `**THEN**` bullets within scenarios
- For MODIFIED requirements, copy the entire existing requirement block and edit it
- Header text must match exactly (whitespace-insensitive) when modifying

### Step 6: Create tasks.md

Create a structured implementation checklist:

```markdown
# Implementation Tasks

## Phase 1: Setup

- [ ] T001 Initial setup task
- [ ] T002 Configuration task

## Phase 2: Core Implementation

- [ ] T003 Main feature implementation
- [ ] T004 Supporting functionality
- [ ] T005 Integration work

## Phase 3: Testing & Documentation

- [ ] T006 Add unit tests
- [ ] T007 Add integration tests
- [ ] T008 Update documentation
```

### Step 7: Optional - Create design.md

Create `design.md` only when needed for:
- Cross-cutting changes affecting multiple systems
- New dependencies or external integrations
- Significant data model changes
- Security or performance complexity

**design.md sections:**
- Context
- Goals / Non-Goals
- Key Decisions
- Risks & Trade-offs
- Migration Plan (if applicable)
- Open Questions

### Step 8: Validate Before Sharing

Always validate your proposal:

```bash
openspec validate <change-id> --strict
```

Fix all issues identified by validation. Use `openspec show <change-id> --json --deltas-only` for debugging.

## Key Principles

- **Specs are truth** - The `specs/` directory reflects what is built
- **Changes are proposals** - The `changes/` directory contains planned modifications
- **Ask before ambiguity** - If the request is unclear, ask 1–2 clarifying questions before scaffolding

## Helpful Commands

| Command | Purpose |
|---------|---------|
| `openspec list` | View active changes |
| `openspec list --specs` | List existing capabilities |
| `openspec show [item]` | Display change or spec details |
| `openspec validate [item] --strict` | Comprehensive validation |
