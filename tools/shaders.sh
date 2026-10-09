#!/bin/sh
# Embeds luce-3d's fragment shaders (shaders/) into src/renderers/fog_shaders.lucb with
# luce-gpu's tools/embed_shaders.py. Needs glslangValidator and spirv-cross; builds use
# the checked-in module, so run this only when a shader changes.
set -e
cd "$(dirname "$0")/.."
python3 ../luce-gpu/tools/embed_shaders.py src/renderers/fog_shaders.lucb --public --fast-math fog shaders/fog.frag
