/**
 * builtin-tools.ts — The built-in tool name list.
 *
 * A leaf module (no imports) so both the agent registry and the agent-file
 * loaders can depend on it without forming a cycle:
 * `agent-types → default-agents → embedded-agents → builtin-tools`.
 *
 * Re-exported from `agent-types.ts` for existing call sites.
 */

/** All known built-in tool names. */
export const BUILTIN_TOOL_NAMES: string[] = ["read", "bash", "edit", "write", "grep", "find", "ls"];
