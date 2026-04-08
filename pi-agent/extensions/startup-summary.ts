/**
 * Startup Summary Extension
 *
 * Shows a one-line summary of loaded resources after the pi splash:
 *   Skills (13) ✓  Extensions (14) ✓  AGENTS.md (Global) ✓  AGENTS.md (Project) ✗
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

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
			// npm packages are installed globally
			const result = require("node:child_process").execSync("npm root -g", { encoding: "utf8" }).trim();
			const dir = join(result, pkgName);
			return existsSync(dir) ? dir : undefined;
		} catch {
			return undefined;
		}
	}

	if (source.startsWith("git:") || source.startsWith("https://") || source.startsWith("http://")) {
		// git packages are cloned to ~/.pi/agent/git/<host>/<path>
		let url = source.replace(/^git:/, "");
		url = url.replace(/^https?:\/\//, "").replace(/@[^/]*$/, ""); // strip ref
		const dir = join(agentDir, "git", url);
		return existsSync(dir) ? dir : undefined;
	}

	// Local path
	const resolved = resolve(agentDir, source);
	return existsSync(resolved) ? resolved : undefined;
}

export default function (pi: ExtensionAPI) {
	pi.on("session_start", async (event, ctx) => {
		if (!ctx.hasUI) return;
		if (event.reason !== "startup" && event.reason !== "reload") return;

		const home = process.env.HOME ?? "";
		const agentDir = join(home, ".pi", "agent");

		// Count local extensions
		let extCount = countExtensionsInDir(join(agentDir, "extensions"));
		extCount += countExtensionsInDir(join(ctx.cwd, ".pi", "extensions"));
		extCount -= 1; // subtract this extension itself

		// Count package extensions from settings.json
		const settingsPath = join(agentDir, "settings.json");
		if (existsSync(settingsPath)) {
			try {
				const settings = JSON.parse(readFileSync(settingsPath, "utf8"));
				const packages: (string | { source: string })[] = settings.packages ?? [];
				for (const pkg of packages) {
					const source = typeof pkg === "string" ? pkg : pkg.source;
					const pkgDir = resolvePackageDir(source, agentDir);
					if (pkgDir) {
						extCount += countPackageExtensions(pkgDir);
					}
				}
			} catch { /* ignore settings parse errors */ }
		}

		// Count skills
		let skillCount = countSkillsInDir(join(agentDir, "skills"));
		skillCount += countSkillsInDir(join(ctx.cwd, ".pi", "skills"));

		const globalAgents = existsSync(join(agentDir, "AGENTS.md"));
		const projectAgents = existsSync(join(ctx.cwd, "AGENTS.md"));

		const theme = ctx.ui.theme;
		const check = theme.fg("success", "✓");
		const cross = theme.fg("error", "✗");

		const parts = [
			`${theme.fg("muted", `Skills (${skillCount})`)} ${skillCount > 0 ? check : cross}`,
			`${theme.fg("muted", `Extensions (${extCount})`)} ${extCount > 0 ? check : cross}`,
			`${theme.fg("muted", "AGENTS.md (Global)")} ${globalAgents ? check : cross}`,
			`${theme.fg("muted", "AGENTS.md (Project)")} ${projectAgents ? check : cross}`,
		];

		ctx.ui.setWidget("startup-summary", [parts.join("  ")]);
	});

	pi.on("agent_start", async (_event, ctx) => {
		ctx.ui.setWidget("startup-summary", undefined);
	});
}
