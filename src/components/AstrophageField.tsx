import { useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, ToneMapping } from "@react-three/postprocessing";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { ToneMappingMode } from "postprocessing";
import vert from "../shaders/astrophage.vert.glsl";
import frag from "../shaders/astrophage.frag.glsl";
import { createBandParticles, stepParticles, type Particle } from "../systems/particleSystem";

type Props = {
  count: number;
  bloom: number;
};

/**
 * Draws thousands of **instanced** quads in one draw call.
 *
 * **Instancing:** GPU repeats the same triangle list `instanceCount` times. Each instance
 * reads different attributes (offset, size, …). Much faster than one mesh per particle.
 *
 * Particles live in **world space** at the origin; the camera moves through them (FPS controls).
 *
 * **RawShaderMaterial:** we supply full GLSL (Three’s built-in chunks are not prepended).
 */
export function AstrophageField({ count, bloom }: Props) {
  const mesh = useRef<THREE.Mesh>(null);
  const particles = useRef<Particle[]>([]);
  const { clock } = useThree();

  const geom = useMemo(() => {
    const plane = new THREE.PlaneGeometry(1, 1);
    const g = new THREE.InstancedBufferGeometry();
    g.index = plane.index;
    g.setAttribute("position", plane.attributes.position);
    g.setAttribute("uv", plane.attributes.uv);
    const o = new Float32Array(count * 3);
    const s = new Float32Array(count);
    const sd = new Float32Array(count);
    const dn = new Float32Array(count);
    g.setAttribute("aOffset", new THREE.InstancedBufferAttribute(o, 3));
    g.setAttribute("aSize", new THREE.InstancedBufferAttribute(s, 1));
    g.setAttribute("aSeed", new THREE.InstancedBufferAttribute(sd, 1));
    g.setAttribute("aDensity", new THREE.InstancedBufferAttribute(dn, 1));
    g.instanceCount = count;
    return g;
  }, [count]);

  const mat = useMemo(
    () =>
      new THREE.RawShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        uniforms: { uTime: { value: 0 } },
        transparent: true,
        // Additive glow: skip depth write so layers stack visually (ordering is approximate).
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  useLayoutEffect(() => {
    particles.current = createBandParticles(count);
    const g = mesh.current?.geometry as THREE.InstancedBufferGeometry | undefined;
    if (!g) return;
    const p = particles.current;
    const off = g.attributes.aOffset as THREE.InstancedBufferAttribute;
    const sz = g.attributes.aSize as THREE.InstancedBufferAttribute;
    const sd = g.attributes.aSeed as THREE.InstancedBufferAttribute;
    const dn = g.attributes.aDensity as THREE.InstancedBufferAttribute;
    for (let i = 0; i < p.length; i++) {
      off.setXYZ(i, p[i].position.x, p[i].position.y, p[i].position.z);
      sz.setX(i, p[i].size);
      sd.setX(i, p[i].seed);
      dn.setX(i, p[i].density);
    }
    off.needsUpdate = true;
    sz.needsUpdate = true;
    sd.needsUpdate = true;
    dn.needsUpdate = true;
  }, [count]);

  useFrame((_, dt) => {
    const p = particles.current;
    if (!p.length) return;
    stepParticles(p, dt, clock.elapsedTime);
    const off = mesh.current?.geometry.attributes.aOffset as THREE.InstancedBufferAttribute | undefined;
    if (!off) return;
    for (let i = 0; i < p.length; i++) off.setXYZ(i, p[i].position.x, p[i].position.y, p[i].position.z);
    off.needsUpdate = true;
    mat.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <>
      <mesh ref={mesh} geometry={geom} material={mat} frustumCulled={false} renderOrder={1} />
      {/*
        Post stack runs after the scene render:
        - Bloom: blur bright pixels and add them back → glow / “volumetric” read.
        - Tone mapping: squeeze HDR brightness into display range (ACES filmic = film-like rolloff).
      */}
      <EffectComposer multisampling={0}>
        <Bloom intensity={bloom} luminanceThreshold={0.15} mipmapBlur radius={0.92} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} whitePoint={4.2} middleGrey={0.62} />
      </EffectComposer>
    </>
  );
}
