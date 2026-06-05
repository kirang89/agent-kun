import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const EXTENSION_NAME = "wiki";
const DEFAULT_VAULT_ROOT = path.join(os.homedir(), "PKM", "research-wiki");
const RUNS_DIR = path.join(os.homedir(), ".pi", "agent", "wiki-runs");

type WikiArgs = {
	topic: string;
	vaultRoot: string;
};

type JsonEvent = {
	type?: string;
	message?: {
		role?: string;
		content?: Array<{ type: string; text?: string }>;
	};
};

export default function wikiExtension(pi: ExtensionAPI) {
	pi.registerCommand("wiki", {
		description: "Build an Obsidian research wiki for a topic from the current session using an isolated subagent",
		getArgumentCompletions: (prefix) => {
			const completions = ["mtp", "--vault ~/PKM/research-wiki"];
			const filtered = completions.filter((item) => item.startsWith(prefix));
			return filtered.length > 0 ? filtered.map((value) => ({ value, label: value })) : null;
		},
		handler: async (args, ctx) => {
			const parsed = await getWikiArgs(args, ctx);
			if (!parsed) return;

			const sessionFile = ctx.sessionManager.getSessionFile();
			if (!sessionFile) {
				ctx.ui.notify("/wiki requires a persisted pi session. Current session has no session file.", "error");
				return;
			}

			await fs.promises.mkdir(RUNS_DIR, { recursive: true });
			const runId = new Date().toISOString().replace(/[:.]/g, "-");
			const promptPath = path.join(RUNS_DIR, `${runId}-${slugify(parsed.topic)}-prompt.md`);
			const logPath = path.join(RUNS_DIR, `${runId}-${slugify(parsed.topic)}.log`);
			const prompt = buildSubagentPrompt(parsed.topic, parsed.vaultRoot, sessionFile);
			await fs.promises.writeFile(promptPath, prompt, "utf8");

			ctx.ui.notify(`Starting isolated wiki subagent for "${parsed.topic}"...`, "info");
			ctx.ui.setStatus(EXTENSION_NAME, `wiki: ${parsed.topic}`);

			try {
				const result = await runSubagent(promptPath, logPath, ctx.cwd);
				ctx.ui.setStatus(EXTENSION_NAME, "");

				if (result.exitCode === 0) {
					const summary = result.finalText.trim() || `Wiki generated for ${parsed.topic}.`;
					ctx.ui.notify(`${summary}\n\nLog: ${logPath}`, "info");
				} else {
					ctx.ui.notify(`Wiki subagent failed with exit code ${result.exitCode}. Log: ${logPath}`, "error");
				}
			} catch (error) {
				ctx.ui.setStatus(EXTENSION_NAME, "");
				ctx.ui.notify(`Wiki subagent failed: ${String(error)}\nLog: ${logPath}`, "error");
			}
		},
	});
}

async function getWikiArgs(args: string, ctx: any): Promise<WikiArgs | null> {
	const tokens = splitArgs(args.trim());
	let vaultRoot = DEFAULT_VAULT_ROOT;
	const topicParts: string[] = [];

	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];
		if (token === "--vault") {
			const next = tokens[i + 1];
			if (!next) {
				ctx.ui.notify("Usage: /wiki <topic> [--vault <path>]", "error");
				return null;
			}
			vaultRoot = expandHome(next);
			i++;
			continue;
		}
		topicParts.push(token);
	}

	let topic = topicParts.join(" ").trim();
	if (!topic && ctx.hasUI) {
		const input = await ctx.ui.input("Research topic for wiki", "e.g. multi-token prediction");
		topic = (input ?? "").trim();
	}

	if (!topic) {
		ctx.ui.notify("Usage: /wiki <topic> [--vault <path>]", "error");
		return null;
	}

	return { topic, vaultRoot };
}

function buildSubagentPrompt(topic: string, vaultRoot: string, sessionFile: string): string {
	const topicSlug = slugify(topic);
	return `# Isolated wiki-generation subagent

You are running as an isolated subagent. Your job is to build and maintain an Obsidian research wiki for a topic using the current pi session as source material.

Do not ask follow-up questions. Do the work directly. Do not use Jot. Never read, write, or edit .env files or environment variables.

## User request

Create or update an Obsidian wiki for research topic: **${topic}**

## Inputs

- Current pi session JSONL file: \`${sessionFile}\`
- Obsidian vault root: \`${vaultRoot}\`
- Topic folder slug: \`${topicSlug}\`
- Topic root to create/update: \`${path.join(vaultRoot, topicSlug)}\`

## Required folder contract

Create/update this structure:

\`\`\`text
${vaultRoot}/
  README.md
  ${topicSlug}/
    raw/
      session-excerpt.md
      artifacts/
        README.md
        ...raw files copied or reconstructed from session artifacts...
    wiki/
      00 - Start Here.md
      ...synthesized notes...
    assets/
      README.md
      ...images, JSON, CSV, diagrams, metadata...
\`\`\`

## How to read the session

1. Read the JSONL session file from \`${sessionFile}\`.
2. Parse entries with \`type: "message"\`, \`type: "compaction"\`, and \`type: "branch_summary"\`.
3. Extract useful learning content from user and assistant text.
4. Treat tool calls/results and bash executions as raw evidence, especially file paths and created artifacts.
5. Identify artifact file paths mentioned in the session. Copy existing artifact files into \`${topicSlug}/raw/artifacts/\`. Artifacts include \`.html\`, \`.md\`, \`.png\`, \`.jpg\`, \`.jpeg\`, \`.gif\`, \`.svg\`, \`.json\`, \`.csv\`, and generated datasets/visualizations.
6. If an artifact path no longer exists, record it in \`${topicSlug}/raw/artifacts/README.md\` as missing instead of failing.

## Obsidian expectations

- Use Obsidian-compatible Markdown and wikilinks.
- Prefer many small notes over one giant note.
- Include frontmatter with \`topic\`, \`type\`, \`status\`, and \`created\`.
- Because Obsidian often hides unsupported extensions, always create Markdown wrapper/index files for raw non-Markdown artifacts.
- Use the \`obsidian\` CLI where practical to create or open notes. If the CLI cannot target the new vault reliably, write Markdown files directly and mention that in your final report.

## Synthesis expectations

Build a beginner-friendly wiki that ramps from first principles:

1. Start with the simplest intuition.
2. Add technical vocabulary gradually.
3. Separate raw data from synthesis.
4. Add a glossary.
5. Add open questions / reading queue.
6. Add maintenance notes for future AI agents.
7. Preserve provenance: link synthesized notes back to raw session excerpt and artifacts.

## Quality bar

- Do not dump the whole session into the wiki.
- Keep raw excerpts in \`raw/session-excerpt.md\`.
- Use concise notes with clear titles.
- Make the start page usable as a learning path.
- Ensure directories that may appear empty in Obsidian contain a visible \`README.md\`.
- Verify the final file tree with a shell command.

## Final response

Return a short report only:

- vault path
- topic path
- files created/updated
- artifacts copied/missing
- any Obsidian CLI limitation encountered
`;
}

async function runSubagent(promptPath: string, logPath: string, cwd: string): Promise<{ exitCode: number; finalText: string }> {
	const args = [
		"--mode",
		"json",
		"-p",
		"--no-session",
		"--no-extensions",
		"--no-skills",
		"--no-prompt-templates",
		"--no-context-files",
		"--tools",
		"read,bash,write,edit",
		`@${promptPath}`,
	];
	const invocation = getPiInvocation(args);

	return new Promise((resolve, reject) => {
		const proc = spawn(invocation.command, invocation.args, {
			cwd,
			shell: false,
			stdio: ["ignore", "pipe", "pipe"],
		});

		const logStream = fs.createWriteStream(logPath, { flags: "a" });
		let stdoutBuffer = "";
		let stderr = "";
		let finalText = "";

		proc.stdout.on("data", (chunk) => {
			const text = chunk.toString();
			logStream.write(text);
			stdoutBuffer += text;
			const lines = stdoutBuffer.split("\n");
			stdoutBuffer = lines.pop() ?? "";
			for (const line of lines) {
				const extracted = extractAssistantText(line);
				if (extracted) finalText = extracted;
			}
		});

		proc.stderr.on("data", (chunk) => {
			const text = chunk.toString();
			stderr += text;
			logStream.write(text);
		});

		proc.on("error", (error) => {
			logStream.end();
			reject(error);
		});

		proc.on("close", (code) => {
			if (stdoutBuffer.trim()) {
				const extracted = extractAssistantText(stdoutBuffer);
				if (extracted) finalText = extracted;
			}
			if (stderr.trim()) logStream.write(`\n[stderr]\n${stderr}\n`);
			logStream.end();
			resolve({ exitCode: code ?? 0, finalText });
		});
	});
}

function extractAssistantText(line: string): string | null {
	if (!line.trim()) return null;
	let event: JsonEvent;
	try {
		event = JSON.parse(line);
	} catch {
		return null;
	}
	if (event.type !== "message_end" || event.message?.role !== "assistant") return null;
	const parts = event.message.content ?? [];
	return parts
		.filter((part) => part.type === "text" && part.text)
		.map((part) => part.text)
		.join("\n")
		.trim();
}

function getPiInvocation(args: string[]): { command: string; args: string[] } {
	const currentScript = process.argv[1];
	const isBunVirtualScript = currentScript?.startsWith("/$bunfs/root/");
	if (currentScript && !isBunVirtualScript && fs.existsSync(currentScript)) {
		return { command: process.execPath, args: [currentScript, ...args] };
	}

	const execName = path.basename(process.execPath).toLowerCase();
	const isGenericRuntime = /^(node|bun)(\.exe)?$/.test(execName);
	if (!isGenericRuntime) return { command: process.execPath, args };
	return { command: "pi", args };
}

function slugify(value: string): string {
	const slug = value
		.trim()
		.toLowerCase()
		.replace(/['"]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return slug || "research-topic";
}

function expandHome(value: string): string {
	if (value === "~") return os.homedir();
	if (value.startsWith("~/")) return path.join(os.homedir(), value.slice(2));
	return value;
}

function splitArgs(input: string): string[] {
	const tokens: string[] = [];
	const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
	let match: RegExpExecArray | null;
	while ((match = re.exec(input))) tokens.push(match[1] ?? match[2] ?? match[3]);
	return tokens;
}
