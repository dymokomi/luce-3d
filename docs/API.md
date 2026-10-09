# API

The package exports `three`. It has no UI dependency: an application's view hands
the renderer a render target (luced-3d's `SceneView` is a `luce-ui` example).
Public objects use `init` and methods in Base, and existing `Type(args)`
construction in Luce. Mutating or allocating operations can fail; Luce callers
handle or propagate those errors.

Polygon meshes, their builders and modeling kernels live in
[luce-geocore](https://github.com/dymokomi/luce-geocore) (export `geocore`); `three`
re-exports its `Vector3`, `Matrix4`, `Vertex`, `Bounds` and `Geometry`. A
scene draws a geocore `Mesh` through `Mesh.of`, from GPU arrays (a geocore
mesh is not a per-vertex `Geometry`; `MeshGeometry` wraps it for that path).

| Type | Responsibility and principal methods |
| --- | --- |
| `Vector3(x=0,y=0,z=0)` | Immutable operations `add`, `subtract`, `multiply_scalar`, `dot`, `cross`, `length`, `normalized`, `rotated`; public coordinates are values. |
| `Matrix4` | Affine column vectors and translation, implicit final row `(0,0,0,1)`; `compose`, `multiply`, `transform_point`, `transform_direction`, `transform_normal`. |
| `Vertex(position,normal,u=0,v=0,color=Vector3(1,1,1))` | Position, nonzero normal, UV coordinates and multiplicative RGB tint. |
| `Bounds(minimum,maximum)` | Axis-aligned local-space bounds. |
| `Geometry` | Open interface: `vertex_count`, `index_count`, `vertex`, `index`, `bounds`. |
| `BufferGeometry(vertices,indices)` | Copies and validates indexed triangle data; subsequent caller mutations do not change it. |
| `SphereGeometry(radius=1,width_segments=32,height_segments=16)` | Shared immutable UV sphere; duplicates the seam, omits degenerate polar triangles. |
| `BoxGeometry(width=1,height=1,depth=1)` | Origin-centred box: 24 hard-normal, face-local UV vertices and 12 outward-wound triangles. Dimensions must be finite and in `(0,1e6]`. |
| `Material` | Open interface: linear RGB `color()` and `is_lit()`. |
| `MeshBasicMaterial(color=white)` | Unlit linear color, mutable with `set_color`. |
| `MeshLambertMaterial(color=white)` | Ambient plus directional Lambert lighting, mutable with `set_color`. |
| `Object3D` | Open interface: stable `node`, optional retained `geometry`/`material`, and `light`. |
| `ObjectNode` | Transform, visibility and child membership shared through composition; `position`, `rotation`, `scale`, corresponding setters, `matrix`, `set_visible`, `add`, `remove`, `clear`, `child_count`. |
| `Scene`, `Group` | Own a node and child objects; expose `node`, transform methods, `add`, `remove`, `clear`. |
| `Mesh(geometry,material)` | Owns shared geometry/material interfaces and its own node. |
| `Mesh.of(mesh,material)` | A scene object for a geocore `Mesh`, drawn from GPU arrays retained by the mesh's change ids (per-vertex fallback on deviceless frames). |
| `MeshGeometry(mesh)` | The per-vertex `Geometry` of a geocore `Mesh`: its corners as vertices. `Mesh.of` uses it without a device. |
| `AmbientLight(color=white,intensity=1)` | Scene light; `set_intensity` updates its contribution. |
| `DirectionalLight(color=white,intensity=1,direction=(1,1,1))` | Direction points toward the light and is transformed with its scene node. |
| `PerspectiveCamera(fov=50,aspect=1,near=0.1,far=1000)` | World-space camera initially at `(0,0,5)` looking at the origin; `set_position`, `look_at`, `set_aspect`, `set_projection`. FOV is vertical degrees. |
| `Renderer(static_scene=false)` | `static_scene` keeps prepared objects between frames (scene changes still invalidate them; `invalidate()` after custom geometry or material edits). `render(scene,camera,target,fit_aspect=false)` appends checked triangles to a standard GPU target. `set_wire_overlay(width=0)` reserves slope-aware depth for a coplanar logical-pixel wire overlay; zero restores ordinary depth. It changes draw state, not cached geometry. `set_shading(mode,stripes=20,duty=0.5,axis=(0,1,0),planar=false,stripes_only=false)` shades polygon meshes: 0 lit, 1 flat, 2 zebra, 3 isophotes, 4 normals, 5 unlit, 6 curvature (`set_curvature(kind,range=0)`: 0 mean, 1 Gaussian, 2 k1, 3 k2, 4 largest |k|; range 0 is the 98th percentile). `set_edges(width,color,surfaces=true)` draws their edges from the same arrays (`surfaces=false`: wires only). `set_face_selection(mesh,faces,color,weight)`, `set_selected_faces(mesh,selection,color,weight)` (a geocore face `Selection`, keyed by its bits) and `clear_face_selection()` tint selected faces in the surface pass from one bit per face (it follows the mesh's Moves). A mesh with subdivision settings draws its limit surface (`subdivided_display`) with the cage's wires over it, the tint mapped onto the display faces. `set_flat(on)` switches to face normals. `pick_face(mesh,camera,x,y,width,height)` returns the face under a view point from a GPU id pass, reused until the mesh or view changes (fails `unavailable` before a device frame). `uploads()` and `uploaded_bytes()` count GPU array uploads; a local Move patches only its neighbourhood of the previous buffers. None of the draw state re-uploads geometry. |
| `EditOverlay` | Edit-mode overlays for one mesh, kept in Base (mode 0 points, 1 edges, 2 faces, 3 corners): `show(mesh,mode,selection,hovered)` from a geocore `Selection` (or `update` with ids), `draw(camera,target,wire,accent,point,wires=true,hidden=none)` (`hidden`: the selection through surfaces first, dimmed), `pick(camera,x,y,width,height,face=-2)` (points and edges on a known face, else a ray; the nearest point on screen for a point cloud), `center(mesh,mode,ids)`, `set_fill(false)` to leave face fills to the renderer's tint, and `set_soft(radius,falloff=3,symmetry=0)`: points a soft selection reaches are drawn in a falloff ramp by their weight (computed in Base with geocore's `selection_weights`), in every mode. |
| `Knife`, `KnifePlane` | A knife stroke on screen: `Knife.plane(camera,x0,y0,x1,y1,width,height)` is the plane through the eye holding the stroke (a point and a unit normal, for Clip's custom plane), `faces_under(mesh,camera,...)` the faces the line passes over, `snapped(x0,y0,x1,y1)` the end at the nearest 15 degrees. |
| `WireRenderer` | `lines(points,camera,target,color,width=1,bias=0.000001,depth=true)` draws independent world endpoint pairs at constant logical-pixel width; near clipped and depth tested (`depth=false`: over everything). `triangles(points,camera,target,color)` draws depth-tested selection fills. Uses the existing target depth buffer; current GPU API also writes depth. |
| `WireBatch` | Retained endpoint pairs drawn at constant pixel width (`draw(camera,target,color,width)`); `count()` segments and `bounds()` for framing. |
| `FogVolume`, `FogLook` | A fog grid of a luce-geocore set, ray-marched on the GPU as smoke (see below): `FogVolume.of(geometry,index,matrix=identity,light=(3,5,2))` the `index`th smoke grid of the set's own volume (its non-empty fog grids but the look's emission field), placed by `matrix`, its self-shadowing swept toward `light`, drawn with the set's look; `FogVolume.count(geometry)` how many there are; `FogVolume.key(geometry,index,matrix,light)` what its texels are made from (grid contents, emission field, placement, light), equal for a changed look; `FogVolume.look_of(geometry)` the set's look. `draw(camera,target,key=(0.85,0.85,0.85),ambient=0.35)` draws it over what the target holds; `set_look(look)` sets `FogLook` (`density` scale, smoke `color`, `shadow` scale, `emission` scale and `emission_color`, `step` in voxels 0.25..8), uploading nothing; `bounds()` (the world box, for framing), `peak()`, `texels(axis)` and `upload_count()` (one, on the first draw) for tests. Base callers: `fog_volume_of(set,index,matrix,light)` makes a heap volume (on a worker; adopt it with `fog_volume_type`), `fog_volume_key`, `fog_look_of`, `fog_grid_count(set)`, and `release_fog_pipelines()` frees the shared shader. |
| `GaussianSplats`, `SplatLook`, `SplatMode`, `SplatTimes` | A luce-geocore point cloud drawn as Gaussian splats, or as dots when it has no `orient`, `scale` and `opacity` (see below): `GaussianSplats.of(geometry,matrix=identity)` packs the set's cloud placed by `matrix`; `GaussianSplats.count(geometry)` its points (0 without a cloud); `GaussianSplats.key(geometry,matrix)` what it packs from (column ids, color space, placement). `draw(camera,target)` draws it alone over what the target holds, depth tested; `set_look(look)` sets `SplatLook` (`mode` splats or centers, `sh_degree` 0..3, `alpha_cull`, `scale`, `max_size` in pixels, `dot_size` in points, `lod_pixels` and `lod_from` for level of detail), uploading nothing; `set_marks(selection)` tints the points a luce-geocore `Selection` of the cloud's points selects (none clears); `bounds()`, `size()`, `is_splats()`, `has_lod()`, `sh_items()`, `upload_count()` (one, on the first draw), `sort_count()` (views sorted alone) and `timings()` (the last such view's GPU milliseconds per step) for tests and reports. Base callers: `gaussian_splats_of(set,matrix)` packs a heap one (on a worker; adopt it with `gaussian_splats_type`), `splat_key`, `splat_count`, and `release_splat_pipelines()` frees the shared shader. `RadixSort` and `radix_arguments` are the GPU sort it orders depths with. |
| `SplatScene` | Several clouds drawn as one: `draw(clouds,camera,target)` sorts every cloud given in one combined pass, so splats of clouds that interleave (overlapping captures, instances) blend in depth order across clouds; `set_look(look)` applies to all of them; `sort_count()` and `timings()` as above. A viewport keeps one. |
| `CurveLines` | The curves of a luce-geocore `GeometrySet` as wire batches: `batch(geometry)` draws every evaluated curve (instances placed), `batch(geometry, true)` the control hulls (control polygons of smooth curves, Bezier handle arms, a cross per control point); `count(geometry)` segments. Base code appends the same endpoint pairs with `append_curve_segments(set, matrix, lines, hulls)`, extracted in parallel from the evaluated-curve cache. |
| `SurfaceHits` | Where a view ray meets the scene: `cast(root,origin,direction)` returns the nearest face of any visible polygon object under `root` (each placed by its parents, hit through its BVH) as a `SurfaceHit` (`found`, world `point`, unit `normal`, `distance`); `plane(origin,direction,point,normal)` meets a construction plane. |

Rotations are intrinsic XYZ radians, applied as Z, Y, X to column vectors. A world
matrix is `parent * local`; normals use the inverse transpose, including
nonuniform scale. Negative scale is permitted, zero or near-zero scale is rejected.
The initial GPU pipeline draws both triangle faces.

Node transform components are finite and bounded to magnitude 1e6; scale
magnitudes must be at least 1e-6. BufferGeometry retains its separate small-buffer
limits; the renderer supports luce-geocore's larger mesh budgets.
Sphere segments are 3–256 by 2–128, with radius in `(0,1e6]`. The renderer
accepts up to 1024 objects and 64 levels per frame. Standard GPU command and vertex
budgets apply to the whole frame as well. Invalid custom interface results fail
before indexing or copying their data. Device frames retain GPU batches (split
below 128 MiB); standalone CPU recordings still use the dynamic frame budget.

Camera aspect is positive and bounded to `[1e-6,1e6]`; `0 < near < far <= 1e9`,
`0 < fov < 179`. Camera position and target must be finite and distinct. The initial
camera is independent of scene parenting. `SceneView` fits projection to its
allocated viewport without mutating the shared camera's configured aspect.

Base consumers use explicit `interop.Reference`, `interop.Interface` and
`interop.Outcome` carriers. Descriptor constants such as `mesh_type`,
`sphere_geometry_type` and `renderer_type` are available from `three`. Reference/interface return values
transfer one retained edge. Outcome values own their results or error messages;
release the carrier after use. The Luce compiler supplies the matching ARC and
error conversion automatically. See `tests/geometry/main.lucb` and `tests/pixels/readback.lucb` for
compiled direct Base consumers, and `tests/custom/main.luc` for application-defined
geometry and materials.

## Fog volumes

A fog grid has no surface, so it is drawn by ray marching (Houdini's viewport
smoke), split between the CPU, once per grid, and the GPU, per frame:

- **Texels** (`renderers/fog_texels.lucb`). The grid's leaves span a box of
  voxels; the box, padded by a texel of background, becomes a dense texel box
  whose z slices sit side by side in one `rgba16_float` atlas texture (red the
  density, green the optical depth toward the key light, blue toward the sky,
  alpha the look's emission field, sampled from that grid at texel centers).
  luce-gpu has no 3D textures, and a 2D atlas of slices filters bilinearly in
  hardware on every backend: the shader adds the linear step between two
  slices. Leaves wider than 256³ texels (or an atlas past 16384 texels a side)
  are averaged down by a whole factor. The optical depths, ∫ density along the
  world length toward the light, are swept plane by plane on the CPU (in
  parallel per plane), so lighting costs two reads per step and a new density
  scale needs no new sweep.
- **Slabs** (`renderers/fog_volume.lucb`, `shaders/fog.frag`). A draw cuts the
  box into view-aligned slabs four steps thick, back to front, as one
  `gpu.shade_triangles` draw whose vertex colors are box coordinates. Each
  fragment marches its slab's stretch of the eye ray front to back, with
  per-pixel jittered steps (interleaved gradient noise): Beer–Lambert
  absorption, single scattering of the key light
  (`exp(-depth_light × density × shadow)`) and of the sky, and emission
  (`field × emission × emission_color` per world unit). It emits premultiplied color, so slabs
  composite over one another and over the scene. The pipeline is depth tested
  without writing depth: a mesh in front hides the fog, the fog veils what lies
  behind it, and a mesh inside it cuts it to within one slab.

The look comes from the geometry: luce-geocore's Volume Visualization verb
puts volvis_* detail attributes on the set (`volume_look`), and `look_of`
turns them into a `FogLook`. A new look keeps the grids, and so the key: a
display holding volumes by `key` only calls `set_look`.

The atlas uploads on the first draw and the CPU copy is freed; later draws
(camera moves, a new look) upload nothing. The shader and its pipelines are
shared by every volume. `tests/fog_pixels` checks a fog ball's pixels and
reports a 128³ ball's GPU time at 2800×1800 (about 5 ms on an M4 Max).

## Gaussian splats

A point cloud with luce-geocore's splat conventions (`orient`, `scale`,
`opacity`, linear `Cd`, the `sh` array, optional `restorient`; see its
`splats` module) is drawn as 3D Gaussian Splatting draws it (Kerbl et al.
2023), with a global depth sort and hardware-blended quads:

- **Pack** (`renderers/splat_data.lucb`), once per cloud on the CPU, in
  parallel: per splat its placed center (f32, relative to the cloud's placed
  origin) and opacity, its placed covariance L Σ Lᵀ (f32 × 6), its DC color in
  the cloud's encoding (`encode(Cd)`, f16), its SH frame
  `orient · restorient⁻¹` (f16, only with a `restorient`) and its SH items
  (f16). About 140 bytes per degree-3 splat. Uploaded on the first draw; the
  CPU copy is freed.
- **Level of detail** (`renderers/splat_lod.lucb`), packed with clouds of 2^20
  splats or more: the splats go in Morton order of their centers (16 bits over
  the box's longest side, so a flat capture's thin axis takes few bits), and
  one merged splat per run of 4, 16, 64 and 256 consecutive splats is appended.
  A merged splat matches its members' moments (weights opacity × (det Σ)^⅓;
  mean center; covariance the weighted Σᵢ plus the centers' spread; linear
  mean color) and keeps their summed opacity, so its drawn opacity is the
  members' coverage widened by the 0.3 px² low-pass, as they would draw. About
  16 bytes more per splat.
- **Project** (`shaders/splat_project.comp`), each new view, once per cloud:
  with level of detail on, the coarsest merged splat of a splat's runs whose
  footprint (3σ) is under `lod_pixels` stands in for its run (it takes the
  run's first slot; the others stay empty); then the EWA 2D covariance (x/z
  and y/z clamped to 1.3 tan(fov/2), a 0.3 px² low-pass), its eigenvectors,
  the quad's half axes k·√λ where the Gaussian falls to the alpha cull (k at
  most 3, the longest capped by `max_size`), frustum and opacity culling, and
  the color: the SH bands toward the eye, turned into the splat's SH frame,
  added to the DC color, clamped at 0 and decoded from sRGB, which is
  luce-geocore's `display_color`; a marked (selected) splat is tinted toward
  the highlight. A capture trained antialiased (Mip-Splatting's 2D filter;
  detail `gsplat_antialiased`, which luce-spz reads from an SPZ) has its
  opacity scaled by √(det Σ′ / det(Σ′ + 0.3 I)), so the low-pass keeps a
  small splat's integral instead of fattening it. Each visible splat writes a 48-byte quad record (clip center,
  clip half axes, linear color and opacity; an opacity of 2 marks a dot) at its
  slot, and a 24-bit depth key (the view depth's float bits, reversed: far
  first). Every cloud of a view takes a run of slots in one combined index
  space (`renderers/splat_view.lucb`), padded to whole workgroups.
- **Gather** (`splat_offsets.comp`, `splat_compact.comp`), once over all
  slots: a workgroup's visible count, one scan of those counts, and a stable
  rank inside each workgroup put the visible keys and slots in slot order, so
  equal keys never trade places between frames. The same kernel writes the
  draw's indirect arguments and the sort's workgroup count.
- **Sort** (`renderers/radix_sort.lucb`, `radix_*.comp`), once over all
  clouds: an LSD radix sort, 4 bits a pass (six passes for 24-bit keys), each
  pass a count per tile of 2048 keys, one scan, and a stable scatter that
  sorts each tile in shared memory first, so every digit's run is written out
  whole (coalesced writes made the sort 2× faster on an NVIDIA GPU and 6× on a
  Radeon 890M). Reduce-then-scan needs no forward progress between
  workgroups, which Metal does not promise.
- **Draw**: luce-gpu's `shade_quads`, the records through the sorted slots,
  the count from the GPU. `shaders/splat.frag` gives
  α = min(0.99, o·exp(-½ k² ρ²)), drops α under the cull, and writes
  premultiplied color with `Blend.over`, back to front. The pipeline is depth
  tested without writing depth: meshes in front hide splats, splats veil
  meshes behind them.

The compute pass runs only when the clouds, their placements and marks, the
view or the look changed; at rest a frame is the draw alone. A `SplatScene`
sorts all its clouds together, so interleaved clouds composite exactly; a
cloud drawn alone (`GaussianSplats.draw`) sorts by itself. Level of detail
engages when the clouds drawn together number at least `lod_from` (10M by
default) at `lod_pixels` (2 by default). Centers mode, and every cloud without
the splat attributes, draws round opaque dots of the DC color (`Cd` for plain
clouds) through the same pass. `tests/splat_pixels` checks pixels against
these formulas and reports times per step (docs/VALIDATION.md).
