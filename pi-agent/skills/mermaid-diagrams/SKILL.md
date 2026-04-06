---
name: mermaid-diagrams
description: Visualize architecture diagrams, workflows, state machines, sequence diagrams, class diagrams, and ER diagrams as Unicode art directly in responses. Use when asked to draw, visualize, diagram, or illustrate system designs, processes, or relationships.
---

# Mermaid Diagrams

Render Mermaid diagrams as Unicode art using [beautiful-mermaid](https://github.com/lukilabs/beautiful-mermaid).

## Setup

Run once before first use:

```bash
cd ~/.pi/agent/skills/mermaid-diagrams && bun install
```

## Rendering

All commands must run from the skill directory:

```bash
cd ~/.pi/agent/skills/mermaid-diagrams

# Pipe content directly (preferred)
cat << 'EOF' | ./render.js - -f unicode
graph LR
    A --> B --> C
EOF

# Render a file
./render.js /path/to/diagram.mmd -f unicode

# Save as SVG (only when user asks)
./render.js /path/to/diagram.mmd -o output.svg

# With theme (e.g. dracula, tokyo-night, catppuccin-mocha, nord, github-dark)
./render.js /path/to/diagram.mmd -f unicode -t dracula

# List all themes
./render.js --list-themes
```

## Workflow

1. Write the Mermaid diagram content
2. Pipe it to `./render.js - -f unicode`
3. **Copy the Unicode output and paste it into a fenced code block in your response**

Tool output appears in a collapsed block the user may not see. You **must** copy the rendered diagram into your response text.

Default to `-f unicode` for inline display. Only save to file (`-o`) if the user asks for SVG.
