import type { ExtensionAPI, ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";
import type { Component } from "@earendil-works/pi-tui";
import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const LOGO_ROWS = buildOfficialLogoRows();

// Left margin applied to every line in the right column so its content isn't
// flush against the divider/border.
const RIGHT_MARGIN = "  ";

const TIPS = [
	["/", "commands"],
	["/tree", "session tree"],
	["!", "run bash"],
	["Ctrl+l", "scoped models"],
	["Shift+Tab", "thinking"],
];

/** Snapshot of which resources were loaded for this session. */
interface LoadedInfo {
	skills: number;
	extensions: number;
	globalAgents: boolean;
	projectAgents: boolean;
}

export default function piSplashExtension(pi: ExtensionAPI) {
	let headerActive = false;

	function dismiss(ctx: ExtensionContext): void {
		if (!ctx.hasUI || !headerActive) return;
		headerActive = false;
		ctx.ui.setHeader(undefined);
	}

	pi.on("session_start", (event, ctx) => {
		if (ctx.mode !== "tui") return;
		if (!["startup", "reload", "new", "resume", "fork"].includes(event.reason)) return;

		headerActive = true;
		const loaded = computeLoadedInfo(ctx.cwd);
		ctx.ui.setHeader((_tui, theme) => new PiSplashHeader(theme, loaded));
	});

	// v0.78.1 renamed the user-message event to "input"; dismiss the splash as
	// soon as the user sends a message (agent_start/shutdown also dismiss).
	pi.on("input", (_event, ctx) => dismiss(ctx));
	pi.on("agent_start", (_event, ctx) => dismiss(ctx));
	pi.on("session_shutdown", (_event, ctx) => dismiss(ctx));

	pi.registerCommand("splash", {
		description: "Show the pi Unicode splash screen",
		handler: async (_args, ctx) => {
			if (ctx.mode !== "tui") return;
			headerActive = true;
			const loaded = computeLoadedInfo(ctx.cwd);
			ctx.ui.setHeader((_tui, theme) => new PiSplashHeader(theme, loaded));
		},
	});
}

class PiSplashHeader implements Component {
	constructor(
		private readonly theme: Theme,
		private readonly loaded: LoadedInfo,
	) {}

	render(termWidth: number): string[] {
		if (termWidth < 44) return [];
		return termWidth >= 78 ? this.renderWide(termWidth) : this.renderCompact(termWidth);
	}

	invalidate(): void {}

	private renderWide(termWidth: number): string[] {
		const boxWidth = Math.min(94, termWidth);
		const leftPad = " ".repeat(Math.floor((termWidth - boxWidth) / 2));
		const innerWidth = boxWidth - 2;
		const leftWidth = 54;
		const rightWidth = innerWidth - leftWidth - 1;

		const logo = colorLogo(LOGO_ROWS, this.theme);
		const left = [
			"",
			...logo.map((line) => center(line, leftWidth)),
			"",
		];
		const right = renderRightColumn(this.theme, this.loaded);
		const rows = Math.max(left.length, right.length);

		return [
			leftPad + borderTop(leftWidth, rightWidth, this.theme),
			...Array.from({ length: rows }, (_, index) => {
				const l = padToWidth(left[index] ?? "", leftWidth);
				const r = padToWidth(right[index] ?? "", rightWidth);
				return leftPad + border("│", this.theme) + l + border("│", this.theme) + r + border("│", this.theme);
			}),
			leftPad + borderBottom(leftWidth, rightWidth, this.theme),
			"",
		];
	}

	private renderCompact(termWidth: number): string[] {
		const boxWidth = Math.min(64, termWidth);
		const leftPad = " ".repeat(Math.floor((termWidth - boxWidth) / 2));
		const innerWidth = boxWidth - 2;
		const lines = [
			...colorLogo(LOGO_ROWS, this.theme).map((line) => center(line, innerWidth)),
			"",
			center(this.theme.fg("accent", "Quick Tips"), innerWidth),
			center(this.theme.fg("dim", "/ commands │ ! bash │ Esc abort"), innerWidth),
			center(this.theme.fg("accent", "Loaded"), innerWidth),
			center(this.theme.fg("dim", compactLoadedSummary(this.loaded)), innerWidth),
		];

		return [
			leftPad + this.theme.fg("border", `╭${"─".repeat(innerWidth)}╮`),
			...lines.map((line) => leftPad + border("│", this.theme) + padToWidth(line, innerWidth) + border("│", this.theme)),
			leftPad + this.theme.fg("border", `╰${"─".repeat(innerWidth)}╯`),
			"",
		];
	}
}

function renderRightColumn(theme: Theme, loaded: LoadedInfo): string[] {
	return [
		// Top padding row so "Quick Tips" aligns with the top of the logo, which
		// has a matching blank padding row in the left column.
		"",
		`${RIGHT_MARGIN}${theme.fg("accent", "Quick Tips")}`,
		...TIPS.map(([key, action]) => `${RIGHT_MARGIN}${theme.fg("toolTitle", key.padEnd(9))} ${theme.fg("muted", action)}`),
		"",
		`${RIGHT_MARGIN}${theme.fg("accent", "Loaded")}`,
		...renderLoadedRows(theme, loaded),
	];
}

function renderLoadedRows(theme: Theme, loaded: LoadedInfo): string[] {
	const check = theme.fg("success", "✓");
	const cross = theme.fg("error", "✗");
	const items: [string, boolean][] = [
		[`Skills (${loaded.skills})`, loaded.skills > 0],
		[`Extensions (${loaded.extensions})`, loaded.extensions > 0],
		["AGENTS.md (Global)", loaded.globalAgents],
		["AGENTS.md (Project)", loaded.projectAgents],
	];
	const labelWidth = Math.max(...items.map(([label]) => label.length));
	return items.map(([label, ok]) => `${RIGHT_MARGIN}${theme.fg("muted", label.padEnd(labelWidth))} ${ok ? check : cross}`);
}

function compactLoadedSummary(loaded: LoadedInfo): string {
	const g = loaded.globalAgents ? "✓" : "✗";
	const p = loaded.projectAgents ? "✓" : "✗";
	return `Skills ${loaded.skills} · Ext ${loaded.extensions} · AGENTS G${g} P${p}`;
}

function colorLogo(lines: string[], theme: Theme): string[] {
	// Single color: use the main theme color (accent) for the whole logo.
	return lines.map((line) => theme.fg("accent", line));
}

function buildOfficialLogoRows(): string[] {
	const unitWidth = 6;
	const unitHeight = 3;
	const grid = [
		[1, 1, 1, 0],
		[1, 0, 1, 0],
		[1, 1, 0, 1],
		[1, 0, 0, 1],
	];

	return grid.flatMap((row) => {
		const line = row.map((cell) => cell ? "█".repeat(unitWidth) : " ".repeat(unitWidth)).join("");
		return Array.from({ length: unitHeight }, () => line);
	});
}

// --- Loaded-resource counting --------------------------------------------

function computeLoadedInfo(cwd: string): LoadedInfo {
	const home = process.env.HOME ?? "";
	const agentDir = join(home, ".pi", "agent");

	// Local extensions (global + project), minus this splash extension itself.
	let extensions = countExtensionsInDir(join(agentDir, "extensions"));
	extensions += countExtensionsInDir(join(cwd, ".pi", "extensions"));
	extensions -= 1;

	// Package extensions declared in settings.json.
	const settingsPath = join(agentDir, "settings.json");
	if (existsSync(settingsPath)) {
		try {
			const settings = JSON.parse(readFileSync(settingsPath, "utf8"));
			const packages: (string | { source: string })[] = settings.packages ?? [];
			for (const pkg of packages) {
				const source = typeof pkg === "string" ? pkg : pkg.source;
				const pkgDir = resolvePackageDir(source, agentDir);
				if (pkgDir) extensions += countPackageExtensions(pkgDir);
			}
		} catch {
			/* ignore settings parse errors */
		}
	}

	let skills = countSkillsInDir(join(agentDir, "skills"));
	skills += countSkillsInDir(join(cwd, ".pi", "skills"));

	return {
		skills,
		extensions: Math.max(0, extensions),
		globalAgents: existsSync(join(agentDir, "AGENTS.md")),
		projectAgents: existsSync(join(cwd, "AGENTS.md")),
	};
}

/** Count .ts files and dirs-with-index.ts in an extensions directory. */
function countExtensionsInDir(dir: string): number {
	if (!existsSync(dir)) return 0;
	let count = 0;
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		const stat = statSync(full);
		if (stat.isFile() && entry.endsWith(".ts")) {
			count++;
		} else if (stat.isDirectory() && existsSync(join(full, "index.ts"))) {
			count++;
		}
	}
	return count;
}

/** Count skill directories (dirs containing SKILL.md). */
function countSkillsInDir(dir: string): number {
	if (!existsSync(dir)) return 0;
	let count = 0;
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory() && existsSync(join(full, "SKILL.md"))) {
			count++;
		}
	}
	return count;
}

/** Count extension files declared in a package's package.json "pi.extensions" field. */
function countPackageExtensions(pkgRoot: string): number {
	const pkgJsonPath = join(pkgRoot, "package.json");
	if (!existsSync(pkgJsonPath)) return 0;

	try {
		const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf8"));
		const extPaths: string[] = pkg?.pi?.extensions ?? [];
		let count = 0;
		for (const ep of extPaths) {
			const resolved = resolve(pkgRoot, ep);
			if (!existsSync(resolved)) continue;
			const stat = statSync(resolved);
			if (stat.isFile()) {
				count++;
			} else if (stat.isDirectory()) {
				count += countExtensionsInDir(resolved);
			}
		}
		return count;
	} catch {
		return 0;
	}
}

/** Resolve a package source string to its install directory. */
function resolvePackageDir(source: string, agentDir: string): string | undefined {
	if (source.startsWith("npm:")) {
		const pkgName = source.slice(4).replace(/@[^/]*$/, ""); // strip version
		try {
			const root = execSync("npm root -g", { encoding: "utf8" }).trim();
			const dir = join(root, pkgName);
			return existsSync(dir) ? dir : undefined;
		} catch {
			return undefined;
		}
	}

	if (source.startsWith("git:") || source.startsWith("https://") || source.startsWith("http://")) {
		let url = source.replace(/^git:/, "");
		url = url.replace(/^https?:\/\//, "").replace(/@[^/]*$/, ""); // strip ref
		const dir = join(agentDir, "git", url);
		return existsSync(dir) ? dir : undefined;
	}

	const resolved = resolve(agentDir, source);
	return existsSync(resolved) ? resolved : undefined;
}

// --- Box drawing helpers --------------------------------------------------

function borderTop(leftWidth: number, rightWidth: number, theme: Theme): string {
	return theme.fg("border", `╭${"─".repeat(leftWidth)}┬${"─".repeat(rightWidth)}╮`);
}

function borderBottom(leftWidth: number, rightWidth: number, theme: Theme): string {
	return theme.fg("border", `╰${"─".repeat(leftWidth)}┴${"─".repeat(rightWidth)}╯`);
}

function border(char: string, theme: Theme): string {
	return theme.fg("border", char);
}

function center(text: string, width: number): string {
	const size = visibleWidth(text);
	if (size >= width) return truncateToWidth(text, width);
	const left = Math.floor((width - size) / 2);
	const right = width - size - left;
	return " ".repeat(left) + text + " ".repeat(right);
}

function padToWidth(text: string, width: number): string {
	const fitted = truncateToWidth(text, width);
	return fitted + " ".repeat(Math.max(0, width - visibleWidth(fitted)));
}

function truncateToWidth(text: string, width: number): string {
	if (visibleWidth(text) <= width) return text;
	return stripAnsi(text).slice(0, Math.max(0, width - 1)) + "…";
}

function visibleWidth(text: string): number {
	return stripAnsi(text).length;
}

function stripAnsi(text: string): string {
	return text.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "");
}
