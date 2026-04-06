---
name: planning
description: "Create a plan and break it into implementable tasks. Use when asked to plan, break down work, estimate scope, or before implementing anything non-trivial."
---

# Planning

A three-phase process that produces two artifacts: **PLAN.md** (what and why) and **TODO.md** (how, in what order). Each phase ends with an explicit user approval gate.

## When to Use

- You have a spec or requirements and need to plan before implementing
- A task feels too large or vague to start
- Work needs to be parallelized across multiple agents or sessions
- You need to communicate scope to a human
- The user asks to "create a plan", "break this down", or "plan this out"

**When NOT to use:** Single-file changes with obvious scope, or when the user already has a well-defined task list.

---

## Phase 1: Plan

Iterate with the user to produce a clear, agreed-upon plan. Operate in **read-only mode** — no code, only analysis and conversation.

### Process

1. **Understand the task.** Parse what the user wants. Identify unknowns and ambiguities.
2. **Ask clarifying questions.** Expected behavior, constraints, scope boundaries, existing patterns. **Wait for answers** before proceeding.
3. **Analyze the codebase.** Find related files, existing patterns, tests. Identify affected files. Check for breaking change risks.
4. **Draft the plan.** Present it to the user for feedback.
5. **Iterate.** Revise based on feedback. Repeat until the user is satisfied.

### Plan Structure

The plan should cover:

- **Overview** — 1-2 sentence summary of what we're building
- **Architecture Decisions** — key choices and their rationale
- **Files Affected** — with action (create/modify/delete) and purpose
- **Risks and Mitigations** — what could go wrong and how to handle it
- **Open Questions** — anything still unresolved

### Gate

When the user confirms the plan looks good:

1. Write the final plan to **PLAN.md** in the project root.
2. Tell the user you're moving to task breakdown.

**Do NOT proceed to Phase 2 until the user explicitly approves the plan.**

---

## Phase 2: Task Breakdown

Decompose the approved plan into ordered, implementable tasks. Read [`task-breakdown.md`](task-breakdown.md) in this directory for the detailed breakdown process.

### Process

1. Read `task-breakdown.md` for the full process (dependency graphs, vertical slicing, task structure, sizing).
2. Break the plan into small, verifiable tasks with acceptance criteria.
3. Order tasks by dependency, insert checkpoints.
4. Present the task breakdown to the user for feedback.
5. Iterate until the user approves.

### Gate

When the user approves the task breakdown:

1. Write the final task list to **TODO.md** in the project root.
2. Ensure **PLAN.md** is still up-to-date (update if the plan evolved during breakdown).
3. **Stop.** The user will decide when and how to begin implementation.

**Do NOT begin implementation. Do NOT spawn a new session.**

---

## Phase 3: Finalize

Before stopping, verify:

- [ ] **PLAN.md** exists and reflects the current agreed-upon plan
- [ ] **TODO.md** exists with ordered tasks, acceptance criteria, and checkpoints
- [ ] Both files are consistent with each other
- [ ] The user has explicitly approved both

Report the status of these files and stop.
