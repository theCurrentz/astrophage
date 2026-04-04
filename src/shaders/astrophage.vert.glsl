precision highp float;

/*
  RawShaderMaterial: Three.js does NOT prepend its standard chunks here.
  We must declare every uniform and attribute ourselves.

  Uniforms = values the CPU sends once per frame (same for all vertices).
  Attributes = per-vertex (or per-instance) data stored in GPU buffers.
  Varyings = outputs interpolated across each triangle for the fragment shader.
*/

uniform float uTime;
uniform mat4 modelViewMatrix;   // world → camera (eye) space
uniform mat4 projectionMatrix;  // eye space → clip space (perspective divide)

attribute vec3 position;  // quad corner in local space (−0.5 … 0.5)
attribute vec2 uv;        // texture coordinate (0 … 1)

// Per-instance data — one value per particle, not per vertex.
attribute vec3 aOffset;   // world-space center of this particle
attribute float aSize;    // billboard radius
attribute float aSeed;    // random phase so particles don't pulse in sync
attribute float aDensity; // brightness multiplier

varying vec2 vUv;
varying float vSeed;
varying float vDensity;
varying float vDepthFade;

void main() {
  vUv = uv;
  vSeed = aSeed;
  vDensity = aDensity;

  /*
    Gentle vertex-level wobble: each particle sways on its own phase.
    The amplitudes are tiny (0.02 units) so the motion reads as a calm drift.
  */
  float wobble = sin(uTime * 0.22 + aSeed * 0.02) * 0.008
               + cos(uTime * 0.18 + aSeed * 0.015) * 0.006;

  vec3 off = aOffset + vec3(wobble, wobble * 0.7, wobble * 0.5);

  /*
    Transform to eye (camera) space. In eye space the camera sits at the origin
    looking down −Z. We then offset by the quad's local position scaled by aSize.
    This is the "billboard" trick: the quad always faces the camera because we
    move its corners in screen-aligned XY.
  */
  vec4 mvPosition = modelViewMatrix * vec4(off, 1.0);
  mvPosition.xy += position.xy * aSize;

  /*
    Depth fade: particles far from the camera fade out, giving a sense of
    atmospheric depth (cheap fog). smoothstep(far, near, depth) returns 0 at
    `far` and 1 at `near`.
  */
  float vz = -mvPosition.z;
  vDepthFade = mix(0.15, 1.0, smoothstep(25.0, 1.0, vz));

  gl_Position = projectionMatrix * mvPosition;
}
