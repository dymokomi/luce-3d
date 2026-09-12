# Validation

`./test.sh` builds the direct Base fixture and two Luce consumers in native
optimization modes 0, 1, 2, 3 and supplemental C debug/release modes.

- Sphere counts, radii, normalized normals, exact seams, UV bounds, outward
  nondegenerate triangles at both poles, and out-of-range access.
- Copied vertex/index storage, invalid constructor inputs, composed transforms,
  inverse-transpose normals under nonuniform scale, polar camera orientation and
  rejected invalid lens updates without state changes.
- Rejection at each sphere allocation stage, no live package allocations after
  cleanup, transactional membership growth, duplicates, cycles, removing closed
  children and closing parents with externally retained nodes.
- Heterogeneous native scene objects, shared geometry/materials, nested groups,
  independent camera aspect and UI composition through real package imports.
- Application-defined geometry and material interfaces, dynamic error messages,
  invalid indices, successful reuse after failed rendering, reentrant rendering
  rejection and deferred renderer closure from inside a callback.

`python3 tests/gpu.py` uses the pinned Base standard GPU test observer solely in
a temporary test consumer. The package itself has no native framework imports.
With Metal API/shader validation enabled it reads back pixels for overlapping
triangles in both submission orders, near-plane and behind-camera clipping,
resize, and a UI-composed viewport. These tests require a macOS Metal desktop;
portable scene/geometry tests run on macOS and Linux.

The public README's Luce example is compiled by `tests/docs.py`. CI executes the
portable suite and this documentation check on ARM64 macOS and x86-64 Linux, and
the Metal suite on macOS. Exact toolchain/UI revisions are recorded in bootstrap
pins. Tests use temporary output directories and release them on success/failure.

There is no Vulkan renderer yet. CPU-side mesh preparation is intentional and
must not be reported as GPU vertex shading. This initial library has no texture,
shadow, skinning, model-loading or general shader API.
