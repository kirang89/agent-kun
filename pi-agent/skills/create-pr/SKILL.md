---
name: create-pr
description: "Create pull requests with clear, scannable descriptions a reviewer can grasp in under a minute. Use when opening a PR, writing or rewriting a PR description, or asked to 'create a PR' / 'open a pull request'."
---

# Create PR Skill

Write PRs that explain **why** and map **what changed** — never narrate the code. Follow `pr-template.md` (in this skill's directory). The template contains both a **structure** (the section layout to fill in) and **instructions** (guidance, tone, and rules on what to write in each part and what to leave out), including a **Title** section that instructs how to compose the PR title. Apply both.

Be extremely concise. Sacrifice grammar for the sake of concision.

## Workflow

1. Determine the base branch (usually `main`) and the current branch. If not pushed yet, push with `git push -u origin <branch>`.
2. Review the full diff against base to understand the change:
   ```bash
   git fetch origin
   git diff origin/main...HEAD
   git log origin/main..HEAD --pretty=format:%s
   ```
3. Identify linked issues (e.g. `Closes #123`) from the branch, commits, or user input.
4. Draft the title and description following `pr-template.md`. Read it fully first — compose the title per its **Title** instructions, and follow its structure and per-section instructions for what the description should (and shouldn't) contain.
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

- Read `pr-template.md` and apply both its structure and its instructions exactly — do not modify the template.
- Omit optional sections that add no signal. A trivial PR may be just a title + one line.
- Be extremely concise. Sacrifice grammar for the sake of concision.
- For UI changes, prompt the user for one screenshot/GIF if not provided.
- Don't invent context, issue numbers, or deployment notes you can't verify from the diff or user.
