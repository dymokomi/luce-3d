#!/usr/bin/env python3
"""Compile the README's complete Luce example against real package exports."""
import os
from pathlib import Path
import re
import subprocess
import tempfile
import json
ROOT = Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix="luce-3d-docs-") as temporary:
    project = Path(temporary)
    (project / "luce.toml").write_text('[package]\nname = "documentation"\nsource = "."\n[dependencies]\nluce_3d = ' + json.dumps(str(ROOT)) + '\nluce_ui = ' + json.dumps(str(ROOT.parent / 'luce-ui')) + '\n')
    examples = re.findall(r'```luce\n(.*?)```', (ROOT / 'README.md').read_text(), re.S)
    assert examples, 'missing documented example'
    for source in examples:
        (project / "main.luc").write_text(source)
        subprocess.run([str(ROOT.parent / 'luce/build/luce'), 'build', str(project / 'main.luc'), '-o', str(project / 'example')], check=True,
                       env=dict(os.environ, LUCE_BASE=str(ROOT.parent / 'luce-base/build/luce-base')), timeout=180)
print('PASS documented Luce sphere example')
