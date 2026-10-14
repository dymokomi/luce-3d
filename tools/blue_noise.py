#!/usr/bin/env python3
"""Write src/renderers/fog_noise.lucb: the fog march's 64x64 blue-noise tile of
ranks, laid out by void and cluster (Ulichney 1993). The tile is fixed (a set
seed and filter), so it is made here once, not on the first fog draw."""
import math
from pathlib import Path

SIDE = 64
CELLS = SIDE * SIDE
SPREAD = 1.5       # the energy filter's width in texels
SEEDED = 410       # texels the initial binary pattern sets

def main():
    filt = [0.0] * CELLS
    for y in range(SIDE):
        for x in range(SIDE):
            dx = x if x <= SIDE // 2 else SIDE - x
            dy = y if y <= SIDE // 2 else SIDE - y
            filt[y * SIDE + x] = math.exp(-(dx * dx + dy * dy) / (2.0 * SPREAD * SPREAD))
    point = [False] * CELLS
    energy = [0.0] * CELLS
    rank = [0] * CELLS

    def toggle(at):
        point[at] = not point[at]
        sign = 1.0 if point[at] else -1.0
        ax, ay = at % SIDE, at // SIDE
        for y in range(SIDE):
            row = ((y + SIDE - ay) % SIDE) * SIDE
            for x in range(SIDE):
                energy[y * SIDE + x] += sign * filt[row + (x + SIDE - ax) % SIDE]

    def tightest():
        best, most = 0, -1.0e300
        for at in range(CELLS):
            if point[at] and energy[at] > most:
                most, best = energy[at], at
        return best

    def loosest():
        best, least = 0, 1.0e300
        for at in range(CELLS):
            if not point[at] and energy[at] < least:
                least, best = energy[at], at
        return best

    # The initial points, from a fixed generator.
    state = 0x9E3779B97F4A7C15
    placed = 0
    while placed < SEEDED:
        state = (state * 6364136223846793005 + 1442695040888963407) & 0xFFFFFFFFFFFFFFFF
        at = (state >> 33) % CELLS
        if point[at]:
            continue
        toggle(at)
        placed += 1
    # Move points from their tightest cluster to the largest void until a
    # point would go back where it came from.
    for _ in range(CELLS * 4):
        cluster = tightest()
        toggle(cluster)
        hole = loosest()
        toggle(hole)
        if hole == cluster:
            break
    initial, start = point[:], energy[:]
    # Phase 1: rank the initial points, tightest cluster first.
    r = SEEDED
    while r > 0:
        r -= 1
        at = tightest()
        toggle(at)
        rank[at] = r
    # Phases 2 and 3: fill the largest void each time.
    point[:], energy[:] = initial, start
    r = SEEDED
    while r < CELLS:
        at = loosest()
        toggle(at)
        rank[at] = r
        r += 1
    rows = []
    for y in range(SIDE):
        rows.append("    " + ", ".join(str(v) for v in rank[y * SIDE:(y + 1) * SIDE]) + ("," if y + 1 < SIDE else ""))
    out = Path(__file__).resolve().parents[1] / "src/renderers/fog_noise.lucb"
    out.write_text(
        "## Blue noise for the fog march's per-pixel start offsets (shaders/fog.frag):\n"
        "## a 64×64 tile of ranks laid out by void and cluster (Ulichney 1993), so\n"
        "## neighboring pixels start their steps far apart and what is left of the step\n"
        "## pattern is fine grain with no low frequencies, not bands. The tile is\n"
        "## fixed: tools/blue_noise.py writes this file.\n\n"
        "## Texels across the tile, each way.\n"
        f"pub let noise_side: usize = {SIDE}\n\n"
        "## Each texel's rank, row by row; its value is (rank + 0.5) / 4096.\n"
        f"pub let noise_ranks: u16[{CELLS}] = [\n" + "\n".join(rows) + "]\n\n"
        "## The tile's values in 0..1, row by row, into `out` (`noise_side`² floats).\n"
        "pub func blue_noise(out: f32[]):\n"
        f"    for at in 0..<noise_ranks.length: out[at] = ((f32)noise_ranks[at] + 0.5) / {CELLS}.0\n")

main()
