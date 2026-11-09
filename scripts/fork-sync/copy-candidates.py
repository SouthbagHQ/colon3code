#!/usr/bin/env python3
"""List added (vs $FORK_SYNC_BASE, default main) lines in UI code that carry capitalised chrome strings."""
import collections, os, re, subprocess, sys
paths = sys.argv[1:]
diff = subprocess.run(["git","diff","-U0","--no-renames",os.environ.get("FORK_SYNC_BASE","main"),"--",*paths,":!*.test.ts",":!*.test.tsx",":!**/test/**",":!**/__fixtures__/**"],capture_output=True,text=True).stdout
pat = re.compile(r'''(?:\b(?:label|title|placeholder|aria-label|ariaLabel|tooltip|heading|buttonLabel|confirmLabel|cancelLabel|actionLabel|emptyTitle|name)\s*[=:]\s*\{?\s*["'`]([A-Z][a-z][^"'`]*)["'`])|(?:>\s*([A-Z][a-z][A-Za-z ,'’…?!]{2,})\s*<)|(?:^\s+([A-Z][a-z]+(?: [A-Za-z’'…?!,.]+)+)\s*$)|(?:\btitle:\s*["'`]([A-Z][^"'`]*)["'`])''')
cur=None; out=collections.Counter(); samples=collections.defaultdict(list)
for line in diff.splitlines():
    if line.startswith("+++ b/"): cur=line[6:]; continue
    if not line.startswith("+") or line.startswith("+++"): continue
    if cur and not cur.endswith((".ts",".tsx")): continue
    s=line[1:]
    if s.strip().startswith(("//","*","/*","import ")): continue
    m=pat.search(s)
    if m:
        out[cur]+=1
        if len(samples[cur])<2: samples[cur].append(next(g for g in m.groups() if g))
for f,c in out.most_common(): print(f"{c}\t{f}\t{' | '.join(samples[f])}")
