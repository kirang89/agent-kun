import { complete } from "@mariozechner/pi-ai";
import type { ExtensionAPI, ExtensionCommandContext } from "@mariozechner/pi-coding-agent";
import { DynamicBorder, getMarkdownTheme } from "@mariozechner/pi-coding-agent";
import {
	Container,
	Input,
	Markdown,
	matchesKey,
	Key,
	Text,
	truncateToWidth,
	wrapTextWithAnsi,
	type Component,
	type Focusable,
	type TUI,
} from "@mariozechner/pi-tui";
import type { Theme } from "@mariozechner/pi-coding-agent";
import * as fs from "node:fs";
import * as path from "node:path";

// --- Types ---

type ContentBlock = {
	type?: string;
	text?: string;
	name?: string;
	arguments?: Record<string, unknown>;
};

type SessionEntry = {
	type: string;
	message?: {
		role?: string;
		content?: unknown;
	};
};

type AnalysisResult = {
	insights: string;
	observations: string;
	rules: string;
};

type ParsedRule = {
	heading: string;
	text: string;
};

type RuleSelectionResult = {
	selectedRules: ParsedRule[];
	customText: string;
};

// --- Conversation extraction ---

const extractTextParts = (content: unknown): string[] => {
	if (typeof content === "string") return [content];
	if (!Array.isArray(content)) return [];

	const parts: string[] = [];
	for (const part of content) {
		if (!part || typeof part !== "object") continue;
		const block = part as ContentBlock;
		if (block.type === "text" && typeof block.text === "string") {
			parts.push(block.text);
		}
	}
	return parts;
};

const extractToolCallLines = (content: unknown): string[] => {
	if (!Array.isArray(content)) return [];

	const lines: string[] = [];
	for (const part of content) {
		if (!part || typeof part !== "object") continue;
		const block = part as ContentBlock;
		if (block.type === "toolCall" && typeof block.name === "string") {
			const args = block.arguments ?? {};
			lines.push(`Tool ${block.name} called with: ${JSON.stringify(args)}`);
		}
	}
	return lines;
};

const buildConversationText = (entries: SessionEntry[]): string => {
	const sections: string[] = [];

	for (const entry of entries) {
		if (entry.type !== "message" || !entry.message?.role) continue;

		const { role } = entry.message;
		if (role !== "user" && role !== "assistant") continue;

		const entryLines: string[] = [];
		const textParts = extractTextParts(entry.message.content);
		if (textParts.length > 0) {
			const label = role === "user" ? "User" : "Assistant";
			const text = textParts.join("\n").trim();
			if (text.length > 0) entryLines.push(`${label}: ${text}`);
		}

		if (role === "assistant") {
			entryLines.push(...extractToolCallLines(entry.message.content));
		}

		if (entryLines.length > 0) sections.push(entryLines.join("\n"));
	}

	return sections.join("\n\n");
};

// --- Prompt ---

const buildAnalysisPrompt = (conversationText: string, existingAgentsMd: string): string => `\
Analyze this coding session and produce three separate sections, delimited by exact markers.

${existingAgentsMd ? `Here is the existing AGENTS.md for context — avoid duplicating rules already present:\n\n<existing_agents_md>\n${existingAgentsMd}\n</existing_agents_md>\n` : ""}

## SECTION 1: Reusable Insights

Extract insights and learnings that generalize beyond this specific session:

1. **Technical Insights** — Patterns, APIs, libraries, or techniques discovered that apply broadly
2. **Debugging Lessons** — Root cause patterns and diagnostic approaches worth remembering
3. **Architecture Decisions** — Design choices and reasoning that inform future work
4. **Gotchas & Pitfalls** — Surprising behaviors or edge cases in tools/libraries/APIs

For each insight: state it concisely as a heading, provide brief context, include the key takeaway.
Skip empty categories. Be specific and actionable — not generic advice.
If nothing qualifies, write "No reusable insights identified."

## SECTION 2: Session Observations

Capture noteworthy things that are specific to THIS session and don't generalize, but are still
worth recording as a log of what happened:

- What was the goal and was it achieved?
- What approaches were tried and abandoned?
- What tradeoffs were made and why?
- What was left incomplete or deferred?
- Any dead ends, surprising failures, or wrong turns worth noting?

Write as a concise narrative or bullet list. This is a session journal — context that would help
someone (or a future agent) pick up where this session left off.
If the session was too trivial for observations, write "No notable observations."

## SECTION 3: Proposed AGENTS.md Rules

Extract **concrete, actionable rules and workflows** from this session that an AI coding agent should
follow in future sessions on this project. AGENTS.md is an instruction file for AI agents — it tells
them what to do, what NOT to do, and how to approach specific tasks.

### What belongs in AGENTS.md

AGENTS.md entries are **standing orders for the AI agent**. Look for:

- **Command rules** — Specific commands to run (or never run), in what order, with what flags
  Example: "Always run \`bun run check\` before committing. Never run \`bun test\` without a specific file."
- **Code constraints** — Concrete coding rules that prevent mistakes seen in this session
  Example: "No \`any\` types. Always use \`Type.Object()\` from typebox for tool parameter schemas."
- **Workflow recipes** — Step-by-step processes for recurring tasks discovered during the session
  Example: "## Adding a New API Endpoint\\n1. Create handler in src/handlers/\\n2. Add route in src/routes.ts\\n3. Add tests in test/"
- **Tool usage rules** — How to use specific tools, CLIs, or APIs correctly
  Example: "Use \`rg\` instead of \`grep\`. Always use the read tool, never \`cat\` or \`sed\` to read files."
- **Gotcha prevention** — Rules that prevent specific mistakes encountered during the session
  Example: "The Stripe webhook handler must verify signatures before parsing the body."
- **Project conventions** — Naming, file organization, or architectural patterns specific to this project
  Example: "All error types must extend BaseError. Use discriminated unions for results, not exceptions."
- **Git/commit rules** — How to commit, what to check, branch naming, etc.

### What does NOT belong

- Generic software engineering wisdom (e.g., "write clean code", "use meaningful names")
- Things already in the existing AGENTS.md
- Session-specific observations (those go in Section 2)

### Format

- Group rules under markdown headings (e.g., "## Commands", "## Code Quality", "## Testing")
- Write as imperative instructions: "Always...", "Never...", "Before X, do Y..."
- Use bullet points for individual rules
- Use numbered lists for multi-step workflows
- Be specific — include actual command names, file paths, tool names
- If no actionable rules emerged from this session, write "No new rules identified."

## Output Format

Use these exact delimiters:

---INSIGHTS_START---
(reusable insights in markdown here)
---INSIGHTS_END---

---OBSERVATIONS_START---
(session-specific observations in markdown here)
---OBSERVATIONS_END---

---RULES_START---
(proposed AGENTS.md rules in markdown here)
---RULES_END---

<conversation>
${conversationText}
</conversation>`;

// --- Parsing ---

const parseResponse = (text: string): AnalysisResult => {
	const insightsMatch = text.match(/---INSIGHTS_START---\n?([\s\S]*?)\n?---INSIGHTS_END---/);
	const observationsMatch = text.match(/---OBSERVATIONS_START---\n?([\s\S]*?)\n?---OBSERVATIONS_END---/);
	const rulesMatch = text.match(/---RULES_START---\n?([\s\S]*?)\n?---RULES_END---/);

	return {
		insights: insightsMatch?.[1]?.trim() ?? "",
		observations: observationsMatch?.[1]?.trim() ?? "",
		rules: rulesMatch?.[1]?.trim() ?? "",
	};
};

const hasContent = (section: string, ...emptyPhrases: string[]): boolean => {
	if (!section || section.length <= 20) return false;
	const lower = section.toLowerCase();
	return !emptyPhrases.some((phrase) => lower.includes(phrase));
};

/**
 * Parse the rules markdown into individual selectable rules.
 * Extracts bullet points (- ...) grouped under their nearest heading.
 */
const parseRules = (rulesMarkdown: string): ParsedRule[] => {
	const rules: ParsedRule[] = [];
	let currentHeading = "General";

	for (const line of rulesMarkdown.split("\n")) {
		const trimmed = line.trim();

		// Track headings
		const headingMatch = trimmed.match(/^#{1,4}\s+(.+)$/);
		if (headingMatch) {
			currentHeading = headingMatch[1];
			continue;
		}

		// Extract bullet points as individual rules
		const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
		if (bulletMatch) {
			rules.push({ heading: currentHeading, text: bulletMatch[1] });
			continue;
		}

		// Extract numbered items as individual rules
		const numberedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
		if (numberedMatch) {
			rules.push({ heading: currentHeading, text: numberedMatch[1] });
		}
	}

	return rules;
};

// --- File operations ---

const readExistingAgentsMd = (cwd: string): string => {
	const projectPath = path.join(cwd, "AGENTS.md");
	const globalPath = path.join(process.env.HOME ?? "~", ".pi", "agent", "AGENTS.md");

	const projectContent = readFileOrEmpty(projectPath);
	const globalContent = readFileOrEmpty(globalPath);

	const parts: string[] = [];
	if (globalContent) parts.push(`# Global AGENTS.md\n\n${globalContent}`);
	if (projectContent) parts.push(`# Project AGENTS.md\n\n${projectContent}`);
	return parts.join("\n\n");
};

const readFileOrEmpty = (filepath: string): string => {
	try {
		return fs.readFileSync(filepath, "utf-8");
	} catch {
		return "";
	}
};

const appendToAgentsMd = (content: string, cwd: string): string => {
	const filepath = path.join(cwd, "AGENTS.md");
	const existing = readFileOrEmpty(filepath);

	const timestamp = new Date().toISOString().slice(0, 10);
	const section = `\n\n# Session Rules (${timestamp})\n\n${content}\n`;

	fs.writeFileSync(filepath, existing + section);
	return filepath;
};

const buildRulesContent = (result: RuleSelectionResult): string => {
	const sections: string[] = [];

	// Group selected rules by heading
	if (result.selectedRules.length > 0) {
		const grouped = new Map<string, string[]>();
		for (const rule of result.selectedRules) {
			const list = grouped.get(rule.heading) ?? [];
			list.push(rule.text);
			grouped.set(rule.heading, list);
		}

		for (const [heading, rules] of grouped) {
			sections.push(`## ${heading}`);
			for (const rule of rules) {
				sections.push(`- ${rule}`);
			}
			sections.push("");
		}
	}

	// Append custom text
	if (result.customText.trim()) {
		sections.push(result.customText.trim());
		sections.push("");
	}

	return sections.join("\n").trim();
};

// --- UI: Read-only analysis overlay ---

const showAnalysisOverlay = async (
	result: AnalysisResult,
	hasInsights: boolean,
	hasObservations: boolean,
	hasRules: boolean,
	ctx: ExtensionCommandContext,
): Promise<void> => {
	if (!ctx.hasUI) return;

	await ctx.ui.custom((_tui, theme, _kb, done) => {
		const container = new Container();
		const border = new DynamicBorder((s: string) => theme.fg("accent", s));
		const mdTheme = getMarkdownTheme();

		if (hasInsights) {
			container.addChild(border);
			container.addChild(new Text(theme.fg("accent", theme.bold("  Reusable Insights")), 1, 0));
			container.addChild(new Markdown(result.insights, 1, 1, mdTheme));
		}

		if (hasObservations) {
			container.addChild(border);
			container.addChild(new Text(theme.fg("muted", theme.bold("  Session Observations")), 1, 0));
			container.addChild(new Markdown(result.observations, 1, 1, mdTheme));
		}

		if (hasRules) {
			container.addChild(border);
			container.addChild(new Text(theme.fg("warning", theme.bold("  Proposed AGENTS.md Rules")), 1, 0));
			container.addChild(new Markdown(result.rules, 1, 1, mdTheme));
		}

		container.addChild(border);
		container.addChild(new Text(theme.fg("dim", "  Press Enter or Esc to continue"), 0, 0));

		return {
			render: (width: number) => container.render(width),
			invalidate: () => container.invalidate(),
			handleInput: (data: string) => {
				if (matchesKey(data, "enter") || matchesKey(data, "escape")) {
					done(undefined);
				}
			},
		};
	});
};

// --- UI: Rule selector form ---

class RuleSelector implements Component, Focusable {
	private tui: TUI;
	private theme: Theme;
	private rules: ParsedRule[];
	private done: (result: RuleSelectionResult | null) => void;

	private selected: boolean[];
	private cursor = 0;
	private inCustomInput = false;
	private customInput: Input;

	private cachedWidth?: number;
	private cachedLines?: string[];

	private _focused = false;
	get focused(): boolean {
		return this._focused;
	}
	set focused(value: boolean) {
		this._focused = value;
		if (this.inCustomInput) {
			this.customInput.focused = value;
		}
	}

	constructor(
		tui: TUI,
		theme: Theme,
		rules: ParsedRule[],
		done: (result: RuleSelectionResult | null) => void,
	) {
		this.tui = tui;
		this.theme = theme;
		this.rules = rules;
		this.done = done;
		this.selected = new Array(rules.length).fill(false);
		this.customInput = new Input(theme, 1, 0, "Type additional rules or instructions...");
	}

	handleInput(data: string): void {
		// Custom input mode
		if (this.inCustomInput) {
			if (matchesKey(data, Key.escape)) {
				this.inCustomInput = false;
				this.customInput.focused = false;
				this.invalidate();
				this.tui.requestRender();
				return;
			}
			// Tab exits custom input back to list
			if (matchesKey(data, Key.tab) || matchesKey(data, Key.shift("tab"))) {
				this.inCustomInput = false;
				this.customInput.focused = false;
				this.invalidate();
				this.tui.requestRender();
				return;
			}
			this.customInput.handleInput?.(data);
			this.invalidate();
			this.tui.requestRender();
			return;
		}

		// List mode
		if (matchesKey(data, Key.escape)) {
			this.done(null);
			return;
		}

		if (matchesKey(data, Key.up)) {
			this.cursor = Math.max(0, this.cursor - 1);
			this.invalidate();
			this.tui.requestRender();
			return;
		}

		if (matchesKey(data, Key.down)) {
			// +1 for the "custom input" row
			this.cursor = Math.min(this.rules.length, this.cursor + 1);
			this.invalidate();
			this.tui.requestRender();
			return;
		}

		// Toggle selection or enter custom input
		if (matchesKey(data, Key.space)) {
			if (this.cursor < this.rules.length) {
				this.selected[this.cursor] = !this.selected[this.cursor];
				this.invalidate();
				this.tui.requestRender();
			} else {
				// Custom input row
				this.inCustomInput = true;
				this.customInput.focused = this._focused;
				this.invalidate();
				this.tui.requestRender();
			}
			return;
		}

		if (matchesKey(data, Key.enter)) {
			// If on custom input row, enter custom input mode
			if (this.cursor === this.rules.length) {
				this.inCustomInput = true;
				this.customInput.focused = this._focused;
				this.invalidate();
				this.tui.requestRender();
				return;
			}

			// Otherwise submit
			this.submit();
			return;
		}

		// Tab to jump to custom input
		if (matchesKey(data, Key.tab)) {
			this.inCustomInput = true;
			this.customInput.focused = this._focused;
			this.invalidate();
			this.tui.requestRender();
			return;
		}

		// 'a' to select all, 'n' to select none
		if (data === "a" || data === "A") {
			this.selected.fill(true);
			this.invalidate();
			this.tui.requestRender();
			return;
		}
		if (data === "d" || data === "D") {
			this.selected.fill(false);
			this.invalidate();
			this.tui.requestRender();
			return;
		}

		// Ctrl+Enter to submit from anywhere
		if (matchesKey(data, Key.ctrl("s"))) {
			this.submit();
			return;
		}
	}

	private submit(): void {
		const selectedRules = this.rules.filter((_, i) => this.selected[i]);
		const customText = this.customInput.getText().trim();

		if (selectedRules.length === 0 && !customText) {
			this.done(null);
			return;
		}

		this.done({ selectedRules, customText });
	}

	render(width: number): string[] {
		if (this.cachedLines && this.cachedWidth === width) {
			return this.cachedLines;
		}

		const t = this.theme;
		const lines: string[] = [];

		lines.push(t.fg("border", "─".repeat(width)));
		lines.push(t.fg("accent", t.bold("  Select rules to add to AGENTS.md")));
		lines.push("");

		// Render rules grouped by heading
		let lastHeading = "";
		this.rules.forEach((rule, idx) => {
			if (rule.heading !== lastHeading) {
				if (lastHeading) lines.push("");
				lines.push(`  ${t.fg("warning", t.bold(rule.heading))}`);
				lastHeading = rule.heading;
			}

			const isCursor = idx === this.cursor && !this.inCustomInput;
			const isSelected = this.selected[idx];
			const checkbox = isSelected ? t.fg("success", "[✓]") : t.fg("muted", "[ ]");
			const pointer = isCursor ? t.fg("accent", "› ") : "  ";
			const text = isCursor ? t.fg("accent", rule.text) : rule.text;

			const wrapped = wrapTextWithAnsi(`${pointer}${checkbox} ${text}`, width);
			for (const wl of wrapped) {
				lines.push(wl);
			}
		});

		// Custom input section
		lines.push("");
		lines.push(t.fg("border", "─".repeat(width)));

		const isCustomCursor = this.cursor === this.rules.length && !this.inCustomInput;
		const customPointer = isCustomCursor ? t.fg("accent", "› ") : "  ";
		const customLabel = isCustomCursor
			? t.fg("accent", "Custom rules (Enter to type)")
			: this.inCustomInput
				? t.fg("accent", "Custom rules:")
				: t.fg("muted", "Custom rules (Enter to type)");

		lines.push(`${customPointer}${customLabel}`);

		if (this.inCustomInput) {
			lines.push("");
			const inputLines = this.customInput.render(width - 4);
			for (const line of inputLines) {
				lines.push("    " + line);
			}
			lines.push(`    ${t.fg("dim", "Tab to go back • Type rules as plain text")}`);
		} else {
			const existing = this.customInput.getText().trim();
			if (existing) {
				lines.push(`    ${t.fg("muted", `"${truncateToWidth(existing, width - 10)}"`)}`);
			}
		}

		// Footer
		lines.push("");
		lines.push(t.fg("border", "─".repeat(width)));

		const selectedCount = this.selected.filter(Boolean).length;
		const hasCustom = this.customInput.getText().trim().length > 0;
		const status = [
			selectedCount > 0 ? t.fg("success", `${selectedCount} selected`) : t.fg("dim", "0 selected"),
			hasCustom ? t.fg("success", "+ custom") : "",
		]
			.filter(Boolean)
			.join("  ");

		lines.push(`  ${status}`);
		lines.push(
			t.fg(
				"dim",
				"  ↑↓: navigate • Space: toggle • a/d: all/none • Enter: submit • Ctrl+S: submit • Esc: cancel",
			),
		);
		lines.push(t.fg("border", "─".repeat(width)));

		this.cachedWidth = width;
		this.cachedLines = lines;
		return lines;
	}

	invalidate(): void {
		this.cachedWidth = undefined;
		this.cachedLines = undefined;
	}
}

const showRuleSelector = async (
	rules: ParsedRule[],
	ctx: ExtensionCommandContext,
): Promise<RuleSelectionResult | null> => {
	if (!ctx.hasUI) return null;

	return await ctx.ui.custom<RuleSelectionResult | null>((tui, theme, _kb, done) => {
		return new RuleSelector(tui, theme, rules, done);
	});
};

// --- Extension ---

export default function (pi: ExtensionAPI) {
	pi.registerCommand("insights", {
		description: "Extract insights, observations, and proposed AGENTS.md rules from the current session",
		handler: async (_args, ctx) => {
			const branch = ctx.sessionManager.getBranch();
			const conversationText = buildConversationText(branch);

			if (!conversationText.trim()) {
				if (ctx.hasUI) ctx.ui.notify("No conversation to analyze", "warning");
				return;
			}

			if (ctx.hasUI) ctx.ui.notify("Analyzing session...", "info");

			const model = ctx.model;
			if (!model) {
				if (ctx.hasUI) ctx.ui.notify("No active model available", "error");
				return;
			}

			const apiKey = await ctx.modelRegistry.getApiKeyForProvider(model.provider);
			if (!apiKey) {
				if (ctx.hasUI) ctx.ui.notify(`No API key for ${model.provider}/${model.id}`, "error");
				return;
			}

			const existingAgentsMd = readExistingAgentsMd(ctx.cwd);

			const messages = [
				{
					role: "user" as const,
					content: [
						{
							type: "text" as const,
							text: buildAnalysisPrompt(conversationText, existingAgentsMd),
						},
					],
					timestamp: Date.now(),
				},
			];

			try {
				const response = await complete(model, { messages }, { apiKey, reasoningEffort: "high" });

				const responseText = response.content
					.filter((c): c is { type: "text"; text: string } => c.type === "text")
					.map((c) => c.text)
					.join("\n");

				if (!responseText.trim()) {
					if (ctx.hasUI) ctx.ui.notify("No analysis could be produced", "warning");
					return;
				}

				const result = parseResponse(responseText);

				const hasInsights = hasContent(result.insights, "no reusable insights");
				const hasObservations = hasContent(result.observations, "no notable observations");
				const hasRules = hasContent(result.rules, "no new rules identified", "no actionable rules");

				if (!hasInsights && !hasObservations && !hasRules) {
					if (ctx.hasUI) ctx.ui.notify("No insights could be extracted from this session", "warning");
					return;
				}

				// Step 1: Show read-only analysis overlay
				await showAnalysisOverlay(result, hasInsights, hasObservations, hasRules, ctx);

				if (!ctx.hasUI || !hasRules) return;

				// Step 2: Ask if user wants to update AGENTS.md
				const wantsUpdate = await ctx.ui.confirm(
					"Update AGENTS.md?",
					"Would you like to add any of the proposed rules to your project's AGENTS.md?",
				);

				if (!wantsUpdate) return;

				// Step 3: Show rule selector
				const parsedRules = parseRules(result.rules);

				if (parsedRules.length === 0) {
					// No structured rules to select — fall back to editor for free-form
					const customText = await ctx.ui.editor(
						"Enter rules for AGENTS.md:",
						result.rules,
					);
					if (customText?.trim()) {
						const filepath = appendToAgentsMd(customText.trim(), ctx.cwd);
						ctx.ui.notify(`Updated ${filepath}`, "success");
					}
					return;
				}

				const selection = await showRuleSelector(parsedRules, ctx);

				if (!selection) {
					ctx.ui.notify("No rules selected", "info");
					return;
				}

				const rulesContent = buildRulesContent(selection);
				if (!rulesContent) {
					ctx.ui.notify("No rules to add", "info");
					return;
				}

				const filepath = appendToAgentsMd(rulesContent, ctx.cwd);
				ctx.ui.notify(`Updated ${filepath}`, "success");
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				if (ctx.hasUI) ctx.ui.notify(`Analysis failed: ${message}`, "error");
			}
		},
	});
}
