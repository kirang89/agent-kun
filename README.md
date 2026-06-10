# agent-kun

My custom agent configuration — skills, extensions, and themes.


## Extensions

Custom tools and commands that extend the agent's capabilities.

| Extension | Description |
|-----------|-------------|
| [comment.ts](pi-agent/extensions/comment.ts) | `/comment` command to open the last assistant message in `$EDITOR` and load the quoted result back into the editor |
| [evaluate-test-harness](pi-agent/extensions/evaluate-test-harness/) | `/evaluate-test-harness` command to analyze a project's test suite against a 19-category rubric |
| [interactive-form](pi-agent/extensions/interactive-form/) | `interactive_form` tool — tabbed form UI for gathering multiple user inputs |
| [notify.ts](pi-agent/extensions/notify.ts) | Desktop notification via OSC 777 when the agent finishes and is waiting for input |
| [pi-splash.ts](pi-agent/extensions/pi-splash.ts) | `/splash` welcome header with the pi logo, quick tips, and a loaded-resources summary |
| [refine-plan.ts](pi-agent/extensions/refine-plan.ts) | `/refine-plan` command to interrogate a plan until every ambiguity is resolved |
| [review.ts](pi-agent/extensions/review.ts) | `/review` and `/end-review` commands for code review (PR, branch, commit, or uncommitted changes) |
| [statusline.ts](pi-agent/extensions/statusline.ts) | `/statusline` command for a minimal footer showing active tool, context usage, git branch, and model |
| [turn-stats.ts](pi-agent/extensions/turn-stats.ts) | `/turn-stats` command toggling a persistent per-turn token/TPS widget |
| [wiki](pi-agent/extensions/wiki/) | `/wiki` command that builds an Obsidian research wiki for a topic from the current session via an isolated subagent |

## Skills

Task-specific instructions that guide the agent for particular workflows.

| Skill | Description |
|-------|-------------|
| [adr](pi-agent/skills/adr/) | Write Architecture Decision Records for architecturally significant choices |
| [caveman](pi-agent/skills/caveman/) | Ultra-compressed communication mode that cuts token usage while keeping technical accuracy |
| [context7](pi-agent/skills/context7/) | Fetch up-to-date library and framework documentation from Context7 |
| [domain-model](pi-agent/skills/domain-model/) | Grill a plan against the existing domain model and sharpen terminology |
| [firecrawl](pi-agent/skills/firecrawl/) | Fast, reliable web search, scraping, and interaction via Firecrawl |
| [frontend-design](pi-agent/skills/frontend-design/) | Design and implement distinctive, production-ready frontend interfaces |
| [git](pi-agent/skills/git/) | Git best practices: atomic commits, conventional format, clean history, worktrees |
| [github](pi-agent/skills/github/) | GitHub CLI (`gh`) for issues, PRs, CI runs, and API queries |
| [grill-me](pi-agent/skills/grill-me/) | Interview the user relentlessly about a plan until reaching shared understanding |
| [grill-with-docs](pi-agent/skills/grill-with-docs/) | Grill a plan against the domain model and documentation, updating docs inline |
| [improve-codebase-architecture](pi-agent/skills/improve-codebase-architecture/) | Find architectural improvement opportunities and deepen shallow modules |
| [playwright-cli](pi-agent/skills/playwright-cli/) | Browser automation for web testing, screenshots, and data extraction |
| [tufte-design-visualization](pi-agent/skills/tufte-design-visualization/) | Apply Edward Tufte's principles to data visualisations and analytical UIs |
| [update-changelog](pi-agent/skills/update-changelog/) | Guidance for updating changelogs with changes between releases |

## Themes

Custom color schemes for the pi agent TUI.

| Theme |
|-------|
| [adventure.json](pi-agent/themes/adventure.json) |
| [aura.json](pi-agent/themes/aura.json) |
| [catppuccin.json](pi-agent/themes/catppuccin.json) |
| [doom-peacock.json](pi-agent/themes/doom-peacock.json) |
| [dracula.json](pi-agent/themes/dracula.json) |
| [dracula-plus.json](pi-agent/themes/dracula-plus.json) |
| [everforest-dark.json](pi-agent/themes/everforest-dark.json) |
| [everforest-dark-hard.json](pi-agent/themes/everforest-dark-hard.json) |
| [everforest-dark-soft.json](pi-agent/themes/everforest-dark-soft.json) |
| [japanesque.json](pi-agent/themes/japanesque.json) |
| [kanagawa-wave.json](pi-agent/themes/kanagawa-wave.json) |
| [moe-dark.json](pi-agent/themes/moe-dark.json) |
| [night-owl.json](pi-agent/themes/night-owl.json) |
| [tokyo-night-moon.json](pi-agent/themes/tokyo-night-moon.json) |

## External Packages

`pi-agent/settings.json` also enables these external pi packages:

- `git:https://github.com/badlogic/pi-diff-review`
- `git:github.com/picassio/pi-cc-patch`
- `npm:pi-bash-live-view`
- `npm:@kiranpg/pi-sentry`

## Setup

To use these configurations, symlink or copy the contents to `~/.pi/agent/`:

```bash
# Backup existing config
mv ~/.pi/agent ~/.pi/agent.bak

# Symlink this repo
ln -s /path/to/agent-kun/pi-agent ~/.pi/agent
```

Or selectively copy specific skills/extensions/themes.

## Environment Variables

Some skills require API keys (optional but recommended for higher rate limits):

- `CONTEXT7_API_KEY` — for the [context7](pi-agent/skills/context7/) skill
- `FIRECRAWL_API_KEY` — for the [firecrawl](pi-agent/skills/firecrawl/) skill
