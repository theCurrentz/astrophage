precision highp float;

uniform float uTime;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.02;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = vUv;
  float x = uv.x;
  float y = uv.y - 0.5;

  float t = uTime * 0.02;
  float bow = sin(x * 3.14159265 + t * 0.12) * 0.2;
  float wiggle = (fbm(vec2(x * 0.85 + t * 0.15, 2.1)) - 0.5) * 0.05;
  float arc = bow + wiggle;
  float w = 0.2 + fbm(vec2(x * 1.2, t)) * 0.05;
  float d = abs(y - arc);
  float core = exp(-d * d / (w * w)) * 0.55;
  float haze = exp(-d * d / ((w * 2.2) * (w * 2.2))) * 0.25;
  float intensity = core + haze;

  float edge = smoothstep(0.02, 0.12, x) * smoothstep(0.98, 0.88, x);
  intensity *= edge;

  float breathe = 0.92 + 0.08 * sin(uTime * 0.35 + x * 2.0);
  intensity *= breathe;

  vec3 deep = vec3(0.45, 0.02, 0.04);
  vec3 rim = vec3(0.95, 0.2, 0.18);
  vec3 col = mix(deep, rim, smoothstep(0.0, 0.45, intensity));

  float alpha = clamp(intensity * 1.15, 0.0, 1.0);
  if (alpha < 0.004) discard;

  gl_FragColor = vec4(col * intensity * 1.4, alpha);
}
