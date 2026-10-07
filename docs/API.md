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
