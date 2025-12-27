# OpenSpec Archive - Stage 3: Archiving Changes

You are helping the user archive a completed OpenSpec change. This is Stage 3 of the OpenSpec workflow.

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Prerequisites

**IMPORTANT: Archive only after deployment.**

Stage 3 should be run after:
1. All tasks in `tasks.md` are marked complete (`- [x]`)
2. The code has been reviewed and merged
3. The changes have been deployed to production (or the target environment)

## Archive Workflow

### Step 1: Verify Completion

Before archiving, confirm:

```bash
# Check all tasks are complete
openspec show <change-id>

# Validate the change passes all checks
openspec validate <change-id> --strict
```

### Step 2: Archive the Change

Move the change directory to archive with a date prefix:

```bash
openspec archive <change-id> --yes
```

This command:
1. **Moves** `openspec/changes/<change-id>/` to `openspec/changes/archive/YYYY-MM-DD-<change-id>/`
2. **Updates** `openspec/specs/` with any capability changes
3. **Validates** the archived change passes all checks

### Step 3: Verify Archive Success

After archiving:

```bash
# Confirm change is no longer in active list
openspec list

# Verify specs were updated correctly
openspec validate --strict
```

## Manual Archive Process

If you need to archive manually (without the CLI):

### 1. Create Archive Directory

```bash
mkdir -p openspec/changes/archive/$(date +%Y-%m-%d)-<change-id>
mv openspec/changes/<change-id>/* openspec/changes/archive/$(date +%Y-%m-%d)-<change-id>/
rmdir openspec/changes/<change-id>
```

### 2. Update Main Specs

If the change modified existing specs, merge the deltas:

1. **For ADDED requirements** - Copy to `openspec/specs/<capability>/spec.md`
2. **For MODIFIED requirements** - Replace the original requirement with the modified version
3. **For REMOVED requirements** - Delete from `openspec/specs/<capability>/spec.md`
4. **For RENAMED requirements** - Update the name in place

### 3. Clean Up Spec Deltas

The archived change should retain its spec deltas for historical reference, but the main `specs/` directory should now reflect the deployed state.

## Archive Options

```bash
# Standard archive (prompts for confirmation)
openspec archive <change-id>

# Skip confirmation prompt
openspec archive <change-id> --yes
openspec archive <change-id> -y

# Skip spec updates (for tooling-only changes)
openspec archive <change-id> --skip-specs
```

**Note:** Always pass the change-id explicitly. Don't rely on positional inference.

## Validation After Archive

Run comprehensive validation to confirm:

```bash
openspec validate --strict
```

This validates:
- All archived changes pass validation
- Main specs are internally consistent
- No orphaned references exist

## Common Issues

### Spec Conflicts

If archiving fails due to spec conflicts:

1. **Review the conflict** - Check which requirements clash
2. **Resolve manually** - Edit `specs/<capability>/spec.md` to resolve
3. **Re-run validation** - Ensure consistency after manual fixes
4. **Document resolution** - Note any manual interventions

### Missing Archive Directory

If the archive directory doesn't exist:

```bash
mkdir -p openspec/changes/archive
```

### Partial Archive

If archive was interrupted:

1. **Check for duplicate files** in both `changes/` and `changes/archive/`
2. **Complete the move** manually if needed
3. **Run validation** to confirm state is correct

## Post-Archive Checklist

After successfully archiving:

- [ ] Change is in `openspec/changes/archive/YYYY-MM-DD-<change-id>/`
- [ ] Active change list (`openspec list`) no longer shows it
- [ ] Main specs reflect deployed state
- [ ] Validation passes (`openspec validate --strict`)
- [ ] Git commit includes the archive change

```bash
git add .
git commit -m "chore: archive <change-id> after deployment"
```

## Key Principles

- **Archive promptly** - Don't let changes linger after deployment
- **Keep history** - Archived changes serve as documentation
- **Specs are truth** - After archiving, `specs/` represents deployed reality
- **Validate always** - Run validation before and after archiving
