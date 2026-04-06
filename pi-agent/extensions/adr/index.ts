/**
 * ADR Extension — Record Architecture Decision Records from session conversations.
 *
 * Registers a `/adr` slash command that:
 * 1. Analyzes the current session for architecturally significant decisions
 * 2. Presents an interactive form for the user to select which to record
 * 3. Writes selected decisions as MADR-formatted files to `adrs/`
 */

import type { ExtensionAPI, ExtensionCommandContext } from "@mariozechner/pi-coding-agent";
import { complete } from "@mariozechner/pi-ai";
import { analyzeSessionForDecisions, type DecisionCandidate } from "./analyze";
import { writeAdrFiles } from "./write-adr";

export default function (pi: ExtensionAPI) {
	pi.registerCommand("adr", {
		description: "Analyze session for architecture decisions and record selected ones as ADRs",
		handler: async (_args, ctx) => {
			await handleAdrCommand(ctx, pi);
		},
	});
}

async function handleAdrCommand(ctx: ExtensionCommandContext, pi: ExtensionAPI): Promise<void> {
	if (!ctx.hasUI) {
		return;
	}

	await ctx.waitForIdle();

	const branch = ctx.sessionManager.getBranch();
	const conversationText = buildConversationText(branch);

	if (!conversationText.trim()) {
		ctx.ui.notify("No conversation found to analyze", "warning");
		return;
	}

	ctx.ui.notify("Analyzing session for architecture decisions...", "info");

	const model = ctx.model;
	if (!model) {
		ctx.ui.notify("No active model available", "error");
		return;
	}

	const apiKey = await ctx.modelRegistry.getApiKey(model);
	if (!apiKey) {
		ctx.ui.notify(`No API key for ${model.provider}/${model.id}`, "error");
		return;
	}

	const candidates = await analyzeSessionForDecisions(conversationText, model, apiKey);

	if (candidates.length === 0) {
		ctx.ui.notify("No architecturally significant decisions found in this session", "info");
		return;
	}

	const tabs = candidates.map((candidate, idx) => ({
		id: `decision-${idx}`,
		label: `D${idx + 1}`,
		question: candidate.title,
		options: [
			{
				value: "record",
				label: "Record this decision",
				description: candidate.summary,
			},
			{
				value: "skip",
				label: "Skip",
				description: "Don't record this decision",
			},
		],
		selectionType: "single" as const,
		allowCustom: false,
	}));

	const { InteractiveForm } = await import("../interactive-form/form-component");

	const result = await ctx.ui.custom<FormResult | null>((tui, theme, _kb, done) => {
		return new InteractiveForm(tui, theme, "Architecture Decisions Found", tabs, done);
	});

	if (!result) {
		ctx.ui.notify("ADR recording cancelled", "info");
		return;
	}

	const selectedCandidates = candidates.filter((_candidate, idx) => {
		const response = result.responses[`decision-${idx}`];
		return response?.selected.includes("record");
	});

	if (selectedCandidates.length === 0) {
		ctx.ui.notify("No decisions selected for recording", "info");
		return;
	}

	const adrDir = `${ctx.cwd}/adrs`;
	const writtenFiles = await writeAdrFiles(selectedCandidates, adrDir, model, apiKey);

	ctx.ui.notify(`Recorded ${writtenFiles.length} ADR(s) in adrs/`, "success");

	const fileList = writtenFiles.map((f) => `  • ${f}`).join("\n");
	pi.sendMessage(
		{
			customType: "adr-recorded",
			content: `Recorded ${writtenFiles.length} Architecture Decision Record(s):\n${fileList}`,
			display: true,
		},
		{ deliverAs: "nextTurn" }
	);
}

interface FormResult {
	responses: Record<string, { selected: string[]; customText?: string }>;
}

// --- Conversation extraction (same pattern as summarize.ts) ---

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

function buildConversationText(entries: SessionEntry[]): string {
	const sections: string[] = [];

	for (const entry of entries) {
		if (entry.type !== "message" || !entry.message?.role) continue;

		const role = entry.message.role;
		if (role !== "user" && role !== "assistant") continue;

		const textParts = extractTextParts(entry.message.content);
		if (textParts.length === 0) continue;

		const roleLabel = role === "user" ? "User" : "Assistant";
		const messageText = textParts.join("\n").trim();
		if (messageText.length > 0) {
			sections.push(`${roleLabel}: ${messageText}`);
		}
	}

	return sections.join("\n\n");
}

function extractTextParts(content: unknown): string[] {
	if (typeof content === "string") return [content];
	if (!Array.isArray(content)) return [];

	const parts: string[] = [];
	for (const part of content) {
		if (part && typeof part === "object" && (part as ContentBlock).type === "text" && typeof (part as ContentBlock).text === "string") {
			parts.push((part as ContentBlock).text!);
		}
	}
	return parts;
}
