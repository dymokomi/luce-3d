# Luce 3D

A Luce Base library for scenes, materials, cameras and rendering through
standard `gpu`, drawing the geometry of
[luce-geocore](https://github.com/dymokomi/luce-geocore). The public names
follow the shape of Three.js. It has no UI dependency: an application's view
hands the renderer a render target. All platform resources belong to the
standard library.

```luce
from luce_3d.graphics import Scene, Mesh, SphereGeometry, MeshLambertMaterial, Color, PerspectiveCamera, AmbientLight, DirectionalLight, Renderer
from luce_gpu.gpu import Frame
from luce_window import window

pub func main(arguments: list[str]) -> int!:
    let scene = Scene()
    let geometry = SphereGeometry()
    let material = MeshLambertMaterial(Color(0.1, 0.4, 1.0))
    scene.add(Mesh(geometry, material))
    scene.add(AmbientLight(intensity = 0.25))
    scene.add(DirectionalLight(intensity = 0.8))
    let frame = Frame(window.Size(320.0, 240.0, 320.0, 240.0, 1.0))
    Renderer().render(scene, PerspectiveCamera(), frame.target())
    frame.close()
    return 0
```

Declare the dependency in the consumer's `package.prisma`:

```prisma
def dependency "luce-3d" {
    str owner = "dymokomi"
    str version = "^0.3.0"
}
```

Import `three`. A window or widget toolkit hosts the renderer: luced-3d's
`SceneView` shows how a `luce-ui` Viewport passes its region to
`Renderer.render(scene, camera, target, fit_aspect = true)`.

Check out luce-base, luce and the packages this one uses beside this repository, at main
(`python3 ../luce-base/tools/checkout_main.py . ../luce` clones the missing ones). Run `luc test`
for the Base and Luce test programs under `tests/`; `tests/pixels` reads back Metal
pixels and needs a macOS Metal desktop.

See [the API](docs/API.md), [design and ownership](docs/DESIGN.md),
[validation](docs/VALIDATION.md) and [benchmarks](docs/BENCHMARKS.md)
(`python3 tests/bench/run.py`). The interactive Luce example lives in the
separate [luce-demos](https://github.com/dymokomi/luce-demos) repository.

Polygon meshes (`Mesh.of`) draw from GPU arrays retained by the arrays' change
ids: vertex pulling, lighting and the zebra, isophote and normal analysis modes
run in `gpu` shaders, and a changed mesh uploads only its changed arrays. Other
geometry goes through the per-vertex `Geometry` interface, transformed and lit
on the CPU. Fog volumes (density grids) are ray-marched on the GPU as smoke
(`FogVolume`, `FogScene`; docs/API.md), and point clouds as Gaussian splats or dots, culled and
depth-sorted on the GPU (`GaussianSplats`; docs/API.md). Metal and Vulkan are implemented. Textures, custom materials,
shadows, animation assets and asset loading are later work. This is development
code with no compatibility commitment before its first release.

Licensed under MIT or Apache-2.0, at your option.

## Windows x64

Build sibling `luce-base` and `luce` checkouts with `python tools/build_windows.py` in each compiler repository, then run `luc test` in this repository.
For real windows and rendering, install the Vulkan SDK and start a fresh terminal with `VULKAN_SDK` set. luced-3d and the sibling `luce-demos` applications exercise Win32/Vulkan presentation. CPU tests run in hosted Windows CI; GPU smoke tests require an interactive desktop and Vulkan hardware.
