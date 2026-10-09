# Validation

`luc test` builds and runs the test programs under `tests/`: the direct Base
fixture (`tests/geometry`) and two Luce consumers (`tests/objects`,
`tests/custom`), the GPU pixel programs (`tests/pixels`, `tests/mesh_pixels`, `tests/fog_pixels`, `tests/splat_pixels`) and
the README check (`tests/readme`).

- Sphere counts, radii, normalized normals, exact seams, UV bounds, outward
  nondegenerate triangles at both poles, and out-of-range access.
- Copied vertex/index storage, invalid constructor inputs, composed transforms,
  inverse-transpose normals under nonuniform scale, polar camera orientation and
  rejected invalid lens updates without state changes.
- Rejection at each sphere allocation stage, no live package allocations after
  cleanup, transactional membership growth, duplicates, cycles, removing closed
  children and closing parents with externally retained nodes.
- Heterogeneous native scene objects, shared geometry/materials, nested groups,
  independent camera aspect and region rendering through real package imports.
- Application-defined geometry and material interfaces, dynamic error messages,
  invalid indices, successful reuse after failed rendering, reentrant rendering
  rejection and deferred renderer closure from inside a callback.
- Edit overlays (`tests/objects`): selection geometry rebuilt only when
  the selection changes (never for hover or camera), see-through drawing,
  point and edge picks on a known face, point-cloud picks, a new mesh
  replacing every retained batch, knife planes, the faces under a stroke and
  15-degree snapping, and soft-selection weights in point and face modes.
- Mesh construction, operators, display triangulations, dissolves and
  spatial queries are validated in luce-geocore (its docs/VALIDATION.md).

`tests/pixels` uses a copy of luce-gpu's test observer (`tests/pixels/native.lucb`),
in the test program only. The package itself has no native framework imports.
With Metal API/shader validation enabled it reads back pixels for overlapping
triangles in both submission orders, near-plane and behind-camera clipping,
resize, and rendering into a host view's region. These tests require a macOS Metal desktop;
portable scene/geometry tests run on macOS and Linux.

The public README's Luce examples are compiled by `tests/readme`. Tests use
temporary output directories and release them on success/failure.

`tests/mesh_pixels` renders offscreen: the
polygon-mesh path matches the per-vertex path within 3/255 in lit and flat
modes (with authored normals and point colors), a Move uploads exactly two
arrays, zebra bands double with the stripe count on a cylinder, break at a
crease with a normal per face and flow across the same seam with shared
normals, and change without one-pixel jumps on a sphere. The program uses only
portable `gpu` calls, so it runs on Vulkan hosts too. This library has no
texture, shadow, skinning, model-loading or general shader API.

`tests/fog_pixels` builds a fog ball through luce-geocore's grid API and draws
it offscreen: lit smoke in its middle, fading to the clear past its edge, a
quad in front hiding it and one behind showing through it, one atlas upload
over several draws and a denser look, and a look on the geometry: a heat
grid emitting orange, left out of the smoke grids, its look's scale outside
the key. It ends by printing the GPU
time of a 128³ ball filling 2800×1800 pixels (report only).

`tests/splat_pixels` draws Gaussian splats offscreen into a half-float target
and compares with the formulas: one Gaussian's falloff along a row against
3DGS's α = min(0.99, o·exp(-½ d²/(σ² + 0.3))) and its quad bound (about 0.001
apart); two half-opaque splats composited in both depth orders; a quad in front
hiding a splat and one behind veiled by it; the middle pixel's color of a
degree-3 splat with a rest frame against luce-geocore's `display_color` toward
five eyes (about 0.0005 apart), and Cd at degree 0; dots for a plain cloud and
Centers mode; one upload per cloud and one sort per view; two clouds
interleaved in depth through a `SplatScene` compositing back to front across
clouds (where drawing them one after the other lays the second over the
first), from both sides; selection marks tinting the marked splat only; and a
2^20-splat ball seen from 15 units drawing under a tenth of its splats with
level of detail, its summed color within 6% of the full draw's (about 4%);
and a sub-pixel splat of an antialiased capture drawn at its compensated
opacity, σ²/(σ² + 0.3) of the plain one's. The GPU radix sort is
checked against a CPU stable sort on random 32-bit keys, many ties, 24- and
16-bit keys, a partial tile, one key and none. It ends by printing GPU times per
step for 1M, 3M and 6M synthetic degree-3 splats in a 2800×1800 view (report
only; `SPLAT_TIMINGS=0` skips them). On an M4 Max: 3M splats take about 14 ms
a view (1.2 ms projecting, 0.2 gathering, 1.7 sorting, 10.8 drawing), 6M about
29 ms; a view at rest is the draw alone (11 and 23 ms). On an RTX A5500 laptop
GPU (Windows): 10 ms and 21 ms. `SPLAT_LARGE=20000000` also reports level of
detail on a 20M-splat field 200 units across (no SH), seen from 2 units up
and from 150 units overhead. On an M4 Max: packing 1.2 s; at eye level 37 ms
a view without it (11.5M splats drawn), 33 ms at 2 pixels (9.7M), 17 ms at 4
pixels (4.6M); overhead 29 ms without (11.9M), 22.5 ms at 2 pixels (8.8M),
7 ms at 4 pixels (2.3M).
