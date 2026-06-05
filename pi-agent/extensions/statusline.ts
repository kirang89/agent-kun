/**
 * Clean statusline extension inspired by Amp's minimal design
 *
 * Replaces default footer with essential context:
 * - Active tool/operation
 * - Context usage % (color-coded by threshold)
 * - Current folder name
 * - Model name
 *
 * Also replaces the input editor chrome with a rounded, Amp-like prompt box
 * with the non-main working branch embedded in the top border.
 *
 * Colors adapt based on state:
 * - Context: green → yellow → red as usage increases
 * - Operations: accent for active, dim for idle
 * - Location: muted to stay out of the way
 *
 * Toggle with: /statusline
 */

import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

import {
  CustomEditor,
  type ExtensionAPI,
  type ExtensionContext,
  type Theme,
} from "@mariozechner/pi-coding-agent";

import { Container, truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";

const CLEAN_STATUSLINE_DEFAULT_ENABLED = true;
const FRAME_MARGIN_X = 0;
const PROMPT_PREFIX_WIDTH = 3;
const PROMPT_TEXT = "\x1b[38;2;255;255;255m";
const RESET = "\x1b[0m";
const BRANCH_CACHE_TTL_MS = 1_000;
const HIDDEN_BRANCHES = new Set(["main", "master"]);

const ANSI_PATTERN =
  /\x1b\[[0-?]*[ -/]*[@-~]|\x1b\][^\x07]*(?:\x07|\x1b\\)|\x1b_[^\x1b]*(?:\x1b\\)/g;
const MENU_BORDER_PATCH = Symbol.for("pi.statusline.menuBorderPatch");

const SELECTOR_COMPONENT_NAMES = new Set([
  "ExtensionEditorComponent",
  "ExtensionInputComponent",
  "ExtensionSelectorComponent",
  "ModelSelectorComponent",
  "OAuthSelectorComponent",
  "ScopedModelsSelectorComponent",
  "SettingsSelectorComponent",
  "ShowImagesSelectorComponent",
  "ThemeSelectorComponent",
  "ThinkingSelectorComponent",
  "TreeSelectorComponent",
  "UserMessageSelectorComponent",
]);

class AmpPromptEditor extends CustomEditor {
  constructor(
    tui: ConstructorParameters<typeof CustomEditor>[0],
    editorTheme: ConstructorParameters<typeof CustomEditor>[1],
    keybindings: ConstructorParameters<typeof CustomEditor>[2],
    private readonly codingTheme: Theme,
    private readonly cwd: string
  ) {
    super(tui, editorTheme, keybindings);
  }

  render(width: number): string[] {
    if (width < 8) return super.render(width);

    const textWidth = Math.max(1, width - FRAME_MARGIN_X * 2 - 2 - PROMPT_PREFIX_WIDTH);
    const lines = super.render(textWidth);
    const bottomIndex = findBottomBorderIndex(lines);
    const contentLines = lines.slice(1, bottomIndex);
    const overflowLines = lines.slice(bottomIndex + 1);

    return [
      this.topBorderLine(width),
      ...contentLines.map((line, index) => this.promptLine(line, index, width)),
      ...overflowLines.map((line) => this.menuLine(line, width)),
      this.borderLine("╰", "╯", width),
    ];
  }

  private topBorderLine(width: number): string {
    const branch = getVisibleGitBranch(this.cwd);
    if (!branch) return this.borderLine("╭", "╮", width);

    const borderWidth = Math.max(2, width - FRAME_MARGIN_X * 2);
    const innerWidth = borderWidth - 2;
    const rightRuleWidth = 1;
    const maxLabelWidth = innerWidth - rightRuleWidth - 2;
    if (maxLabelWidth < 1) return this.borderLine("╭", "╮", width);

    // Show the complete branch name whenever it physically fits; only truncate
    // as a last resort to keep the rendered line within the terminal width.
    const labelText =
      visibleWidth(branch) <= maxLabelWidth
        ? branch
        : truncateToWidth(branch, maxLabelWidth);
    const label = ` ${labelText} `;
    const leftRuleWidth = Math.max(
      0,
      innerWidth - visibleWidth(label) - rightRuleWidth
    );

    return `${" ".repeat(FRAME_MARGIN_X)}${this.colorBorder(
      "╭" + "─".repeat(leftRuleWidth)
    )}${this.codingTheme.fg("muted", label)}${this.colorBorder(
      "─".repeat(rightRuleWidth) + "╮"
    )}${" ".repeat(FRAME_MARGIN_X)}`;
  }

  private borderLine(left: string, right: string, width: number): string {
    const borderWidth = Math.max(2, width - FRAME_MARGIN_X * 2);
    return `${" ".repeat(FRAME_MARGIN_X)}${this.colorBorder(
      left + "─".repeat(Math.max(0, borderWidth - 2)) + right
    )}${" ".repeat(FRAME_MARGIN_X)}`;
  }

  private promptLine(line: string, index: number, width: number): string {
    const prefix = index === 0 ? `${this.codingTheme.fg("accent", ">")} ` : "  ";
    return this.frameLine(` ${prefix}${tintPromptText(line)}`, width);
  }

  private menuLine(line: string, width: number): string {
    return this.frameLine(` ${line}`, width);
  }

  private frameLine(content: string, width: number): string {
    const innerWidth = Math.max(0, width - FRAME_MARGIN_X * 2 - 2);
    const fitted = truncateToWidth(content, innerWidth, "");
    const padding = " ".repeat(Math.max(0, innerWidth - visibleWidth(fitted)));
    return `${" ".repeat(FRAME_MARGIN_X)}${this.colorBorder("│")}${fitted}${padding}${this.colorBorder(
      "│"
    )}${" ".repeat(FRAME_MARGIN_X)}`;
  }

  private colorBorder(text: string): string {
    // Custom framing bypasses the stock editor border renderer, so mirror Pi's
    // bash-mode cue here to keep `!` commands visually distinct.
    if (this.getText().trimStart().startsWith("!")) {
      return this.codingTheme.fg("warning", text);
    }
    return this.borderColor(text);
  }
}

function findBottomBorderIndex(lines: string[]): number {
  for (let index = lines.length - 1; index > 0; index--) {
    if (isDefaultEditorBorder(lines[index] ?? "")) return index;
  }
  return Math.max(1, lines.length - 1);
}

function isDefaultEditorBorder(line: string): boolean {
  const plain = line.replace(ANSI_PATTERN, "");
  return /^[─ ↑↓0-9more]+$/.test(plain) && plain.includes("─");
}

function tintPromptText(line: string): string {
  return `${PROMPT_TEXT}${line.replace(/\x1b\[0m/g, `${RESET}${PROMPT_TEXT}`)}${RESET}`;
}

type BranchCacheEntry = {
  branch: string | undefined;
  checkedAt: number;
};

const branchCache = new Map<string, BranchCacheEntry>();

function getVisibleGitBranch(cwd: string): string | undefined {
  const now = Date.now();
  const cached = branchCache.get(cwd);
  if (cached && now - cached.checkedAt < BRANCH_CACHE_TTL_MS) {
    return cached.branch;
  }

  const branch = readCurrentGitBranch(cwd);
  const visibleBranch = branch && !HIDDEN_BRANCHES.has(branch) ? branch : undefined;
  branchCache.set(cwd, { branch: visibleBranch, checkedAt: now });
  return visibleBranch;
}

function readCurrentGitBranch(cwd: string): string | undefined {
  try {
    const branch = execFileSync("git", ["branch", "--show-current"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return branch || undefined;
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// GitHub PR badge
//
// One async `gh` lookup per session (at startup). Afterwards the PR is
// discovered passively by watching for `gh pr create` tool calls, so steady
// state is zero network calls. The badge is rendered as an OSC 8 hyperlink in
// the footer, right after the context % section.
// ---------------------------------------------------------------------------

type PrInfo = { number: number; url: string; branch: string };

// The only shared state: written by the tool_result handler and the footer
// factory's startup lookup, read by render. null = no PR known.
let currentPr: PrInfo | null = null;

const PR_CREATE_RE = /\bgh\s+pr\s+create\b/;
const PR_URL_RE = /https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/pull\/(\d+)/;

/** Build a clickable OSC 8 hyperlink for a PR badge. */
function prLink(pr: PrInfo): string {
  return `\x1b]8;;${pr.url}\x1b\\PR #${pr.number}\x1b]8;;\x1b\\`;
}

/**
 * Look up the open PR for the current branch via the simplest `gh` command.
 * `gh pr view` auto-detects the repo (from cwd) and the current branch, so no
 * --repo/--head/remote parsing is needed. Returns null for any failure (no gh,
 * not authenticated, not a repo, no PR) or a non-open PR.
 */
async function resolveOpenPr(cwd: string): Promise<{ number: number; url: string } | null> {
  try {
    const { stdout } = await execFileAsync("gh", ["pr", "view", "--json", "number,url,state"], {
      cwd,
      timeout: 5_000, // don't let a hung process linger
    });
    const pr = JSON.parse(stdout) as { number?: number; url?: string; state?: string };
    if (pr.state !== "OPEN" || typeof pr.number !== "number" || !pr.url) return null;
    return { number: pr.number, url: pr.url };
  } catch {
    return null;
  }
}

function installMenuBorderPatch(codingTheme: Theme): void {
  const proto = Container.prototype as typeof Container.prototype & {
    [MENU_BORDER_PATCH]?: true;
  };
  if (proto[MENU_BORDER_PATCH]) return;

  const render = proto.render;
  proto.render = function patchedRender(width: number): string[] {
    const lines = render.call(this, width);
    if (!shouldFrameMenu(this, lines)) return lines;
    return frameMenuLines(lines, width, codingTheme);
  };
  proto[MENU_BORDER_PATCH] = true;
}

function shouldFrameMenu(component: unknown, lines: string[]): boolean {
  const candidate = component as { constructor?: { name?: string } } | null | undefined;
  const name = candidate?.constructor?.name;
  return (
    typeof name === "string" &&
    SELECTOR_COMPONENT_NAMES.has(name) &&
    lines.length >= 2 &&
    isDefaultEditorBorder(lines[0] ?? "") &&
    isDefaultEditorBorder(lines[lines.length - 1] ?? "")
  );
}

function frameMenuLines(lines: string[], width: number, codingTheme: Theme): string[] {
  return [
    themedBorderLine("╭", "╮", width, codingTheme),
    ...lines.slice(1, -1).map((line) => themedFrameLine(line, width, codingTheme)),
    themedBorderLine("╰", "╯", width, codingTheme),
  ];
}

function themedBorderLine(left: string, right: string, width: number, codingTheme: Theme): string {
  const borderWidth = Math.max(2, width - FRAME_MARGIN_X * 2);
  return `${" ".repeat(FRAME_MARGIN_X)}${codingTheme.fg(
    "border",
    left + "─".repeat(Math.max(0, borderWidth - 2)) + right
  )}${" ".repeat(FRAME_MARGIN_X)}`;
}

function themedFrameLine(line: string, width: number, codingTheme: Theme): string {
  const innerWidth = Math.max(0, width - FRAME_MARGIN_X * 2 - 2);
  const fitted = truncateToWidth(line, innerWidth, "");
  const padding = " ".repeat(Math.max(0, innerWidth - visibleWidth(fitted)));
  return `${" ".repeat(FRAME_MARGIN_X)}${codingTheme.fg("border", "│")}${fitted}${padding}${codingTheme.fg(
    "border",
    "│"
  )}${" ".repeat(FRAME_MARGIN_X)}`;
}

export default function (pi: ExtensionAPI) {
  let enabled = CLEAN_STATUSLINE_DEFAULT_ENABLED;

  pi.registerCommand("statusline", {
    description: "Toggle clean statusline",
    handler: async (_args, ctx) => {
      enabled = !enabled;

      if (enabled) {
        setupFooter(ctx);
        setupPrompt(ctx);
        ctx.ui.notify("Clean statusline enabled", "info");
      } else {
        ctx.ui.setFooter(undefined);
        ctx.ui.setEditorComponent(undefined);
        ctx.ui.notify("Default footer restored", "info");
      }
    },
  });

  // Detect PRs created during the session. We only inspect `gh pr create`
  // commands (not arbitrary output), so an unrelated PR URL elsewhere in bash
  // output never triggers a false badge. The URL is parsed regardless of exit
  // status because when a PR already exists `gh pr create` errors with
  // "...already exists: <url>". This costs zero network calls.
  pi.on("tool_result", async (event, ctx) => {
    if (event.toolName !== "bash") return;
    const command = String((event.input as { command?: string }).command ?? "");
    if (!PR_CREATE_RE.test(command)) return;

    const text = event.content
      .filter((c): c is { type: "text"; text: string } => c.type === "text")
      .map((c) => c.text)
      .join("\n");
    const match = text.match(PR_URL_RE);
    if (!match) return;

    // Use the RAW branch name (not getVisibleGitBranch, which hides main/master)
    // so it matches the footerData.getGitBranch() value the render guard compares.
    const branch = readCurrentGitBranch(ctx.cwd) ?? "";
    currentPr = { number: Number(match[1]), url: match[0], branch };
    // No requestRender needed: the tool result itself triggers a render.
  });

  pi.on("session_start", async (_event, ctx) => {
    if (!enabled) return;
    // Reset PR state so it never bleeds across /new, /resume, or fork.
    currentPr = null;
    setupFooter(ctx);
    setupPrompt(ctx);
  });

  // Clear the footer before the old session context becomes stale.
  // Without this, the TUI render timer can fire after shutdown and invoke
  // the captured ctx (e.g. ctx.getContextUsage()), which throws
  // "stale after session replacement or reload". A fresh footer is
  // re-installed by the session_start handler for the replacement session.
  pi.on("session_shutdown", async (_event, ctx) => {
    if (!ctx.hasUI) return;
    ctx.ui.setFooter(undefined);
    ctx.ui.setEditorComponent(undefined);
  });

  function setupPrompt(ctx: ExtensionContext) {
    if (!ctx.hasUI) return;

    installMenuBorderPatch(ctx.ui.theme);
    ctx.ui.setEditorComponent((tui, theme, keybindings) =>
      new AmpPromptEditor(tui, theme, keybindings, ctx.ui.theme, ctx.cwd)
    );
  }

  function setupFooter(ctx: ExtensionContext) {
    if (!ctx.hasUI) return;

    ctx.ui.setFooter((tui, theme, footerData) => {
      let disposed = false; // factory-local guard for the async startup lookup
      const unsub = footerData.onBranchChange(() => tui.requestRender());

      // One-time startup lookup: find an existing open PR for the current branch.
      // Async + non-blocking; render reads `currentPr` as soon as it resolves.
      const startupBranch = footerData.getGitBranch();
      if (startupBranch && !HIDDEN_BRANCHES.has(startupBranch)) {
        void resolveOpenPr(ctx.cwd).then((pr) => {
          if (disposed) return; // ctx/tui may be stale after shutdown
          if (pr && !currentPr) {
            // Don't clobber a PR already detected from `gh pr create` output.
            currentPr = { ...pr, branch: startupBranch };
            tui.requestRender();
          }
        });
      }

      return {
        dispose: () => {
          disposed = true;
          unsub();
        },
        invalidate() {},
        render(width: number): string[] {
          const leftParts: string[] = [];
          const rightParts: string[] = [];

          // Show extension statuses (e.g. plan mode) set via ctx.ui.setStatus()
          const statuses = footerData.getExtensionStatuses();
          for (const text of statuses.values()) {
            leftParts.push(text);
          }

          const usage = ctx.getContextUsage();
          if (usage && typeof usage.percent === "number") {
            const percent = usage.percent;
            let color: "success" | "error" | "warning" = "success";
            let hint = "";

            if (percent > 80) {
              color = "error";
              hint = theme.fg("dim", " (consider /handoff)");
            } else if (percent > 60) {
              color = "warning";
              hint = theme.fg("dim", " (consider /handoff)");
            }

            const formatTokens = (n: number) => {
              if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
              if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
              return `${n}`;
            };

            const contextStr =
              theme.fg(color, `${percent.toFixed(0)}%`) +
              theme.fg("dim", ` of ${formatTokens(usage.contextWindow)}`) +
              hint;
            leftParts.push(contextStr);
          }

          // PR badge, right after the context % section. Branch guard avoids
          // showing a stale PR after a mid-session branch switch (no re-lookup).
          // `muted` keeps it subtle; the OSC 8 underline signals it's a link.
          if (currentPr && currentPr.branch === footerData.getGitBranch()) {
            leftParts.push(theme.fg("muted", prLink(currentPr)));
          }

          // Intentionally omit the thinking level from the status line —
          // it's controllable via /thinking and adds noise here.
          const provider = ctx.model?.provider;
          const modelId = ctx.model?.id || "no-model";
          const model = provider ? `${provider}/${modelId}` : modelId;
          rightParts.push(theme.fg("toolTitle", model));

          const home = process.env.HOME || "";
          const cwd = process.cwd();
          const displayPath =
            home && cwd.startsWith(home) ? `~${cwd.slice(home.length)}` : cwd;

          rightParts.push(theme.fg("dim", displayPath));

          const separator = theme.fg("dim", " · ");
          // Keep footer flush: Pi already applies viewport padding, so adding
          // outer spaces here makes the statusline drift from surrounding text.
          const sidePadding = 0;
          const paddingWidth = sidePadding * 2;
          const sidePad = " ".repeat(sidePadding);

          const joinParts = (parts: string[]) => parts.join(separator);
          const totalWidth = (l: string[], r: string[]) =>
            visibleWidth(joinParts(l)) + visibleWidth(joinParts(r)) + paddingWidth;

          // Progressive truncation to fit within width:
          // 1. Try full content
          // 2. Truncate the path (usually longest)
          // 3. Drop path entirely
          // 4. Truncate model name
          // 5. Drop right side entirely

          let activeLeft = [...leftParts];
          let activeRight = [...rightParts];

          const pathIdx = activeRight.length - 1; // path is always last
          const modelIdx = activeRight.length - 2; // model is second to last

          // Minimum gap between left and right
          const minGap = 1;

          const fits = (l: string[], r: string[]) =>
            totalWidth(l, r) + minGap <= width;

          if (!fits(activeLeft, activeRight) && activeRight.length > 0) {
            // Step 1: Truncate the path to fit
            const available =
              width -
              visibleWidth(joinParts(activeLeft)) -
              (activeRight.length > 1
                ? visibleWidth(
                    joinParts(activeRight.slice(0, pathIdx)) + separator
                  )
                : 0) -
              paddingWidth -
              minGap;

            if (available > 10 && pathIdx >= 0) {
              activeRight[pathIdx] = truncateToWidth(
                activeRight[pathIdx],
                available
              );
            } else if (pathIdx >= 0) {
              // Step 2: Drop path entirely
              activeRight = activeRight.slice(0, pathIdx);
            }
          }

          if (!fits(activeLeft, activeRight) && modelIdx >= 0 && activeRight.length > modelIdx) {
            // Step 3: Truncate model name
            const available =
              width -
              visibleWidth(joinParts(activeLeft)) -
              paddingWidth -
              minGap;

            if (available > 8) {
              activeRight = [truncateToWidth(activeRight[modelIdx], available)];
            } else {
              // Step 4: Drop right side entirely
              activeRight = [];
            }
          }

          if (!fits(activeLeft, activeRight)) {
            // Step 5: Truncate left to fit
            activeRight = [];
            activeLeft = [
              truncateToWidth(joinParts(activeLeft), width - paddingWidth),
            ];
          }

          const left = joinParts(activeLeft);
          const right = joinParts(activeRight);
          const gap = " ".repeat(
            Math.max(
              minGap,
              width - visibleWidth(left) - visibleWidth(right) - paddingWidth
            )
          );

          return [truncateToWidth(`${sidePad}${left}${gap}${right}${sidePad}`, width)];
        },
      };
    });
  }
}
