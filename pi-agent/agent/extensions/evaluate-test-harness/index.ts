/**
 * Evaluate Test Harness — extension that analyses a project's test suite
 * against 19 testing categories and surfaces gaps with actionable suggestions.
 *
 * Usage:
 *   /evaluate-test-harness
 *   /evaluate-test-harness path/to/plan.md
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const INSTRUCTIONS = `# Test Harness Evaluate

Analyse the current project's test suite against a comprehensive testing taxonomy and surface **only the gaps** — missing test categories, untested behaviours, and absent tooling — with concrete suggestions for each.

## Reference

The reference table below contains the 19 test categories, their intents, mechanisms, example scenarios, and complexity ratings. This is the evaluation rubric.

## Modes

This skill operates in two modes depending on context:

### Mode 1 — Repository Evaluation (default)

The user invokes the skill from within a project directory. Evaluate what exists and report what's missing.

### Mode 2 — Plan Augmentation

The user is working on an implementation plan (a plan file is open or referenced in conversation) and wants a test harness section added. Generate a concrete test plan and append it after user approval.

Detect mode automatically: if the conversation references a plan file or the user mentions "plan", use Mode 2. Otherwise, use Mode 1.

---

## Mode 1: Repository Evaluation

### Step 1 — Discover the project

Gather structural context quickly. Do not read every file — sample strategically.

\`\`\`
1. Identify language/framework:
   - Check for package.json, Cargo.toml, go.mod, pyproject.toml, pom.xml,
     build.gradle, Makefile, CMakeLists.txt, *.csproj, mix.exs, etc.

2. Find test files:
   - Search for files matching: *test*, *spec*, *_test.*, *.test.*, test_*
   - Note test directories: test/, tests/, __tests__/, spec/, *_test/

3. Identify test tooling:
   - Look for test runner configs: jest.config.*, pytest.ini, .mocharc.*,
     vitest.config.*, phpunit.xml, cargo test config, etc.
   - Check CI configs: .github/workflows/*.yml, .gitlab-ci.yml, Jenkinsfile,
     .circleci/config.yml — look for test/lint/coverage/fuzz steps.

4. Check for coverage tooling:
   - Look for: .nycrc, .coveragerc, lcov.info, coverage/, codecov.yml,
     jest --coverage flags in scripts, tarpaulin config.

5. Check for static analysis / linting:
   - Look for: .eslintrc*, .pylintrc, clippy config, .clang-tidy,
     sonar-project.properties, .golangci.yml

6. Check for fuzzing:
   - Look for: fuzz/, fuzz_targets/, *_fuzz*, corpus/, OSS-Fuzz config,
     cargo-fuzz, go-fuzz, jazzer config.

7. Sample 3-5 test files to understand testing patterns:
   - Read the files to gauge depth (are they just happy-path? do they test
     error paths? boundaries? concurrency?).
\`\`\`

### Step 2 — Map existing tests to categories

For each of the 19 categories in the reference table, determine whether the project has meaningful coverage. Use this classification:

- **Present**: clear evidence of tests in this category.
- **Absent**: no evidence at all.
- **Weak**: some incidental coverage but no systematic effort (e.g., a few error-path tests exist but fault injection is not used).

Be rigorous. A project with unit tests that occasionally check an error return does **not** have "Fault Injection" coverage. A project with a CI matrix running on two OSes **does** have Parameterised/Matrix Testing, even if limited.

### Step 3 — Audit assertion health

Beyond test *coverage*, evaluate test *quality* by scanning assertions in the sampled test files (and more if needed — grep broadly for assertion patterns). Flag violations of these two principles:

#### 3a. Positive assertions over negative assertions

Tests should assert what the result **is**, not what it **isn't**. Negative assertions (\`assertNotEqual\`, \`not toContain\`, \`refute\`, \`!= nil\`) are weaker — they pass for infinitely many wrong values and only exclude one.

**Flag when you find:**
- \`assertNotEqual(status, 500)\` instead of \`assertEqual(status, 200)\` — passes for 404, 503, garbage.
- \`expect(result).not.toBeNull()\` instead of \`expect(result).toEqual(expectedValue)\` — confirms existence but not correctness.
- \`assert response != ""\` instead of \`assert response == "expected output"\` — any non-empty string passes.
- \`refute_match(~r/error/, msg)\` instead of \`assert msg == "success"\` — absence of one bad pattern doesn't confirm the right one.

**Negative assertions are warranted when:**
- The test's intent is genuinely exclusionary (e.g., "this list must never contain duplicates", "the output must not include PII").
- The positive space is unbounded or non-deterministic (e.g., "the timestamp is not zero" when exact value is unpredictable — though even here, a range assertion is tighter).

For each violation, note the file, line, the negative assertion found, and a concrete positive replacement.

#### 3b. Tight assertions over loose assertions

Assertions should be as specific as the behaviour they verify. Loose assertions let bugs slip through because they pass for a wide range of wrong values.

**Flag when you find:**

| Loose (flag this) | Tight (suggest this) | Why it matters |
|---|---|---|
| \`expect(body).toMatch(/user/)\` | \`expect(body.name).toBe("alice")\` | Regex matches unrelated occurrences; doesn't verify structure. |
| \`assert "id" in response\` | \`assert response["id"] == 42\` | Field existence doesn't verify correctness. |
| \`assert len(items) > 0\` | \`assert len(items) == 3\` | "Non-empty" passes for 1 item when 3 were expected. |
| \`assert result > 0\` | \`assert result == 7\` | Range check passes for any positive number. |
| \`assertTrue(response.ok)\` | \`assertEqual(response.status_code, 200)\` | \`.ok\` is true for 200–299; masks wrong success codes. |
| \`assertContains(log, "processed")\` | \`assertEqual(log, "processed 5 records in 2ms")\` or at least \`assertContains(log, "processed 5 records")\` | Substring match is fragile and under-specified. |
| \`expect(result).toBeDefined()\` | \`expect(result).toEqual({ id: 1, name: "test" })\` | Defined-check ignores the actual value entirely. |

**Loose assertions are warranted when:**
- The value is genuinely non-deterministic (timestamps, UUIDs, random tokens) — but even then, assert the format or range (\`matches ISO-8601\`, \`is valid UUID v4\`, \`length == 36\`).
- The test is intentionally testing a property, not a value (e.g., "the list is sorted" — checking the sort property is correct; asserting exact contents would be a different test).

For each violation, note the file, line, the loose assertion found, and a concrete tighter replacement.

#### Output format for assertion health

Produce a separate table after the category gap report:

**Assertion Health Issues**

| File | Line | Issue | Current Assertion | Suggested Fix |
|------|------|-------|-------------------|---------------|

Where:
- **Issue**: \`Negative assertion\` or \`Loose assertion\`.
- **Current Assertion**: the actual assertion code found.
- **Suggested Fix**: a concrete rewrite using values/patterns observed in the test or inferred from context.

If the project has more than ~30 violations, show the 15 most impactful (prioritise: tests of critical paths > tests of utilities; loose existence checks > loose range checks) and state the total count with a note like *"15 of ~40 issues shown — run a project-wide grep for \`assertNot|not\\.to|refute|toBeDefined|toMatch\\(\\/|> 0|!= nil\` to find the rest."*

### Step 4 — Generate the gap report

Produce a markdown table containing **only categories classified as Absent or Weak**. Do not include categories that are Present — the report is gaps-only.

The table must have these columns:

| # | Category | Current State | Gap Description | Suggested Tests | Mechanism & Tooling | Complexity | Priority |
|---|----------|---------------|-----------------|-----------------|---------------------|------------|----------|

Column guidance:
- **#**: The category number from the reference table (1–19).
- **Category**: The category name from the reference table.
- **Current State**: \`Absent\` or \`Weak\` — with a brief note on what exists (if Weak).
- **Gap Description**: What specific behaviours or failure modes are untested. Be concrete — reference actual modules, files, or patterns observed in the codebase.
- **Suggested Tests**: 2–4 concrete test cases tailored to this project. Reference real function names, modules, endpoints, or file formats found during discovery. Do not use generic examples.
- **Mechanism & Tooling**: How to implement these tests, including specific tools appropriate for the project's language and ecosystem.
- **Complexity**: Low / Medium / High — from the reference table, adjusted if the project's architecture makes it easier or harder.
- **Priority**: High / Medium / Low — based on the risk profile of the project:
  - **High**: the project handles persistent data, user input, concurrency, or money and lacks tests for those failure modes.
  - **Medium**: the category would catch real bugs given the project's architecture but isn't urgent.
  - **Low**: the category is best-practice but the project's risk profile doesn't demand it immediately.

### Step 5 — Summarise

After both tables (category gaps + assertion health), provide:

1. **Quick wins** — the 2–3 lowest-effort, highest-value gaps to close first.
2. **Biggest risks** — the 1–2 gaps that represent the most dangerous untested failure modes.
3. **Assertion quality** — a one-line verdict on overall assertion discipline (e.g., "~60% of assertions are loose existence checks — tightening these is the single highest-ROI improvement").
4. **Recommended tooling additions** — specific tools/packages to install, with one-liner install commands.

### Constraints

- Do not praise existing tests. The report is purely about what's missing.
- Do not suggest tests the project has no realistic use for (e.g., don't suggest crash-recovery testing for a stateless CLI tool).
- Every suggested test must reference something concrete from the codebase — a module, function, endpoint, file format, or data flow observed during discovery.
- Keep the report actionable. Vague advice like "add more tests" is useless.

---

## Mode 2: Plan Augmentation

The user has an implementation plan (from the \`planning\` skill or a similar structured plan) and wants to know what tests should accompany it.

### Step 1 — Read the plan

Read the plan file. Identify:
- What new modules, APIs, or data flows are being introduced.
- What existing code is being modified.
- What the risk areas are (persistence, concurrency, user input, external dependencies).

### Step 2 — Discover existing test patterns

Follow Steps 1–2 from Mode 1 to understand the current test landscape. This is needed to make suggestions consistent with existing patterns (same frameworks, same directory structure, same naming conventions).

### Step 3 — Generate the test harness section

Produce a new plan section titled **"Test Harness"** structured as checkpoints (matching the planning skill's format). Each checkpoint is a group of related tests.

Structure each checkpoint as:

\`\`\`markdown
### Checkpoint T<N>: <Category Name>

**Goal**: <what this test group verifies>
**Files**:
  - \\\`<path/to/new/test/file>\\\` — create — <purpose>
  - \\\`<path/to/existing/test/file>\\\` — modify — <purpose>

**Tests**:
1. <concrete test description referencing plan modules>
2. <concrete test description>
3. ...

**Verification**: <how to confirm the tests work — e.g., run command, expected pass count>
\`\`\`

Only include test categories relevant to the plan's changes. If the plan adds a new API endpoint, suggest unit tests, boundary tests, and input validation tests for it. If the plan introduces a new file format, suggest malformed-input and round-trip tests. Match the tests to the work.

### Step 4 — Present for approval

Show the test harness section and ask:

> Here is the test harness for this plan. Should I:
> 1. Append it to the plan as-is
> 2. Modify specific checkpoints first
> 3. Skip — don't add tests to the plan

**Do not append without explicit approval.** If approved, append the section to the plan file after the last existing checkpoint but before any "Risks" or "Out of scope" sections.`;

export default function (pi: ExtensionAPI) {
	pi.registerCommand("evaluate-test-harness", {
		description: "Evaluate the project's test harness against 19 testing categories and surface gaps",
		handler: async (args, ctx) => {
			const extensionDir = dirname(fileURLToPath(import.meta.url));
			const referencePath = join(extensionDir, "references", "test-harness.md");
			const referenceContent = await readFile(referencePath, "utf-8");

			const parts = [INSTRUCTIONS, "\n\n---\n\n## Reference Table\n\n", referenceContent];

			if (args.trim()) {
				parts.push(`\n\n---\n\nUser context: ${args.trim()}`);
			}

			pi.sendUserMessage(parts.join(""));
		},
	});
}
