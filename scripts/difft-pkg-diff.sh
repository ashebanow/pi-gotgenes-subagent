#!/usr/bin/env bash
# Diff a package's working tree against its most recent release tag, scoped to
# that package's directory, using difftastic (difft).
#
# Usage: difft-pkg-diff.sh <package-name> [difft-options...]
#   e.g. difft-pkg-diff.sh pi-subagents
#        difft-pkg-diff.sh pi-permission-system --display inline
#
# Tags are <component>-v<version>. The glob is "<pkg>-v*" so a package like
# pi-subagents does not also match the sibling pi-subagents-worktrees tags.
#
# Git's GIT_EXTERNAL_DIFF hook invokes difft one file at a time; `difft` must be
# on PATH. Only tracked files are shown. To review new files as well, record
# them as intent-to-add first (`git add -N <pkg dir>` stages no content).
set -euo pipefail

usage() {
  printf 'Usage: %s <package-name> [difft-options...]\n' "$(basename "$0")" >&2
  printf '  e.g. %s pi-subagents\n' "$(basename "$0")" >&2
  printf '       %s pi-permission-system --display inline\n' "$(basename "$0")" >&2
  exit "${1:-1}"
}

[[ $# -ge 1 ]] || usage 1
case "$1" in
  -h | --help) usage 0 ;;
esac

command -v difft >/dev/null 2>&1 || {
  printf 'difft not found on PATH (install difftastic)\n' >&2
  exit 1
}

PKG="$1"
shift

PKG_DIR="packages/$PKG"
[[ -d "$PKG_DIR" ]] || {
  printf 'No such package directory: %s\n' "$PKG_DIR" >&2
  exit 1
}

TAG_GLOB="${PKG}-v*"
LATEST_TAG=$(git tag --list "$TAG_GLOB" --sort=-version:refname | head -1)
[[ -n "$LATEST_TAG" ]] || {
  printf 'No release tag found matching %s\n' "$TAG_GLOB" >&2
  exit 1
}

DIFF_CMD="difft${1:+ $*}"
printf 'Diffing %s against %s (scoped to %s)\n' "$PKG" "$LATEST_TAG" "$PKG_DIR" >&2
GIT_EXTERNAL_DIFF="$DIFF_CMD" exec git diff "$LATEST_TAG" -- "$PKG_DIR"
