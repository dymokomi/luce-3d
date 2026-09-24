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
    dependencies = ''.join(f'    def dependency "{name}" {{\n        str path = {json.dumps((ROOT if name == "luce-3d" else ROOT.parent / name).as_posix())}\n    }}\n'
                           for name in ('luce-3d', 'luce-ui', 'luce-std', 'luce-window', 'luce-gpu'))
    (project / "package.prisma").write_text('#prisma 4.0\ndef package "documentation" {\n    str source = "."\n' + dependencies + '}\n')
    examples = re.findall(r'```luce\n(.*?)```', (ROOT / 'README.md').read_text(), re.S)
    assert examples, 'missing documented example'
    for source in examples:
        (project / "main.luc").write_text(source)
        subprocess.run([str(ROOT.parent / 'luce/build/luce'), 'build', str(project / 'main.luc'), '-o', str(project / 'example')], check=True,
                       env=dict(os.environ, LUCE_BASE=str(ROOT.parent / 'luce-base/build/luce-base')), timeout=180)
print('PASS documented Luce sphere example')
