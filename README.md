# agent-kun

My custom agent configuration — skills, extensions, and themes.


## Extensions

Custom tools and commands that extend the agent's capabilities.

| Extension | Description |
|-----------|-------------|
| [adr](pi-agent/extensions/adr/) | `/adr` command to analyze session for architecture decisions and record them as MADR files |
| [evaluate-test-harness](pi-agent/extensions/evaluate-test-harness/) | `/evaluate-test-harness` command to analyze a project's test suite against 19 testing categories |
| [handoff.ts](pi-agent/extensions/handoff.ts) | `/handoff` command to transfer context to a new focused session with a generated prompt |
| [insights.ts](pi-agent/extensions/insights.ts) | `/insights` command for interactive exploration of session insights |
| [interactive-form](pi-agent/extensions/interactive-form/) | Tabbed form UI for gathering multiple user inputs |
| [notify.ts](pi-agent/extensions/notify.ts) | Desktop notification via OSC 777 when the agent finishes and is waiting for input |
| [refine-plan.ts](pi-agent/extensions/refine-plan.ts) | `/refine-plan` command to interrogate a plan until every ambiguity is resolved |
| [review.ts](pi-agent/extensions/review.ts) | `/review` command for code review with multiple modes (PR, branch, uncommitted, commit) |
| [statusline.ts](pi-agent/extensions/statusline.ts) | Minimal statusline showing active tool, context usage, git branch, and model |

## Skills

Task-specific instructions that guide the agent for particular workflows.

| Skill | Description |
|-------|-------------|
| [adr](pi-agent/skills/adr/) | Write Architecture Decision Records for significant design choices |
| [code-review](pi-agent/skills/code-review/) | Git diff analysis for complexity, tests, docs, and dependencies |
| [commit](pi-agent/skills/commit/) | Conventional Commits-style commit messages |
| [context7](pi-agent/skills/context7/) | Fetch up-to-date library documentation from Context7 |
| [frontend-design](pi-agent/skills/frontend-design/) | Design and implement distinctive frontend interfaces |
| [git](pi-agent/skills/git/) | Git best practices: atomic commits, conventional format, clean history |
| [github](pi-agent/skills/github/) | GitHub CLI (`gh`) for issues, PRs, CI runs, and API queries |
| [improve-codebase-architecture](pi-agent/skills/improve-codebase-architecture/) | Find architectural improvement opportunities and deepen shallow modules |
| [mermaid-diagrams](pi-agent/skills/mermaid-diagrams/) | Render Mermaid diagrams as Unicode art |
| [planning](pi-agent/skills/planning/) | Create detailed implementation plans with checkpoints |
| [playwright-cli](pi-agent/skills/playwright-cli/) | Browser automation for web testing, screenshots, and data extraction |
| [update-changelog](pi-agent/skills/update-changelog/) | Update changelogs with changes between releases |
| [web-search](pi-agent/skills/web-search/) | Web search using Jina Search API |

## Themes

Custom color schemes for the pi agent TUI.

| Theme | Description |
|-------|-------------|
| [catppuccin.json](pi-agent/themes/catppuccin.json) | Catppuccin color scheme |
| [dracula.json](pi-agent/themes/dracula.json) | Dracula color scheme |
| [gruvbox-dark.json](pi-agent/themes/gruvbox-dark.json) | Gruvbox Dark color scheme |
| [rose-pine.json](pi-agent/themes/rose-pine.json) | Rosé Pine color scheme |

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

- `CONTEXT7_API_KEY` - For [context7](pi-agent/skills/context7/) skill
- `JINA_API_KEY` - For [web-search](pi-agent/skills/web-search/) skill
