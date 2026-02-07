---
name: code-review
description: Code review skill that analyzes git diffs for complexity, missing tests, documentation gaps, and new dependencies. Use when you need to review changes in a git repository. Creates a fresh context branch in pi-agent.
---

# Code Review

This skill reviews code changes in the current git repository with a fresh context.

## Instructions

When this skill is invoked:

1. **Verify git repository**: Confirm the current directory is a git repository.

2. **Present diff options menu**: Ask the user to select one of these options:

   ```
   Select diff type to review:
   
   1. Unstaged changes (working directory vs staged/HEAD)
   2. Branch changes against local master/main
   3. Branch changes against remote origin/master or origin/main
   ```

3. **Get the diff** based on selection:

   - **Option 1 - Unstaged changes**:
     ```bash
     git diff
     ```
     If empty, also check staged changes:
     ```bash
     git diff --cached
     ```

   - **Option 2 - Branch vs local master/main**:
     ```bash
     # Detect default branch
     git rev-parse --verify main 2>/dev/null && DEFAULT=main || DEFAULT=master
     git diff $DEFAULT...HEAD
     ```

   - **Option 3 - Branch vs remote master/main**:
     ```bash
     # Fetch latest
     git fetch origin
     # Detect default branch
     git rev-parse --verify origin/main 2>/dev/null && DEFAULT=origin/main || DEFAULT=origin/master
     git diff $DEFAULT...HEAD
     ```

4. **Also gather context**:
   ```bash
   # List changed files
   git diff --name-only [appropriate args based on selection]
   
   # Check for new dependencies
   git diff [appropriate args] -- package.json Cargo.toml requirements.txt go.mod pom.xml build.gradle Gemfile pyproject.toml
   
   # Check for test files in changes
   git diff --name-only [appropriate args] | grep -E "(test|spec|_test\.|\.test\.)"
   ```

5. **Perform the review** analyzing the diff for:

   ### Simplification Opportunities
   - Overly complex functions (high cyclomatic complexity)
   - Nested conditionals that could be flattened
   - Repeated code patterns that could be abstracted
   - Functions doing too many things (violating single responsibility)
   - Complex state management that could be simplified

   ### Untested Domain Logic
   - New business logic without corresponding tests
   - Modified logic paths without test coverage
   - Edge cases that should have tests
   - Error handling paths without tests

   ### Documentation Gaps
   - New public APIs without documentation
   - Changed behavior not reflected in README
   - New configuration options undocumented
   - Breaking changes not called out
   - New features missing from docs

   ### New Dependencies
   - List any new packages/libraries added
   - Note the purpose of each new dependency
   - Flag if a dependency seems unnecessary or duplicative
   - Warn about dependencies with known issues or that are unmaintained

6. **Format the review** as:

   ```markdown
   # Code Review Summary
   
   **Diff type**: [selected option]
   **Files changed**: [count]
   **Insertions/Deletions**: +X / -Y
   
   ## 🔧 Simplification Opportunities
   
   [List findings or "None identified"]
   
   ## 🧪 Untested Domain Logic
   
   [List findings or "All new logic appears tested"]
   
   ## 📚 Documentation Updates Needed
   
   [List findings or "Documentation appears up to date"]
   
   ## 📦 New Dependencies
   
   [List new deps with notes, or "No new dependencies"]
   
   ## General Observations
   
   [Any other noteworthy items]
   ```

## Notes

- If the diff is very large, focus on the most significant changes
- For binary files, just note they were changed
- Be constructive in feedback, not just critical
- Prioritize findings by impact
