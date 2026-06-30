import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

import type { AssistantMessage, Usage } from "@mariozechner/pi-ai";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";

const WIDGET_KEY = "turn-stats";
const WIDGET_PADDING_X = 1;
const CONFIG_PATH = join(
  process.env.PI_CODING_AGENT_DIR ?? join(homedir(), ".pi", "agent"),
  "turn-stats.json"
);

interface Config {
  enabled: boolean;
}

let enabled = readConfig().enabled;
let assistantStartedAt: number | undefined;
let lastStats: string | undefined;

export default function (pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => {
    renderWidget(ctx);
  });

  pi.on("message_start", (event) => {
    if (event.message.role === "assistant") {
      assistantStartedAt = Date.now();
    }
  });

  pi.on("message_end", (event, ctx) => {
    if (event.message.role !== "assistant") return;

    const usage = (event.message as AssistantMessage).usage;
    if (!usage) return;

    const startedAt = assistantStartedAt ?? Date.now();
    assistantStartedAt = undefined;
    lastStats = formatStats(usage, Date.now() - startedAt);
    renderWidget(ctx);
  });

  pi.registerCommand("turn-stats", {
    description: "Toggle persistent per-turn token/TPS stats, or pass on/off/status",
    handler: async (args, ctx) => {
      const action = args.trim().toLowerCase();

      if (action === "on") {
        setEnabled(true, ctx);
        return;
      }

      if (action === "off") {
        setEnabled(false, ctx);
        return;
      }

      if (action === "" || action === "toggle") {
        setEnabled(!enabled, ctx);
        return;
      }

      if (action === "status") {
        ctx.ui.notify(`Turn stats are ${enabled ? "on" : "off"}.`, "info");
        return;
      }

      ctx.ui.notify("Usage: /turn-stats [on|off|toggle|status]", "warning");
    },
  });
}

function setEnabled(next: boolean, ctx: ExtensionContext): void {
  enabled = next;
  writeConfig({ enabled });
  renderWidget(ctx);
  ctx.ui.notify(`Turn stats ${enabled ? "enabled" : "disabled"}.`, "info");
}

function renderWidget(ctx: ExtensionContext): void {
  if (!enabled) {
    ctx.ui.setWidget(WIDGET_KEY, undefined, { placement: "aboveEditor" });
    return;
  }

  ctx.ui.setWidget(
    WIDGET_KEY,
    (_tui, theme) =>
      new Text(
        theme.fg("dim", lastStats ?? "TPS -- tok/s. out --, in --, cache r/w --/--, total --, --s"),
        WIDGET_PADDING_X,
        0
      ),
    { placement: "aboveEditor" }
  );
}

function formatStats(usage: Usage, elapsedMs: number): string {
  const seconds = Math.max(0.001, elapsedMs / 1000);
  const total = usage.input + usage.output + usage.cacheRead + usage.cacheWrite;
  const tps = usage.output / seconds;

  return [
    `TPS ${tps.toFixed(1)} tok/s.`,
    `out ${formatInteger(usage.output)},`,
    `in ${formatInteger(usage.input)},`,
    `cache r/w ${formatInteger(usage.cacheRead)}/${formatInteger(usage.cacheWrite)},`,
    `total ${formatInteger(total)},`,
    `${seconds.toFixed(1)}s`,
  ].join(" ");
}

function formatInteger(value: number): string {
  return Math.round(value).toLocaleString();
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
