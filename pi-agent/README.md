# pi-agent

Personal pi configuration repository.

This repo tracks the local pi resources I keep under `~/.pi/agent/` and sync into version control:

- custom extensions
- reusable skills
- themes
- settings
- shared `AGENTS.md` guidance

## Repository Layout

- `AGENTS.md` — global instructions for coding agents
- `extensions/` — local pi extensions
- `skills/` — local pi skills
- `themes/` — custom themes
- `settings.json` — pi settings and package configuration

## Local Extensions

These extensions live in `extensions/` and are part of the repo:

- `comment.ts` — `/comment` command to open the last assistant message in `$EDITOR` and load the result back into the editor
- `evaluate-test-harness` — `/evaluate-test-harness` command for assessing a project's test suite against a 19-category rubric
- `interactive-form` — `interactive_form` tool for collecting structured user input through a tabbed form UI
- `notify.ts` — desktop notifications when pi finishes a turn and is waiting for input
- `pi-splash.ts` — `/splash` welcome header with the pi logo, quick tips, and a loaded-resources summary
- `refine-plan.ts` — `/refine-plan` command for interrogating and tightening implementation plans
- `review.ts` — `/review` and `/end-review` commands for reviewing PRs, branches, commits, or uncommitted changes
- `statusline.ts` — `/statusline` command for toggling a cleaner footer/status line
- `turn-stats.ts` — `/turn-stats` command toggling a persistent per-turn token/TPS widget
- `wiki` — `/wiki` command that builds an Obsidian research wiki for a topic from the current session via an isolated subagent

## Local Skills

These skills live in `skills/` and are available to pi on demand:

- `adr` — write ADRs for architecturally significant decisions
- `caveman` — ultra-compressed communication mode that cuts token usage while keeping technical accuracy
- `context7` — fetch up-to-date library and framework documentation
- `domain-model` — grill a plan against the existing domain model and sharpen terminology
- `firecrawl` — fast, reliable web search, scraping, and interaction via Firecrawl
- `frontend-design` — design and implement distinctive, production-ready frontend interfaces
- `git` — git best practices for commits, pulling, and worktrees
- `github` — interact with GitHub via the `gh` CLI
- `grill-me` — interview the user relentlessly about a plan until reaching shared understanding
- `grill-with-docs` — grilling session that challenges a plan against the domain model and docs
- `improve-codebase-architecture` — identify architectural refactoring opportunities
- `playwright-cli` — browser automation and web testing workflows
- `tufte-design-visualization` — apply Edward Tufte's principles to data visualisations and analytical UIs
- `update-changelog` — guidance for changelog updates

## External Packages

`settings.json` also enables these external pi packages:

- `git:https://github.com/badlogic/pi-diff-review`
- `git:github.com/picassio/pi-cc-patch`
- `npm:pi-bash-live-view`
- `npm:@kiranpg/pi-sentry`

## Syncing From `~/.pi/agent`

This repo is used as a checked-in copy of the live pi setup. A typical sync looks like this:

```bash
rsync -a ~/.pi/agent/extensions/ ./extensions/
rsync -a ~/.pi/agent/skills/ ./skills/
```

After syncing, remove any repo-only resources that no longer exist in `~/.pi/agent`, review the diff, then commit.
