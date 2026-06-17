import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { InteractiveForm } from "./interactive-form/form-component";
import type { FormResult, TabConfig } from "./interactive-form";

const BASE_TAB: TabConfig = {
	id: "base",
	label: "Base",
	question: "Target branch?",
	selectionType: "single",
	allowCustom: true,
	options: [
		{ value: "main", label: "main" },
		{ value: "master", label: "master" },
		{ value: "develop", label: "develop" },
	],
};

const MODE_TAB: TabConfig = {
	id: "mode",
	label: "Mode",
	question: "Draft or ready PR?",
	selectionType: "single",
	allowCustom: false,
	options: [
		{ value: "draft", label: "Draft" },
		{ value: "ready", label: "Ready" },
	],
};

export default function prExtension(pi: ExtensionAPI) {
	pi.registerCommand("pr", {
		description: "Commit relevant changes and create a PR (/pr against <branch> ready)",
		handler: async (args, ctx) => {
			if (!ctx.isIdle()) {
				ctx.ui.notify("Agent busy. Run /pr when idle.", "warning");
				return;
			}

			const parsedArgs = parseArgs(args);
			const tabs = clarificationTabs(parsedArgs);
			if (tabs.length > 0 && ctx.mode === "tui") {
				const result = await ctx.ui.custom<FormResult | null>((tui, theme, _keybindings, done) => {
					return new InteractiveForm(tui, theme, "Clarify PR", tabs, done);
				});

				if (!result) {
					ctx.ui.notify("/pr cancelled", "info");
					return;
				}

				applyClarifications(parsedArgs, result);
			}

			pi.sendUserMessage(buildPrompt(parsedArgs));
		},
	});
}

function buildPrompt(args: ParsedArgs): string {
	return `/skill:create-pr

Create a PR for this session.

Before creating it:
- Use the git commit workflow for any required commit.
- Inspect git status and diffs.
- Commit unstaged/untracked changes relevant to this session.
- Stage only intended files. If no relevant changes exist, do not create an empty commit.
- If relevance is unclear, ask before staging.
- Use concise Conventional Commit messages.
- Use ${args.targetBranch} as the PR base branch.
- Create a ${args.draft ? "draft" : "ready"} PR${args.draft ? " (pass --draft to gh pr create)" : ""}.
- Follow the create-pr skill exactly, including its PR template.

Inputs:
- Target branch: ${args.targetBranch}
- PR mode: ${args.draft ? "Draft" : "Ready"}
- Validation: ${args.checks}
- Notes: ${args.extraGuidance || "None"}

Stop after returning the PR URL.`;
}

type ParsedArgs = {
	targetBranch: string;
	draft: boolean;
	checks: string;
	extraGuidance: string;
	unclear: Array<"targetBranch" | "mode">;
};

function parseArgs(args: string): ParsedArgs {
	let extraGuidance = args.trim();
	const targetMatches = [...extraGuidance.matchAll(/\b(?:against|base(?:\s+branch)?|target(?:\s+branch)?)\s+(\S+)/gi)];
	const targetBranches = [...new Set(targetMatches.map((match) => match[1]))];
	const hasDanglingTarget = /\b(?:against|base(?:\s+branch)?|target(?:\s+branch)?)\s*$/i.test(extraGuidance);
	const hasDraft = /\bdraft\b/i.test(extraGuidance);
	const hasReady = /\b(ready|publish|non-draft)\b/i.test(extraGuidance);

	for (const match of targetMatches) {
		extraGuidance = extraGuidance.replace(match[0], " ");
	}
	extraGuidance = extraGuidance.replace(/\b(draft|ready|publish|non-draft)\b/gi, " ").replace(/\s+/g, " ").trim();

	return {
		targetBranch: targetBranches[0] ?? "main",
		draft: !(hasReady && !hasDraft),
		checks: parseChecks(args),
		extraGuidance,
		unclear: [
			...(hasDanglingTarget || targetBranches.length > 1 ? (["targetBranch"] as const) : []),
			...(hasDraft && hasReady ? (["mode"] as const) : []),
		],
	};
}

function parseChecks(args: string): string {
	if (/\b(already\s+(ran|run)|checks?\s+(passed|done)|tests?\s+(passed|done))\b/i.test(args)) {
		return "Already run / infer from session";
	}
	if (/\b(run|execute)\s+(checks|tests?|validation)\b/i.test(args)) {
		return "Run reasonable checks first";
	}
	return "Not run";
}

function clarificationTabs(args: ParsedArgs): TabConfig[] {
	return args.unclear.map((field) => (field === "targetBranch" ? BASE_TAB : MODE_TAB));
}

function applyClarifications(args: ParsedArgs, result: FormResult): void {
	if (result.responses[BASE_TAB.id]) {
		args.targetBranch = formatAnswer(BASE_TAB, result);
	}
	if (result.responses[MODE_TAB.id]) {
		args.draft = formatAnswer(MODE_TAB, result) !== "Ready";
	}
}

function formatAnswer(tab: TabConfig, result: FormResult): string {
	const response = result.responses[tab.id];
	if (!response) return defaultAnswer(tab.id);
	if (response.customText?.trim()) return response.customText.trim();
	if (response.selected.length === 0) return defaultAnswer(tab.id);

	return response.selected
		.map((value) => tab.options.find((option) => option.value === value)?.label ?? value)
		.join(", ");
}

function defaultAnswer(tabId: string): string {
	switch (tabId) {
		case "base":
			return "main";
		case "mode":
			return "Draft";
		default:
			return "(none)";
	}
}
