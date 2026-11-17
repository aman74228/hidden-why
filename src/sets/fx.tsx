import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {useScene} from '../scene/ctx';
import {mulberry} from './toon';

// Atmosphere + particles shared by every set. All animation is a pure function
// of scene time (deterministic per frame, safe for Remotion).

/* ---------------- rain: streaks + ground splashes ---------------- */
export const RainFX: React.FC<{
  intensity: number;
  center?: [number, number, number];
  area?: number;
  splashY?: number;
  color?: string;
}> = ({intensity, center = [0, 0, 0], area = 9, splashY = 0.012, color = '#DCE6FF'}) => {
  const {t} = useScene();
  const ref = useRef<THREE.InstancedMesh>(null);
  const sref = useRef<THREE.InstancedMesh>(null);
  const N = 2200;
  const S = 260;
  const drops = useMemo(() => {
    const r = mulberry(21);
    return Array.from({length: N}, () => ({x: (r() - 0.5) * area * 2, z: (r() - 0.65) * area * 2, y: r() * 12, v: 11 + r() * 4, l: 0.25 + r() * 0.3}));
  }, [area]);
  const splashes = useMemo(() => {
    const r = mulberry(23);
    return Array.from({length: S}, () => ({x: (r() - 0.5) * area * 1.6, z: (r() - 0.7) * area * 1.6, ph: r(), rate: 1.6 + r() * 1.4}));
  }, [area]);
  const k = Math.max(0, Math.min(1, intensity));
  useLayoutEffect(() => {
    const m = ref.current;
    if (m) {
      const o = new THREE.Object3D();
      drops.forEach((d, i) => {
        const y = (((d.y - d.v * t) % 12) + 12) % 12;
        o.position.set(center[0] + d.x + y * 0.05, y, center[2] + d.z);
        o.rotation.set(0, 0, 0.05);
        o.scale.set(1, d.l / 0.4, 1);
        o.updateMatrix();
        m.setMatrixAt(i, o.matrix);
      });
      m.count = Math.round(N * k);
      m.instanceMatrix.needsUpdate = true;
    }
    const s = sref.current;
    if (s) {
      const o = new THREE.Object3D();
      splashes.forEach((p, i) => {
        const u = (t * p.rate + p.ph) % 1;
        const sc = 0.02 + u * 0.16;
        o.position.set(center[0] + p.x, splashY, center[2] + p.z);
        o.rotation.set(-Math.PI / 2, 0, 0);
        o.scale.set(sc, sc, sc);
        o.updateMatrix();
        s.setMatrixAt(i, o.matrix);
        s.setColorAt(i, new THREE.Color(color).multiplyScalar(1 - u));
      });
      s.count = Math.round(S * k);
      s.instanceMatrix.needsUpdate = true;
      if (s.instanceColor) s.instanceColor.needsUpdate = true;
    }
  }, [t, k, drops, splashes, center[0], center[2]]);
  if (k <= 0.001) return null;
  return (
    <>
      <instancedMesh ref={ref} args={[undefined, undefined, N]} frustumCulled={false}>
        <boxGeometry args={[0.01, 0.4, 0.01]} />
        <meshBasicMaterial color={color} transparent opacity={0.42} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={sref} args={[undefined, undefined, S]} frustumCulled={false}>
        <ringGeometry args={[0.8, 1, 20]} />
        <meshBasicMaterial transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} />
      </instancedMesh>
    </>
  );
};

/* ---------------- soft round sprite texture ---------------- */
let dot: THREE.CanvasTexture | null = null;
export const softDot = () => {
  if (dot) return dot;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.35, 'rgba(255,255,255,0.6)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  dot = new THREE.CanvasTexture(c);
  return dot;
};

/* ---------------- floating dust motes / embers / fireflies ---------------- */
export const Motes: React.FC<{
  count?: number;
  box: [number, number, number]; // size
  center: [number, number, number];
  color?: string;
  size?: number;
  rise?: number; // m/s upward drift (embers)
  seed?: number;
  opacity?: number;
}> = ({count = 120, box, center, color = '#FFE0A0', size = 0.05, rise = 0.04, seed = 3, opacity = 0.8}) => {
  const {t} = useScene();
  const geo = useMemo(() => new THREE.BufferGeometry(), []);
  const pts = useMemo(() => {
    const r = mulberry(seed);
    return Array.from({length: count}, () => ({x: r(), y: r(), z: r(), ph: r() * 6.28, sp: 0.5 + r()}));
  }, [count, seed]);
  useLayoutEffect(() => {
    const a = new Float32Array(count * 3);
    pts.forEach((p, i) => {
      const y = (p.y + (t * rise * p.sp) / box[1]) % 1;
      a[i * 3] = center[0] + (p.x - 0.5) * box[0] + Math.sin(t * 0.6 * p.sp + p.ph) * 0.15;
      a[i * 3 + 1] = center[1] + (y - 0.5) * box[1];
      a[i * 3 + 2] = center[2] + (p.z - 0.5) * box[2] + Math.cos(t * 0.5 * p.sp + p.ph) * 0.15;
    });
    geo.setAttribute('position', new THREE.BufferAttribute(a, 3));
  }, [t, pts]);
  return (
    <points geometry={geo} frustumCulled={false}>
      <pointsMaterial
        map={softDot()}
        color={color}
        size={size}
        sizeAttenuation
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
};

/* ---------------- volumetric-looking light beam ---------------- */
// A soft additive cone from `from` toward `to`; brighter at the source and on
// its axis. Dust motes float in it when `dust` is on.
const beamMat = (color: string, strength: number) =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {uColor: {value: new THREE.Color(color)}, uStrength: {value: strength}},
    vertexShader: `varying float vV; varying vec3 vN; varying vec3 vView;
      void main(){ vV = uv.y; vec4 mv = modelViewMatrix*vec4(position,1.0);
        vN = normalize(normalMatrix*normal); vView = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uStrength; varying float vV; varying vec3 vN; varying vec3 vView;
      void main(){ float edge = pow(abs(dot(vN, vView)), 1.6);
        float along = pow(vV, 1.4);
        gl_FragColor = vec4(uColor * uStrength * edge * along, 1.0); }`,
  });

export const LightBeam: React.FC<{
  from: [number, number, number];
  to: [number, number, number];
  r0?: number;
  r1?: number;
  color?: string;
  strength?: number;
  dust?: boolean;
}> = ({from, to, r0 = 0.25, r1 = 1.2, color = '#FFC873', strength = 0.35, dust = true}) => {
  const {t} = useScene();
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const len = a.distanceTo(b);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const q = useMemo(() => {
    const dir = b.clone().sub(a).normalize();
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
  }, [from.join(), to.join()]);
  const flicker = 0.92 + 0.08 * Math.sin(t * 1.3);
  const mat = useMemo(() => beamMat(color, strength), [color, strength]);
  mat.uniforms.uStrength.value = strength * flicker;
  return (
    <group>
      <mesh position={mid} quaternion={q} material={mat} renderOrder={5}>
        <cylinderGeometry args={[r0, r1, len, 32, 1, true]} />
      </mesh>
      {dust && <Motes count={70} box={[r1 * 1.2, len * 0.8, r1 * 1.2]} center={[mid.x, mid.y, mid.z]} color={color} size={0.035} rise={0.02} seed={Math.round(from[0] * 10 + 7)} />}
    </group>
  );
};

/* ---------------- spark burst (hammer impacts, coin taps) ---------------- */
export const Sparks: React.FC<{pos: [number, number, number]; times: number[]; color?: string; n?: number; speed?: number; life?: number}> = ({
  pos,
  times,
  color = '#FFD76A',
  n = 26,
  speed = 2.4,
  life = 0.45,
}) => {
  const {t} = useScene();
  const ps = useMemo(() => {
    const r = mulberry(13);
    return Array.from({length: n}, () => ({a: r() * Math.PI * 2, e: 0.2 + r() * 1.1, v: 0.4 + r(), s: 0.01 + r() * 0.015}));
  }, [n]);
  return (
    <group position={pos}>
      {times.map((t0, k) => {
        const s = t - t0;
        if (s < 0 || s > life) return null;
        const u = s / life;
        return ps.map((p, i) => (
          <mesh
            key={`${k}-${i}`}
            position={[Math.cos(p.a) * Math.cos(p.e) * p.v * speed * s, Math.sin(p.e) * p.v * speed * s - 4.5 * s * s, Math.sin(p.a) * Math.cos(p.e) * p.v * speed * s]}
          >
            <sphereGeometry args={[p.s * (1 - u * 0.7), 5, 4]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
        ));
      })}
    </group>
  );
};

/* ---------------- steam / mist puffs ---------------- */
export const Steam: React.FC<{center: [number, number, number]; spread?: number; amount?: number; color?: string; seed?: number}> = ({
  center,
  spread = 0.6,
  amount = 1,
  color = '#E8EEFF',
  seed = 9,
}) => {
  const {t} = useScene();
  const puffs = useMemo(() => {
    const r = mulberry(seed);
    return Array.from({length: 18}, () => ({x: (r() - 0.5) * spread, z: (r() - 0.5) * spread * 0.5, ph: r(), s: 0.25 + r() * 0.3}));
  }, [spread, seed]);
  if (amount <= 0.01) return null;
  return (
    <group position={center}>
      {puffs.map((p, i) => {
        const u = (t * 0.35 + p.ph) % 1;
        return (
          <sprite key={i} position={[p.x + Math.sin(u * 6 + i) * 0.06, u * 1.2, p.z]} scale={p.s * (0.5 + u)}>
            <spriteMaterial map={softDot()} color={color} transparent opacity={amount * 0.22 * Math.sin(u * Math.PI)} depthWrite={false} />
          </sprite>
        );
      })}
    </group>
  );
};
