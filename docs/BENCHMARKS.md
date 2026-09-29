# Geometry-core benchmarks

These figures track the geometry-core migration: shared typed arrays, derived caches, retained GPU
buffers and selection bits. Each step of the migration records its numbers here against the targets.
The targets come from the design's measured primitive costs: a memcpy of f64 positions is about
0.8 ms, packing them to f32×3 about 1.5 ms, and upload runs at about 2.4 GB/s.

Every number is a single run of a `--native --opt 2` build on an M-series Mac with 16 cores.
Differences below about 10 % are noise.

## Running

- `python3 tests/bench/run.py` (luce-3d). This runs the Base benchmark on the 837×837 quad grid:
  702,244 points, 700,569 faces, 2,802,276 corners, 1,402,812 edges and 1,401,138 triangles.
  Display cases draw into an offscreen 1400×900 texture. Each timed draw ends with a one-pixel read,
  so it includes the GPU's work.
- `python3 tests/bench/run.py` (luced-3d). This is the headless editor run: the real Workspace,
  compute worker, publisher, renderer and Edit overlay.
  - It takes the same grid as an OBJ file, and `~/Desktop/camera.step` through Tessellate
    (707,404 points, 655,405 faces). Use `--step` to name another STEP file.
  - The camera-only redraw orbits the camera 4 pixels first.
  - Selecting is 1,000 `choose_component` clicks.
  - The Move round trip starts at `move_selection` and ends when the redraw is complete. It covers
    the request, the worker's cook, the hand-off, the adopt and the redraw.

## luce-3d (Base, 700k grid)

| Operation | Target | Step 0 |
|---|---|---:|
| construct `PolygonMesh` | — | 358.6 ms |
| mesh core, CPU bytes | 106 MB with caches and uv | 181.8 MB |
| uv attribute, CPU bytes (includes the copied weight) | 22.4 MB | 48.1 MB |
| attribute add: point f64 | ~0.3 ms, that column only | 1.45 ms |
| attribute add: corner uv on a mesh with weight | that column only | 12.9 ms |
| attribute add: face on a mesh with uv + weight | that column only | 14.3 ms |
| select 1k faces (overlay + centre) | < 2 ms | 1.07 ms |
| move 1k faces: bare mesh | — | 24.5 ms |
| move 1k faces: mesh with uv + weight + mask | — | 38.9 ms |
| worker to UI hand-off | < 0.05 ms | 14.3 ms |
| BVH build | ≤ 150 ms | 550.6 ms |
| 1000 BVH ray picks | — | 2.46 ms |
| BVH after a Move | refit ≤ 5 ms | 644.1 ms (rebuild) |
| display: first draw of a new mesh | — | 1,736.8 ms |
| display: camera-only redraw | — | 3.24 ms |
| display: redraw after a Move | — | 1,703.6 ms |
| **Move 1k faces round trip** (cook + hand-off + display) | **< 10 ms** | **1,727.4 ms** |
| **first display of a new mesh** (construct + draw) | **< 30 ms** | **2,095.5 ms** |

## luced-3d (headless editor)

| Operation | Target | Step 0 |
|---|---|---:|
| grid 700k: import and cook to an Edit node | — | 2,653.8 ms |
| grid 700k: first display | < 30 ms | 1,807.3 ms |
| grid 700k: camera-only redraw | — | 3.33 ms |
| grid 700k: select 1k faces (1000 clicks) | < 2 ms per click | 81.8 ms |
| grid 700k: Move 1k faces, request to adopted result | — | 960.1 ms |
| grid 700k: Move 1k faces, redraw | — | 1,768.3 ms |
| **grid 700k: Move 1k faces round trip** | **< 10 ms** | **2,728.4 ms** |
| grid 700k: invert a 1k-face selection | — | 1,029.5 ms |
| camera.step: import and cook to an Edit node | — | 9,221.5 ms |
| camera.step: first display | < 30 ms | 2,060.5 ms |
| camera.step: select 1k faces (1000 clicks) | < 2 ms per click | 121.7 ms |
| camera.step: Move 1k faces, request to adopted result | — | 1,240.8 ms |
| camera.step: Move 1k faces, redraw | — | 1,905.8 ms |
| **camera.step: Move 1k faces round trip** | **< 10 ms** | **3,146.6 ms** |
| camera.step: invert a 1k-face selection | — | 961.3 ms |

## Step notes

- **Step 0** (baseline): luce-3d 0.2.0 and luced-3d 0.1.6.
  - The redraw after a Move is almost all CPU preparation: per-corner interface calls, Lambert
    lighting and de-indexing into 134 MB of vertices.
  - A Move re-copies every attribute, and the hand-off copies them again.
  - Inverting a selection is O(n²) in Luce lists.
