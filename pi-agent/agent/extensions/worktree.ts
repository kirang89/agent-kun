import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { homedir } from "node:os";

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";

const WIDGET_KEY = "worktree";
const WIDGET_PADDING_X = 1;
const CONFIG_PATH = join(
	process.env.PI_CODING_AGENT_DIR ?? join(homedir(), ".pi", "agent"),
	"worktree.json",
);

interface Config {
	enabled: boolean;
}

let enabled = readConfig().enabled;
let lastName: string | undefined;

export default function worktreeExtension(pi: ExtensionAPI) {
	pi.on("session_start", (_event, ctx) => {
		void refreshWorktree(pi, ctx);
	});

	pi.on("agent_end", (_event, ctx) => {
		void refreshWorktree(pi, ctx);
	});

	pi.on("before_agent_start", (_event, ctx) => {
		void refreshWorktree(pi, ctx);
	});

	pi.on("user_bash", (event, ctx) => {
		void refreshWorktree(pi, ctx, event.cwd);
	});

	pi.registerCommand("worktree", {
		description: "Toggle worktree widget, or pass on/off/toggle/status/refresh",
		handler: async (args, ctx) => {
			const action = args.trim().toLowerCase();

			if (action === "on") {
				setEnabled(true, ctx);
				await refreshWorktree(pi, ctx);
				return;
			}

			if (action === "off") {
				setEnabled(false, ctx);
				return;
			}

			if (action === "" || action === "toggle") {
				setEnabled(!enabled, ctx);
				await refreshWorktree(pi, ctx);
				return;
			}

			if (action === "status") {
				ctx.ui.notify(`Worktree widget is ${enabled ? "on" : "off"}.`, "info");
				return;
			}

			if (action === "refresh") {
				await refreshWorktree(pi, ctx);
				return;
			}

			ctx.ui.notify("Usage: /worktree [on|off|toggle|status|refresh]", "warning");
		},
	});
}

function setEnabled(next: boolean, ctx: ExtensionContext): void {
	enabled = next;
	writeConfig({ enabled });
	if (!enabled) ctx.ui.setWidget(WIDGET_KEY, undefined, { placement: "aboveEditor" });
	ctx.ui.notify(`Worktree widget ${enabled ? "enabled" : "disabled"}.`, "info");
}

async function refreshWorktree(pi: ExtensionAPI, ctx: ExtensionContext, cwd = ctx.cwd): Promise<void> {
	if (!enabled) {
		hideWidget(ctx);
		return;
	}

	const name = await worktreeName(pi, cwd);
	if (!name) {
		hideWidget(ctx);
		return;
	}

	if (name === lastName) return;
	lastName = name;
	ctx.ui.setWidget(
		WIDGET_KEY,
		(_tui, theme) => new Text(theme.fg("dim", `worktree: ${name}`), WIDGET_PADDING_X, 0),
		{ placement: "aboveEditor" },
	);
}

async function worktreeName(pi: ExtensionAPI, cwd: string): Promise<string | undefined> {
	const result = await pi.exec(
		"git",
		["rev-parse", "--path-format=absolute", "--git-dir", "--git-common-dir", "--show-toplevel"],
		{ cwd, timeout: 3000 },
	);

	if (result.code !== 0) return undefined;

	const [gitDir, commonDir, root] = result.stdout
		.split("\n")
		.map((line) => stripTrailingSlash(line.trim()))
		.filter(Boolean);

	// Main checkout has git-dir == common-dir. Linked worktrees use .git/worktrees/<name>.
	if (!gitDir || !commonDir || gitDir === commonDir) return undefined;
	return root ? basename(root) : basename(gitDir);
}

function hideWidget(ctx: ExtensionContext): void {
	lastName = undefined;
	ctx.ui.setWidget(WIDGET_KEY, undefined, { placement: "aboveEditor" });
}

function stripTrailingSlash(path: string): string {
	return path.replace(/\/+$/, "");
}

function readConfig(): Config {
	try {
		if (!existsSync(CONFIG_PATH)) return { enabled: true };

		const parsed = JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as Partial<Config>;
		return { enabled: parsed.enabled !== false };
	} catch {
		return { enabled: true };
	}
}

function writeConfig(config: Config): void {
	mkdirSync(dirname(CONFIG_PATH), { recursive: true });
	writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}
