#!/usr/bin/env python3
"""Build and run the geometry-core benchmark; print its figures beside the design's targets.

The benchmark is report-only: it never fails on a missed target. Timings are
single runs of a --native --opt 2 build; run it more than once before trusting
a small difference.
"""
import argparse
import os
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]
TARGETS = {
    "select 1k faces (overlay + centre)": "< 2 ms",
    "Move 1k faces round trip (cook + hand-off + display)": "< 10 ms",
    "first display of a new mesh (construct + draw)": "< 30 ms",
    "attribute add: point f64": "~0.3 ms, that column only",
    "attribute add: corner uv on a mesh with weight": "that column only",
    "attribute add: face on a mesh with uv + weight": "that column only",
    "worker to UI hand-off": "< 0.05 ms",
    "BVH build": "<= 150 ms",
    "BVH after a Move (rebuild or refit)": "refit <= 5 ms",
    "bytes:mesh core": "with caches and uv: 106 MB",
}


def run(base, opt):
    with tempfile.TemporaryDirectory(prefix="luce-3d-bench-") as temporary:
        binary = Path(temporary) / "bench"
        env = dict(os.environ, LUCE_CACHE=str(Path(temporary) / "cache"))
        subprocess.run([str(base), "build", str(ROOT / "tests/bench/bench.lucb"), "--native", "--opt", str(opt), "-o", str(binary)],
                       check=True, env=env, timeout=600)
        return subprocess.run([str(binary)], check=True, capture_output=True, text=True, timeout=600).stdout


def table(output):
    rows = []
    values = {}
    for line in output.splitlines():
        if line.startswith("#"):
            print(line)
            continue
        name, _, value = line.partition("\t")
        values[name] = float(value)
        rows.append(name)
    if "construct" in values and "display: first draw of a new mesh" in values:
        name = "first display of a new mesh (construct + draw)"
        values[name] = values["construct"] + values["display: first draw of a new mesh"]
        rows.append(name)
    print("| Operation | Measured | Target |")
    print("|---|---:|---|")
    for name in rows:
        value = values[name]
        shown = f"{value / 1048576:.1f} MB" if name.startswith("bytes:") else f"{value:.3f} ms"
        print(f"| {name.removeprefix('bytes:')} | {shown} | {TARGETS.get(name, '')} |")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", type=Path, default=Path(os.environ.get("LUCE_BASE", str(ROOT.parent / "luce-base/build/luce-base"))))
    parser.add_argument("--opt", type=int, choices=range(4), default=2)
    arguments = parser.parse_args()
    table(run(arguments.base.resolve(), arguments.opt))
