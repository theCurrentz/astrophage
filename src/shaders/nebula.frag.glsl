precision highp float;

/*
  Nebula / Lightning Arc Fragment Shader
  ======================================
  Creates a flowing, plasma-like red energy arc — the "astrophage cloud"
  visible in the reference images. Built entirely from layered noise:

  1. A base arc shape using a sine wave with noise displacement
  2. Multiple octaves of noise for fine detail (fractal Brownian motion)
  3. Edge glow that fades smoothly into black space
  4. Time animation for flowing, organic movement

  Key math concepts:
  - Simplex-like hash noise: cheap pseudo-random per pixel
  - fBm (fractal Brownian motion): stack noise at different scales
  - smoothstep: hardware-accelerated S-curve for soft edges
*/

uniform float uTime;
varying vec2 vUv;

/*
  Hash function: takes a 2D coordinate, returns a pseudo-random float in [0,1).
  Uses the classic dot-product-with-large-primes trick. The fract() keeps only
  the fractional part, which is effectively random for non-trivial inputs.
*/
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

/*
  2D value noise: interpolates random values at integer grid points.
  Steps:
    1. Find the integer cell corner (floor)
    2. Get the fractional position within the cell
    3. Smooth the fraction with a cubic curve (3f^2 - 2f^3) for C1 continuity
    4. Bilinear interpolation of the four corner hash values
*/
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

/*
  Fractal Brownian Motion (fBm): layers of noise at increasing frequency
  and decreasing amplitude. Each layer ("octave") adds finer detail.
  - frequency doubles each octave (lacunarity = 2.0)
  - amplitude halves each octave (gain = 0.5)
  Result: natural-looking turbulence.
*/
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  vec2 shift = vec2(100.0);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.0 + shift;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = vUv;

  /*
    Remap UV so the arc runs horizontally across the mesh.
    y is centered at 0 (range -0.5 to 0.5) for symmetric falloff.
  */
  float x = uv.x;
  float y = uv.y - 0.5;

  float t = uTime * 0.08;

  /*
    Arc backbone: a sine wave displaced by noise creates the main
    curved shape. The arc bends and flows over time.
  */
  float arcY = sin(x * 3.0 + t * 2.0) * 0.12
             + fbm(vec2(x * 2.0 + t, 0.5)) * 0.15 - 0.075;

  /*
    Distance from the arc center line. This drives the brightness
    falloff — pixels close to the arc are bright, far ones are dark.
  */
  float dist = abs(y - arcY);

  /*
    Turbulent detail: fBm at different scales adds the wispy,
    filamentary structure of plasma arcs.
  */
  float turb = fbm(vec2(x * 5.0 - t * 1.5, y * 4.0 + t)) * 0.6;
  float turb2 = fbm(vec2(x * 8.0 + t * 0.7, y * 6.0 - t * 0.5)) * 0.3;

  /*
    Combine distance and turbulence into a glow intensity.
    exp(-dist^2 / sigma) gives a gaussian glow profile.
    The turbulence modulates the width and brightness.
  */
  float glow = exp(-dist * dist / (0.008 + turb * 0.012)) * 0.6;
  float detail = exp(-dist * dist / (0.003 + turb2 * 0.005)) * 0.9;

  float intensity = glow + detail * 0.5;

  /*
    Edge vignette: fade out at the horizontal edges of the mesh
    so the arc doesn't end abruptly.
  */
  float edgeFade = smoothstep(0.0, 0.15, x) * smoothstep(1.0, 0.85, x);
  intensity *= edgeFade;

  /*
    Flickering: subtle brightness variation over time mimics
    the unstable, electrical nature of plasma.
  */
  float flicker = 0.85 + 0.15 * sin(uTime * 1.2 + x * 10.0);
  intensity *= flicker;

  /*
    Color: deep red base with hotter (pinkish) core.
    The core color appears where intensity is highest.
  */
  vec3 red = vec3(0.9, 0.02, 0.03);
  vec3 hotPink = vec3(1.0, 0.25, 0.15);
  vec3 color = mix(red, hotPink, intensity) * intensity * 2.0;

  float alpha = clamp(intensity * 1.5, 0.0, 1.0);
  if (alpha < 0.003) discard;

  gl_FragColor = vec4(color, alpha);
}
