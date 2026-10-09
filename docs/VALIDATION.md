# Validation

`luc test` builds and runs the test programs under `tests/`: the direct Base
fixture (`tests/geometry`) and two Luce consumers (`tests/objects`,
`tests/custom`), the GPU pixel programs (`tests/pixels`, `tests/mesh_pixels`, `tests/fog_pixels`) and
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
