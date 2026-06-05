---
name: git
description: "Git best practices for commits, pulling, and worktrees. Use when committing changes, pulling from remote, or working with git worktrees. Enforces atomic commits, conventional commit format, and clean git history."
---

# Git Skill

## Commits

### Atomic Commits

Each commit must contain exactly one logical change. Never bundle unrelated changes.

Before committing, review staged changes with `git diff --cached`. If changes are unrelated, use `git add -p` to stage specific hunks and commit each logical unit separately.

**Split the commit if:**
- The message needs "and" to describe it
- You're mixing bug fixes with features, or refactoring with behavior changes

### Conventional Commit Format

Follow [Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/#summary):

```
<type>(<scope>): <summary>
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

**Scope** (optional): module, component, or area affected.

### Message Rules

- Imperative mood ("add" not "added")
- Keep the subject concise and specific; prefer <= 72 characters
- No filler ("This commit adds...", "Various improvements", "Minor fixes")
- No trailing period
- Be specific — if you can't name the change clearly, the commit is too broad
- When creating commits from this skill, do not add breaking-change markers, footers, or sign-offs unless the user explicitly asks for them

**Examples:**
```
feat(search): add fuzzy matching support
fix(auth): prevent session timeout on active users
refactor(db): replace raw SQL with query builder
```

### When Asked to Create a Commit

Create a git commit for the current changes using a concise Conventional Commits-style subject.

Treat any caller-provided arguments as additional commit guidance. Common patterns:
- Freeform instructions should influence scope, summary, and body
- File paths or globs should limit which files to commit
- If arguments combine files and instructions, honor both

**Workflow:**
1. Infer whether the user specified file paths/globs and/or commit guidance
2. Review `git status` and `git diff` to understand the current changes (limit to requested files when applicable)
3. Optionally run `git log -n 50 --pretty=format:%s` to discover commonly used scopes
4. If it is unclear which files belong in the commit, ask before staging
5. Stage only the intended files (all changes only when the user did not narrow the scope)
6. Review staged changes with `git diff --cached`
7. Run `git commit -m "<subject>"` (and `-m "<body>"` if needed)
8. Only commit; do not push

## Pulling

Always rebase when pulling. Never create merge commits for pulls:

```bash
git pull --rebase --autostash
```

Do not rebase commits that have been pushed and shared with others.

## Worktrees

Prefer worktrees over branch switching when you need to work on multiple branches simultaneously (parallel development, code review, running tests on another branch).

```bash
# Create worktree with new branch
git worktree add -b feat/new-feature ../myproject-new-feature main

# Clean up when done
git worktree remove ../myproject-new-feature
```

Name worktree directories clearly (e.g. `myproject-feature`, `myproject-review`). Remove worktrees when done — don't accumulate stale ones.

## Don'ts

- Never use `git restore` (or similar commands) to revert files you didn't author
