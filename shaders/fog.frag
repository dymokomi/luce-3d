// A fog volume's slab, ray-marched (src/renderers/fog_volume.lucb draws them).
//
// The volume is a dense box of texels, its z slices tiled side by side in one
// rgba16_float atlas (image 1): r the density, g the optical depth toward the key
// light, b the optical depth toward the sky (+Y), both integrated through the
// densities on the CPU when the volume was made. The box is drawn as view-aligned
// slabs, back to front; each fragment of a slab marches its stretch of the eye ray,
// from the slab's plane to the next one's, front to back, and emits that stretch's
// color and coverage premultiplied, so the slabs composite "over" one another and
// over the scene. Slabs are depth tested without writing depth: a mesh in front
// hides them, and they fog what lies behind.
//
// The vertex color is the fragment's position on the slab's plane in the box's
// coordinates (0..1 across it); distances along the ray are in world units through
// `scale`, the world length of the box's three axes.
#version 450
layout(location = 0) in vec4 vertex_color;
layout(location = 0) out vec4 fragment_color;
layout(push_constant) uniform Params {
    vec4 eye;       // the eye in box coordinates; w the slab thickness in world units, along the view axis
    vec4 forward;   // the view axis as box coordinates' depth gradient (depth = dot(p - eye, forward)); w steps per slab
    vec4 scale;     // world length of the box's x, y and z; w the density scale
    vec4 light;     // the key light's direction as box coordinates' dot gradient; w the phase anisotropy (-0.9..0.9)
    vec4 light_color; // the key light's color times intensity; w the ambient (sky) intensity
    vec4 color;     // the smoke's scattering color, or the emitted color; w 1 for emission, 0 for smoke
    vec4 atlas;     // texels across the box: x, y, z; w atlas columns
    vec4 size;      // the atlas's width and height in texels; z the step jitter's seed
} params;
layout(set = 0, binding = 1) uniform sampler2D volume;

const float pi = 3.14159265358979;

// The box's texels at `q` (0..1 across the box): bilinear within a z slice of the
// atlas (texel centers clamped inside the slice's tile, so tiles never bleed), and
// linear between the two nearest slices.
vec4 texels(vec3 q) {
    vec3 t = q * params.atlas.xyz - 0.5;
    vec2 xy = clamp(t.xy, vec2(0.0), params.atlas.xy - 1.0) + 0.5;
    float z = clamp(t.z, 0.0, params.atlas.z - 1.0);
    float z0 = floor(z);
    float z1 = min(z0 + 1.0, params.atlas.z - 1.0);
    float columns = params.atlas.w;
    vec2 tile0 = vec2(mod(z0, columns), floor(z0 / columns)) * params.atlas.xy;
    vec2 tile1 = vec2(mod(z1, columns), floor(z1 / columns)) * params.atlas.xy;
    vec4 a = textureLod(volume, (tile0 + xy) / params.size.xy, 0.0);
    vec4 b = textureLod(volume, (tile1 + xy) / params.size.xy, 0.0);
    return mix(a, b, z - z0);
}

// Interleaved gradient noise (Jimenez 2014): a per-pixel offset in 0..1 that
// turns step banding into fine noise.
float jitter(vec2 pixel) {
    return fract(52.9829189 * fract(dot(pixel + params.size.z, vec2(0.06711056, 0.00583715))));
}

void main() {
    vec3 start = vertex_color.xyz;
    vec3 ray = start - params.eye.xyz;
    float depth = dot(ray, params.forward.xyz);
    if (depth <= 0.0) {
        discard;
    }
    // The ray is eye + ray * s; the slab's plane is s = 1, the next plane s = 1 + T / depth.
    float steps = params.forward.w;
    float ds = params.eye.w / depth / steps;
    float span = length(ray * params.scale.xyz);
    float step_length = span * ds;
    float density_scale = params.scale.w;
    bool emission = params.color.w > 0.5;
    // Henyey-Greenstein, scaled so isotropic scattering is 1.
    float g = params.light.w;
    float cosine = dot(ray, params.light.xyz) / max(span, 1e-20);
    float phase = (1.0 - g * g) / pow(max(1.0 + g * g - 2.0 * g * cosine, 1e-6), 1.5);
    vec3 key = params.light_color.rgb * phase;
    float ambient = params.light_color.w;
    vec3 radiance = vec3(0.0);
    float transmittance = 1.0;
    float offset = jitter(gl_FragCoord.xy);
    for (float i = 0.0; i < steps; i += 1.0) {
        vec3 q = params.eye.xyz + ray * (1.0 + (i + offset) * ds);
        if (any(lessThan(q, vec3(0.0))) || any(greaterThan(q, vec3(1.0)))) {
            continue;
        }
        vec4 s = texels(q);
        float sigma = s.r * density_scale;
        if (sigma <= 0.0) {
            continue;
        }
        float alpha = 1.0 - exp(-sigma * step_length);
        vec3 lit = emission ? params.color.rgb
                            : params.color.rgb * (key * exp(-s.g * density_scale) + ambient * exp(-s.b * density_scale));
        radiance += transmittance * alpha * lit;
        transmittance *= 1.0 - alpha;
    }
    float coverage = 1.0 - transmittance;
    if (coverage <= 0.0) {
        discard;
    }
    fragment_color = vec4(radiance, coverage);
}
