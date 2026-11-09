#!/usr/bin/env python3
"""Apply the fork's mechanical rebrand to a git tree; print the new tree id.
usage: rebrand-tree.py <repo> <treeish>"""
import os, re, subprocess, sys, tempfile

RULES = [
    (re.compile(r"t3-code-release"), "\0KEEP_RELEASE\0"),
    (re.compile(r"t3tools/t3code"), "southbaghq/colon3code"),
    (re.compile(r"(?:pingdotgg|T3Tools|t3tools)/t3code", re.I), "SouthbagHQ/colon3code"),
    (re.compile(r"T3Tools/T3Code"), "SouthbagHQ/Colon3Code"),
    (re.compile(r'owner: "pingdotgg", repo: "t3code"'), 'owner: "SouthbagHQ", repo: "colon3code"'),
    (re.compile(r"git@github\.com:(?:T3Tools|pingdotgg)/t3code"), "git@github.com:SouthbagHQ/colon3code"),
    (re.compile(r"T3-Code-"), "Colon3-Code-"),
    (re.compile(r"/Applications/T3 Code"), "/Applications/꞉3 Code"),
    (re.compile(r"T3 Code"), ":3 Code"),
    (re.compile(r"T3CODE"), "COLON3CODE"),
    (re.compile(r"T3Code"), "Colon3Code"),
    (re.compile(r"t3code"), "colon3code"),
    (re.compile(r"t3-code"), "colon3-code"),
    # Regexes that recognise the app's own MCP server by name must also accept the fork's.
    (re.compile(r"t3\[-_ \]\?code"), "(?:t3|colon3)[-_ ]?code"),
    (re.compile(r"t3\[-_\]code"), "(?:t3|colon3)[-_]code"),
    (re.compile(r"\0KEEP_RELEASE\0"), "t3-code-release"),
]

def tx(s):
    for r, v in RULES:
        s = r.sub(v, s)
    return s

repo, treeish = sys.argv[1], sys.argv[2]
def git(*a, **kw):
    return subprocess.run(["git", "-C", repo, *a], check=True, capture_output=True, **kw).stdout

entries = git("ls-tree", "-r", "-z", treeish).split(b"\0")
cat = subprocess.Popen(["git", "-C", repo, "cat-file", "--batch"], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
tmpd = tempfile.mkdtemp()
out_lines = []
pending = []  # (mode, path, tmpfile)
for e in entries:
    if not e:
        continue
    meta, path = e.split(b"\t", 1)
    mode, typ, sha = meta.split()
    path_s = path.decode("utf-8", "surrogateescape")
    new_path = tx(path_s)
    if typ != b"blob" or mode == b"120000":
        out_lines.append((mode, new_path, sha.decode()))
        continue
    cat.stdin.write(sha + b"\n"); cat.stdin.flush()
    hdr = cat.stdout.readline().split()
    data = cat.stdout.read(int(hdr[2])); cat.stdout.read(1)
    new_data = data
    if b"\0" not in data[:8000] and re.search(rb"t3code|T3CODE|T3Code|T3 Code|t3-code|T3-Code|t3\\[-_", data):
        try:
            new_data = tx(data.decode("utf-8")).encode("utf-8")
        except UnicodeDecodeError:
            pass
    if new_data is data:
        out_lines.append((mode, new_path, sha.decode()))
    else:
        f = os.path.join(tmpd, str(len(pending)))
        open(f, "wb").write(new_data)
        pending.append((mode, new_path, f))
        out_lines.append(None)
cat.stdin.close(); cat.wait()
shas = git("hash-object", "-w", "--stdin-paths", "--no-filters", input="\n".join(p[2] for p in pending).encode()).decode().split() if pending else []
it = iter(zip(pending, shas))
idx = os.path.join(tmpd, "index")
info = []
for l in out_lines:
    if l is None:
        (mode, p, _), sha = next(it)
        l = (mode, p, sha)
    info.append(f"{l[0].decode()} {l[2]}\t{l[1]}")
env = dict(os.environ, GIT_INDEX_FILE=idx)
subprocess.run(["git", "-C", repo, "update-index", "--add", "-z", "--index-info"], input=("\0".join(info) + "\0").encode("utf-8", "surrogateescape"), env=env, check=True)
print(subprocess.run(["git", "-C", repo, "write-tree"], env=env, check=True, capture_output=True).stdout.decode().strip())
