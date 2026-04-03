precision highp float;

uniform float uTime;
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform vec3 cameraPosition;

attribute vec3 position;
attribute vec2 uv;
attribute vec3 aOffset;
attribute float aSize;
attribute float aSeed;
attribute float aDensity;

varying vec2 vUv;
varying vec3 vViewDir;
varying float vSeed;
varying float vDensity;
varying float vDepthFade;

void main() {
  vUv = uv;
  vSeed = aSeed;
  vDensity = aDensity;

  float wobble = sin(uTime * 1.4 + aSeed * 0.02) * 0.012
    + cos(uTime * 0.9 + aSeed * 0.015) * 0.008;

  vec3 off = aOffset + vec3(wobble, wobble * 0.6, wobble * 0.4);

  vec4 mvPosition = modelViewMatrix * vec4(off, 1.0);
  mvPosition.xy += position.xy * aSize;

  vec3 worldPos = (modelMatrix * vec4(off, 1.0)).xyz;
  vViewDir = normalize(cameraPosition - worldPos);

  float vz = -mvPosition.z;
  vDepthFade = mix(0.28, 1.0, smoothstep(4.5, 1.0, vz));

  gl_Position = projectionMatrix * mvPosition;
}
