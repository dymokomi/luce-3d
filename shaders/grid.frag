// The ground grid as Blender's overlay draws it (src/renderers/ground_grid.lucb): a plane
// reaching to the horizon, each pixel finding where its ray meets the plane and how near
// it lies to a line of each level of the grid (spacings `step` times powers of five).
// Lines keep a width in screen pixels; a level shows only where its lines are far enough
// apart on screen, so finer levels fade in as the camera nears and out with distance and
// at grazing angles, never thick enough to alias or moiré. The plane fades with distance
// and toward the horizon. The two axis lines through the origin keep the vertex color.
// Drawn depth-tested without writing depth, as the overlay lines are (line.frag).
#version 450
layout(location = 0) in vec4 vertex_color;
layout(location = 0) out vec4 fragment_color;
layout(push_constant) uniform Params {
    vec4 view;    // the target's placement and extent, physical pixels
    vec4 eye;     // the camera's position; w: the distance the grid has faded out by
    vec4 right;   // the camera's right scaled by aspect / focal; w: the finest step
    vec4 up;      // the camera's up scaled by 1 / focal; w: line width, physical pixels
    vec4 forward; // the camera's forward; w: the plane's height
    vec4 major;   // the color of lines far apart on screen (alpha: opacity)
    vec4 minor;   // the color of lines close together
} p;

// How much of a line of spacing `spacing` covers this pixel, along each axis, and how
// visible the level is from its on-screen spacing (pixels between lines).
vec2 coverage(vec2 at, vec2 footprint, float spacing, out vec2 apart) {
    apart = spacing / max(footprint, vec2(1e-20));
    vec2 offset = abs(fract(at / spacing + 0.5) - 0.5) * apart;
    float half_width = 0.5 * p.up.w;
    return clamp(half_width + 0.5 - offset, 0.0, 1.0);
}

void main() {
    vec2 uv = (gl_FragCoord.xy - p.view.xy) / p.view.zw;
    vec2 ndc = vec2(uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0);
    vec3 ray = p.forward.xyz + p.right.xyz * ndc.x + p.up.xyz * ndc.y;
    float t = (p.forward.w - p.eye.y) / ray.y;
    if (!(t > 0.0)) discard;
    vec3 hit = p.eye.xyz + ray * t;
    vec2 at = hit.xz;
    // World units a pixel covers along x and z; the larger one picks the levels.
    vec2 footprint = fwidth(at);
    float widest = max(footprint.x, footprint.y);
    float finest = p.right.w;
    // The first level whose lines are at least 2 pixels apart, then three coarser.
    float level = floor(log(max(2.0 * widest / finest, 1e-6)) / log(5.0));
    float spacing = finest * pow(5.0, level);
    vec3 color = vec3(0.0);
    float alpha = 0.0;
    for (int index = 0; index < 4; index++) {
        vec2 apart;
        vec2 lines = coverage(at, footprint, spacing, apart);
        // A level appears between 6 and 20 pixels apart, brightens toward the major
        // color by 100, per axis, so a grazing view keeps only its sparser lines.
        vec2 shown = smoothstep(6.0, 20.0, apart);
        vec2 strength = lines * shown;
        float a = max(strength.x, strength.y);
        float bright = smoothstep(20.0, 100.0, min(apart.x, apart.y));
        vec3 tone = mix(p.minor.rgb, p.major.rgb, bright);
        float opacity = mix(p.minor.a, p.major.a, bright) * a;
        if (opacity > alpha) {
            alpha = opacity;
            color = tone;
        }
        spacing *= 5.0;
    }
    // The axes: x along z = 0, z along x = 0, a little wider, in the vertex color.
    vec2 axis_offset = abs(at) / max(footprint, vec2(1e-20));
    vec2 axes = clamp(0.5 * p.up.w * 1.5 + 0.5 - axis_offset.yx, 0.0, 1.0);
    float axis = max(axes.x, axes.y) * vertex_color.a;
    if (axis > 0.0) {
        color = mix(color, vertex_color.rgb, axis);
        alpha = max(alpha, axis);
    }
    // Fade with distance from the eye along the plane, and toward the horizon,
    // where the plane is seen edge on.
    float distance = length(hit.xz - p.eye.xz);
    float far_fade = 1.0 - smoothstep(0.25 * p.eye.w, p.eye.w, distance);
    float edge_on = abs(ray.y) / length(ray);
    float horizon = smoothstep(0.0, 0.08, edge_on);
    alpha *= far_fade * horizon;
    if (alpha <= 0.002) discard;
    fragment_color = vec4(color * alpha, alpha);
}
