/**
 * Clean statusline extension inspired by Amp's minimal design
 *
 * Replaces default footer with essential context:
 * - Active tool/operation
 * - Context usage % (color-coded by threshold)
 * - Current folder name
 * - Git branch
 * - Model name
 *
 * Colors adapt based on state:
 * - Context: green → yellow → red as usage increases
 * - Operations: accent for active, dim for idle
 * - Location: muted to stay out of the way
 *
 * Toggle with: /statusline
 */

import type {
  ExtensionAPI,
  ExtensionContext,
} from "@mariozechner/pi-coding-agent";

import { truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";

export default function (pi: ExtensionAPI) {
  let enabled = true;

  pi.registerCommand("statusline", {
    description: "Toggle clean statusline",
    handler: async (_args, ctx) => {
      enabled = !enabled;

      if (enabled) {
        setupFooter(ctx);
        ctx.ui.notify("Clean statusline enabled", "info");
      } else {
        ctx.ui.setFooter(undefined);
        ctx.ui.notify("Default footer restored", "info");
      }
    },
  });

  pi.on("session_start", async (_event, ctx) => {
    if (enabled) setupFooter(ctx);
  });

  function setupFooter(ctx: ExtensionContext) {
    if (!ctx.hasUI) return;

    ctx.ui.setFooter((tui, theme, footerData) => {
      const unsub = footerData.onBranchChange(() => tui.requestRender());

      return {
        dispose: unsub,
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

          const provider = ctx.model?.provider;
          const modelId = ctx.model?.id || "no-model";
          const model = provider ? `${provider}/${modelId}` : modelId;
          const thinkingLevel = pi.getThinkingLevel();

          if (thinkingLevel && thinkingLevel !== "off") {
            const thinkingColorMap: Record<
              string,
              | "thinkingMinimal"
              | "thinkingLow"
              | "thinkingMedium"
              | "thinkingHigh"
              | "thinkingXhigh"
            > = {
              minimal: "thinkingMinimal",
              low: "thinkingLow",
              medium: "thinkingMedium",
              high: "thinkingHigh",
              xhigh: "thinkingXhigh",
            };
            const thinkingColor =
              thinkingColorMap[thinkingLevel] || "thinkingText";
            rightParts.push(
              theme.fg(thinkingColor, `${model} (${thinkingLevel})`)
            );
          } else {
            rightParts.push(theme.fg("toolTitle", model));
          }

          const home = process.env.HOME || "";
          const cwd = process.cwd();
          const displayPath =
            home && cwd.startsWith(home) ? `~${cwd.slice(home.length)}` : cwd;

          const branch = footerData.getGitBranch();
          const pathWithBranch =
            branch && branch !== "detached"
              ? `${displayPath} ${theme.fg("muted", `(${branch})`)}`
              : displayPath;
          rightParts.push(theme.fg("dim", pathWithBranch));

          const separator = theme.fg("dim", " · ");
          const padding = 2; // 1 space on each side

          const joinParts = (parts: string[]) => parts.join(separator);
          const totalWidth = (l: string[], r: string[]) =>
            visibleWidth(joinParts(l)) + visibleWidth(joinParts(r)) + padding;

          // Progressive truncation to fit within width:
          // 1. Try full content
          // 2. Truncate the path (usually longest)
          // 3. Drop branch info
          // 4. Drop path entirely
          // 5. Truncate model name
          // 6. Drop right side entirely

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
              padding -
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
              padding -
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
              truncateToWidth(joinParts(activeLeft), width - padding),
            ];
          }

          const left = joinParts(activeLeft);
          const right = joinParts(activeRight);
          const gap = " ".repeat(
            Math.max(
              minGap,
              width - visibleWidth(left) - visibleWidth(right) - padding
            )
          );

          return [truncateToWidth(` ${left}${gap}${right} `, width)];
        },
      };
    });
  }
}
