import { describe, expect, it } from "vitest";
import { DEFAULT_AGENTS } from "#src/config/default-agents";
import { loadEmbeddedAgent } from "#src/config/embedded-agents";
import { TURN_LIMIT_STEER_MESSAGE } from "#src/lifecycle/turn-limits";

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

    expect(agent.builtinToolNames).toEqual(["read", "bash", "grep", "find", "ls", "edit", "write"]);
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

describe("Reviewer default agent", () => {
  const reviewer = DEFAULT_AGENTS.get("Reviewer");

  it("is registered as a default with the embedded prompt", () => {
    expect(reviewer).toBeDefined();
    expect(reviewer?.isDefault).toBe(true);
    expect(reviewer?.systemPrompt.length).toBeGreaterThan(1000);
  });

  it("can edit files so it can make small corrective fixes", () => {
    expect(reviewer?.builtinToolNames).toContain("edit");
    expect(reviewer?.builtinToolNames).toContain("write");
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
    ["turn budget", "You have reached your turn limit"],
    ["self-review gate", "Check your own work before you emit"],
    ["feedback loop", "Calibration delta"],
    ["progress.md carve-out", "progress.md"],
  ])("keeps the %s section", (_label, needle) => {
    expect(reviewer?.systemPrompt).toContain(needle);
  });

  it("does not instruct the agent to use emojis", () => {
    expect(reviewer?.systemPrompt).toContain("No emojis");
  });

  // `rumdl fmt` enforces one sentence per line across the repo and previously split
  // both of these. The prompt still read plausibly afterwards, so nothing but an
  // assertion catches the regression.
  it("quotes the runtime's turn-limit steer message verbatim", () => {
    // Compared against the constant the turn loop actually sends, so rewording the
    // steer without updating the prompt fails here rather than silently leaving the
    // agent unable to recognise its own wrap-up signal.
    expect(reviewer?.systemPrompt).toContain(TURN_LIMIT_STEER_MESSAGE);
  });

  it("keeps the defect lenses as single headings", () => {
    const prompt = reviewer?.systemPrompt ?? "";
    expect(prompt).toContain("**Lens 1 — Cross-path invariant drift.**");
    // A bare "**7.**" on its own line means a formatter split a lens heading in two.
    expect(prompt).not.toMatch(/^\*\*\d+\.\*\*$/m);
  });
});
