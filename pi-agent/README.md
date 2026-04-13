# pi-agent

Personal pi configuration repository.

This repo tracks the local pi resources I keep under `~/.pi/agent/` and sync into version control:

- custom extensions
- reusable skills
- agent definitions
- themes
- settings
- shared `AGENTS.md` guidance

## Repository Layout

- `AGENTS.md` — global instructions for coding agents
- `agents/` — custom agent definitions
- `extensions/` — local pi extensions
- `skills/` — local pi skills
- `themes/` — custom themes
- `settings.json` — pi settings and package configuration

## Local Extensions

These extensions live in `extensions/` and are part of the repo:

- `evaluate-test-harness` — `/evaluate-test-harness` command for assessing a project's test suite against a 19-category rubric
- `interactive-form` — `interactive_form` tool for collecting structured user input through a tabbed form UI
- `notify.ts` — desktop notifications when pi finishes a turn and is waiting for input
- `refine-plan.ts` — `/refine-plan` command for interrogating and tightening implementation plans
- `review.ts` — `/review` and `/end-review` commands for reviewing PRs, branches, commits, or uncommitted changes
- `startup-summary.ts` — startup summary showing loaded skills/extensions and AGENTS.md status
- `statusline.ts` — `/statusline` command for toggling a cleaner footer/status line

## Local Skills

These skills live in `skills/` and are available to pi on demand:

- `adr` — write ADRs for architecturally significant decisions
- `code-review` — review diffs for complexity, test gaps, docs gaps, and dependency changes
- `context7` — fetch up-to-date library and framework documentation
- `frontend-design` — design and implement polished frontend interfaces
- `git` — git workflow and commit guidance
- `github` — interact with GitHub via `gh`
- `improve-codebase-architecture` — identify architectural refactoring opportunities
- `planning` — create plans and break work into implementable tasks
- `playwright-cli` — browser automation and web testing workflows
- `update-changelog` — guidance for changelog updates
- `web-search` — lightweight web search via Jina Search API

## External Packages

`settings.json` also enables these external pi packages:

- `npm:pi-subagents`
- `git:github.com/ghoseb/pi-splash`
- `git:https://github.com/badlogic/pi-diff-review`
- `npm:pi-magic-docs`

## Syncing From `~/.pi/agent`

This repo is used as a checked-in copy of the live pi setup. A typical sync looks like this:

```bash
rsync -a ~/.pi/agent/extensions/ ./extensions/
rsync -a ~/.pi/agent/skills/ ./skills/
```

After syncing, remove any repo-only resources that no longer exist in `~/.pi/agent`, review the diff, then commit.
