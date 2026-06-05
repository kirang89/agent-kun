# `/wiki` extension

Global pi extension installed at:

```text
~/.pi/agent/extensions/wiki.ts
```

## Purpose

Create or update an Obsidian research wiki for a topic from the current pi session while keeping the main context clean.

The command launches an isolated non-interactive pi subprocess with `--no-session`, so the subagent's reasoning and tool results are not appended to the active conversation.

## Usage

```text
/wiki mtp
/wiki "multi-token prediction"
/wiki mtp --vault ~/PKM/research-wiki
```

If no topic is provided, the extension prompts for one.

## What the subagent does

Given a topic, the subagent:

1. Reads the current pi session JSONL file.
2. Extracts user/assistant explanations and useful tool results.
3. Treats generated artifacts mentioned in the session as raw data sources.
4. Creates or updates this structure:

```text
<vault>/
  README.md
  <topic-slug>/
    raw/
      session-excerpt.md
      artifacts/
        README.md
        ...copied raw artifacts...
    wiki/
      00 - Start Here.md
      ...synthesized notes...
    assets/
      README.md
      ...supporting assets...
```

5. Creates Markdown indexes/wrappers for non-Markdown artifacts so Obsidian does not appear empty when it hides unsupported file types.

## Defaults

Default vault root:

```text
~/PKM/research-wiki
```

Run logs and prompts are stored under:

```text
~/.pi/agent/wiki-runs/
```

## Notes

- The subagent is instructed not to use Jot.
- The subagent is instructed not to read, write, or edit `.env` files.
- The subagent tries to use the Obsidian CLI where practical, but falls back to direct Markdown file writes if CLI vault targeting is unreliable.
- Use `/reload` after editing the extension so pi discovers the new command.
