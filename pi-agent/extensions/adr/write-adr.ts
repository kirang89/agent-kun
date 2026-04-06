/**
 * Write ADR files in MADR minimal format.
 *
 * Handles sequential numbering, kebab-case file naming,
 * timestamps, parent ADR linking, and directory creation.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { complete, type Model } from "@mariozechner/pi-ai";
import type { DecisionCandidate } from "./analyze";

export async function writeAdrFiles(
	candidates: DecisionCandidate[],
	adrDir: string,
	model: Model,
	apiKey: string
): Promise<string[]> {
	fs.mkdirSync(adrDir, { recursive: true });

	const nextNumber = getNextAdrNumber(adrDir);
	const existingAdrs = listExistingAdrs(adrDir);
	const writtenFiles: string[] = [];

	for (let i = 0; i < candidates.length; i++) {
		const candidate = candidates[i];
		const number = nextNumber + i;
		const slug = toKebabCase(candidate.title);
		const filename = `${String(number).padStart(4, "0")}-${slug}.md`;
		const filepath = path.join(adrDir, filename);
		const timestamp = new Date().toISOString().split("T")[0];

		const parentFile = candidate.supersedes ? resolveParentAdr(candidate.supersedes, existingAdrs) : null;

		const content = await renderAdr(candidate, timestamp, parentFile, model, apiKey);
		fs.writeFileSync(filepath, content, "utf-8");
		writtenFiles.push(filename);

		if (parentFile) {
			markSuperseded(path.join(adrDir, parentFile), filename);
		}
	}

	return writtenFiles;
}

// --- Parent ADR resolution ---

interface ExistingAdr {
	filename: string;
	title: string;
}

function listExistingAdrs(adrDir: string): ExistingAdr[] {
	if (!fs.existsSync(adrDir)) return [];

	return fs
		.readdirSync(adrDir)
		.filter((f) => /^\d{4}-.*\.md$/.test(f))
		.map((filename) => {
			const content = fs.readFileSync(path.join(adrDir, filename), "utf-8");
			const titleMatch = content.match(/^#\s+(.+)$/m);
			return { filename, title: titleMatch?.[1]?.trim() ?? "" };
		})
		.filter((adr) => adr.title.length > 0);
}

function resolveParentAdr(supersedes: string, existing: ExistingAdr[]): string | null {
	const needle = supersedes.toLowerCase();

	// Exact match first
	const exact = existing.find((a) => a.title.toLowerCase() === needle);
	if (exact) return exact.filename;

	// Substring match — title contains or is contained by the supersedes string
	const partial = existing.find(
		(a) => a.title.toLowerCase().includes(needle) || needle.includes(a.title.toLowerCase())
	);
	if (partial) return partial.filename;

	return null;
}

function markSuperseded(parentPath: string, childFilename: string): void {
	if (!fs.existsSync(parentPath)) return;

	const content = fs.readFileSync(parentPath, "utf-8");

	// Don't add duplicate superseded notices
	if (content.includes(`Superseded by`)) return;

	const notice = `> **Superseded by [${childFilename}](${childFilename})**\n\n`;
	fs.writeFileSync(parentPath, notice + content, "utf-8");
}

// --- Numbering & naming ---

function getNextAdrNumber(adrDir: string): number {
	if (!fs.existsSync(adrDir)) return 1;

	const files = fs.readdirSync(adrDir).filter((f) => /^\d{4}-.*\.md$/.test(f));
	if (files.length === 0) return 1;

	const numbers = files.map((f) => parseInt(f.slice(0, 4), 10)).filter((n) => !isNaN(n));
	return Math.max(...numbers) + 1;
}

function toKebabCase(title: string): string {
	return title
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 80);
}

// --- ADR rendering ---

async function renderAdr(
	candidate: DecisionCandidate,
	timestamp: string,
	parentFile: string | null,
	model: Model,
	apiKey: string
): Promise<string> {
	const parentLine = parentFile ? `\n- Parent ADR: ${parentFile}` : "";

	const prompt = `You are a technical writer. Write an Architecture Decision Record (ADR) in the exact MADR minimal format below. Use the provided decision data. Write clear, concise prose. Context should describe forces at play in value-neutral language. Decision outcome should use active voice ("We will...").

Decision data:
- Title: ${candidate.title}
- Context: ${candidate.context}
- Considered Options: ${candidate.consideredOptions.join(", ")}
- Chosen Option: ${candidate.chosenOption}
- Justification: ${candidate.justification}
- Good Consequences: ${candidate.goodConsequences.join("; ")}
- Bad Consequences: ${candidate.badConsequences.join("; ")}
- Date: ${timestamp}${parentLine}

Output ONLY the ADR markdown, nothing else. Follow this exact structure:

# {title}

- **Date:** {YYYY-MM-DD}
${parentFile ? `- **Parent:** [{parent filename}]({parent filename})\n` : ""}
## Context and Problem Statement

{2-3 sentences describing the context and forces at play}

## Considered Options

* {option 1}
* {option 2}
...

## Decision Outcome

Chosen option: "{chosen option}", because {justification}.

### Consequences

* Good, because {consequence}
* Bad, because {consequence}
...`;

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
		{ apiKey }
	);

	const text = response.content
		.filter((c): c is { type: "text"; text: string } => c.type === "text")
		.map((c) => c.text)
		.join("\n")
		.trim();

	// Strip markdown code fences if the model wrapped the output
	const stripped = text.replace(/^```(?:markdown)?\s*\n?/, "").replace(/\n?```\s*$/, "");

	return stripped + "\n";
}
