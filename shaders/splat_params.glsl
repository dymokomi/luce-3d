// The per-view uniforms the splat kernels share (128 bytes of push constants):
// the camera in the cloud's pack frame (positions relative to its origin), the
// target's size and focal lengths in pixels, the cloud's layout and the look.
layout(push_constant) uniform Params {
    vec4 eye_near;     // eye x, y, z; near plane distance
    vec4 right_far;    // camera right; far plane distance
    vec4 up_fx;        // camera up; focal length in pixels along x
    vec4 forward_fy;   // view direction; focal length in pixels along y
    vec4 view;         // target width and height in pixels; EWA clamps of x/z and y/z
    uvec4 counts;      // splats; SH items stored per splat; SH items evaluated; flags
    vec4 look;         // alpha cull; splat scale; largest quad half axis in pixels; dot radius in pixels
    vec4 rotation;     // the placement's rotation (x, y, z, w), turning SH-frame directions to world
} p;

// counts.w flags.
const uint flag_srgb = 1u;     // colors and SH are sRGB-encoded: decode after adding the bands
const uint flag_frames = 2u;   // per-splat SH frames (restorient) are stored
const uint flag_centers = 4u;  // draw dots at the centers
const uint flag_splats = 8u;   // the cloud has orient, scale and opacity

// Workgroups of 256 splats in a 2D grid: the splat this invocation handles.
uint splat_index() {
    uint group = gl_WorkGroupID.y * gl_NumWorkGroups.x + gl_WorkGroupID.x;
    return group * 256u + gl_LocalInvocationID.x;
}

uint group_index() {
    return gl_WorkGroupID.y * gl_NumWorkGroups.x + gl_WorkGroupID.x;
}
