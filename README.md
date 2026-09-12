# Luce 3D

A Luce Base library for scenes, geometry, materials, cameras and rendering through
standard `gpu`. The public names follow the shape of Three.js. It runs standalone
or inside a `luce-ui` widget; all platform resources belong to the standard library.

```luce
from ui import Application
from three import Scene, Mesh, SphereGeometry, MeshLambertMaterial, Color, PerspectiveCamera, AmbientLight, DirectionalLight
from three_ui import SceneView

pub func main(arguments: list[str]) -> int!:
    let scene = Scene()
    let geometry = SphereGeometry()
    let material = MeshLambertMaterial(Color(0.1, 0.4, 1.0))
    scene.add(Mesh(geometry, material))
    scene.add(AmbientLight(intensity = 0.25))
    scene.add(DirectionalLight(intensity = 0.8))
    let view = SceneView(scene, PerspectiveCamera())
    let app = Application(view, title = "A sphere")
    app.run()
    return 0
```

Declare local dependencies in the consumer's `luce.toml`:

```toml
[dependencies]
luce_3d = "../luce-3d"
luce_ui = "../luce-ui"
```

Import `three` for the core and `three_ui` for `SceneView`. Direct UI imports also
require the consumer's UI dependency. These are real package exports: no copied
package sources or demo-specific aliases are needed.

Use the exact compiler/UI revisions in `bootstrap/BASE`, `bootstrap/LUCE` and
`bootstrap/UI`, checked out alongside this repository. Run `./test.sh` for Base
and Luce tests at native optimization levels 0–3 and both C comparison modes.
`python3 tests/gpu.py` additionally requires a macOS Metal desktop. Build a Base
consumer with `python3 tools/build.py tests/main.lucb -o build/test`.

See [the API](docs/API.md), [design and ownership](docs/DESIGN.md), and
[validation](docs/VALIDATION.md). The interactive Luce example lives in the
separate [luce-demos](https://github.com/dymokomi/luce-demos) repository.

The initial renderer performs transforms, projection and Lambert lighting on the
CPU; `gpu` performs homogeneous clipping, rasterization, interpolation and depth
testing. Metal is implemented. Vulkan, textures, custom materials/shaders,
shadows, animation assets and asset loading are later work. This is development
code with no compatibility commitment before its first release.

Licensed under MIT or Apache-2.0, at your option.
