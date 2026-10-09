// A Gaussian splat's quad (shade_quads): α = opacity · exp(-½ k² ρ²), ρ the
// quad coordinates' radius and k where the Gaussian falls to the alpha cull
// (the quad's edge, at most 3σ), clamped to 0.99, dropped under the cull, and
// premultiplied for Blend.over back to front. A record whose opacity is over
// 1 is a dot (a plain cloud's point, or Centers mode): round and opaque. A
// negative one is a merged splat of level of detail standing for members of
// summed opacity z = -opacity: they overlap at random, so they cover
// α = 1 - exp(-z exp(-½ 9 ρ²)), out to 3σ (the quad's edge) as each member
// does; a plain Gaussian of opacity min(z, 0.99) would show less where they
// pile up, and a wider one would spread past them.
#version 450
layout(location = 0) in vec4 vertex_color;
layout(location = 1) flat in vec4 data0;
layout(location = 0) out vec4 fragment_color;
layout(push_constant) uniform Params {
    float cull;
} params;

void main() {
    vec2 uv = vertex_color.xy;
    float r2 = dot(uv, uv);
    if (r2 > 1.0) discard;
    float opacity = data0.a;
    if (opacity > 1.5) {
        fragment_color = vec4(data0.rgb, 1.0);
        return;
    }
    float alpha;
    if (opacity < 0.0) {
        alpha = min(0.99, 1.0 - exp(opacity * exp(-4.5 * r2)));
    } else {
        float k2 = min(2.0 * log(opacity / params.cull), 9.0);
        alpha = min(0.99, opacity * exp(-0.5 * k2 * r2));
    }
    if (alpha < params.cull) discard;
    fragment_color = vec4(data0.rgb * alpha, alpha);
}
