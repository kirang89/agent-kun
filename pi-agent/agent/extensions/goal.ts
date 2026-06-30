/**
 * Goal Extension
 *
 * Session-scoped /goal command for keeping a persistent north star across turns.
 *
 * Manual validation:
 * 1. /reload
 * 2. /goal -> set goal
 * 3. Confirm footer shows truncated goal only (no turn count)
 * 4. Ask unrelated task; verify mismatch warning/confirmation
 * 5. Ask for refinement/completion; verify goal_update can update state
 * 6. /goal turns -> verify current turn budget is shown
 * 7. /goal turns 60 -> verify cap updates without resetting turns used
 * 8. /goal done; verify footer clears and goal_update disabled
 * 9. Quit/resume same session; verify active goal restored
 * 10. /goal clear; verify no goal injected next turn
 * 11. Lower cap to turnsUsed + 1, continue; verify maxTurnsReached state/message and goal_update disabled
 */

import type { ExtensionAPI, ExtensionCommandContext, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { StringEnum } from "@earendil-works/pi-ai";
import { Type } from "typebox";

type GoalStatus = "wip" | "cleared" | "completed" | "maxTurnsReached";

interface GoalState {
	status: GoalStatus;
	text?: string;
	updatedAt: number;
	maxTurns: number;
	turnsUsed: number;
}

const GOAL_STATE_TYPE = "goal-state";
const GOAL_TOOL_NAME = "goal_update";
const DEFAULT_MAX_TURNS = 50;
const FOOTER_GOAL_LIMIT = 100;

const goalUpdateSchema = Type.Object({
	action: StringEnum(["set", "refine", "complete", "clear"] as const),
	text: Type.Optional(Type.String({ description: "Replacement goal text for set/refine actions." })),
	reason: Type.Optional(Type.String({ description: "Brief reason for completing or clearing the goal." })),
});

export default function goalExtension(pi: ExtensionAPI): void {
	let state: GoalState = inactiveState("cleared");
	let goalToolRegistered = false;

	function inactiveState(status: Exclude<GoalStatus, "wip" | "maxTurnsReached">): GoalState {
		return {
			status,
			updatedAt: Date.now(),
			maxTurns: DEFAULT_MAX_TURNS,
			turnsUsed: 0,
		};
	}

	function isActiveGoal(current: GoalState): boolean {
		return current.status === "wip" && typeof current.text === "string" && current.text.trim().length > 0;
	}

	function hasRecoverableGoal(current: GoalState): boolean {
		return (
			(current.status === "wip" || current.status === "maxTurnsReached") &&
			typeof current.text === "string" &&
			current.text.trim().length > 0
		);
	}

	function normalizeGoalText(text: string): string {
		const trimmed = text.trim();
		if (trimmed.length === 0) throw new Error("Goal cannot be empty.");
		return trimmed;
	}

	function truncate(text: string, maxLength: number): string {
		if (text.length <= maxLength) return text;
		return `${text.slice(0, Math.max(0, maxLength - 1))}…`;
	}

	function getTurnSummary(current: GoalState): string {
		return `${current.turnsUsed}/${current.maxTurns}`;
	}

	function activeToolsWithoutGoalTool(): string[] {
		return pi.getActiveTools().filter((name) => name !== GOAL_TOOL_NAME);
	}

	function enableGoalTool(): void {
		ensureGoalToolRegistered();
		const activeTools = pi.getActiveTools();
		if (!activeTools.includes(GOAL_TOOL_NAME)) {
			pi.setActiveTools([...activeTools, GOAL_TOOL_NAME]);
		}
	}

	function disableGoalTool(): void {
		const activeTools = pi.getActiveTools();
		if (activeTools.includes(GOAL_TOOL_NAME)) {
			pi.setActiveTools(activeToolsWithoutGoalTool());
		}
	}

	function syncGoalTool(): void {
		if (isActiveGoal(state)) {
			enableGoalTool();
		} else {
			disableGoalTool();
		}
	}

	function updateStatus(ctx: ExtensionContext): void {
		if (isActiveGoal(state)) {
			ctx.ui.setStatus("goal", `🎯 ${truncate(state.text ?? "", FOOTER_GOAL_LIMIT)}`);
			return;
		}

		if (state.status === "maxTurnsReached") {
			ctx.ui.setStatus("goal", "🎯 max turns reached");
			return;
		}

		ctx.ui.setStatus("goal", undefined);
	}

	function persistState(nextState: GoalState, ctx?: ExtensionContext): void {
		state = nextState;
		pi.appendEntry<GoalState>(GOAL_STATE_TYPE, state);
		syncGoalTool();
		if (ctx) updateStatus(ctx);
	}

	function setNewGoal(text: string, ctx: ExtensionContext): void {
		persistState(
			{
				status: "wip",
				text: normalizeGoalText(text),
				updatedAt: Date.now(),
				maxTurns: DEFAULT_MAX_TURNS,
				turnsUsed: 0,
			},
			ctx,
		);
	}

	function replaceGoalPreservingBudget(text: string, ctx: ExtensionContext): void {
		persistState(
			{
				...state,
				status: "wip",
				text: normalizeGoalText(text),
				updatedAt: Date.now(),
			},
			ctx,
		);
	}

	function clearGoal(status: "cleared" | "completed", ctx: ExtensionContext): void {
		persistState(
			{
				status,
				updatedAt: Date.now(),
				maxTurns: state.maxTurns,
				turnsUsed: state.turnsUsed,
			},
			ctx,
		);
	}

	function setTurnCap(maxTurns: number, ctx: ExtensionContext): void {
		if (!Number.isInteger(maxTurns) || maxTurns < state.turnsUsed + 1) {
			throw new Error(`Turn cap must be an integer greater than turns used (${state.turnsUsed}).`);
		}
		if (!hasRecoverableGoal(state)) {
			throw new Error("No goal with text to apply a turn cap to.");
		}

		persistState(
			{
				...state,
				status: "wip",
				maxTurns,
				updatedAt: Date.now(),
			},
			ctx,
		);
	}

	function markMaxTurnsReached(ctx: ExtensionContext): void {
		if (!isActiveGoal(state)) return;

		persistState(
			{
				...state,
				status: "maxTurnsReached",
				updatedAt: Date.now(),
			},
			ctx,
		);
		ctx.abort();
		pi.sendMessage(
			{
				customType: "goal-max-turns-reached",
				content: `Goal turn cap reached (${getTurnSummary(state)}). Use /goal turns N to extend, /goal edit to revise, /goal done, or /goal clear.`,
				display: true,
			},
			{ deliverAs: "followUp", triggerTurn: false },
		);
	}

	function inform(ctx: ExtensionContext, message: string, type: "info" | "warning" | "error" = "info"): void {
		if (ctx.hasUI) {
			ctx.ui.notify(message, type);
			return;
		}
		console.log(message);
	}

	function formatGoalDetails(current: GoalState): string {
		if (isActiveGoal(current)) {
			return `Goal:\n${current.text}\n\nTurns used: ${getTurnSummary(current)}`;
		}
		if (current.status === "maxTurnsReached" && current.text) {
			return `Goal turn cap reached:\n${current.text}\n\nTurns used: ${getTurnSummary(current)}`;
		}
		return "No active goal.";
	}

	async function promptForGoal(ctx: ExtensionCommandContext, prefill = ""): Promise<void> {
		if (!ctx.hasUI) {
			inform(ctx, "No active goal. Use /goal <text> to set one.");
			return;
		}

		const text = await ctx.ui.editor("What is the goal?", prefill);
		if (!text?.trim()) return;

		if (hasRecoverableGoal(state)) {
			replaceGoalPreservingBudget(text, ctx);
			inform(ctx, "Goal updated.");
			return;
		}

		setNewGoal(text, ctx);
		inform(ctx, "Goal set.");
	}

	async function promptForTurnCap(ctx: ExtensionCommandContext): Promise<void> {
		if (!hasRecoverableGoal(state)) {
			inform(ctx, "No goal with text to apply a turn cap to.", "warning");
			return;
		}

		if (!ctx.hasUI) {
			inform(ctx, `Turns used: ${getTurnSummary(state)}. Use /goal turns N to change the cap.`);
			return;
		}

		const input = await ctx.ui.input("Goal turn cap", `Current: ${getTurnSummary(state)}`);
		if (!input?.trim()) return;
		handleTurnsCommand(input.trim(), ctx);
	}

	function handleTurnsCommand(args: string, ctx: ExtensionContext): void {
		if (!hasRecoverableGoal(state)) {
			inform(ctx, "No goal with text to apply a turn cap to.", "warning");
			return;
		}

		if (args.trim().length === 0) {
			inform(ctx, `Turns used: ${getTurnSummary(state)}`);
			return;
		}

		const parsed = Number(args.trim());
		try {
			setTurnCap(parsed, ctx);
			inform(ctx, `Goal turn cap set to ${state.maxTurns}. Turns used: ${state.turnsUsed}.`);
		} catch (error) {
			inform(ctx, error instanceof Error ? error.message : String(error), "error");
		}
	}

	async function showGoalMenu(ctx: ExtensionCommandContext): Promise<void> {
		const options = ["Show goal", "Edit goal", "Set turn cap", "Mark done", "Clear goal"];
		const choice = await ctx.ui.select("Goal", options);
		if (!choice) return;

		if (choice === "Show goal") {
			inform(ctx, formatGoalDetails(state));
			return;
		}
		if (choice === "Edit goal") {
			await promptForGoal(ctx, state.text ?? "");
			return;
		}
		if (choice === "Set turn cap") {
			await promptForTurnCap(ctx);
			return;
		}
		if (choice === "Mark done") {
			clearGoal("completed", ctx);
			inform(ctx, "Goal marked completed.");
			return;
		}
		if (choice === "Clear goal") {
			clearGoal("cleared", ctx);
			inform(ctx, "Goal cleared.");
		}
	}

	function restoreState(ctx: ExtensionContext): void {
		state = inactiveState("cleared");
		for (const entry of ctx.sessionManager.getBranch()) {
			if (entry.type !== "custom" || entry.customType !== GOAL_STATE_TYPE) continue;
			const restored = normalizeRestoredState(entry.data);
			if (restored) state = restored;
		}

		// Keep old sessions from remaining WIP if they already exhausted the cap.
		if (isActiveGoal(state) && state.turnsUsed >= state.maxTurns) {
			state = { ...state, status: "maxTurnsReached", updatedAt: Date.now() };
			pi.appendEntry<GoalState>(GOAL_STATE_TYPE, state);
		}

		syncGoalTool();
		updateStatus(ctx);
	}

	function normalizeRestoredState(data: unknown): GoalState | undefined {
		if (!data || typeof data !== "object") return undefined;
		const candidate = data as Partial<GoalState>;
		if (
			candidate.status !== "wip" &&
			candidate.status !== "cleared" &&
			candidate.status !== "completed" &&
			candidate.status !== "maxTurnsReached"
		) {
			return undefined;
		}

		const maxTurns = Number.isInteger(candidate.maxTurns) && candidate.maxTurns > 0 ? candidate.maxTurns : DEFAULT_MAX_TURNS;
		const turnsUsed = Number.isInteger(candidate.turnsUsed) && candidate.turnsUsed >= 0 ? candidate.turnsUsed : 0;
		const updatedAt = typeof candidate.updatedAt === "number" ? candidate.updatedAt : Date.now();
		const text = typeof candidate.text === "string" && candidate.text.trim().length > 0 ? candidate.text.trim() : undefined;

		if ((candidate.status === "wip" || candidate.status === "maxTurnsReached") && !text) {
			return inactiveState("cleared");
		}

		return {
			status: candidate.status,
			text,
			updatedAt,
			maxTurns,
			turnsUsed,
		};
	}

	function ensureGoalToolRegistered(): void {
		if (goalToolRegistered) return;
		goalToolRegistered = true;

		pi.registerTool({
			name: GOAL_TOOL_NAME,
			label: "Goal Update",
			description: "Refine, complete, or clear the current session goal.",
			promptSnippet: "Refine, complete, or clear the active /goal north star",
			promptGuidelines: [
				"Use goal_update only for the active /goal: refine it when the user clearly changes direction, complete it when the goal is met, or clear it when the goal is impossible/obsolete after explaining why.",
				"Do not use goal_update to create the first goal; the user must opt in with /goal first.",
			],
			parameters: goalUpdateSchema,
			async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
				if (!isActiveGoal(state)) {
					throw new Error("No active /goal to update. The user must set one with /goal first.");
				}

				if (params.action === "set" || params.action === "refine") {
					if (!params.text?.trim()) throw new Error(`goal_update ${params.action} requires text.`);
					replaceGoalPreservingBudget(params.text, ctx);
					return {
						content: [{ type: "text", text: `Goal ${params.action === "set" ? "updated" : "refined"}.` }],
						details: { state },
					};
				}

				if (params.action === "complete") {
					clearGoal("completed", ctx);
					return {
						content: [{ type: "text", text: params.reason ? `Goal completed: ${params.reason}` : "Goal completed." }],
						details: { state },
					};
				}

				if (params.action === "clear") {
					clearGoal("cleared", ctx);
					return {
						content: [{ type: "text", text: params.reason ? `Goal cleared: ${params.reason}` : "Goal cleared." }],
						details: { state },
					};
				}

				throw new Error(`Unsupported goal_update action: ${params.action}`);
			},
		});
	}

	ensureGoalToolRegistered();

	pi.registerCommand("goal", {
		description: "Set, show, edit, clear, complete, or cap the session goal",
		handler: async (args, ctx) => {
			const trimmed = args.trim();

			if (trimmed.length === 0) {
				if (hasRecoverableGoal(state)) {
					if (!ctx.hasUI) {
						inform(ctx, formatGoalDetails(state));
						return;
					}
					await showGoalMenu(ctx);
					return;
				}
				await promptForGoal(ctx);
				return;
			}

			const [command = "", ...restParts] = trimmed.split(/\s+/);
			const rest = restParts.join(" ");

			if (command === "set") {
				try {
					setNewGoal(rest, ctx);
					inform(ctx, "Goal set.");
				} catch (error) {
					inform(ctx, error instanceof Error ? error.message : String(error), "error");
				}
				return;
			}

			if (command === "show") {
				inform(ctx, formatGoalDetails(state));
				return;
			}

			if (command === "edit") {
				await promptForGoal(ctx, state.text ?? "");
				return;
			}

			if (command === "clear") {
				clearGoal("cleared", ctx);
				inform(ctx, "Goal cleared.");
				return;
			}

			if (command === "done") {
				clearGoal("completed", ctx);
				inform(ctx, "Goal marked completed.");
				return;
			}

			if (command === "turns") {
				handleTurnsCommand(rest, ctx);
				return;
			}

			try {
				setNewGoal(trimmed, ctx);
				inform(ctx, "Goal set.");
			} catch (error) {
				inform(ctx, error instanceof Error ? error.message : String(error), "error");
			}
		},
	});

	pi.on("session_start", async (_event, ctx) => {
		restoreState(ctx);
	});

	pi.on("before_agent_start", async (event) => {
		if (!isActiveGoal(state)) return undefined;

		const remainingTurns = Math.max(0, state.maxTurns - state.turnsUsed);
		return {
			systemPrompt:
				event.systemPrompt +
				`

ACTIVE SESSION GOAL (/goal):
${state.text}

Goal turn budget: ${state.turnsUsed}/${state.maxTurns} turns used; ${remainingTurns} main-session turns remaining.

Treat the active goal as the north star for this session:
- Before choosing actions, evaluate whether they advance the active goal.
- Prefer direct progress toward the active goal over tangents.
- If the user's request appears unrelated to or in conflict with the active goal, briefly say so and ask whether to continue unless the user explicitly overrides the goal.
- If multiple valid approaches together may achieve a non-trivial goal and uncertainty is high, consider spawning bounded Pi subagents in separate tmux sessions to explore alternatives in parallel. Give each subagent a narrow one-shot investigation and have it stop after reporting findings.
- If one direction is clearly best, explore that first without spawning subagents.
- If the goal appears impossible, underspecified, blocked, or not worth further attempts, stop pursuing it. Tell the user clearly, include rationale/evidence, and ask for a revised goal or confirmation to clear it. Use goal_update clear only after explaining why.
- If the goal is complete, use goal_update complete.
- System, developer, and explicit user instructions remain higher priority than the goal.
`,
		};
	});

	pi.on("turn_start", async (_event, ctx) => {
		if (!isActiveGoal(state)) return;
		if (state.turnsUsed >= state.maxTurns) markMaxTurnsReached(ctx);
	});

	pi.on("turn_end", async (_event, ctx) => {
		if (!isActiveGoal(state)) return;

		const nextState: GoalState = {
			...state,
			turnsUsed: state.turnsUsed + 1,
			updatedAt: Date.now(),
		};
		persistState(nextState, ctx);

		if (state.turnsUsed >= state.maxTurns) {
			markMaxTurnsReached(ctx);
		}
	});
}
