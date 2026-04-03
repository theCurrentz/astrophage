precision highp float;

uniform float uTime;

varying vec2 vUv;
varying vec3 vViewDir;
varying float vSeed;
varying float vDensity;
varying float vDepthFade;

void main() {
  // Radial mask in UV space: quad is 0…1; center is 0.5,0.5 → soft circular sprite.
  float d = length(vUv - 0.5);
  float alpha = smoothstep(0.5, 0.0, d);

  // Rim emphasis: brighter at the silhouette (Fresnel-like, faked from UV radius here).
  float fresnel = pow(1.0 - smoothstep(0.0, 0.45, d), 3.0);

  // Phase varies per instance (vSeed) so the swarm does not blink in sync.
  float pulse = sin(uTime * 2.0 + vSeed * 0.01) * 0.5 + 0.5;
  float brightness = alpha * vDensity * pulse * (0.65 + fresnel * 0.85) * vDepthFade;

  // Subtle “heat” variation across the quad (stretch goal: localized hot zones).
  float heat = sin(vUv.x * 12.0 + vUv.y * 9.0 + uTime * 0.3) * 0.08 + 1.0;
  brightness *= heat;

  vec3 color = vec3(1.0, 0.1, 0.02) * brightness;

  // Fake occlusion hint: slightly darker toward card edges (vignette on the sprite).
  float edge = smoothstep(0.48, 0.2, min(abs(vUv.x - 0.5), abs(vUv.y - 0.5)) * 2.0);
  color *= mix(0.55, 1.0, edge);

  // Premultiplied-friendly alpha for additive blending in the material.
  gl_FragColor = vec4(color, alpha * 0.92 * vDepthFade);
}
