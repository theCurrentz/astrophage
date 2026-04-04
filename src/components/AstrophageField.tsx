import { useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, ToneMapping } from "@react-three/postprocessing";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { ToneMappingMode } from "postprocessing";
import vert from "../shaders/astrophage.vert.glsl";
import frag from "../shaders/astrophage.frag.glsl";
import {
  createSpaceParticles,
  resizeParticleArray,
  stepParticles,
  type Particle,
} from "../systems/particleSystem";

const MAX_INSTANCES = 12000;

type Props = { count: number; bloom: number };

export function AstrophageField({ count, bloom }: Props) {
  const particles = useRef<Particle[]>([]);
  const { clock } = useThree();

  const geom = useMemo(() => {
    const plane = new THREE.PlaneGeometry(1, 1);
    const g = new THREE.InstancedBufferGeometry();
    g.index = plane.index;
    g.setAttribute("position", plane.attributes.position);
    g.setAttribute("uv", plane.attributes.uv);

    const o = new Float32Array(MAX_INSTANCES * 3);
    const s = new Float32Array(MAX_INSTANCES);
    const sd = new Float32Array(MAX_INSTANCES);
    const dn = new Float32Array(MAX_INSTANCES);
    g.setAttribute("aOffset", new THREE.InstancedBufferAttribute(o, 3));
    g.setAttribute("aSize", new THREE.InstancedBufferAttribute(s, 1));
    g.setAttribute("aSeed", new THREE.InstancedBufferAttribute(sd, 1));
    g.setAttribute("aDensity", new THREE.InstancedBufferAttribute(dn, 1));
    g.instanceCount = MAX_INSTANCES;
    return g;
  }, []);

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
    const prev = particles.current;
    particles.current =
      prev.length === 0 ? createSpaceParticles(count) : resizeParticleArray(prev, count);
    const g = geom;
    g.instanceCount = count;
    const p = particles.current;
    const off = g.attributes.aOffset as THREE.InstancedBufferAttribute;
    const sz = g.attributes.aSize as THREE.InstancedBufferAttribute;
    const sd = g.attributes.aSeed as THREE.InstancedBufferAttribute;
    const dn = g.attributes.aDensity as THREE.InstancedBufferAttribute;
    for (let i = 0; i < count; i++) {
      off.setXYZ(i, p[i].position.x, p[i].position.y, p[i].position.z);
      sz.setX(i, p[i].size);
      sd.setX(i, p[i].seed);
      dn.setX(i, p[i].density);
    }
    off.needsUpdate = sz.needsUpdate = sd.needsUpdate = dn.needsUpdate = true;
  }, [count, geom]);

  useFrame((_, dt) => {
    const p = particles.current;
    if (!p.length || count === 0) return;
    stepParticles(p, dt, clock.elapsedTime);
    const off = geom.attributes.aOffset as THREE.InstancedBufferAttribute;
    for (let i = 0; i < count; i++) off.setXYZ(i, p[i].position.x, p[i].position.y, p[i].position.z);
    off.needsUpdate = true;
    mat.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <>
      <mesh geometry={geom} material={mat} frustumCulled={false} renderOrder={1} />
      <EffectComposer multisampling={0}>
        <Bloom intensity={bloom} luminanceThreshold={0.08} mipmapBlur radius={0.85} levels={7} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} whitePoint={5.0} middleGrey={0.6} />
      </EffectComposer>
    </>
  );
}
