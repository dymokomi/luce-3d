// Overlay lines that are depth tested without writing depth (src/renderers/wire.lucb):
// the ground grid, which a mesh in front hides and which leaves the depth buffer to what
// it hides, so splats and fog drawn after it cover it as they cover anything behind
// them. The vertex color is the line's color (alpha in w), written premultiplied for
// the "over" blend.
#version 450
layout(location = 0) in vec4 vertex_color;
layout(location = 0) out vec4 fragment_color;

void main() {
    fragment_color = vec4(vertex_color.rgb * vertex_color.a, vertex_color.a);
}
