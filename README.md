# agent-kun

My custom agent configuration — skills, extensions, and themes.


## Extensions

Custom tools and commands that extend the agent's capabilities.

| Extension | Description |
|-----------|-------------|
| [interactive-form](pi-agent/extensions/interactive-form/) | Tabbed form UI for gathering multiple user inputs |
| [review.ts](pi-agent/extensions/review.ts) | `/review` command for code review with multiple modes (PR, branch, uncommitted, commit) |
| [rich-review](pi-agent/extensions/rich-review/) | Code review through Rich Hickey's software design philosophy |
| [todo-tracker](pi-agent/extensions/todo-tracker/) | Persistent todo widget with `/todos` command for task tracking |
| [uv.ts](pi-agent/extensions/uv.ts) | Redirects Python tooling (pip, poetry, python) to uv equivalents |

## Skills

Task-specific instructions that guide the agent for particular workflows.

| Skill | Description |
|-------|-------------|
| [browser-tools](pi-agent/skills/browser-tools/) | Chrome DevTools Protocol automation for web interaction |
| [code-review](pi-agent/skills/code-review/) | Git diff analysis for complexity, tests, docs, and dependencies |
| [context7](pi-agent/skills/context7/) | Fetch up-to-date library documentation from Context7 |
| [crafting-effective-readmes](pi-agent/skills/crafting-effective-readmes/) | README templates matched to audience and project type |
| [frontend-design](pi-agent/skills/frontend-design/) | Design and implement distinctive frontend interfaces |
| [git](pi-agent/skills/git/) | Git best practices: atomic commits, conventional format, clean history |
| [github](pi-agent/skills/github/) | GitHub CLI (`gh`) for issues, PRs, CI runs, and API queries |
| [makefile](pi-agent/skills/makefile/) | Generate Makefiles with common commands based on project type |
| [mermaid-diagrams](pi-agent/skills/mermaid-diagrams/) | Render Mermaid diagrams as Unicode art |
| [pi-overlay-extension](pi-agent/skills/pi-overlay-extension/) | Build popup/overlay UI components for pi extensions |
| [planning](pi-agent/skills/planning/) | Create detailed implementation plans with checkpoints |
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
