#!/usr/bin/env python3
"""pick-hunks.py ours|theirs|both FILE [hunk_numbers...]  resolve conflict hunks (1-based; all if none given)."""
import sys, re
side, path, *nums = sys.argv[1:]
nums = {int(n) for n in nums}
out, state, n, o, t = [], None, 0, [], []
for line in open(path, encoding="utf-8").read().splitlines(keepends=True):
    if state is None and line.startswith("<<<<<<< "):
        state, n, o, t = "o", n + 1, [], []
    elif state == "o" and line.startswith("||||||| "):
        state = "b"
    elif state in ("o", "b") and line.startswith("=======") and line.strip() == "=======":
        state = "t"
    elif state == "t" and line.startswith(">>>>>>> "):
        if nums and n not in nums:
            out += ["<<<<<<< HEAD\n", *o, "=======\n", *t, line]
        else:
            out += o if side == "ours" else t if side == "theirs" else o + t
        state = None
    elif state == "o": o.append(line)
    elif state == "t": t.append(line)
    elif state == "b": pass
    else: out.append(line)
open(path, "w", encoding="utf-8").write("".join(out))
