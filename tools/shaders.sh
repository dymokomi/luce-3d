#!/bin/sh
# Embeds luce-3d's shaders (shaders/) with luce-gpu's tools/embed_shaders.py: the fog
# fragment (two ways) into src/renderers/fog_shaders.lucb, the overlay line fragment into
# src/renderers/line_shaders.lucb, and the Gaussian splat fragment, kernels
# and radix sort into src/renderers/splat_shaders.lucb. Needs glslangValidator and
# spirv-cross; builds use the checked-in modules, so run this only when a shader changes.
set -e
cd "$(dirname "$0")/.."
# The fog fragment twice: one drawing a pass (fog), and two whose boxes meet (fog_pair).
python3 ../luce-gpu/tools/embed_shaders.py src/renderers/fog_shaders.lucb --public --fast-math fog --fast-math fog_pair \
    shaders/fog.frag:fog:PAIR=0 shaders/fog.frag:fog_pair:PAIR=1
python3 ../luce-gpu/tools/embed_shaders.py src/renderers/line_shaders.lucb --public shaders/line.frag
python3 ../luce-gpu/tools/embed_shaders.py src/renderers/splat_shaders.lucb --public -I shaders --fast-math splat --fast-math splat_project \
    shaders/splat.frag shaders/splat_project.comp shaders/splat_offsets.comp shaders/splat_compact.comp \
    shaders/radix_count.comp shaders/radix_scan.comp shaders/radix_scatter.comp
