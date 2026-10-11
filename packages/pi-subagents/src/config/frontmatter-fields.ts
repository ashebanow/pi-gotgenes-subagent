/**
 * frontmatter-fields.ts — Shared frontmatter field parsers for agent .md files.
 *
 * Used by both the user-agent loader (`custom-agents.ts`) and the embedded
 * default-agent loader (`embedded-agents.ts`), so a field spelled the same way
 * in a user file and in a shipped built-in file is always parsed the same way.
 * One implementation is deliberate: two loaders with their own copies would
 * drift, and `thinking: High` or `max_turns: 0` would then mean different
 * things depending on where the file happened to live.
 *
 * This is a leaf module by necessity, not by taste: `custom-agents.ts` imports
 * `BUILTIN_TOOL_NAMES` from the registry, and `agent-types.ts` reaches the
 * embedded loader through `default-agents.ts`, so hosting these parsers in
 * `custom-agents.ts` would close a cycle that `.fallowrc.json` rejects.
 *
 * All parsers follow the same convention:
 * omitted → default, "none"/empty → nothing, value → exact.
 */

import { isLockableField, type LockDeclaration } from "#src/config/invocation-config";
import { parseThinkingLevel, thinkingLevelError } from "#src/config/thinking-level";
import { debugLog } from "#src/debug";
import type { AgentConfig } from "#src/types";

/** Extract a string, or undefined when absent or not a string. */
export function str(val: unknown): string | undefined {
  return typeof val === "string" ? val : undefined;
}

/** Extract a non-negative integer or undefined. 0 means unlimited for max_turns. */
export function nonNegativeInt(val: unknown): number | undefined {
  return typeof val === "number" && val >= 0 ? val : undefined;
}

/**
 * Parse a list field with defaults.
 * omitted → defaults; "none"/empty → []; otherwise → listed items.
 */
export function listField(val: unknown, defaults: string[]): string[] {
  if (val === undefined || val === null) return defaults;
  return parseListField(val) ?? [];
}

/**
 * Parse a list field, leaving an omitted key `undefined` rather than defaulting it.
 *
 * An embedded agent that names no `tools:` has to reach the registry still
 * carrying nothing, so `agent-types.ts` supplies the built-in fallback itself
 * (`?? [...BUILTIN_TOOL_NAMES]`). Defaulting to a list here would answer the
 * question before the registry could, and would make an omitted key
 * indistinguishable from a deliberate `tools: none`.
 */
export function optionalListField(val: unknown): string[] | undefined {
  return val == null ? undefined : (parseListField(val) ?? []);
}

/**
 * Extract a thinking level, dropping an unrecognized one.
 *
 * Passing it through would not surface as an error: Pi clamps a level missing from
 * its own table down to `off`, silently disabling thinking for an agent whose author
 * asked for more of it. Inheriting the parent's level is the safer miss (Refs #834).
 */
export function thinkingLevel(val: unknown, agentName: string): AgentConfig["thinking"] {
  const level = parseThinkingLevel(val);
  if (val != null && level === undefined) {
    debugLog(`agent ${agentName} frontmatter thinking`, thinkingLevelError(val));
  }
  return level;
}

/**
 * Parse the `locked:` key into a lock declaration, or undefined when it claims nothing.
 *
 * `true` is the whole-file form; anything else parses as a field list, so both YAML
 * spellings `tools:` accepts work here too. An entry naming no lockable field is
 * dropped rather than failing the agent's load.
 */
export function lockDeclaration(val: unknown, agentName: string): LockDeclaration | undefined {
  if (typeof val === "boolean") return val ? true : undefined;

  const entries = parseListField(val);
  if (entries === undefined) return undefined;

  const fields = entries.filter(isLockableField);
  const unknownEntries = entries.filter((entry) => !isLockableField(entry));
  if (unknownEntries.length > 0) {
    debugLog(`agent ${agentName} frontmatter locked`, `unknown fields: ${unknownEntries.join(", ")}`);
  }
  return fields.length > 0 ? fields : undefined;
}

/**
 * Parse a raw list field into items, or undefined if absent/empty/"none".
 *
 * Frontmatter is YAML, so a list field is written either as a comma-separated
 * scalar (`tools: read, grep`) or as a sequence (`tools: [read, grep]`). Both
 * are supported: a sequence keeps its entries intact, while a scalar is split
 * on commas.
 */
function parseListField(val: unknown): string[] | undefined {
  if (val === undefined || val === null) return undefined;
  const items = Array.isArray(val)
    ? val.map(entry => String(entry).trim()).filter(Boolean)
    // eslint-disable-next-line @typescript-eslint/no-base-to-string -- val is already narrowed past null/undefined; String() is the intended coercion here
    : String(val).trim().split(",").map(entry => entry.trim()).filter(Boolean);
  if (items.length === 0) return undefined;
  return items.length === 1 && items[0] === "none" ? undefined : items;
}
