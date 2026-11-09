#!/usr/bin/env bash
# Start a merge of upstream (pingdotgg/t3code) into the current branch with the
# fork's mechanical rename applied to both the merge base and upstream's tip, so
# only real content conflicts are left. Leaves a normal in-progress merge
# (MERGE_HEAD = the real upstream commit) to resolve and `git commit`.
# usage: scripts/fork-sync/start-merge.sh [upstream-ref]   (default upstream/main)
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
repo="$(git rev-parse --show-toplevel)"
up="${1:-upstream/main}"
git -C "$repo" diff --quiet && git -C "$repo" diff --cached --quiet || { echo "working tree not clean" >&2; exit 1; }
base="$(git -C "$repo" merge-base HEAD "$up")"
[ "$base" = "$(git -C "$repo" rev-parse "$up")" ] && { echo "already up to date with $up"; exit 0; }
base_tree="$(python3 "$here/rebrand-tree.py" "$repo" "$base")"
up_tree="$(python3 "$here/rebrand-tree.py" "$repo" "$up")"
b="$(git -C "$repo" commit-tree "$base_tree" -m "rebranded base")"
u="$(git -C "$repo" commit-tree "$up_tree" -p "$b" -m "rebranded upstream")"
set +e
git -C "$repo" -c merge.renameLimit=50000 merge-recursive "$b" -- HEAD "$u" >/dev/null 2>&1
set -e
git -C "$repo" rev-parse "$up" > "$(git -C "$repo" rev-parse --git-path MERGE_HEAD)"
echo "merge: upstream $(git -C "$repo" describe --tags "$up" 2>/dev/null || git -C "$repo" rev-parse --short "$up") into the fork" \
  > "$(git -C "$repo" rev-parse --git-path MERGE_MSG)"
echo "$(git -C "$repo" rev-list --count "$base..$up") upstream commits; $(git -C "$repo" diff --name-only --diff-filter=U | wc -l) conflicted files"
