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

| Operation | Target | Step 0 | Step 1 | Step 2 | Step 3 |
|---|---|---:|---:|---:|---:|
| construct geocore `Mesh` | — | 358.6 ms | 356.5 ms | 353.9 ms | 43.3 ms |
| mesh core, CPU bytes | 106 MB with caches and uv | 181.8 MB | 160.4 MB | 160.4 MB | 45.5 MB |
| uv attribute, CPU bytes (includes the copied weight) | 22.4 MB | 48.1 MB | 42.8 MB | 42.8 MB | 42.8 MB |
| attribute add: point f64 | ~0.3 ms, that column only | 1.45 ms | 0.74 ms | 0.77 ms | 1.23 ms |
| attribute add: corner uv on a mesh with weight | that column only | 12.9 ms | 6.06 ms | 5.84 ms | 9.77 ms |
| attribute add: face on a mesh with uv + weight | that column only | 14.3 ms | 0.72 ms | 0.70 ms | 1.15 ms |
| select 1k faces (overlay + centre) | < 2 ms | 1.07 ms | 1.39 ms | 1.31 ms | 1.90 ms |
| move 1k faces: bare mesh | — | 24.5 ms | 24.9 ms | 24.6 ms | 17.7 ms |
| move 1k faces: mesh with uv + weight + mask | — | 38.9 ms | 24.0 ms | 24.4 ms | 6.80 ms |
| worker to UI hand-off | < 0.05 ms | 14.3 ms | 0.001 ms | 0.001 ms | 0.001 ms |
| BVH build | ≤ 150 ms | 550.6 ms | 564.3 ms | 552.2 ms | 158.8 ms |
| 1000 BVH ray picks | — | 2.46 ms | 3.00 ms | 2.87 ms | 2.59 ms |
| BVH after a Move | refit ≤ 5 ms | 644.1 ms (rebuild) | 662.1 ms (rebuild) | 651.6 ms (rebuild) | 9.24 ms (refit) |
| display: first draw of a new mesh | — | 1,736.8 ms | 1,806.7 ms | 30.0 ms | 45.4 ms |
| display: camera-only redraw | — | 3.24 ms | 2.61 ms | 4.68 ms | 2.80 ms |
| display: redraw after a Move | — | 1,703.6 ms | 1,791.3 ms | 12.8 ms | 12.5 ms |
| **Move 1k faces round trip** (cook + hand-off + display) | **< 10 ms** | **1,727.4 ms** | **1,817.8 ms** | **42.0 ms** | **18.8 ms** |
| **first display of a new mesh** (construct + draw) | **< 30 ms** | **2,095.5 ms** | **2,163.2 ms** | **384.0 ms** | **88.7 ms** |

## luced-3d (headless editor)

| Operation | Target | Step 0 | Step 1 | Step 2 | Step 3 | Step 4 |
|---|---|---:|---:|---:|---:|---:|
| grid 700k: import and cook to an Edit node | — | 2,653.8 ms | 2,779.2 ms | 2,429.5 ms | 1,641.5 ms | 105.7 ms |
| grid 700k: first display | < 30 ms | 1,807.3 ms | 1,805.8 ms | 39.1 ms | 57.2 ms | 59.8 ms |
| grid 700k: camera-only redraw | — | 3.33 ms | 3.22 ms | 4.57 ms | 5.13 ms | 5.20 ms |
| grid 700k: select 1k faces (1000 clicks) | < 2 ms per click | 81.8 ms | 85.1 ms | 83.7 ms | 36.4 ms | 36.6 ms |
| grid 700k: Move 1k faces, request to adopted result | — | 960.1 ms | 1,063.6 ms | 855.5 ms | 28.7 ms | 10.1 ms |
| grid 700k: Move 1k faces, redraw | — | 1,768.3 ms | 1,778.0 ms | 9.21 ms | 14.5 ms | 14.4 ms |
| **grid 700k: Move 1k faces round trip** | **< 10 ms** | **2,728.4 ms** | **2,841.5 ms** | **864.7 ms** | **43.2 ms** | **24.6 ms** |
| grid 700k: invert a 1k-face selection | — | 1,029.5 ms | 1,038.4 ms | 1,034.2 ms | 1,112.5 ms | 38.1 ms |
| camera.step: import and cook to an Edit node | — | 9,221.5 ms | 9,552.0 ms | 9,077.6 ms | 2,517.4 ms | 2,345.5 ms |
| camera.step: first display | < 30 ms | 2,060.5 ms | 2,201.7 ms | 73.3 ms | 19.0 ms | 20.6 ms |
| camera.step: select 1k faces (1000 clicks) | < 2 ms per click | 121.7 ms | 123.7 ms | 121.8 ms | 55.1 ms | 56.9 ms |
| camera.step: Move 1k faces, request to adopted result | — | 1,240.8 ms | 1,322.3 ms | 1,114.6 ms | 68.5 ms | 19.8 ms |
| camera.step: Move 1k faces, redraw | — | 1,905.8 ms | 1,987.7 ms | 20.6 ms | 13.0 ms | 12.4 ms |
| **camera.step: Move 1k faces round trip** | **< 10 ms** | **3,146.6 ms** | **3,310.0 ms** | **1,135.2 ms** | **81.5 ms** | **32.2 ms** |
| camera.step: invert a 1k-face selection | — | 961.3 ms | 972.3 ms | 992.9 ms | 1,072.9 ms | 34.7 ms |
| grid 700k: Move 1k adjacent faces round trip (local edit) | < 10 ms | — | — | — | — | 13.3 ms |
| grid 700k: redraw with the inverted selection (699k faces) | — | — | — | — | — | 12.4 ms |
| camera.step: Move 1k adjacent faces round trip (local edit) | < 10 ms | — | — | — | — | 12.6 ms |
| camera.step: redraw with the inverted selection | — | — | — | — | — | 12.3 ms |

## Step notes

- **Step 0** (baseline): luce-3d 0.2.0 and luced-3d 0.1.6.
  - The redraw after a Move is almost all CPU preparation: per-corner interface calls, Lambert
    lighting and de-indexing into 134 MB of vertices.
  - A Move re-copies every attribute, and the hand-off copies them again.
  - Inverting a selection is O(n²) in Luce lists.
- **Step 1** (luce-geocore): geometry moved into luce-geocore. Every mesh array
  and attribute is a shared column with a change id; attributes are typed, with
  single storage, an edge domain and no count limit.
  - The hand-off and attribute adds now cost what changes: 14.3 ms → 0.001 ms,
    and a face attribute on an attributed mesh 14.3 → 0.72 ms.
  - A Move no longer copies attributes (38.9 → 24.0 ms with three attributes);
    the rest of it (new f64 positions, touched normals, bounds) goes in step 3.
  - Edges are stored at their exact count: the core is 21 MB smaller.
  - The attribute nodes (Create, Randomize, Color, Selection Group, UV Project,
    Normal, Measure) run Base kernels instead of per-element Luce loops.
- **Step 2** (luce-gpu buffers and mesh draws; luce-3d `Mesh.of`): polygon meshes
  draw from GPU arrays keyed by change ids, with lighting, zebra and isophotes in
  the shaders and wires pulled from positions and edges.
  - Redraw after a Move: 1.7 s → 12.8 ms (luce-3d), 1.77 s → 9.2 ms in the
    editor; a first display 1.74 s → 30 ms.
  - The editor's Move round trip is now the worker's cook (855 ms for the grid):
    moved_points (25 ms), and warming the BVH (650 ms) before handing the mesh
    over. Steps 3 (parallel BVH, refit) and 4 (GPU picking, copy-on-write
    moves) take those.
  - The worker no longer extracts wire endpoints for meshes.
- **Step 3** (structure-of-arrays `Mesh`, lazy caches, the geometry pool): f32
  positions over an f64 origin, i32 topology, and parallel construction on one
  persistent pool (then geocore's; now luce-std's process-wide `parallel` pool).
  - Construct 354 → 43 ms (37 ms unloaded) and the core 160 → 45.5 MB: edges,
    incidence and the connectivity hash are lazy caches shared by a topology.
  - BVH after a Move 652 ms (rebuild) → 9.2 ms (refit); the build is parallel
    (552 → 159 ms).
  - The editor's Move round trip 865 → 43 ms (grid) and 1,135 → 82 ms
    (camera.step): only an Edit node warms its index (a refit), a one-shot
    action sends one worker request, and selecting sends none (1,000 clicks
    84 → 36 ms).
  - Meshes without N now shade with smooth normals (60-degree cusp), built on
    first draw: the grid's first draw is 45 ms instead of 30 ms. A Move keeps
    authored N and refreshes it around the moved points.
  - camera.step's first display 73 → 19 ms (f32 normals, one-pass packing,
    lazy normal guides).
  - These runs shared the machine with other builds (load average 5–7);
    differences below about 20 % are noise here.
  - Left for step 4: the UI side of a Move (about 11 ms building the Edit
    recipe in Luce lists), the worker's cook of it, inverting a selection
    (O(n²), about 1 s), and dirty-range uploads.
- **Step 4** (picking, selection and edits on the GPU side; luced-3d): the
  editor's interaction paths.
  - Faces are picked from the renderer's id pass (`Renderer.pick_face`), read
    back once per view; points and edges take the picked face. No query
    index is warmed on the worker any more (publish 15 → ~1 ms).
  - Selected faces tint in the surface pass from one bit per face
    (`Renderer.set_face_selection`); the overlay outlines up to 20k faces and
    builds no fill: a 699k-face selection redraws in 12 ms.
  - Inverting a selection is O(n + k) (1.1 s → 35–38 ms); a click costs
    0.04–0.06 ms (target 2 ms).
  - The UI's Move recipe was 11 ms, nearly all the first connectivity hash:
    it is hashed in parallel chunks now (10 → 1 ms). Refreshing authored N
    runs in parallel (29 → 5 ms on camera.step).
  - A column names the elements an edit changed; the renderer patches just
    that range of the previous buffer. A local Move (1k adjacent faces) is
    13 ms round trip on both models; the spread-out 1k-face Move still
    re-uploads whole arrays (23–32 ms).
  - Tools and the overlay stay up during a drag (`editing()` holds while a
    gesture's previews recook).
  - These runs shared the machine with other sessions (load 7–10).
