#!/usr/bin/env python3
"""Exercise Base geometry and Luce scene composition in all compiled modes."""
import argparse
import os
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--base", type=Path, default=ROOT.parent / "luce-base/build/luce-base")
parser.add_argument("--luce", type=Path, default=ROOT.parent / "luce/build/luce")
parser.add_argument("--opt", type=int, choices=range(4))
args = parser.parse_args()
modes = [["--native", "--opt", str(level)] for level in ([args.opt] if args.opt is not None else range(4))]
if args.opt is None:
    modes += [["--backend=c"], ["--backend=c", "--release"]]
env = dict(os.environ, LUCE_BASE=str(args.base.resolve()))
with tempfile.TemporaryDirectory(prefix="luce-3d-tests-") as temporary:
    binary = Path(temporary) / "test"
    for compiler, entry in [(args.base, "main.lucb"), (args.luce, "objects.luc"), (args.luce, "custom.luc")]:
        for flags in modes:
            subprocess.run([str(compiler.resolve()), "build", str(ROOT / "tests" / entry),
                            *flags, "-o", str(binary)], check=True, env=env, timeout=180)
            subprocess.run([str(binary)], check=True, timeout=30)
print("PASS 3D Base and Luce consumers, native and comparison modes")
