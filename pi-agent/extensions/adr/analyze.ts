/**
 * Analyze session conversation text for architecturally significant decisions.
 *
 * Uses an LLM call to extract decision candidates from the conversation,
 * returning structured data for each candidate.
 */

import { complete, type Model } from "@mariozechner/pi-ai";

export interface DecisionCandidate {
	title: string;
	summary: string;
	context: string;
	consideredOptions: string[];
	chosenOption: string;
	justification: string;
	goodConsequences: string[];
	badConsequences: string[];
	supersedes: string | null;
}

const ANALYSIS_PROMPT = `You are a system design decision analyst. Analyze the following conversation and extract only system design decisions that were made or agreed upon.

A decision qualifies if it falls into one of these categories:

1. **Technology/infrastructure choices** — Choosing one technology over another (e.g., PostgreSQL over SQLite, Redis over Memcached)
2. **Major refactoring from dependency changes** — Switching an ORM, replacing a core library, migrating frameworks
3. **Core workflow changes** — Modifying or redesigning workflows that are central to how the system operates
4. **Domain modeling changes** — Changing abstractions, entities, or mental models that affect how users or developers think about a workflow
5. **New API surfaces** — Adding a new API endpoint, protocol, or integration surface
6. **Structural changes** — Reorganizing module boundaries, splitting/merging services, changing layering
7. **Non-functional trade-offs** — Decisions affecting performance, security, scalability, or reliability characteristics

Do NOT include:
- Minor implementation details (variable naming, formatting, small refactors)
- Bug fixes or routine maintenance
- Code style or linting choices
- Test-only changes that don't affect system design
- Tooling preferences (editor, CLI tools) unless they affect the build/deploy pipeline

For each decision found, extract:
- title: Short noun phrase (e.g., "Use PostgreSQL for persistent storage")
- summary: One sentence describing the decision
- context: The forces at play and problem being solved (2-3 sentences, value-neutral)
- consideredOptions: Array of options that were considered
- chosenOption: The option that was chosen
- justification: Why this option was chosen
- goodConsequences: Array of positive consequences
- badConsequences: Array of negative consequences (trade-offs accepted)
- supersedes: If this decision revises, replaces, or evolves a previous decision, provide the title of that prior decision (as close to the original ADR title as possible). Leave null if this is a new standalone decision.

Only include decisions that were actually made or clearly agreed upon in the conversation.
Do NOT include open questions or pending decisions.
If no system design decisions were made, return an empty array.

Respond with ONLY valid JSON in this exact format:
{
  "decisions": [
    {
      "title": "...",
      "summary": "...",
      "context": "...",
      "consideredOptions": ["..."],
      "chosenOption": "...",
      "justification": "...",
      "goodConsequences": ["..."],
      "badConsequences": ["..."],
      "supersedes": "..." or null
    }
  ]
}

<conversation>
{CONVERSATION}
</conversation>`;

export async function analyzeSessionForDecisions(
	conversationText: string,
	model: Model,
	apiKey: string
): Promise<DecisionCandidate[]> {
	const prompt = ANALYSIS_PROMPT.replace("{CONVERSATION}", conversationText);

	const response = await complete(
		model,
		{
			messages: [
				{
					role: "user" as const,
					content: [{ type: "text" as const, text: prompt }],
					timestamp: Date.now(),
				},
			],
		},
		{ apiKey, reasoningEffort: "high" }
	);

	const responseText = response.content
		.filter((c): c is { type: "text"; text: string } => c.type === "text")
		.map((c) => c.text)
		.join("\n");

	return parseDecisions(responseText);
}

function parseDecisions(responseText: string): DecisionCandidate[] {
	// Extract JSON from response (handles markdown code blocks)
	const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/) || responseText.match(/(\{[\s\S]*\})/);

	if (!jsonMatch) return [];

	try {
		const parsed = JSON.parse(jsonMatch[1].trim());
		const decisions = parsed.decisions;

		if (!Array.isArray(decisions)) return [];

		return decisions.filter(isValidDecision).map(normalizeDecision);
	} catch {
		return [];
	}
}

function isValidDecision(d: unknown): boolean {
	if (!d || typeof d !== "object") return false;
	const decision = d as Record<string, unknown>;
	return (
		typeof decision.title === "string" &&
		typeof decision.context === "string" &&
		typeof decision.chosenOption === "string" &&
		Array.isArray(decision.consideredOptions) &&
		decision.consideredOptions.length > 0
	);
}

function normalizeDecision(d: Record<string, unknown>): DecisionCandidate {
	return {
		title: d.title as string,
		summary: (d.summary as string) || "",
		context: d.context as string,
		consideredOptions: d.consideredOptions as string[],
		chosenOption: d.chosenOption as string,
		justification: (d.justification as string) || "",
		goodConsequences: Array.isArray(d.goodConsequences) ? (d.goodConsequences as string[]) : [],
		badConsequences: Array.isArray(d.badConsequences) ? (d.badConsequences as string[]) : [],
		supersedes: typeof d.supersedes === "string" ? d.supersedes : null,
	};
}
