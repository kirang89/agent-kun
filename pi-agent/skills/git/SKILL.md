---
name: git
description: "Git best practices for commits, pulling, and worktrees. Use when committing changes, pulling from remote, or working with git worktrees. Enforces atomic commits, conventional commit format, and clean git history."
---

# Git Skill

Best practices for working with git. Follow these guidelines to maintain a clean, readable git history.

## Commits

### Atomic Commits

**Each commit should contain exactly one logical change.** Never bundle unrelated changes together.

Before committing, review staged changes:
```bash
git diff --cached
```

**Separate unrelated changes:**
- If changes touch unrelated features, bugs, or areas of the codebase, split them
- Use `git add -p` to stage specific hunks interactively
- Commit each logical unit separately

```bash
# Stage only specific files or hunks
git add -p                    # Interactive hunk selection
git add src/auth/             # Stage related directory
git commit                    # Commit this unit

git add src/api/              # Stage next logical unit
git commit                    # Separate commit
```

**Signs you need to split a commit:**
- The commit message needs "and" to describe it
- Changes touch unrelated modules
- You're fixing a bug AND adding a feature
- You're refactoring AND changing behavior

### Conventional Commit Format

Follow [Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/#summary).

**Format:**
```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Types:**
| Type | When to Use |
|------|-------------|
| `feat` | New feature for the user |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, missing semicolons (no code change) |
| `refactor` | Code change that neither fixes nor adds feature |
| `perf` | Performance improvement |
| `test` | Adding or correcting tests |
| `build` | Build system or external dependencies |
| `ci` | CI configuration |
| `chore` | Other changes that don't modify src or test |
| `revert` | Reverts a previous commit |

**Scope** (optional): The module, component, or area affected.

**Examples:**
```bash
git commit -m "feat(auth): add OAuth2 login support"
git commit -m "fix(api): handle null response from user endpoint"
git commit -m "refactor(utils): extract date formatting to helper"
git commit -m "docs: update API authentication guide"
git commit -m "test(cart): add unit tests for discount calculation"
```

**Breaking changes:**
```bash
git commit -m "feat(api)!: change response format for /users endpoint"
# Or with footer:
git commit -m "feat(api): change response format

BREAKING CHANGE: Response now returns array instead of object"
```

### Commit Message Guidelines

**Keep the subject line short and direct:**
- Maximum 50 characters for subject
- Use imperative mood ("add" not "added" or "adds")
- No period at the end
- No filler words

**Avoid filler phrases:**
| ❌ Don't | ✅ Do |
|---------|------|
| "This commit adds..." | "add..." |
| "Fixed a bug where..." | "fix..." |
| "Updated the code to..." | "refactor..." |
| "Made some changes to..." | Be specific |
| "Various improvements" | Split into specific commits |
| "Minor fixes" | Name the actual fixes |

**Good examples:**
```
feat(search): add fuzzy matching support
fix(auth): prevent session timeout on active users
refactor(db): replace raw SQL with query builder
perf(images): lazy load below-fold images
```

**Bad examples:**
```
updated stuff                          # vague
fixed some bugs and added features     # multiple changes
WIP                                    # meaningless
addressing PR feedback                 # not descriptive
misc improvements to the codebase      # filler
```

### Pre-Commit Checklist

Before every commit:

1. **Review changes:** `git diff --cached`
2. **Check for unrelated changes:** Split if needed
3. **Verify tests pass:** Run test suite
4. **Lint/format:** Ensure code style is consistent
5. **Write clear message:** Follow conventional format

## Pulling

### Always Rebase and Autostash

**Never use plain `git pull`.** Always use:

```bash
git pull --rebase --autostash
```

**Why rebase:**
- Keeps history linear and readable
- Avoids unnecessary merge commits
- Makes `git log` and `git bisect` cleaner

**Why autostash:**
- Automatically stashes local changes before pull
- Reapplies them after rebase completes
- No need to manually stash/unstash

### Configure as Default

Set this as your default behavior:

```bash
git config --global pull.rebase true
git config --global rebase.autoStash true
```

After configuration, `git pull` will automatically rebase and autostash.

### Handling Conflicts During Rebase

If conflicts occur:

```bash
# 1. Resolve conflicts in your editor
# 2. Stage resolved files
git add <resolved-files>

# 3. Continue rebase
git rebase --continue

# If you need to abort:
git rebase --abort
```

### When to Avoid Rebase

**Do not rebase commits that have been pushed and shared with others.** This rewrites history and causes problems for collaborators.

Only rebase:
- Local commits not yet pushed
- Your own feature branch that others haven't pulled

## Worktrees

Git worktrees allow multiple working directories from one repository. Useful for:
- Working on multiple branches simultaneously
- Keeping a clean main branch checkout
- Running tests on one branch while developing on another
- Code review without switching branches

### Creating Worktrees

```bash
# Create worktree for existing branch
git worktree add ../project-feature feature-branch

# Create worktree with new branch
git worktree add -b new-feature ../project-new-feature main

# Create worktree at specific commit
git worktree add ../project-hotfix abc123
```

**Recommended directory structure:**
```
projects/
├── myproject/           # Main worktree (usually main/master)
├── myproject-feature/   # Feature branch worktree
├── myproject-bugfix/    # Bugfix branch worktree
└── myproject-review/    # For reviewing PRs
```

### Listing Worktrees

```bash
git worktree list
```

Output:
```
/path/to/myproject         abc1234 [main]
/path/to/myproject-feature def5678 [feature-x]
/path/to/myproject-bugfix  ghi9012 [fix-bug-123]
```

### Removing Worktrees

```bash
# Remove worktree (keeps the branch)
git worktree remove ../project-feature

# Force remove if there are changes
git worktree remove --force ../project-feature

# Prune stale worktree references
git worktree prune
```

### Worktree Workflow for Feature Development

```bash
# 1. Start from main worktree
cd ~/projects/myproject

# 2. Create feature worktree
git worktree add -b feat/new-feature ../myproject-new-feature main

# 3. Work in the feature worktree
cd ../myproject-new-feature
# ... make changes, commit ...

# 4. Pull updates from main (in feature worktree)
git pull --rebase --autostash origin main

# 5. When done, remove worktree
cd ../myproject
git worktree remove ../myproject-new-feature
```

### Worktree Workflow for Code Review

```bash
# 1. Create review worktree
git worktree add ../myproject-review origin/pr-branch

# 2. Review code in separate directory
cd ../myproject-review
# ... run tests, inspect code ...

# 3. Clean up after review
cd ../myproject
git worktree remove ../myproject-review
```

### Worktree Best Practices

- **Name worktree directories clearly** - Include project name and purpose
- **Keep main worktree clean** - Use it as reference, develop in feature worktrees
- **Remove worktrees when done** - Don't accumulate stale worktrees
- **Run `git worktree prune` periodically** - Cleans up deleted worktree references
- **Each worktree has its own index** - Staged changes are per-worktree
- **Worktrees share the object database** - Space efficient, instant creation

### Worktree Gotchas

**Cannot checkout same branch in multiple worktrees:**
```bash
# This will fail if 'main' is checked out elsewhere
git worktree add ../other main
# Use a different branch or create a new one
```

**Worktrees share reflog and stash:**
- Stashes are visible across all worktrees
- Be careful with `git stash pop` in the wrong worktree

**Submodules in worktrees:**
```bash
# After creating worktree, initialize submodules
cd ../new-worktree
git submodule update --init --recursive
```
