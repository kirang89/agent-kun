/**
 * Refine Plan — extension that interrogates a plan ruthlessly until every
 * ambiguity is resolved and both sides share a crisp understanding of what
 * will be built, why, and how.
 *
 * Usage:
 *   /refine-plan
 *   /refine-plan path/to/plan.md
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const INSTRUCTIONS = `# Refine Plan

Interrogate a plan ruthlessly until every ambiguity is resolved and both sides share a crisp understanding of what will be built, why, and how.

## Process

### 1. Ingest the Plan

- Read the plan the user has provided (document, message, or file reference).
- Identify every **decision point** — places where the plan makes a choice, assumes a constraint, or leaves something vague.
- Build a mental **design tree**: the major branches (architecture, data model, API surface, UX, deployment, etc.) and the sub-decisions hanging off each.

### 2. Explore the Codebase First

Before asking the user anything, try to answer your own questions:

- Search for existing patterns, conventions, types, and tests that constrain the design space.
- Check for prior art — has something similar been built before? Are there naming conventions or architectural precedents?
- Look at dependencies, configuration, and infrastructure that bound what's feasible.

Only ask the user what the codebase cannot tell you.

### 3. Walk the Design Tree

Work through branches **one at a time**, resolving dependency order:

1. Pick the branch whose decisions block the most other branches.
2. State what you understand so far, what's unclear, and what options exist.
3. Ask a focused question (or a small batch via the interactive form).
4. **Wait for the user's answer.** Do not proceed until they respond.
5. After their answer, provide your suggestion or recommendation with reasoning.
6. Confirm alignment, then move to the next decision.

Repeat until every branch is resolved.

### 4. Ask Questions Effectively

- **One concern at a time** unless questions are closely related — then use the \`interactive_form\` tool to group them into a single form.
- For each question, explain **why it matters** and what depends on the answer.
- Offer concrete options where possible (with trade-offs), rather than open-ended "what do you think?"
- If the user's answer introduces a new ambiguity, follow up immediately before moving on.

### 5. Synthesize

Once all branches are resolved:

- Summarize the refined plan with every decision captured.
- Highlight any risks, trade-offs, or deferred decisions that were explicitly agreed on.
- Ask for final sign-off before considering the plan complete.

## Guidelines

- **Be relentless, not adversarial.** The goal is shared clarity, not winning an argument.
- **Resolve dependencies first.** Don't ask about error handling strategy before the happy path is clear.
- **Ground questions in the codebase.** Reference specific files, types, or patterns when they're relevant.
- **Respect the user's time.** If something can be inferred or discovered, do the work yourself.
- **Never assume silence is agreement.** If you asked a question and didn't get a clear answer, ask again.`;

export default function (pi: ExtensionAPI) {
	pi.registerCommand("refine-plan", {
		description: "Interrogate a plan to resolve every ambiguity and reach shared understanding",
		handler: async (args, ctx) => {
			const parts = [INSTRUCTIONS];

			if (args.trim()) {
				parts.push(`\n\n---\n\nUser context: ${args.trim()}`);
			}

			pi.sendUserMessage(parts.join(""));
		},
	});
}
