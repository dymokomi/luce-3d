// Fog drawings ray-marched together (src/renderers/fog_scene.lucb draws them).
//
// One pass marches one drawing, or with GROUP up to four whose boxes overlap,
// front to back along each pixel's eye ray, from the nearest box entry to the
// farthest exit or the scene's depth, whichever comes first. Where boxes
// overlap, each sample sums the drawings holding it: their extinction, their
// light scattered in proportion, their emission, and their optical depths
// toward the key light and the sky, so crossing smokes mix step by step and
// shadow each other (a drawing's light depth at a point is the optical depth
// through its own grid toward the light; every grid covering the sample adds
// its own). tools/shaders.sh embeds it both ways (fog and fog_group), so a lone
// drawing's pass carries none of the group's cost.
//
// Image 1: the drawings' atlases. Alone, the drawing's own; in a group, the
// group's atlases stacked (fog_scene copies them), each drawing's numbers
// saying where its own starts. Each atlas: its texels, z slices tiled side by
// side (rgba16_float): r the density, g the optical depth toward the key
// light, b toward the sky (+Y), both integrated on the CPU, a the emission
// field. A drawing with an emission color field has a second block of tiles
// below the first holding that field in r.
// Image 2, the table (rgba32_float, 256 wide): rows 0..63 a 64×64 tile of blue
// noise in r; then two rows per drawing: its numbers (8 texels, see `meet`)
// and its emission strip (256 colors along its emission range).
// Image 4, the scene depth (luce-gpu's scene_depth binding): the march ends
// exactly there, a fraction of a step if need be, so a mesh inside the fog cuts
// it smoothly at every depth.
//
// The pass draws the outline of its boxes on screen. A pixel's place across the
// view (x and y in -1..1, y up) gives its ray: forward + x * right + y * up,
// scaled so the ray parameter is the view depth (what the depth buffer holds, as
// clip z / w).
#version 450
layout(location = 0) in vec4 vertex_color;
layout(location = 0) out vec4 fragment_color;
layout(push_constant) uniform Params {
    vec4 eye;       // the eye (world); w the near plane's depth
    vec4 forward;   // the view axis (unit); w the far plane's depth
    vec4 right;     // world offset per unit of x in -1..1 at view depth 1; w how many drawings this pass marches
    vec4 up;        // world offset per unit of y in -1..1 at view depth 1; w the most steps a ray takes
    vec4 key;       // the key light's color times intensity; w the ambient (sky) intensity
    vec4 drawings;  // the table rows of this pass's drawings (first `right.w` of them)
    vec4 view;      // the view's corner in the frame and its size, in pixels
} params;
layout(set = 0, binding = 1) uniform sampler2D atlas;
layout(set = 0, binding = 2) uniform sampler2D table;
layout(set = 0, binding = 4) uniform sampler2D scene_depth;

const int noise_rows = 64;
const float never = 1.0e30;

// One drawing as a pixel's ray meets it: where the ray is in its box
// coordinates (origin + direction * depth), the stretch of view depths inside
// its box, and its numbers from the table.
struct Drawing {
    vec3 origin;
    vec3 direction;
    float enter;
    float leave;
    vec4 counts;   // texels across x, y, z; w slices per atlas row
    vec4 place;    // its atlas's size in texels; z its second block's offset down; w its step (world)
    vec4 smoke;    // the scattering color; w the shadow scale
    vec4 glow;     // x the density scale, y the emission scale, z and w the strip's fit
    vec4 bound;    // where its atlas starts in the bound image (texels down), and that image's size; w unused
    int strip;     // the table row of its emission strip
};

// Drawing `index` of the table as the ray eye + ray * depth meets it, its
// stretch clipped to near..scene.
Drawing meet(float index, vec3 ray, float near, float scene) {
    Drawing g;
    int row = noise_rows + 2 * int(index);
    vec4 m0 = texelFetch(table, ivec2(0, row), 0);
    vec4 m1 = texelFetch(table, ivec2(1, row), 0);
    vec4 m2 = texelFetch(table, ivec2(2, row), 0);
    g.counts = texelFetch(table, ivec2(3, row), 0);
    g.place = texelFetch(table, ivec2(4, row), 0);
    g.smoke = texelFetch(table, ivec2(5, row), 0);
    g.glow = texelFetch(table, ivec2(6, row), 0);
    g.bound = texelFetch(table, ivec2(7, row), 0);
    g.strip = row + 1;
    vec3 eye = params.eye.xyz;
    g.origin = vec3(dot(m0.xyz, eye) + m0.w, dot(m1.xyz, eye) + m1.w, dot(m2.xyz, eye) + m2.w);
    g.direction = vec3(dot(m0.xyz, ray), dot(m1.xyz, ray), dot(m2.xyz, ray));
    // Slabs: where each coordinate crosses 0 and 1 (a zero component is inside
    // for every depth or none).
    vec3 safe = mix(g.direction, vec3(1.0e-12), lessThan(abs(g.direction), vec3(1.0e-12)));
    vec3 a = -g.origin / safe;
    vec3 b = (vec3(1.0) - g.origin) / safe;
    vec3 lo = min(a, b);
    vec3 hi = max(a, b);
    g.enter = max(max(lo.x, lo.y), max(lo.z, near));
    g.leave = min(min(hi.x, hi.y), min(hi.z, scene));
    if (g.leave <= g.enter) {
        g.enter = never;
        g.leave = never;
    }
    return g;
}

// The drawing's texels at `q` (0..1 across its box) in block `block`: bilinear
// within a z slice's tile (texel centers clamped inside it, so tiles never
// bleed), linear between the two nearest slices.
vec4 texels(Drawing g, vec3 q, float block) {
    vec3 t = q * g.counts.xyz - 0.5;
    vec2 xy = clamp(t.xy, vec2(0.0), g.counts.xy - 1.0) + 0.5;
    float z = clamp(t.z, 0.0, g.counts.z - 1.0);
    float z0 = floor(z);
    float z1 = min(z0 + 1.0, g.counts.z - 1.0);
    vec2 corner = vec2(0.0, g.bound.x + block * g.place.z);
    vec2 tile0 = corner + vec2(mod(z0, g.counts.w), floor(z0 / g.counts.w)) * g.counts.xy;
    vec2 tile1 = corner + vec2(mod(z1, g.counts.w), floor(z1 / g.counts.w)) * g.counts.xy;
    vec4 a = textureLod(atlas, (tile0 + xy) / g.bound.yz, 0.0);
    vec4 b = textureLod(atlas, (tile1 + xy) / g.bound.yz, 0.0);
    return mix(a, b, z - z0);
}

// The drawing's emitted color for color field value `c`: its strip, linear
// between the two nearest of its 256 texels.
vec3 strip_color(Drawing g, float c) {
    float x = clamp((c - g.glow.z) * g.glow.w, 0.0, 1.0) * 255.0;
    float x0 = floor(x);
    vec3 a = texelFetch(table, ivec2(int(x0), g.strip), 0).rgb;
    vec3 b = texelFetch(table, ivec2(int(min(x0 + 1.0, 255.0)), g.strip), 0).rgb;
    return mix(a, b, x - x0);
}

bool inside(Drawing g, float depth) {
    return depth >= g.enter && depth < g.leave;
}

#if GROUP
// Up to four drawings march together (fog_groups' most_together). They are
// four named drawings, not an array: an array indexed in a loop goes to
// scratch memory on some GPUs (RADV), a large slowdown.
Drawing d0;
Drawing d1;
Drawing d2;
Drawing d3;
int members;

// What the group's drawings hold at a view depth, summed: extinction, smoke
// color weighted by density, optical depths toward the key light and the
// sky (each drawing's through its own grid, so every grid covering the
// sample shadows it), and emission.
struct FogSample {
    float sigma;
    vec3 smoke;
    float light;
    float sky;
    vec3 emitted;
};

// Add drawing `g`'s sample at view depth `depth` to `s`, if it holds it.
void add_drawing(Drawing g, float depth, inout FogSample s) {
    if (!inside(g, depth)) return;
    vec3 q = g.origin + g.direction * depth;
    vec4 v = texels(g, q, 0.0);
    float density = v.r * g.glow.x;
    s.sigma += density;
    s.smoke += density * g.smoke.rgb;
    s.light += v.g * g.smoke.w * g.glow.x;
    s.sky += v.b * g.glow.x;
    if (g.glow.y > 0.0 && v.a > 0.0) {
        // Strength from the emission field (light is never negative); color
        // from the emission color field (the second block) or the emission
        // field itself, either through the strip's range.
        float c = g.place.z > 0.0 ? texels(g, q, 1.0).r : v.a;
        s.emitted += strip_color(g, c) * (g.glow.y * v.a);
    }
}

FogSample sample_group(float depth) {
    FogSample s = FogSample(0.0, vec3(0.0), 0.0, 0.0, vec3(0.0));
    add_drawing(d0, depth, s);
    add_drawing(d1, depth, s);
    if (members > 2) add_drawing(d2, depth, s);
    if (members > 3) add_drawing(d3, depth, s);
    return s;
}

// Fold one segment `length_world` long with sample `s` into the march.
void absorb_sample(FogSample s, float length_world, inout vec3 radiance, inout float transmittance) {
    float alpha = 1.0 - exp(-s.sigma * length_world);
    if (s.sigma > 0.0) {
        vec3 lit = s.smoke * (params.key.rgb * exp(-s.light) + params.key.w * exp(-s.sky));
        radiance += transmittance * alpha / s.sigma * lit;
    }
    radiance += transmittance * s.emitted * length_world;
    transmittance *= 1.0 - alpha;
}

// Drawing `g`'s step if it holds view depth `s`, else `never`.
float step_at(Drawing g, float s) {
    return inside(g, s) ? g.place.w : never;
}

// The group's step at view depth `s`: the finest step of the drawings
// holding it, or the finest of all where none does.
float group_step(float s) {
    float h = min(step_at(d0, s), step_at(d1, s));
    float finest = min(d0.place.w, d1.place.w);
    if (members > 2) {
        h = min(h, step_at(d2, s));
        finest = min(finest, d2.place.w);
    }
    if (members > 3) {
        h = min(h, step_at(d3, s));
        finest = min(finest, d3.place.w);
    }
    return h < never ? h : finest;
}

// Drawing `g`'s entry if it is past `s`, else `never`.
float entry_past(Drawing g, float s) {
    return g.enter > s ? g.enter : never;
}

// The view depth past `s` where the next drawing begins, or `never`.
float next_entry(float s) {
    float next = min(entry_past(d0, s), entry_past(d1, s));
    if (members > 2) next = min(next, entry_past(d2, s));
    if (members > 3) next = min(next, entry_past(d3, s));
    return next;
}

// Whether some drawing holds view depth `s`.
bool held(float s) {
    return inside(d0, s) || inside(d1, s) || (members > 2 && inside(d2, s)) || (members > 3 && inside(d3, s));
}

// The group from `first` to `last`: segments as long as the finest step of
// the drawings there (in view depth, as slabs stepped), the first after each
// entry a blue-noise fraction of a step so step boundaries never line up from
// pixel to pixel, the last cut short at `last` (the scene's depth where a
// surface is nearer). Two segments a turn, so their texture reads go out
// together; a stretch in no box is skipped.
vec4 march_group(float first, float last, float span) {
    float offset = texelFetch(table, ivec2(ivec2(gl_FragCoord.xy) % noise_rows), 0).r;
    vec3 radiance = vec3(0.0);
    float transmittance = 1.0;
    float a = first;
    float b = min(first + group_step(first) * max(offset, 0.02), last);
    int steps = int(params.up.w);
    for (int i = 0; i < steps && a < last && transmittance > 0.003; i += 2) {
        if (!held(a)) {
            a = min(next_entry(a), last);
            b = min(a + group_step(a) * max(offset, 0.02), last);
            continue;
        }
        float c = min(b + group_step(b), last);
        FogSample sa = sample_group(0.5 * (a + b));
        FogSample sb = sample_group(0.5 * (b + c));
        absorb_sample(sa, (b - a) * span, radiance, transmittance);
        absorb_sample(sb, (c - b) * span, radiance, transmittance);
        a = c;
        b = min(c + group_step(c), last);
    }
    return vec4(radiance, 1.0 - transmittance);
}

#endif

// Add one segment's sample `v` of `g` (its texels at `q`), `length_world` long.
void absorb(Drawing g, vec4 v, vec3 q, float length_world, inout vec3 radiance, inout float transmittance) {
    float density = v.r * g.glow.x;
    vec3 emitted = vec3(0.0);
    if (g.glow.y > 0.0 && v.a > 0.0) {
        float c = g.place.z > 0.0 ? texels(g, q, 1.0).r : v.a;
        emitted = strip_color(g, c) * (g.glow.y * v.a);
    }
    float alpha = 1.0 - exp(-density * length_world);
    vec3 lit = g.smoke.rgb * (params.key.rgb * exp(-v.g * g.smoke.w * g.glow.x) + params.key.w * exp(-v.b * g.glow.x));
    radiance += transmittance * (alpha * lit + emitted * length_world);
    transmittance *= 1.0 - alpha;
}

// One drawing alone, from `first` to `last`: segments as in `march_group`,
// two a turn so their texture reads go out together.
vec4 march_one(Drawing g, float first, float last, float span) {
    float offset = texelFetch(table, ivec2(ivec2(gl_FragCoord.xy) % noise_rows), 0).r;
    float h = g.place.w;
    vec3 radiance = vec3(0.0);
    float transmittance = 1.0;
    float a = first;
    float b = min(first + h * max(offset, 0.02), last);
    int steps = int(params.up.w);
    for (int i = 0; i < steps && a < last && transmittance > 0.003; i += 2) {
        float c = min(b + h, last);
        float xa = 0.5 * (a + b);
        float xb = 0.5 * (b + c);
        vec3 qa = g.origin + g.direction * xa;
        vec3 qb = g.origin + g.direction * xb;
        vec4 va = texels(g, qa, 0.0);
        vec4 vb = texels(g, qb, 0.0);
        absorb(g, va, qa, (b - a) * span, radiance, transmittance);
        absorb(g, vb, qb, (c - b) * span, radiance, transmittance);
        a = c;
        b = min(c + h, last);
    }
    return vec4(radiance, 1.0 - transmittance);
}

void main() {
    vec2 across = (gl_FragCoord.xy - params.view.xy) / params.view.zw;
    vec2 at = vec2(across.x * 2.0 - 1.0, 1.0 - across.y * 2.0);
    vec3 ray = params.forward.xyz + at.x * params.right.xyz + at.y * params.up.xyz;
    float span = length(ray);   // world length per unit of view depth
    // The scene's view depth at this pixel, from the depth buffer's clip z / w.
    float near = params.eye.w;
    float far = params.forward.w;
    float stored = texelFetch(scene_depth, ivec2(gl_FragCoord.xy), 0).r;
    float scene = stored >= 1.0 ? far : far * near / (far - stored * (far - near));
    vec4 color;
#if GROUP
    members = int(params.right.w);
    d0 = meet(params.drawings.x, ray, near, scene);
    d1 = meet(params.drawings.y, ray, near, scene);
    d2 = meet(params.drawings.z, ray, near, scene);
    d3 = meet(params.drawings.w, ray, near, scene);
    float first = min(d0.enter, d1.enter);
    float last = max(d0.enter < never ? d0.leave : 0.0, d1.enter < never ? d1.leave : 0.0);
    if (members > 2 && d2.enter < never) {
        first = min(first, d2.enter);
        last = max(last, d2.leave);
    }
    if (members > 3 && d3.enter < never) {
        first = min(first, d3.enter);
        last = max(last, d3.leave);
    }
    if (first >= never) {
        discard;
    }
    color = march_group(first, last, span);
#else
    Drawing g0 = meet(params.drawings.x, ray, near, scene);
    if (g0.enter >= g0.leave) {
        discard;
    }
    color = march_one(g0, g0.enter, g0.leave, span);
#endif
    if (color.a <= 0.0 && color.rgb == vec3(0.0)) {
        discard;
    }
    fragment_color = color;
}
