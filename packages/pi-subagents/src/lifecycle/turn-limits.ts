/**
 * turn-limits.ts — Pure turn-limit normalization for subagent execution.
 *
 * Extracted from agent-runner.ts (issue #265) so the turn-counting policy has a
 * focused home independent of session assembly. Consumed by the subagent tool's
 * spawn-config resolution and by the turn loop in SubagentSession.
 */

/**
 * Steer message sent once the soft turn limit is reached, before the grace turns run out.
 *
 * The Reviewer agent's prompt (`src/config/agents/reviewer.md`) quotes this text so the
 * agent recognises it and emits its report instead of opening another file. Keep the two
 * in sync — `test/config/embedded-agents.test.ts` asserts the prompt still contains it.
 */
export const TURN_LIMIT_STEER_MESSAGE =
  "You have reached your turn limit. Wrap up immediately - provide your final answer now.";

/** Normalize max turns. undefined or 0 = unlimited, otherwise minimum 1. */
export function normalizeMaxTurns(n: number | undefined): number | undefined {
  if (n == null || n === 0) return undefined;
  return Math.max(1, n);
}
