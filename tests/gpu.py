#!/usr/bin/env python3
"""Run actual Metal readback; reuse the pinned Base GPU test observer."""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--base", type=Path, default=ROOT.parent / "luce-base/build/luce-base")
parser.add_argument("--base-source", type=Path, default=ROOT.parent / "luce-base")
parser.add_argument("--opt", type=int, choices=range(4))
args = parser.parse_args()
modes = [["--native", "--opt", str(level)] for level in ([args.opt] if args.opt is not None else range(4))]
if args.opt is None:
    modes += [["--backend=c"], ["--backend=c", "--release"]]
with tempfile.TemporaryDirectory(prefix="luce-3d-gpu-") as temporary:
    project = Path(temporary)
    shutil.copy2(ROOT / "tests/gpu_pixels_main.lucb", project / "main.lucb")
    shutil.copy2(args.base_source / "tests/programs/gpu/native.lucb", project / "native.lucb")
    (project / "luce.toml").write_text('[package]\nname = "three_pixels"\nsource = "."\n\n[dependencies]\nluce_ui = ' + json.dumps(str(ROOT.parent / 'luce-ui')) + '\nluce_3d = ' + json.dumps(str(ROOT)) + '\n')
    for flags in modes:
        binary = project / "pixels"
        subprocess.run([str(args.base.resolve()), "build", str(project / "main.lucb"), *flags, "-o", str(binary)], check=True, timeout=180)
        subprocess.run([str(binary)], check=True, timeout=60,
                       env=dict(os.environ, MTL_DEBUG_LAYER="1", MTL_SHADER_VALIDATION="1"))
print("PASS real 3D depth, clipping and composed viewport scopes")
