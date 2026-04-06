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
<type>(<scope>): <description>
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

**Scope** (optional): module, component, or area affected.

**Breaking changes:** append `!` after type/scope, e.g. `feat(api)!: change response format`

### Message Rules

- Imperative mood ("add" not "added")
- 50 characters max for subject
- No filler ("This commit adds...", "Various improvements", "Minor fixes")
- Be specific — if you can't name the change clearly, the commit is too broad

**Examples:**
```
feat(search): add fuzzy matching support
fix(auth): prevent session timeout on active users
refactor(db): replace raw SQL with query builder
```

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
