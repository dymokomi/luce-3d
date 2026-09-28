# API

The package exports `three` and optional `three_ui`. Public objects use `init`
and methods in Base, and existing `Type(args)` construction in Luce. Mutating or
allocating operations can fail; Luce callers handle or propagate those errors.

See [immutable mesh modeling](MESH_MODELING.md) for numeric attribute domains,
topology operators, primitive generators and BVH picking contracts.

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
| `PolygonMesh(points,sizes,corners,display=none)` | Immutable shared-point polygon topology implementing Geometry. Optional validated display triangles are independent of wire edges (see below). `cube(size=2)` builds a grounded cube; `empty()` builds an empty result. `point_count`, `point`, `face_count`, `face_size`, `face_point`, `face_normal`, `face_center`, `edge_count`, `edge_point`, `triangle_face` expose topology. |
| `PolygonMesh.transformed(translation,rotation,scale)` | Returns a new mesh with transformed points and regenerated normals. Rotation is XYZ radians; scale must be nonsingular. Reflections reverse winding. |
| `PolygonMesh.moved_points(selection,delta)` / `merged(other)` | Return a new displaced or concatenated mesh without modifying either input. |
| `PolygonMesh.extruded_faces(selection,distance)` | Extrudes a face region along averaged selected-face normals. Shares new points across selected faces and adds walls only on boundary edges; cap face IDs remain stable. Requires a nonzero distance and a region boundary. |
| `PolygonMesh.ray_face(origin,direction)` / `ray_distance(origin,direction)` | Fallible nearest two-sided intersection, or `-1`. Normalize direction for world-space distances. |
| `PolygonMesh.surface_distance(point)` / `closest_face(point)` | BVH nearest surface distance / primitive ID; `-1` for empty geometry. Points must be finite. |
| `PolygonMesh.prepare_queries()` | Builds the shared spatial index before first use, e.g. on a worker before handing a final viewport mesh to the UI. Idempotent and fallible; no topology change. |
| `Material` | Open interface: linear RGB `color()` and `is_lit()`. |
| `MeshBasicMaterial(color=white)` | Unlit linear color, mutable with `set_color`. |
| `MeshLambertMaterial(color=white)` | Ambient plus directional Lambert lighting, mutable with `set_color`. |
| `Object3D` | Open interface: stable `node`, optional retained `geometry`/`material`, and `light`. |
| `ObjectNode` | Transform, visibility and child membership shared through composition; `position`, `rotation`, `scale`, corresponding setters, `matrix`, `set_visible`, `add`, `remove`, `clear`, `child_count`. |
| `Scene`, `Group` | Own a node and child objects; expose `node`, transform methods, `add`, `remove`, `clear`. |
| `Mesh(geometry,material)` | Owns shared geometry/material interfaces and its own node. |
| `AmbientLight(color=white,intensity=1)` | Scene light; `set_intensity` updates its contribution. |
| `DirectionalLight(color=white,intensity=1,direction=(1,1,1))` | Direction points toward the light and is transformed with its scene node. |
| `PerspectiveCamera(fov=50,aspect=1,near=0.1,far=1000)` | World-space camera initially at `(0,0,5)` looking at the origin; `set_position`, `look_at`, `set_aspect`, `set_projection`. FOV is vertical degrees. |
| `Renderer()` | `render(scene,camera,target,fit_aspect=false)` appends checked triangles to a standard GPU target. `set_wire_overlay(width=0)` reserves slope-aware depth for a coplanar logical-pixel wire overlay; zero restores ordinary depth. It changes draw state, not cached geometry. |
| `WireRenderer` | `lines(points,camera,target,color,width=1,bias=0.000001)` draws independent world endpoint pairs at constant logical-pixel width; near clipped and depth tested. `triangles(points,camera,target,color)` draws depth-tested selection fills. Uses the existing target depth buffer; current GPU API also writes depth. |
| `MeshBuilder` | Bounded Base topology staging: `point`, `face`, `corner`, `finish`, `close`. Importers and operators share the same mesh limits. |
| `PolygonTopology` | Borrowed read interface for points, polygon corners and edge endpoints. Numbering/lifetime are defined by the implementation. |
| `DissolveWorkspace(source,edits=128)` | Base-only local edge-dissolve staging over a borrowed immutable `PolygonMesh*`. `face_slots`, `active`, `neighbor`, `dissolve`, `finish`, `close`; see lifetime and ordering below. |
| `SceneView(scene,camera,renderer=none,width=320,height=240)` | UI widget retaining the scene, camera and renderer; provides `layout`, `scene`, `camera`, `renderer`. Creates a renderer when omitted. |

Rotations are intrinsic XYZ radians, applied as Z, Y, X to column vectors. A world
matrix is `parent * local`; normals use the inverse transpose, including
nonuniform scale. Negative scale is permitted, zero or near-zero scale is rejected.
The initial GPU pipeline draws both triangle faces.

Polygon meshes allow 8,388,608 points/faces, 33,554,432 corners, and 3–256 corners per
face. Their topology and triangulation are copied/owned; concave faces use ear
clipping, and degenerate input is rejected. A corner indexes a shared point;
`sizes` partitions the flattened `corners` array into ordered polygons. Empty
results are valid data but should not be submitted as renderable meshes. These
operators are CPU geometry operations. Face UVs are provisional local coordinates;
attribute contracts are detailed in MESH_MODELING.md; cross-face self-intersection
cleanup is not implemented. Attribute-only edits share immutable topology/BVH on
one thread; detached worker transfers remain independent copies.
`polygon_mesh_type` is the Base ownership descriptor.

The BVH is lazy: constructing, rendering or editing an unqueried mesh does not
build it. The first ray/distance query (or `prepare_queries`) builds and publishes
one immutable index shared by attribute snapshots. Allocation failures propagate
and leave the cache retryable, never a partial index or a false "no hit" result.
Concurrent native borrowed readers synchronize initialization; warmed queries
require no allocation or mutex. Keep the mesh alive until all readers finish.
ARC ownership and snapshot creation/destruction remain on their owning thread;
this does not make interop references transferable between threads.

Display indices address the flattened **corner** array, not shared point IDs.
Each face occupies `3*(size-2)` entries, in face order. A wholly `-1` face asks
for ordinary projected ear clipping; an explicit face must cover its oriented
boundary exactly once, pair interior edges in opposite directions, and contain
only nondegenerate triangles within that face. This is a triangulation contract,
not a CAD-support or global self-intersection validator. Geometry producers remain
responsible for checking their support, trimming and approximation error.

Rendering, picking and surface-distance queries use the same retained display
triangles. They do not add diagonals to `edge_count` or alter polygon topology.
Attribute edits, detached copies, affine placement (including reflections),
merges and unchanged-geometry subsets preserve them. Arbitrary point edits
invalidate and regenerate them. `MeshBuilder.set_last_display` takes **local**
corner indices; `copy_last_display` carries a source face through point-ID remaps
or a reversed polygon. `triangulate_last` computes a projected candidate without
allocating a mesh or BVH. Builder rollback via `nf`/`nc` also rewinds display data;
appending a replacement face clears its old display slots.

`MeshOps.compact` only removes unused point records; it preserves authored `N`
attributes, face/corner order and retained display indices. `MeshOps.faces`
with operation 0 (face filtering) also retains each surviving corner's authored
normal. Moving points or changing winding still invalidates stale normals.
`MeshBuilder.finish(source=none, preserve_normals=false)` allows geometry-preserving
operators to opt in explicitly; ordinary modeling edits retain the default.

`TopologyTools.dissolve` retains the two source faces' display triangles while
removing their shared polygon edge. The geometric surface is unchanged; the
removed edge becomes a display diagonal. A union with repeated boundary vertices
is rejected. This does not repair self-intersections already present in the input.

`DissolveWorkspace` batches up to 128 such edits without rebuilding the entire
mesh after each dissolve. Keep its source alive and immutable until `close`;
the scratch holds no managed owner and must not outlive that borrowed source.
Original edge IDs remain stable; face slots include inactive tombstones, with
each new union appended. Iterate `face_slots` in order and skip `!active(face)`.
`neighbor(face,side)` reports the other active face or -1 for an unavailable
neighbor. Nonmanifold or inconsistently oriented input cannot be dissolved.
A failed dissolve, including allocation failure during display validation, does
not change active topology and can be retried. `finish` materializes an independent
mesh in the same order, with the same display triangles and attribute provenance,
as sequential `TopologyTools.dissolve` calls. This is native single-owner scratch,
not a concurrent mutable mesh or a CAD-specific merge policy.

Node transform components are finite and bounded to magnitude 1e6; scale
magnitudes must be at least 1e-6. BufferGeometry retains its separate small-buffer
limits; PolygonMesh and the renderer support the larger budgets above.
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
`sphere_geometry_type` and `renderer_type` are available from `three`;
`scene_view_type` is exported by `three_ui`. Reference/interface return values
transfer one retained edge. Outcome values own their results or error messages;
release the carrier after use. The Luce compiler supplies the matching ARC and
error conversion automatically. See `tests/main.lucb` and `tests/gpu_pixels_main.lucb` for
compiled direct Base consumers, and `tests/custom.luc` for application-defined
geometry and materials.
