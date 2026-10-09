// A Gaussian splat's quad (shade_quads): α = opacity · exp(-½ k² ρ²), ρ the
// quad coordinates' radius and k where the Gaussian falls to the alpha cull
// (the quad's edge, at most 3σ), clamped to 0.99, dropped under the cull, and
// premultiplied for Blend.over back to front. Centers mode draws round opaque
// dots instead.
#version 450
layout(location = 0) in vec4 vertex_color;
layout(location = 1) flat in vec4 data0;
layout(location = 0) out vec4 fragment_color;
layout(push_constant) uniform Params {
    float cull;
    float centers;
} params;

void main() {
    vec2 uv = vertex_color.xy;
    float r2 = dot(uv, uv);
    if (r2 > 1.0) discard;
    if (params.centers > 0.5) {
        fragment_color = vec4(data0.rgb, 1.0);
        return;
    }
    float opacity = data0.a;
    float k2 = min(2.0 * log(opacity / params.cull), 9.0);
    float alpha = min(0.99, opacity * exp(-0.5 * k2 * r2));
    if (alpha < params.cull) discard;
    fragment_color = vec4(data0.rgb * alpha, alpha);
}
