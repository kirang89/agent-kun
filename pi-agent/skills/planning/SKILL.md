---
name: planning
description: Create a detailed implementation plan with checkpoints before coding. Use when the prompt contains "create a plan" or when asked to plan before implementing.
---

# Planning Skill

Create a detailed, checkpoint-based implementation plan before writing any code. This ensures alignment on approach, catches issues early, and maintains code quality throughout.

## Process

### Phase 1: Understand the Task

1. **Parse the request**: Identify what the user wants to achieve
2. **Identify unknowns**: List anything unclear or ambiguous
3. **Ask clarifying questions**: Before planning, ask the user:
   - What is the expected behavior/outcome?
   - Are there constraints (performance, compatibility, dependencies)?
   - Are there existing patterns in the codebase to follow?
   - What's the scope boundary (what's explicitly out of scope)?

4. **Wait for answers** before proceeding to Phase 2

### Phase 2: Analyze the Codebase

1. **Explore relevant code**:
   ```bash
   # Find related files
   fd -e ts -e js -e py [relevant-pattern]
   
   # Search for similar patterns
   rg -l "pattern" --type [lang]
   
   # Check existing tests
   fd -e test.ts -e spec.ts -e _test.py
   ```

2. **Identify all affected files**:
   - Files that need **modification** (and what changes)
   - Files that need **creation** (and their purpose)
   - Files that need **deletion** (and why)
   - Test files that need updates
   - Documentation that needs updates
   - Configuration files affected (package.json, tsconfig, etc.)
   
   ```bash
   # Helpful commands to identify scope
   rg -l "FunctionOrClassToChange" --type ts
   fd "related-name" -e ts -e test.ts
   ```

3. **Check for**:
   - Existing patterns to follow
   - Potential conflicts with current code
   - Breaking change risks

### Phase 3: Create the Plan

Structure the plan with **checkpoints** - each checkpoint is a meaningful, verifiable unit of work.

**Identify parallelization opportunities**:
- Look for independent workstreams that don't share dependencies
- Group checkpoints into parallel tracks where possible
- Mark dependencies explicitly (e.g., "Checkpoint 3 depends on 1 and 2")

```markdown
# Implementation Plan: [Task Title]

## Overview
[1-2 sentence summary of what will be accomplished]

## Files Affected

| File | Action | Purpose |
|------|--------|---------|
| `src/components/Button.tsx` | Modify | Add loading state prop |
| `src/components/Button.test.tsx` | Modify | Add tests for loading state |
| `src/hooks/useAsync.ts` | Create | New hook for async operations |
| `src/types/common.ts` | Modify | Add LoadingState type |
| `docs/components.md` | Modify | Document new Button props |
| `src/legacy/oldButton.tsx` | Delete | Remove deprecated component |

**Summary**: [X] files modified, [Y] files created, [Z] files deleted

## Prerequisites
- [ ] [Any setup or preparation needed]

## Execution Order

```
[Visual representation of parallel vs sequential work]

Track A: [Checkpoint 1] ──→ [Checkpoint 3] ──→ [Checkpoint 5]
                                              ↘
Track B: [Checkpoint 2] ──→ [Checkpoint 4] ────→ [Checkpoint 6: Integration]
```

**Parallel tracks** (can be done simultaneously):
- Track A: [Description - e.g., "Backend API changes"]
- Track B: [Description - e.g., "Frontend components"]

**Sync points** (where tracks must merge):
- After Checkpoints X & Y: [Why sync is needed]

## Checkpoints

### Checkpoint 1: [Descriptive Name]
**Goal**: [What this checkpoint accomplishes]
**Files**:
- `path/to/file.ts` - [what changes]
- `path/to/other.ts` - [what changes]

**Changes**:
1. [Specific change 1]
2. [Specific change 2]

**Verification**:
- [ ] Lint passes
- [ ] Tests pass
- [ ] Build succeeds
- [ ] [Specific acceptance criteria]

---

### Checkpoint 2: [Descriptive Name]
[Same structure...]

---

### Checkpoint N: Final Verification
**Goal**: Ensure everything works together
**Verification**:
- [ ] All tests pass
- [ ] No lint errors
- [ ] Build succeeds
- [ ] Manual verification of [key functionality]
- [ ] Documentation updated

## Risks & Mitigations
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| [Risk 1] | Low/Med/High | [How to handle] |

## Out of Scope
- [Explicitly excluded items]

## Rollback Plan
[How to revert if something goes wrong]
```

### Phase 4: Review & Approval

Present the plan and ask:

```
## 📋 Plan Ready for Review

I've created a plan with [N] checkpoints across [M] parallel tracks.

**Files affected**: [X] modified, [Y] created, [Z] deleted
<details>
<summary>View all files</summary>

| File | Action |
|------|--------|
| `path/to/file.ts` | Modify |
| `path/to/new.ts` | Create |
| ... | ... |

</details>

**Execution overview**:
- Track A ([X] checkpoints): [Brief description]
- Track B ([Y] checkpoints): [Brief description]
- Sync points: [Where tracks merge]

**Checkpoints**:
- [Checkpoint 1 summary]
- [Checkpoint 2 summary]
- ...

**Estimated scope**: [Small/Medium/Large]

**Questions before approval**:
1. Does this approach align with your expectations?
2. Any checkpoints you'd like to combine or split?
3. Should any sequential work be parallelized (or vice versa)?
4. Anything missing from the scope?

👉 **Please approve the plan to proceed, or let me know what adjustments to make.**
```

**Do not proceed with implementation until explicit approval.**

### Phase 5: Execute with Checkpoints

After approval, for **each checkpoint**:

1. **Implement** the changes described

2. **Verify** by running:
   ```bash
   # Detect project type and run appropriate commands
   # For Node.js/TypeScript:
   npm run lint 2>&1 || yarn lint 2>&1 || pnpm lint 2>&1
   npm test 2>&1 || yarn test 2>&1 || pnpm test 2>&1
   npm run build 2>&1 || yarn build 2>&1 || pnpm build 2>&1
   
   # For Python:
   ruff check . || flake8 . || pylint **/*.py
   pytest
   
   # For Rust:
   cargo clippy
   cargo test
   cargo build
   
   # For Go:
   go vet ./...
   go test ./...
   go build ./...
   ```

3. **Reflect** after each checkpoint:
   ```markdown
   ### Checkpoint [N] Complete ✓
   
   **What was done**:
   - [Actual changes made]
   
   **Verification results**:
   - Lint: ✓/✗
   - Tests: ✓/✗ ([X] passed, [Y] failed)
   - Build: ✓/✗
   
   **Reflection**:
   - Does this fit the overall goal? [Yes/Needs adjustment]
   - Any unexpected issues? [None/Description]
   - Course correction needed? [No/Description of adjustment]
   
   **Next**: Proceeding to Checkpoint [N+1]...
   ```

4. **Course-correct** if needed:
   - If tests fail, fix before proceeding
   - If approach isn't working, pause and discuss alternatives
   - If scope creep detected, flag it and confirm with user

5. **Repeat** until all checkpoints complete

### Phase 6: Final Summary

After all checkpoints:

```markdown
# ✅ Implementation Complete

## Summary
[What was accomplished]

## Changes Made
| File | Change Type | Description |
|------|-------------|-------------|
| `file.ts` | Modified | [What changed] |
| `new-file.ts` | Created | [Purpose] |

## Verification
- All [N] checkpoints completed
- Lint: ✓
- Tests: ✓ ([X] total, all passing)
- Build: ✓

## Follow-up Recommendations
- [Any suggested next steps]
- [Technical debt to address later]
- [Documentation to update]
```

## Guidelines

### What Makes a Good Checkpoint?

- **Atomic**: One logical unit of work
- **Verifiable**: Can run tests/lint/build to confirm correctness
- **Reversible**: Easy to undo if needed
- **Meaningful**: Provides value on its own (not just "create empty file")
- **Independent where possible**: Minimize dependencies to enable parallel execution

### Checkpoint Size

- **Too small**: "Add import statement" (combine with usage)
- **Just right**: "Add user validation with tests"
- **Too large**: "Implement entire feature" (break down further)

### Parallelization

**Identify parallel tracks when**:
- Changes touch independent modules/packages
- Frontend and backend work can proceed separately
- Multiple features don't share data structures
- Tests can be written alongside implementation

**Common parallel patterns**:
- **API + Consumer**: Build API (Track A) while building the client/UI (Track B)
- **Core + Tests**: Implement logic while writing test cases
- **Multi-module**: Changes to independent packages/services
- **Infra + Code**: Configuration/setup alongside implementation

**Sync points are needed when**:
- Integration between tracks (API meets frontend)
- Shared types or interfaces are finalized
- Database migrations must be applied before dependent code
- One track's output is another's input

**Mark dependencies clearly**:
```
Checkpoint 4 [Track B]
  └── Depends on: Checkpoint 2 [Track A] (needs API types)
```

### When to Pause and Ask

- Unexpected complexity discovered
- Multiple valid approaches with tradeoffs
- Potential breaking changes detected
- Scope seems to be expanding
- Tests are failing in unexpected ways

## Example Checkpoint Patterns

### Adding a New Feature
1. Add types/interfaces
2. Implement core logic with tests
3. Add integration points
4. Update documentation

### Refactoring
1. Add characterization tests (if missing)
2. Extract/restructure code
3. Verify behavior unchanged
4. Clean up and optimize

### Bug Fix
1. Add failing test that reproduces bug
2. Implement fix
3. Verify test passes
4. Add edge case tests
