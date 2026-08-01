/**
 * frontmatter-fields.ts — Shared frontmatter field parsers for agent .md files.
 *
 * Used by both the user-agent loader (`custom-agents.ts`) and the embedded
 * default-agent loader (`embedded-agents.ts`), so a field spelled the same way
 * in a user file and in a built-in file is always parsed the same way. Keeping
 * one implementation is deliberate: two loaders with their own copies would
 * drift, and `thinking: High` or `max_turns: 0` would then mean different
 * things depending on where the file happened to live.
 *
 * All parsers follow the same convention:
 * omitted → default, "none"/empty → nothing, value → exact.
 */

/** Extract a string, or undefined when absent or not a string. */
export function str(val: unknown): string | undefined {
  return typeof val === "string" ? val : undefined;
}

/** Extract a non-negative integer or undefined. 0 means unlimited for max_turns. */
export function nonNegativeInt(val: unknown): number | undefined {
  return typeof val === "number" && val >= 0 ? val : undefined;
}

/** Extract an explicit boolean, or undefined when the key is absent (so callers can decide). */
export function optionalBool(val: unknown): boolean | undefined {
  return val != null ? val === true : undefined;
}

/**
 * Parse a raw CSV field value into items, or undefined if absent/empty/"none".
 */
export function parseCsvField(val: unknown): string[] | undefined {
  if (val === undefined || val === null) return undefined;
  // eslint-disable-next-line @typescript-eslint/no-base-to-string -- val is already narrowed past null/undefined; String() is the intended coercion here
  const s = String(val).trim();
  if (!s || s === "none") return undefined;
  const items = s.split(",").map(t => t.trim()).filter(Boolean);
  return items.length > 0 ? items : undefined;
}

/**
 * Parse a comma-separated list field with defaults.
 * omitted → defaults; "none"/empty → []; csv → listed items.
 */
export function csvList(val: unknown, defaults: string[]): string[] {
  if (val === undefined || val === null) return defaults;
  return parseCsvField(val) ?? [];
}
