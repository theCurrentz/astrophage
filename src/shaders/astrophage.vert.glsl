precision highp float;

// RawShaderMaterial: Three.js does not inject chunks; we declare matrices explicitly.
uniform float uTime;
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform vec3 cameraPosition;

attribute vec3 position;
attribute vec2 uv;
// Per-instance attributes (one row per particle). aOffset = world-space center of this quad.
attribute vec3 aOffset;
attribute float aSize;
attribute float aSeed;
attribute float aDensity;

// varyings pass data from vertex → fragment shader (interpolated across the triangle).
varying vec2 vUv;
varying vec3 vViewDir;
varying float vSeed;
varying float vDensity;
varying float vDepthFade;

void main() {
  vUv = uv;
  vSeed = aSeed;
  vDensity = aDensity;

  // Tiny procedural motion so particles feel alive even before CPU updates arrive.
  float wobble = sin(uTime * 1.4 + aSeed * 0.02) * 0.012
    + cos(uTime * 0.9 + aSeed * 0.015) * 0.008;

  vec3 off = aOffset + vec3(wobble, wobble * 0.6, wobble * 0.4);

  // modelViewMatrix transforms world → eye space (camera at origin looking down −Z).
  vec4 mvPosition = modelViewMatrix * vec4(off, 1.0);

  // Billboard in *view* space: offset quad corners along camera-right and camera-up.
  // Equivalent to “always face camera” without building a full rotation matrix per instance.
  mvPosition.xy += position.xy * aSize;

  vec3 worldPos = (modelMatrix * vec4(off, 1.0)).xyz;
  vViewDir = normalize(cameraPosition - worldPos);

  // Fade particles that are very far along −Z so depth reads as fog (cheap volumetric hint).
  float vz = -mvPosition.z;
  vDepthFade = mix(0.28, 1.0, smoothstep(4.5, 1.0, vz));

  // Clip space: GPU divides by W for perspective; gl_Position is required output.
  gl_Position = projectionMatrix * mvPosition;
}
