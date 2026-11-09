# fork sync

How :3 Code takes in upstream [T3 Code](https://github.com/pingdotgg/t3code) (remote `upstream`) and
ships a release. One pass, roughly weekly:

1. `git fetch upstream` and branch from `main` (`sync/upstream-YYYY-MM-DD`).
2. `scripts/fork-sync/start-merge.sh` starts the merge. It applies the fork's mechanical rename
   (`rebrand-tree.py`: T3 Code → :3 Code, `t3code` → `colon3code`, `T3CODE_*` → `COLON3CODE_*`,
   `t3-code` → `colon3-code`, repo links → SouthbagHQ) to both the merge base and upstream's tip
   first, so only real content conflicts are left. `MERGE_HEAD` is the real upstream commit.
3. Resolve conflicts: take upstream's code, keep the fork's identity (name, lowercase voice, cat
   faces, Hugeicons via `~/icons`, Nunito, blush/plum palette, Southbag Code provider, `~/.colon3code`,
   desktop "꞉3 Code (Alpha)"). `git show :1:/:2:/:3:<path>` are base/fork/upstream (rebranded);
   `git diff :1:<path> :2:<path>` is what the fork changed. `pick-hunks.py ours|theirs|both <file>
   [n…]` resolves whole hunks.
4. Switch new `lucide-react` imports in `apps/web` to `~/icons` (add any missing glyph to
   `apps/web/src/icons.tsx`); project-icon code (`lucideIconByName`, its test) stays on lucide.
5. `pnpm install`, then `pnpm typecheck`, `vp check`, `pnpm run knip:check` and the unit tests;
   commit the merge (the pre-commit hook runs lint and knip).
6. Put upstream's new copy in the fork's voice: `copy-candidates.py apps/web/src` (and
   `apps/mobile/src packages/client-runtime/src packages/shared/src`) lists added lines with
   capitalised chrome strings versus `main` (`FORK_SYNC_BASE` to change). UI chrome is lowercase;
   sentence prose keeps its capital; no em dashes. Commit separately.
7. Merge to `main`, push, and tag `t3-code-release-<next patch>`; the tag runs `fork-release.yml`.
