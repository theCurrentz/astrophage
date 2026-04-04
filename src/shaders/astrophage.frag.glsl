precision highp float;

/*
  Fragment shader: runs once per pixel covered by a quad.
  Its job: decide the final color and transparency of that pixel.

  Astrophage emit infrared radiation. In "Project Hail Mary" they glow
  deep red. We model each particle as a soft, bokeh-like disc with:
    - A bright hot core (white-ish center fading to deep red)
    - Smooth circular falloff (gaussian-ish)
    - Per-instance pulse so the swarm shimmers organically
*/

uniform float uTime;

varying vec2 vUv;
varying float vSeed;
varying float vDensity;
varying float vDepthFade;

void main() {
  /*
    Distance from quad center (UV 0.5, 0.5).
    This creates the circular shape on a square quad.
  */
  float d = length(vUv - 0.5) * 2.0;  // 0 at center, 1 at edge

  /*
    Bokeh shape: a wide gaussian falloff gives the soft out-of-focus
    look visible in the reference images. exp(-x^2) is the bell curve.
  */
  float bokeh = exp(-d * d * 3.5);

  /*
    Hot core: a tighter gaussian makes the very center brighter,
    mimicking the overexposed center of a bokeh highlight.
  */
  float core = exp(-d * d * 12.0);

  /*
    Per-instance pulse: each particle brightens and dims on its own cycle.
    The seed offsets the phase so neighbouring particles don't blink together.
  */
  float pulse = sin(uTime * 0.8 + vSeed * 0.03) * 0.15 + 0.85;

  float brightness = (bokeh * 0.7 + core * 1.2) * vDensity * pulse * vDepthFade;

  /*
    Color ramp: the core is hot (pinkish-white) and fades to deep red
    at the edges. mix() linearly interpolates between two colors.
    Deep red base = (1.0, 0.04, 0.0) — almost pure red channel.
    Hot core tint = (1.0, 0.35, 0.2) — adds warmth.
  */
  vec3 deepRed = vec3(1.0, 0.04, 0.0);
  vec3 hotCore = vec3(1.0, 0.4, 0.25);
  vec3 color = mix(deepRed, hotCore, core) * brightness;

  /*
    Alpha: the bokeh falloff drives transparency.
    Additive blending (set on the material) means alpha mostly controls
    how much this pixel contributes to the glow stack.
  */
  float alpha = bokeh * 0.85 * vDepthFade;

  /*
    Discard fully transparent fragments to save the GPU from blending
    invisible pixels (early-out optimization).
  */
  if (alpha < 0.005) discard;

  gl_FragColor = vec4(color, alpha);
}
