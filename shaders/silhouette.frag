// A selection contour from coverage, independent of triangulation or color.
#version 450
layout(location = 0) in vec4 vertex_color;
layout(location = 0) out vec4 fragment_color;
layout(set = 0, binding = 1) uniform sampler2D coverage;
layout(push_constant) uniform Params {
    vec4 view; // target placement and extent, physical pixels
    vec4 stroke; // mask texel size, radius in logical pixels, opacity threshold
} p;

float covered(vec2 uv) {
    if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return 0.0;
    return smoothstep(p.stroke.w - 0.03, p.stroke.w + 0.03, texture(coverage, uv).a);
}

void main() {
    vec2 uv = (gl_FragCoord.xy - p.view.xy) / p.view.zw;
    float center = covered(uv);
    float around = center;
    for (int y = -4; y <= 4; y++) {
        for (int x = -4; x <= 4; x++) {
            vec2 offset = vec2(x, y);
            float weight = clamp(p.stroke.z + 0.5 - length(offset), 0.0, 1.0);
            if (weight > 0.0) around = max(around, covered(uv + offset * p.stroke.xy) * weight);
        }
    }
    float alpha = max(0.0, around - center) * vertex_color.a;
    fragment_color = vec4(vertex_color.rgb * alpha, alpha);
}
