import { describe, expect, it } from "vitest";
import { DEFAULT_AGENTS } from "#src/config/default-agents";
import { loadEmbeddedAgent } from "#src/config/embedded-agents";
import { optionalListField } from "#src/config/frontmatter-fields";
import { TURN_BUDGET_WARNING_TAIL } from "#src/lifecycle/turn-limits";

describe("loadEmbeddedAgent", () => {
  it("loads the Reviewer definition from its shipped .md file", () => {
    const agent = loadEmbeddedAgent("reviewer", "Reviewer");

    expect(agent.name).toBe("Reviewer");
    expect(agent.displayName).toBe("Reviewer");
    expect(agent.description).toContain("Code review specialist");
    expect(agent.isDefault).toBe(true);
    expect(agent.source).toBe("default");
  });

  it("maps frontmatter onto config fields using the shared parsers", () => {
    const agent = loadEmbeddedAgent("reviewer", "Reviewer");

    expect(agent.toolNames).toEqual(["read", "bash", "grep", "find", "ls", "edit", "write"]);
    expect(agent.thinking).toBe("high");
    expect(agent.inheritContext).toBe(true);
    expect(agent.promptMode).toBe("replace");
  });

  it("strips frontmatter from the system prompt", () => {
    const agent = loadEmbeddedAgent("reviewer", "Reviewer");

    expect(agent.systemPrompt).not.toContain("display_name:");
    expect(agent.systemPrompt).not.toContain("prompt_mode:");
    expect(agent.systemPrompt.startsWith("# Reviewer")).toBe(true);
  });

  it("throws a diagnosable error when the file is missing", () => {
    expect(() => loadEmbeddedAgent("no-such-agent", "Ghost")).toThrow(
      /Embedded agent "Ghost" could not be read from .*no-such-agent\.md/,
    );
  });
});

describe("optionalListField", () => {
  // The embedded loader leaves an omitted `tools:` undefined on purpose: the
  // registry (`agent-types.ts`) supplies `?? [...BUILTIN_TOOL_NAMES]` itself, so
  // defaulting here would answer the question before the registry could.
  it("leaves an omitted field undefined rather than defaulting it", () => {
    expect(optionalListField(undefined)).toBeUndefined();
    expect(optionalListField(null)).toBeUndefined();
  });

  // An agent that says `tools: none` is asking for no tools, which is not the
  // same as an agent that named no `tools:` key at all.
  it("reads an explicit empty field as no tools, not as absent", () => {
    expect(optionalListField("none")).toEqual([]);
    expect(optionalListField("")).toEqual([]);
  });

  it("splits a comma-separated scalar", () => {
    expect(optionalListField("read, grep")).toEqual(["read", "grep"]);
  });

  it("keeps a YAML sequence intact", () => {
    expect(optionalListField(["read", "grep"])).toEqual(["read", "grep"]);
  });
});

describe("Reviewer default agent", () => {
  const reviewer = DEFAULT_AGENTS.get("Reviewer");

  it("is registered as a default with the embedded prompt", () => {
    expect(reviewer).toBeDefined();
    expect(reviewer?.isDefault).toBe(true);
    expect(reviewer?.systemPrompt.length).toBeGreaterThan(1000);
  });

  it("can edit files so it can make small corrective fixes", () => {
    expect(reviewer?.toolNames).toContain("edit");
    expect(reviewer?.toolNames).toContain("write");
  });

  // The prompt is edited outside of TypeScript, so these guard against a section
  // being dropped or renamed by a prompt edit that nothing else would catch.
  it.each([
    ["finding format", "imperative headline"],
    ["severity model", "**P1**"],
    ["calibration load", ".pi/reviewer-calibration.md"],
    ["cross-path lens", "Cross-path invariant drift"],
    ["test quality", "Tests that cannot fail"],
    ["documentation", "Every example must actually work"],
    ["turn budget", "## Your turn budget is finite"],
    ["self-review gate", "Check your own work before you emit"],
    ["feedback loop", "Calibration delta"],
    ["progress.md carve-out", "progress.md"],
  ])("keeps the %s section", (_label, needle) => {
    expect(reviewer?.systemPrompt).toContain(needle);
  });

  it("does not instruct the agent to use emojis", () => {
    expect(reviewer?.systemPrompt).toContain("No emojis");
  });

  // Compared against the constant the turn loop actually sends, so rewording the
  // warning without updating the prompt fails here rather than silently leaving
  // the agent unable to recognise its own wrap-up signal.
  it("quotes the runtime's turn-budget warning verbatim", () => {
    expect(reviewer?.systemPrompt).toContain(TURN_BUDGET_WARNING_TAIL);
  });

  // `rumdl fmt` enforces one sentence per line across the repo and previously split
  // a lens heading, leaving a prompt that still read plausibly.
  it("keeps the defect lenses as single headings", () => {
    const prompt = reviewer?.systemPrompt ?? "";

    expect(prompt.match(/^\*\*Lens \d+\b.*\*\*$/gm) ?? []).toHaveLength(11);
    // A bare "**7.**" on its own line means a formatter split a lens heading in two.
    expect(prompt).not.toMatch(/^\*\*\d+\.\*\*$/m);
  });
});
