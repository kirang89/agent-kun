---
name: create-pr
description: "Create pull requests with scannable PR descriptions. Use when the user asks to 'create a PR', 'open a pull request', or write a PR description."
---

# Create PR

`pr-template.md` (in this skill's directory) is the **single source of truth** for PR structure, tone, and what to leave out — read it fully and apply its structure and per-section instructions without paraphrasing.

**ELI15** (Explain Like I'm 15): plain language a developer grasps in seconds, no jargon or fluff. Lead with the user-facing problem, then what changed, in simple direct terms.

## Workflow

1. Determine the base branch (usually `main`) and the current branch. If not pushed yet, push with `git push -u origin <branch>`.
2. Review the full diff against base until **every commit and hunk is accounted for** — you can group changes by area (not file) and state each group's motivation:
   ```bash
   git fetch origin
   git diff origin/main...HEAD
   git log origin/main..HEAD --pretty=format:%s
   ```
3. Identify linked issues (e.g. `Closes #123`) from the branch, commits, or user input.
4. Draft the title and description following `pr-template.md` in ELI15 style. Done when **every template section is either filled or intentionally omitted**, and the title is imperative, specific, and minimal.
5. Create the PR with `gh`:
   ```bash
   gh pr create --base main --title "<title>" --body "<body>"
   ```
   Prefer a body file for multi-line descriptions:
   ```bash
   gh pr create --base main --title "<title>" --body-file <path>
   ```
6. Return the PR URL.

## Guardrails

- For UI changes, prompt the user for one screenshot/GIF if not provided.
- Don't invent context, issue numbers, or deployment notes you can't verify from the diff or user.