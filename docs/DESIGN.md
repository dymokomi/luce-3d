# Design and ownership

`math` owns vectors and affine matrices; `core` defines geometry, material and
scene interfaces. `geometries` owns buffers and sphere construction, `objects`
owns meshes and groups, `scenes` owns roots, `lights` owns illumination values,
`cameras` owns lens/view calculations, and `renderers` owns traversal and reusable
command storage. Only the optional `ui` adapter depends on the public UI package.
The core contains no window, UI, native framework or backend-specific calls.

A node belongs to at most one parent. Parents retain their child objects and
stable nodes; children keep only a parent identity. Add rejects duplicates,
cycles and existing membership. Remove before reparenting. Membership allocation
is transactional: failure preserves the previous children and parent identity.
Closing a parent drops its edges; closing a child explicitly leaves a closed
entry until its parent removes it. Rendering that entry reports a closed-object
error. Geometry and material references are shared, so changing one material is
visible to every mesh using it. Closing a shared resource invalidates its aliases.

Objects are main-thread resources. Luce adapters enforce affinity, closure and
active invocation guards; direct Base owners must also use `enter`/`leave` around
calls that can invoke application interfaces. Raw Base storage and copied
reference carriers do not acquire extra ownership. Clone to retain an edge,
release it once, and trace every owned edge in custom implementations. Value
vectors/matrices/colors can be copied normally.

The renderer retains a bounded traversal snapshot. Stable node identity, parent
membership and scene revision are checked while gathering; mutation during that
stage fails. Geometry and materials are invoked under active guards. Later
membership changes do not invalidate the retained snapshot; custom callbacks
must not assume a newly added child appears in the current frame. Reentrant
rendering on the same renderer fails. Explicit closure during a guarded callback
defers disposal until the outer invocation returns.

Transforms, inverse-transpose normals, camera projection and Lambert illumination
are computed on the CPU. Reusable output vertices carry homogeneous positions and
linear color to standard `gpu`, which owns clipping, shader/pipeline selection,
rasterization and depth. A render call appends to the caller's frame; failure can
leave earlier commands recorded. The owning application discards a failed frame.
It does not retry or present a partially failed frame automatically.

`SceneView` retains a viewport and a render binding. Its connection retains the
bound callback; disconnection and destruction release those edges. Each callback
receives a standard checked target limited to the viewport and its ancestor clip.
The adapter neither creates a second native surface nor exposes presentation or
manual target lifetime to Luce applications. Saved targets expire with the frame.

The shared ARC runtime has its existing trap-on-exhaustion policy for internal
collector buffers. Package allocation-failure tests initialize that runtime
storage before rejecting child-buffer growth; geometry construction itself is
checked at each allocation stage. This distinction is part of the pending
language error-handling review, not an implicit guarantee that every runtime
allocation is recoverable.
