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
  independent camera aspect and region rendering through real package imports.
- Application-defined geometry and material interfaces, dynamic error messages,
  invalid indices, successful reuse after failed rendering, reentrant rendering
  rejection and deferred renderer closure from inside a callback.
- Curved-polygon display triangulations: exact index retention through detached
  copies, attributes, affine/reflected placement, merging, deletion/compaction
  and face reversal; arbitrary deformation invalidation; builder rollback;
  rejection of out-of-face, partial, reversed and repeated triangles. Allocation
  failure injection exercises 256 construction/copy/operation stages and checks
  that no package allocations remain live.
- Edge dissolve preserves the exact source display surface across planar,
  nonplanar and thin-cell unions at two scales (eight combinations). A pinched
  union is rejected instead of publishing a repeated boundary vertex.
- Local dissolve staging is compared after every accepted/rejected operation
  against sequential immutable dissolves on planar/nonplanar grids in both
  windings. Points, face/corner order, normals, display indices and numeric
  attributes across all four domains match exactly. Neighbor slots remain
  reciprocal. Zero edit budgets, nonmanifold edges and inconsistent winding
  reject without mutation. 192 injected allocation cutoffs check cleanup;
  a separately denied display-validation allocation leaves the edit retryable.
- Polygon face normals use an extent-relative area threshold, consistent with
  polygon triangulation, rather than the generic vector normalization cutoff.
  Scale regressions cover 96 concave-polygon combinations of size, translation,
  plane and winding through both direct construction and the mesh builder;
  they verify analytic area, unit normals and directed display triangles.
  A tiny non-collinear UV wedge is accepted and a collinear face is rejected.
  This is a polygon-construction contract, not a claim that every CAD operation
  is independent of units or tolerances.
- Stranded-ear recovery has 378 scale/pose/winding/start/perturbation cases.
  Every supplied boundary interval survives once, every interior diagonal twice
  with opposite use, and positions, corner order, signed area and positive
  conditioned triangles are checked. Another 96 injected-allocation stages
  exercise cleanup of the exceptional partition tables. Disabling the fallback
  in an isolated negative-control build makes this regression fail.
- Lazy spatial-index checks cover failure/retry at ten allocation cutoffs,
  including BVH growth, and warmed queries with all further allocation refused.
  Attribute snapshots keep the same completed cache after the original closes.
  Eight rounds of eight simultaneous native readers exercise first publication
  on a detached mesh, then 100 repeated query sets per reader; all allocations
  are accounted for after join/close. Two nonplanar quad triangulations verify
  that queries still use the exact retained display surface, not a new diagonal.
- Point/triangle distance avoids the nearly equal products in the Gram
  determinant. It uses signed cross-product areas, a better-conditioned origin,
  and boundary candidates. 4,334 primitive queries cover thin triangles,
  vertex permutations, scales, translations, axis planes, known interior/edge/
  exterior projections, nonzero normal distances, and degenerate vertices.
  Two observed cancellation cases have independent 100-digit reference checks;
  the previous implementation fails the new near-edge regression. All native
  optimization and C modes execute these checks. This is floating-point
  geometry, not an exact-predicate guarantee for arbitrary input magnitudes.

`python3 tests/gpu.py` uses the pinned Base standard GPU test observer solely in
a temporary test consumer. The package itself has no native framework imports.
With Metal API/shader validation enabled it reads back pixels for overlapping
triangles in both submission orders, near-plane and behind-camera clipping,
resize, and rendering into a host view's region. These tests require a macOS Metal desktop;
portable scene/geometry tests run on macOS and Linux.

The public README's Luce example is compiled by `tests/docs.py`. CI executes the
portable suite and this documentation check on ARM64 macOS and x86-64 Linux, and
the Metal suite on macOS. Exact toolchain and library revisions are recorded in bootstrap
pins. Tests use temporary output directories and release them on success/failure.

There is no Vulkan renderer yet. CPU-side mesh preparation is intentional and
must not be reported as GPU vertex shading. This initial library has no texture,
shadow, skinning, model-loading or general shader API.
