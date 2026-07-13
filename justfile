# ─── pi-gotgenes-subagent workflows ────────────────────────────────────────────
# Soft fork of gotgenes/pi-packages. Focus: pi-subagents core with custom agents.
#
# All commands run from the pi-subagents package directory.
# Use `just -l` to list available recipes.

pkg := "packages/pi-subagents"

# ── Development ────────────────────────────────────────────────────────────────

# Install dependencies
install:
    pnpm install

# Type-check the pi-subagents package
check:
    cd {{pkg}} && npx tsc --noEmit

# Run all tests
test:
    cd {{pkg}} && npx vitest run

# Run tests in watch mode
test-watch:
    cd {{pkg}} && npx vitest

# Run tests for a specific file (e.g., just test-file agent-types)
test-file file:
    cd {{pkg}} && npx vitest run --reporter=verbose "{{file}}"

# Type-check + run tests
verify: check test

# ── Upstream sync ──────────────────────────────────────────────────────────────

# Fetch latest from upstream (gotgenes/pi-packages)
fetch-upstream:
    git fetch upstream

# Merge upstream/main into current branch
merge-upstream: fetch-upstream
    git merge upstream/main

# Show what upstream has that we don't (dry-run merge)
upstream-diff: fetch-upstream
    git log --oneline main..upstream/main

# Show what we have that upstream doesn't
our-diff: fetch-upstream
    git log --oneline upstream/main..main

# ── Package-specific ───────────────────────────────────────────────────────────

# Lint the pi-subagents package
lint:
    cd {{pkg}} && npx biome check . && npx eslint .

# Auto-fix lint issues
lint-fix:
    cd {{pkg}} && npx biome check --write .

# Run markdown lint
lint-md:
    cd {{pkg}} && npx rumdl check *.md docs/**/*.md

# ── Git ────────────────────────────────────────────────────────────────────────

# Show current status
status:
    git status

# Show branch info
branches:
    git branch -vv
    @echo ""
    @echo "Worktrees:"
    git worktree list
