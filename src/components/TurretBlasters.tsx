import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { interceptDirection } from "../systems/intercept";
import {
  AIM_SMOOTH,
  AIM_SPREAD,
  BOLT_SPEED,
  FIRE_COOLDOWN,
  MAX_BOLTS,
  MUZZLE_JITTER,
  TURRET_POSITIONS,
} from "../systems/turretConfig";

type Bolt = { pos: THREE.Vector3; vel: THREE.Vector3; life: number };

const _y = new THREE.Vector3(0, 1, 0);
const _tmpQ = new THREE.Quaternion();

export function TurretBlasters() {
  const { camera } = useThree();
  const prevCam = useRef(new THREE.Vector3().copy(camera.position));
  const shipVel = useRef(new THREE.Vector3());
  const smoothAim = useRef(TURRET_POSITIONS.map(() => new THREE.Vector3(0, 0, -1)));
  const fireT = useRef(TURRET_POSITIONS.map(() => Math.random() * FIRE_COOLDOWN));
  const bolts = useRef<Bolt[]>([]);
  const barrelRefs = useRef<(THREE.Group | null)[]>([]);
  const boltMesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const boltGeo = useMemo(() => new THREE.CylinderGeometry(0.035, 0.055, 1.05, 6), []);
  const boltMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#66e8ff", toneMapped: false }),
    [],
  );

  const tmp = useMemo(
    () => ({
      ideal: new THREE.Vector3(),
      lead: new THREE.Vector3(),
      jitter: new THREE.Vector3(),
      euler: new THREE.Euler(),
    }),
    [],
  );

  useFrame((_, dt) => {
    const pos = camera.position;
    const dtSafe = Math.max(dt, 1e-4);
    shipVel.current.subVectors(pos, prevCam.current).divideScalar(dtSafe);
    prevCam.current.copy(pos);

    const boltsArr = bolts.current;
    for (let i = boltsArr.length - 1; i >= 0; i--) {
      const b = boltsArr[i];
      b.pos.addScaledVector(b.vel, dt);
      b.life -= dt;
      if (b.life <= 0) boltsArr.splice(i, 1);
    }

    const smooth = 1 - Math.exp(-AIM_SMOOTH * dt);

    for (let ti = 0; ti < TURRET_POSITIONS.length; ti++) {
      const base = TURRET_POSITIONS[ti];
      const muzzle = tmp.lead.set(base[0], base[1] + 0.35, base[2]);
      interceptDirection(muzzle, pos, shipVel.current, BOLT_SPEED, tmp.ideal);
      tmp.ideal.x += (Math.random() - 0.5) * MUZZLE_JITTER;
      tmp.ideal.y += (Math.random() - 0.5) * MUZZLE_JITTER;
      tmp.ideal.z += (Math.random() - 0.5) * MUZZLE_JITTER;
      tmp.ideal.normalize();

      const sa = smoothAim.current[ti];
      sa.lerp(tmp.ideal, smooth);
      sa.normalize();

      const br = barrelRefs.current[ti];
      if (br) {
        _tmpQ.setFromUnitVectors(_y, sa);
        br.quaternion.slerp(_tmpQ, 0.35);
      }

      const toShip = tmp.jitter.subVectors(pos, muzzle);
      if (toShip.dot(sa) < 0.12) continue;

      fireT.current[ti] -= dt;
      if (fireT.current[ti] > 0 || boltsArr.length >= MAX_BOLTS) continue;
      fireT.current[ti] = FIRE_COOLDOWN + (Math.random() - 0.5) * 0.22;

      const spread = (Math.random() - 0.5) * 2 * AIM_SPREAD;
      const spread2 = (Math.random() - 0.5) * 2 * AIM_SPREAD;
      tmp.euler.set(spread2 * 0.65, spread, spread * 0.35);
      const dir = tmp.jitter.copy(sa).applyEuler(tmp.euler).normalize();

      boltsArr.push({
        pos: muzzle.clone().addScaledVector(dir, 0.45),
        vel: dir.multiplyScalar(BOLT_SPEED),
        life: 2.2,
      });
    }

    const inst = boltMesh.current;
    if (inst) {
      const n = Math.min(boltsArr.length, MAX_BOLTS);
      inst.count = n;
      for (let i = 0; i < n; i++) {
        const b = boltsArr[i];
        dummy.position.copy(b.pos);
        const v = b.vel;
        const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) || 1;
        dummy.quaternion.setFromUnitVectors(_y, tmp.lead.set(v.x / len, v.y / len, v.z / len));
        dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);
      }
      inst.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      {TURRET_POSITIONS.map((p, i) => (
        <group key={i} position={p}>
          <mesh position={[0, 0.15, 0]}>
            <boxGeometry args={[0.55, 0.35, 0.55]} />
            <meshBasicMaterial color="#4a5568" />
          </mesh>
          <group ref={(el) => (barrelRefs.current[i] = el)} position={[0, 0.32, 0.18]}>
            <mesh position={[0, 0.22, 0]}>
              <cylinderGeometry args={[0.11, 0.15, 0.48, 8]} />
              <meshBasicMaterial color="#5c6a7a" />
            </mesh>
          </group>
        </group>
      ))}
      <instancedMesh
        ref={boltMesh}
        args={[boltGeo, boltMat, MAX_BOLTS]}
        frustumCulled={false}
        renderOrder={2}
      />
    </group>
  );
}
