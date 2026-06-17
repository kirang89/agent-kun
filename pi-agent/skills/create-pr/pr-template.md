# Creating a PR

A reviewer should grasp a PR in under a minute. The diff already shows **how** — your job is **why** and a scannable map of **what changed**. Never narrate the code.

Be extremely concise. Sacrifice grammar for the sake of concision.

## Title

Imperative, specific, minimal — `Fix race in token refresh`, not `Updates`.

## Description

```markdown
## Context (optional)
<1 line of background a reviewer needs that the diff and Why won't give — where this fits in a larger effort, prior art, or a constraint.>

## Why
<1–2 sentences in plain, user-centric language: lead with the user-facing problem and why the reviewer should care. Implementation detail is fine, but don't bury that hook. For a bug fix, give the root cause, not just the symptom. Closes #123.>

## What
- <key change in plain language; group by area, not file>
- <2–5 bullets max; omit section if title + diff are self-evident>

## Breaking changes (optional)
<what breaks and the migration path for consumers>

## Deployment notes (optional)
<env vars, migrations, feature flags, or ordering the deployer must act on>

## Notes (optional)
<other design decisions, tradeoffs, risks, or follow-ups the diff won't reveal>
```

## Examples

Good:
- Added a loading spinner while the page fetches data so users don't see a blank screen.
- Fixed the sidebar overflowing on small screens by adding `min-w-0`
- The title now truncates instead of pushing the badge off-screen

Bad:
- This PR introduces an elegant loading state management system that replaces the previous approach of rendering an empty container, ensuring a seamless user experience during asynchronous data fetching operations.
- Previously, we were using a raw div without constraints, which caused the badge to overflow. This new approach leverages Tailwind's min-width utility to create a more robust layout that gracefully handles long titles.

## Keep it minimal

- Omit any section that adds no signal — a trivial PR may be just a title + one line.
- No filler openers ("This PR…", "In this change we…") or flowery language ("elegant", "seamless", "robust").
- A bug fix reads best when the `Why` walks through the broken behavior in plain terms, then the fix, before the `What` bullets list the details

Final pass: cut every sentence a reviewer could infer from the diff.
