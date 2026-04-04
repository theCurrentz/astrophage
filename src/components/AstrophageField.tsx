import { useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, ToneMapping } from "@react-three/postprocessing";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { ToneMappingMode } from "postprocessing";
import vert from "../shaders/astrophage.vert.glsl";
import frag from "../shaders/astrophage.frag.glsl";
import { createSpaceParticles, stepParticles, type Particle } from "../systems/particleSystem";

type Props = { count: number; bloom: number };

/*
  Instanced rendering: the GPU draws one quad geometry thousands of times.
  Each "instance" reads its own aOffset/aSize/aSeed/aDensity from per-instance
  buffers. This is orders of magnitude faster than creating a separate mesh
  for every particle.
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

  /*
    RawShaderMaterial: we provide complete GLSL — Three.js does NOT inject
    its built-in shader chunks. This gives full control over every line of
    GPU code, which is ideal for learning how shaders really work.
  */
  const mat = useMemo(
    () =>
      new THREE.RawShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        uniforms: { uTime: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  useLayoutEffect(() => {
    particles.current = createSpaceParticles(count);
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
    off.needsUpdate = sz.needsUpdate = sd.needsUpdate = dn.needsUpdate = true;
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
        Post-processing pipeline:
        1. Bloom: extracts bright pixels, blurs them, adds back → glow halo
        2. ToneMapping: compresses HDR values to display range (ACES = filmic rolloff)
      */}
      <EffectComposer multisampling={0}>
        <Bloom intensity={bloom} luminanceThreshold={0.08} mipmapBlur radius={0.85} levels={7} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} whitePoint={5.0} middleGrey={0.6} />
      </EffectComposer>
    </>
  );
}
