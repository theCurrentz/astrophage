precision highp float;

uniform float uTime;

varying vec2 vUv;
varying vec3 vViewDir;
varying float vSeed;
varying float vDensity;
varying float vDepthFade;

void main() {
  float d = length(vUv - 0.5);
  float alpha = smoothstep(0.5, 0.0, d);

  float fresnel = pow(1.0 - smoothstep(0.0, 0.45, d), 3.0);

  float pulse = sin(uTime * 2.0 + vSeed * 0.01) * 0.5 + 0.5;
  float brightness = alpha * vDensity * pulse * (0.65 + fresnel * 0.85) * vDepthFade;

  float heat = sin(vUv.x * 12.0 + vUv.y * 9.0 + uTime * 0.3) * 0.08 + 1.0;
  brightness *= heat;

  vec3 color = vec3(1.0, 0.1, 0.02) * brightness;

  float edge = smoothstep(0.48, 0.2, min(abs(vUv.x - 0.5), abs(vUv.y - 0.5)) * 2.0);
  color *= mix(0.55, 1.0, edge);

  gl_FragColor = vec4(color, alpha * 0.92 * vDepthFade);
}
