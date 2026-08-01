/**
 * embedded-agents.ts — Load a built-in agent from a shipped .md file.
 *
 * Some default agents carry prompts long enough that keeping them inline as
 * TypeScript template literals makes them hard to edit: every backtick and
 * `${` needs escaping, and a prompt change shows up as a diff against
 * extension source. Those agents live in `src/config/agents/*.md` instead and
 * are read here at import time.
 *
 * The files use the same frontmatter vocabulary as user agents in
 * `.pi/agents/*.md` (see `custom-agents.ts`), parsed with the same helpers, so
 * a user copying a built-in agent out to override it does not have to
 * translate anything.
 *
 * Packaging note: `src/` ships verbatim (see the `files` array in
 * package.json) and pi loads it without a bundler, so the .md sits next to its
 * loader at runtime. If that ever stops being true, this throws loudly rather
 * than silently handing back an agent with no instructions.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseFrontmatter } from "@earendil-works/pi-coding-agent";
import { BUILTIN_TOOL_NAMES } from "#src/config/builtin-tools";
import { csvList, nonNegativeInt, optionalBool, str } from "#src/config/frontmatter-fields";
import type { AgentConfig, ThinkingLevel } from "#src/types";

/**
 * Read and parse a built-in agent definition from `src/config/agents/<name>.md`.
 *
 * @param fileName  Basename of the .md file, without the extension.
 * @param name      Registry key for the agent (the .md carries no name field).
 * @throws If the file is missing or unreadable — a packaging fault, not a
 *         recoverable condition, since the alternative is an agent that runs
 *         with an empty system prompt and reviews nothing.
 */
export function loadEmbeddedAgent(fileName: string, name: string): AgentConfig {
  const path = fileURLToPath(new URL(`./agents/${fileName}.md`, import.meta.url));

  let content: string;
  try {
    content = readFileSync(path, "utf-8");
  } catch (err) {
    throw new Error(
      `Embedded agent "${name}" could not be read from ${path}. ` +
        `This file ships with the package and must sit beside embedded-agents.ts at runtime.`,
      { cause: err },
    );
  }

  const { frontmatter: fm, body } = parseFrontmatter(content);
  const systemPrompt = body.trim();
  if (!systemPrompt) {
    throw new Error(`Embedded agent "${name}" has an empty prompt body in ${path}.`);
  }

  return {
    name,
    displayName: str(fm.display_name) ?? name,
    description: str(fm.description) ?? name,
    builtinToolNames: csvList(fm.tools, BUILTIN_TOOL_NAMES),
    model: str(fm.model),
    thinking: str(fm.thinking) as ThinkingLevel | undefined,
    maxTurns: nonNegativeInt(fm.max_turns),
    toolGuideline: str(fm.tool_guideline),
    systemPrompt,
    promptMode: fm.prompt_mode === "append" ? "append" : "replace",
    inheritContext: optionalBool(fm.inherit_context),
    runInBackground: optionalBool(fm.run_in_background),
    isDefault: true,
    source: "default",
  };
}
