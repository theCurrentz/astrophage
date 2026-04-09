precision highp float;

/*
  Simple pass-through vertex shader for a fullscreen-ish mesh.
  The nebula arc is drawn on a large plane that always faces the camera.
  UV coordinates are passed to the fragment shader where all the
  visual magic happens via procedural noise.
*/

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

attribute vec3 position;
attribute vec2 uv;

varying vec2 vUv;

void main() {
  vUv = uv;
  float u = position.x + 0.5;
  float bow = sin(u * 3.14159265) * 0.18;
  vec3 pos = vec3(position.x, position.y + bow, position.z);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
