import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useScene} from '../scene/ctx';
import {C} from '../theme';
import {LightBeam, Motes, Sparks, Steam} from './fx';
import {TexToon, hotIron} from './materials';
import {Ball, Box, Cyl, Toon, mulberry, toonRamp} from './toon';
import {Ground, Lantern, PlantPot, TBox, TCyl} from './world';

// Short #2 (02-damascus-steel): Vik's lab, museum case, ore hillside, and the
// story props (watered-steel sabre, trophy, billets, crucibles, ore grit).
// Everything animates as a pure function of scene time.

type V3 = [number, number, number];
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (x: number) => {
  const k = clamp01(x);
  return k * k * (3 - 2 * k);
};

/* =================================================================== */
/* textures (canvas, deterministic)                                    */
/* =================================================================== */
const rng = (seed: number) => mulberry(seed);

// smooth value noise
const makeNoise = (seed: number) => {
  const r = rng(seed);
  const P = 256;
  const g = Array.from({length: P * P}, () => r());
  const at = (x: number, y: number) => g[(((y % P) + P) % P) * P + (((x % P) + P) % P)];
  return (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const fx = x - xi, fy = y - yi;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
};

const texCache = new Map<string, THREE.CanvasTexture>();
const canvasTex = (key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, srgb = true) => {
  const hit = texCache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  texCache.set(key, t);
  return t;
};

// "Watered" wootz pattern: flowing light/dark bands, domain-warped like water
// ripples / wood grain. `contrast` 0..1 (0 = blank steel).
const wateredPixels = (g: CanvasRenderingContext2D, w: number, h: number, light: number[], dark: number[], scale = 1, seed = 5) => {
  const n1 = makeNoise(seed), n2 = makeNoise(seed + 7), n3 = makeNoise(seed + 13);
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = (x / w) * 14 * scale, v = (y / h) * 3.5 * scale;
      const warp = n1(u * 0.9, v * 0.9) * 3.2 + n2(u * 2.1 + 9, v * 2.1) * 1.2;
      const f = Math.sin((v * 2.6 + warp * 1.7 + n3(u * 0.35, v * 0.35) * 4) * Math.PI * 1.3);
      let k = 0.5 + 0.5 * f;
      k = Math.pow(k, 1.6);
      const grain = (n2(u * 9, v * 9) - 0.5) * 0.12;
      const i = (y * w + x) * 4;
      for (let ch = 0; ch < 3; ch++) img.data[i + ch] = Math.max(0, Math.min(255, dark[ch] + (light[ch] - dark[ch]) * (k + grain)));
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
};

export const wootzTex = () => canvasTex('wootz', 1024, 192, (g, w, h) => wateredPixels(g, w, h, [212, 216, 224], [92, 96, 110]));
const blankSteelTex = () =>
  canvasTex('blank-steel', 512, 96, (g, w, h) => {
    const n = makeNoise(31);
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const k = 0.5 + (n(x / 18, y / 4) - 0.5) * 0.08;
        const i = (y * w + x) * 4;
        img.data[i] = 150 + 40 * k;
        img.data[i + 1] = 154 + 40 * k;
        img.data[i + 2] = 166 + 40 * k;
        img.data[i + 3] = 255;
      }
    g.putImageData(img, 0, 0);
  });
// folded / pattern-welded billet: STRAIGHT, even stripes
const foldedTex = (hot = false) =>
  canvasTex(`folded-${hot}`, 512, 256, (g, w, h) => {
    const n = makeNoise(41);
    const stripes = 14;
    for (let i = 0; i < stripes; i++) {
      g.fillStyle = hot ? (i % 2 ? '#FFC060' : '#E06A20') : i % 2 ? '#D6DAE2' : '#5E6272';
      g.fillRect(0, (i * h) / stripes, w, h / stripes + 1);
    }
    const img = g.getImageData(0, 0, w, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const k = (n(x / 20, y / 6) - 0.5) * 20;
        for (let ch = 0; ch < 3; ch++) img.data[i + ch] = Math.max(0, Math.min(255, img.data[i + ch] + k));
      }
    g.putImageData(img, 0, 0);
  });

// glowing hot steel with flowing bands that appear with hammering (`k` 0..1)
const hotBandsTex = () => canvasTex('hot-bands', 512, 512, (g, w, h) => wateredPixels(g, w, h, [255, 214, 120], [176, 46, 8], 0.8, 9));

const textTex = (key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => canvasTex(key, w, h, (g) => draw(g));
const FONT_STACK = "bold %dpx 'Baloo 2', 'DejaVu Sans', Arial, sans-serif";
const font = (px: number) => FONT_STACK.replace('%d', String(px));

/* =================================================================== */
/* sabre (shamshir)                                                     */
/* =================================================================== */
// Curved blade in local XY: grip at the origin, blade along +x, curving up (+y)
// towards the tip. ~0.85 m blade.
const BLADE_L = 0.85;
const bladeGeo = (() => {
  let cache: THREE.ExtrudeGeometry | null = null;
  return () => {
    if (cache) return cache;
    const n = 40;
    const top: THREE.Vector2[] = [];
    const bot: THREE.Vector2[] = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const x = u * BLADE_L;
      const cy = 0.16 * u * u; // strong curve towards the tip
      const w = 0.038 * (1 - Math.pow(u, 4) * 0.92) + 0.002;
      top.push(new THREE.Vector2(x, cy + w * 0.45));
      bot.push(new THREE.Vector2(x, cy - w * 0.55));
    }
    const s = new THREE.Shape();
    s.moveTo(bot[0].x, bot[0].y);
    bot.forEach((p) => s.lineTo(p.x, p.y));
    for (let i = top.length - 1; i >= 0; i--) s.lineTo(top[i].x, top[i].y);
    const g = new THREE.ExtrudeGeometry(s, {depth: 0.004, bevelEnabled: true, bevelThickness: 0.0025, bevelSize: 0.0035, bevelSegments: 2, curveSegments: 4});
    g.translate(0, 0, -0.002);
    // UVs along the blade (u = x / length, v = across the blade incl. the curve)
    const pos = g.attributes.position as THREE.BufferAttribute;
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      const u = x / BLADE_L;
      uv.setXY(i, u, (y - 0.16 * u * u + 0.03) / 0.06);
    }
    uv.needsUpdate = true;
    g.computeVertexNormals();
    cache = g;
    return g;
  };
})();

export type BladeLook = 'wootz' | 'blank' | 'folded' | 'gold';
const BladeMat: React.FC<{look: BladeLook; sheen?: number}> = ({look, sheen = 0.5}) => {
  if (look === 'gold') return <meshStandardMaterial color="#F0C048" metalness={0.85} roughness={0.22} envMapIntensity={1.1} />;
  // toon-shaded with the pattern texture: PBR + HDRI + spot washed the pattern out to chrome up close
  const map = look === 'wootz' ? wootzTex() : look === 'folded' ? foldedTex() : blankSteelTex();
  return <meshToonMaterial map={map} color="#ffffff" gradientMap={toonRamp()} emissive="#ffffff" emissiveMap={map} emissiveIntensity={0.18 * (sheen + 0.5)} />;
};

export const Sabre: React.FC<{pos?: V3; rot?: V3; s?: number; look?: BladeLook; hilt?: boolean; sheen?: number}> = ({
  pos = [0, 0, 0],
  rot = [0, 0, 0],
  s = 1,
  look = 'wootz',
  hilt = true,
  sheen,
}) => (
  <group position={pos} rotation={rot} scale={s}>
    <mesh geometry={bladeGeo()} castShadow receiveShadow>
      <BladeMat look={look} sheen={sheen} />
    </mesh>
    {hilt && (
      <>
        {/* plain steel crossguard + langets */}
        <mesh position={[-0.01, 0, 0]} castShadow>
          <boxGeometry args={[0.022, 0.15, 0.03]} />
          <meshStandardMaterial color="#9AA0B0" metalness={0.6} roughness={0.35} envMapIntensity={0.6} />
        </mesh>
        {[-1, 1].map((sd) => (
          <mesh key={sd} position={[-0.01, sd * 0.078, 0]}>
            <sphereGeometry args={[0.014, 10, 8]} />
            <meshStandardMaterial color="#9AA0B0" metalness={0.6} roughness={0.35} envMapIntensity={0.6} />
          </mesh>
        ))}
        {/* dark horn grip, bent pommel */}
        <mesh position={[-0.085, -0.004, 0]} rotation={[0, 0, Math.PI / 2 + 0.08]} castShadow>
          <cylinderGeometry args={[0.017, 0.015, 0.14, 12]} />
          <meshStandardMaterial color="#3A2420" roughness={0.55} metalness={0.05} />
        </mesh>
        <mesh position={[-0.165, -0.018, 0]} rotation={[0, 0, Math.PI / 2 + 0.6]}>
          <cylinderGeometry args={[0.02, 0.016, 0.04, 12]} />
          <meshStandardMaterial color="#9AA0B0" metalness={0.6} roughness={0.35} envMapIntensity={0.6} />
        </mesh>
      </>
    )}
  </group>
);

/* =================================================================== */
/* small story props                                                    */
/* =================================================================== */
const goldMat = <meshStandardMaterial color="#F2BE3C" metalness={0.85} roughness={0.25} envMapIntensity={1.2} />;

// Vik's trophy: gold cup on a black base, engraved "VIK #1". `melt` 0..1 slumps it.
export const Trophy: React.FC<{pos?: V3; rotY?: number; s?: number; melt?: number; drop?: number}> = ({pos = [0, 0, 0], rotY = 0, s = 1, melt = 0, drop = 0}) => {
  const cup = useMemo(() => {
    const pts = [
      [0.0, 0.0], [0.035, 0.0], [0.03, 0.02], [0.016, 0.05], [0.016, 0.11], [0.03, 0.125], [0.075, 0.15], [0.1, 0.2], [0.112, 0.27], [0.106, 0.275], [0.094, 0.21], [0.0, 0.2],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, 32);
  }, []);
  const plate = textTex('vik1', 256, 96, (g) => {
    g.fillStyle = '#C9A040';
    g.fillRect(0, 0, 256, 96);
    g.strokeStyle = '#7A5A18';
    g.lineWidth = 6;
    g.strokeRect(6, 6, 244, 84);
    g.fillStyle = '#3A2A10';
    g.font = font(58);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('VIK #1', 128, 52);
  });
  const m = smooth(melt);
  return (
    <group position={[pos[0], pos[1] + drop, pos[2]]} rotation={[0, rotY, 0]} scale={s}>
      {melt < 0.98 && (
        <>
          <mesh position={[0, 0.045, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.16, 0.09, 0.16]} />
            <meshStandardMaterial color="#26243A" roughness={0.3} metalness={0.2} />
          </mesh>
          <mesh position={[0, 0.045, 0.0815]}>
            <planeGeometry args={[0.13, 0.05]} />
            <meshStandardMaterial map={plate} metalness={0.5} roughness={0.35} />
          </mesh>
        </>
      )}
      <group position={[0, 0.09 - m * 0.12, 0]} scale={[1 + m * 0.6, Math.max(0.05, 1 - m * 0.95), 1 + m * 0.6]} rotation={[0, 0, m * 0.25]}>
        <mesh geometry={cup} castShadow>
          {melt > 0 ? <meshStandardMaterial color="#FFC860" emissive="#FF7A20" emissiveIntensity={m * 1.4} metalness={0.7} roughness={0.3} /> : goldMat}
        </mesh>
        {/* handles */}
        {melt < 0.5 &&
          [-1, 1].map((sd) => (
            <mesh key={sd} position={[sd * 0.115, 0.215, 0]} rotation={[0, 0, sd * 0.2]}>
              <torusGeometry args={[0.035, 0.008, 8, 16, Math.PI * 1.2]} />
              {goldMat}
            </mesh>
          ))}
      </group>
    </group>
  );
};

// rectangular bar/billet; looks: folded (straight stripes), hot-folded, pure (shiny + label)
export const Billet: React.FC<{pos?: V3; rot?: V3; size?: V3; look: 'folded' | 'hot-folded' | 'pure'; label?: boolean}> = ({pos = [0, 0, 0], rot = [0, 0, 0], size = [0.32, 0.04, 0.08], look, label}) => {
  const lab = textTex('fe', 256, 128, (g) => {
    g.fillStyle = '#FFFFFF';
    g.fillRect(0, 0, 256, 128);
    g.fillStyle = '#1F9E95';
    g.fillRect(0, 0, 256, 26);
    g.fillStyle = '#1C1838';
    g.font = font(56);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('99.99% Fe', 128, 78);
  });
  return (
    <group position={pos} rotation={rot}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        {look === 'pure' ? (
          <meshStandardMaterial color="#D8DEE8" metalness={0.75} roughness={0.12} envMapIntensity={1.3} />
        ) : look === 'hot-folded' ? (
          <meshBasicMaterial map={foldedTex(true)} color={new THREE.Color('#ffffff').multiplyScalar(1.3)} toneMapped={false} />
        ) : (
          <meshStandardMaterial map={foldedTex()} metalness={0.3} roughness={0.45} envMapIntensity={0.5} />
        )}
      </mesh>
      {label && (
        <mesh position={[0, size[1] / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[size[0] * 0.5, size[0] * 0.25]} />
          <meshBasicMaterial map={lab} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
};

// clay crucible: closed pot (glow 0..1), or cracked open (open 0..1) showing the cake inside
export const Crucible: React.FC<{pos?: V3; s?: number; glow?: number; open?: number; cake?: 'plain' | 'none' | 'molten'}> = ({pos = [0, 0, 0], s = 1, glow = 0, open = 0, cake = 'plain'}) => {
  const k = smooth(open);
  const clay = new THREE.Color('#B8754A').lerp(new THREE.Color('#E8803A'), glow * 0.55);
  const half = (sd: number) => (
    <group position={[sd * k * 0.09, 0, 0]} rotation={[0, 0, -sd * k * 0.9]}>
      <mesh position={[0, 0.06, 0]} castShadow>
        <cylinderGeometry args={[0.042, 0.058, 0.12, 20, 1, false, sd > 0 ? 0 : Math.PI, Math.PI]} />
        <meshStandardMaterial color={clay} emissive="#FF6A1A" emissiveIntensity={glow * 0.3} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.128, 0]}>
        <sphereGeometry args={[0.043, 16, 8, sd > 0 ? 0 : Math.PI, Math.PI, 0, Math.PI / 2]} />
        <meshStandardMaterial color={clay} emissive="#FF6A1A" emissiveIntensity={glow * 0.3} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
  return (
    <group position={pos} scale={s}>
      {half(-1)}
      {half(1)}
      {cake !== 'none' && open > 0.05 && <WootzCake pos={[0, 0.0, 0]} s={0.95} look={cake === 'molten' ? 'hot' : 'plain'} />}
      {glow > 0.05 && <pointLight position={[0, 0.1, 0.1]} color="#FF8A3A" intensity={glow * 0.8} distance={1.2} decay={2} />}
    </group>
  );
};

// wootz "cake": palm-sized round puck with a crusty top
export const WootzCake: React.FC<{pos?: V3; s?: number; look?: 'plain' | 'hot'; rot?: V3}> = ({pos = [0, 0, 0], s = 1, look = 'plain', rot = [0, 0, 0]}) => {
  const geo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.05, 0.052, 0.03, 28, 2);
    const p = g.attributes.position as THREE.BufferAttribute;
    const n = makeNoise(77);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      if (y > 0) p.setY(i, y + (n(x * 90 + 5, z * 90 + 5) - 0.5) * 0.012 + 0.004 * (1 - (x * x + z * z) / 0.0025));
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={geo} position={[pos[0], pos[1] + 0.015 * s, pos[2]]} rotation={rot} scale={s} castShadow receiveShadow>
      {look === 'hot' ? (
        <meshBasicMaterial map={hotIron()} color={new THREE.Color('#ffffff').multiplyScalar(1.3)} toneMapped={false} />
      ) : (
        <meshStandardMaterial color="#4A4650" metalness={0.45} roughness={0.7} envMapIntensity={0.5} />
      )}
    </mesh>
  );
};

/* =================================================================== */
/* stylised 3D hand (inserts): palm up, fingers open with `open` 0..1   */
/* =================================================================== */
export const Hand: React.FC<{pos?: V3; rot?: V3; s?: number; open?: number; point?: boolean; skin?: string; sleeve?: string}> = ({
  pos = [0, 0, 0],
  rot = [0, 0, 0],
  s = 1,
  open = 1,
  point,
  skin = '#B07650',
  sleeve = '#F1E7D2',
}) => {
  const curl = (1 - smooth(open)) * 1.5;
  const fingers = [
    {x: -0.03, len: 0.075},
    {x: -0.01, len: 0.085},
    {x: 0.01, len: 0.08},
    {x: 0.03, len: 0.065},
  ];
  return (
    <group position={pos} rotation={rot} scale={s}>
      {/* sleeve (cream shawl cuff) + wrist */}
      <mesh position={[0, -0.005, 0.16]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.06, 0.16, 18]} />
        <Toon color={sleeve} />
      </mesh>
      <mesh position={[0, 0, 0.075]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.032, 0.036, 0.06, 16]} />
        <Toon color={skin} />
      </mesh>
      {/* palm (cupped) */}
      <mesh position={[0, 0, 0]} scale={[1, 0.45, 1.05]} castShadow receiveShadow>
        <sphereGeometry args={[0.052, 24, 16]} />
        <Toon color={skin} />
      </mesh>
      {fingers.map((f, i) => {
        const c = point ? (i === 0 ? 0 : 1.6) : curl;
        return (
          <group key={i} position={[f.x, 0.006, -0.045]} rotation={[-c * 0.9 + 0.12, 0, (i - 1.5) * 0.08]}>
            <mesh position={[0, 0, -f.len / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <capsuleGeometry args={[0.0105, f.len, 4, 10]} />
              <Toon color={skin} />
            </mesh>
          </group>
        );
      })}
      {/* thumb */}
      <group position={[-0.05, 0.004, -0.005]} rotation={[0, -0.7 + (point ? 0.3 : 0), -0.2 - curl * 0.4]}>
        <mesh position={[-0.025, 0, -0.012]} rotation={[Math.PI / 2, 0, 0.9]} castShadow>
          <capsuleGeometry args={[0.012, 0.045, 4, 10]} />
          <Toon color={skin} />
        </mesh>
      </group>
    </group>
  );
};

// handful of dark glittering ore grit (+ optional violet-silver vanadium specks)
export const Grit: React.FC<{pos?: V3; r?: number; n?: number; seed?: number; specks?: number; glintT?: number; spill?: number; heap?: number}> = ({
  pos = [0, 0, 0],
  r = 0.045,
  n = 140,
  seed = 3,
  specks = 0,
  glintT = 0,
  spill = 0,
  heap = 0.025,
}) => {
  const {t} = useScene();
  const grains = useMemo(() => {
    const q = mulberry(seed);
    return Array.from({length: n}, (_, i) => {
      const a = q() * Math.PI * 2, d = Math.sqrt(q()) * r;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      const y = heap * (1 - (d / r) ** 2) * (0.6 + q() * 0.4);
      return {x, y, z, s: 0.0022 + q() * 0.0042, c: q(), rot: [q() * 3, q() * 3, q() * 3] as V3, ph: q() * 6.28, i};
    });
  }, [n, r, seed, heap]);
  const vSpecks = useMemo(() => grains.filter((_, i) => i % Math.max(1, Math.floor(n / Math.max(1, specks))) === 3).slice(0, specks), [grains, specks, n]);
  return (
    <group position={pos}>
      {grains.map((g) => (
        <mesh key={g.i} position={[g.x, g.y - spill * (g.x > r * 0.5 ? (t * 0.4) % 0.1 : 0), g.z]} rotation={g.rot}>
          <dodecahedronGeometry args={[g.s, 0]} />
          <meshStandardMaterial color={g.c < 0.5 ? '#2A2830' : g.c < 0.85 ? '#3C3A46' : '#5A5664'} metalness={0.7} roughness={0.35} envMapIntensity={0.9} />
        </mesh>
      ))}
      {/* glitter: tiny bright points twinkling */}
      {grains
        .filter((g) => g.i % 9 === 0)
        .map((g) => {
          const tw = Math.max(0, Math.sin(t * 5 + g.ph * 3)) ** 8;
          return (
            <mesh key={`gl${g.i}`} position={[g.x, g.y + g.s, g.z]}>
              <sphereGeometry args={[0.0018 + tw * 0.0022, 6, 4]} />
              <meshBasicMaterial color={new THREE.Color('#FFF2D8').multiplyScalar(1 + tw * 2)} toneMapped={false} />
            </mesh>
          );
        })}
      {vSpecks.map((g, k) => {
        const tw = 0.55 + 0.45 * Math.max(0, Math.sin((t - glintT) * 4 + k * 1.7)) ** 3;
        const on = clamp01((t - glintT - k * 0.12) / 0.3);
        return (
          <mesh key={`v${k}`} position={[g.x, g.y + g.s * 1.2, g.z]} rotation={g.rot}>
            <octahedronGeometry args={[0.0055, 0]} />
            <meshBasicMaterial color={new THREE.Color('#C9A8FF').lerp(new THREE.Color('#E8ECFF'), 0.3).multiplyScalar(0.6 + on * tw * 1.6)} toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
};

/* =================================================================== */
/* LAB (Vik's modern workshop)                                          */
/* =================================================================== */
export const SCANNER: V3 = [0, 0, 0]; // table centre; top at y = 0.92
export const SCAN_TOP = 0.92;
export const BENCH: V3 = [2.4, 0, 0.2]; // Vik's workbench; top at y = 0.95
export const BENCH_TOP = 0.95;
export const FURNACE: V3 = [-2.5, 0, -1.6];
export const PRESS: V3 = [-2.7, 0, 0.9];
export const DOOR: V3 = [-3.6, 0, -3.85];

const screenTex = (kind: 'scan' | 'error' | 'graph') =>
  textTex(`screen-${kind}`, 512, 320, (g) => {
    g.fillStyle = '#0E2A3A';
    g.fillRect(0, 0, 512, 320);
    g.strokeStyle = '#1F6F78';
    g.lineWidth = 1;
    for (let x = 0; x < 512; x += 32) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, 320);
      g.stroke();
    }
    for (let y = 0; y < 320; y += 32) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(512, y);
      g.stroke();
    }
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    if (kind === 'graph' || kind === 'scan') {
      const r = mulberry(kind === 'graph' ? 3 : 8);
      g.strokeStyle = '#7FF0E0';
      g.lineWidth = 4;
      g.beginPath();
      for (let x = 0; x <= 512; x += 8) {
        const y = 200 + Math.sin(x / 30) * 40 + (r() - 0.5) * 50;
        x ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
      g.strokeStyle = '#F2A33A';
      g.beginPath();
      for (let x = 0; x <= 512; x += 8) {
        const y = 240 + Math.cos(x / 45) * 30 + (r() - 0.5) * 30;
        x ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
    }
    if (kind === 'scan') {
      g.fillStyle = '#E5533D';
      g.fillRect(36, 40, 440, 84);
      g.fillStyle = '#FFFFFF';
      g.font = font(46);
      g.fillText('PATTERN: UNKNOWN', 256, 86);
    }
    if (kind === 'error') {
      g.fillStyle = '#FFFFFF';
      g.font = font(40);
      g.fillText('COPYING PATTERN...', 256, 70);
      g.strokeStyle = '#FFFFFF';
      g.lineWidth = 6;
      g.strokeRect(46, 112, 420, 52);
      g.fillStyle = '#7FF0E0';
      g.fillRect(52, 118, 6, 40);
      g.fillStyle = '#FFFFFF';
      g.font = font(34);
      g.fillText('0%', 256, 140);
      g.fillStyle = '#E5533D';
      g.fillRect(96, 196, 320, 92);
      g.fillStyle = '#FFFFFF';
      g.font = font(72);
      g.fillText('ERROR', 256, 246);
    }
  });

const Monitor: React.FC<{pos: V3; rotY?: number; kind: 'scan' | 'error' | 'graph'; w?: number; flash?: number}> = ({pos, rotY = 0, kind, w = 1.0, flash = 1}) => {
  const h = w * 0.625;
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <Box size={[w + 0.08, h + 0.08, 0.06]} pos={[0, 0, -0.035]} color="#2A2E44" />
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={screenTex(kind)} color={new THREE.Color('#ffffff').multiplyScalar(0.75 + 0.5 * flash)} toneMapped={false} />
      </mesh>
      <Box size={[0.08, 0.36, 0.08]} pos={[0, -h / 2 - 0.18, -0.06]} color="#3A3E58" />
      <Box size={[0.4, 0.03, 0.26]} pos={[0, -h / 2 - 0.36, -0.04]} color="#3A3E58" />
      <pointLight position={[0, 0, 0.4]} color={kind === 'graph' ? '#7FE8E0' : '#FF8A7A'} intensity={0.9 * flash} distance={2.2} decay={2} />
    </group>
  );
};

const Dial: React.FC<{pos: V3; rotY?: number; value: number; s?: number}> = ({pos, rotY = 0, value, s = 1}) => {
  const face = textTex('dial', 256, 256, (g) => {
    g.fillStyle = '#F6F2E8';
    g.beginPath();
    g.arc(128, 128, 124, 0, 6.283);
    g.fill();
    g.strokeStyle = '#1C1838';
    g.lineWidth = 8;
    g.stroke();
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI * 0.75 + (i / 10) * Math.PI * 1.5;
      g.lineWidth = i % 5 ? 4 : 8;
      g.strokeStyle = i >= 8 ? '#E5533D' : '#1C1838';
      g.beginPath();
      g.moveTo(128 + Math.cos(a) * 92, 128 + Math.sin(a) * 92);
      g.lineTo(128 + Math.cos(a) * 112, 128 + Math.sin(a) * 112);
      g.stroke();
    }
    g.fillStyle = '#1C1838';
    g.font = font(34);
    g.textAlign = 'center';
    g.fillText('°C', 128, 196);
    g.font = font(26);
    g.fillText('1500', 196, 160);
  });
  const a = -(Math.PI * 0.75 + value * Math.PI * 1.5) + Math.PI / 2;
  return (
    <group position={pos} rotation={[0, rotY, 0]} scale={s}>
      <Cyl r={0.17} h={0.05} pos={[0, 0, -0.03]} rot={[Math.PI / 2, 0, 0]} color="#5A5E78" />
      <mesh>
        <circleGeometry args={[0.15, 40]} />
        <meshBasicMaterial map={face} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.006]} rotation={[0, 0, a - Math.PI / 2]}>
        <mesh position={[0.055, 0, 0]}>
          <boxGeometry args={[0.11, 0.008, 0.004]} />
          <meshBasicMaterial color="#E5533D" toneMapped={false} />
        </mesh>
      </mesh>
      <mesh position={[0, 0, 0.009]}>
        <circleGeometry args={[0.012, 16]} />
        <meshBasicMaterial color="#1C1838" toneMapped={false} />
      </mesh>
    </group>
  );
};

// red laser on a gantry over the scanner bed; `on` 0..1, beam sweeps along x
const Laser: React.FC<{on: number; sweep?: [number, number]; dur: number}> = ({on, sweep = [-0.3, 0.35], dur}) => {
  const {t} = useScene();
  const u = 0.5 - 0.5 * Math.cos((t / Math.max(1, dur)) * Math.PI * 2 * 0.9);
  const x = sweep[0] + (sweep[1] - sweep[0]) * u;
  const topY = 1.75;
  const hitY = SCAN_TOP + 0.01;
  const flick = 0.85 + 0.15 * Math.sin(t * 40);
  return (
    <group>
      {/* gantry */}
      {[-0.9, 0.9].map((gx) => (
        <Box key={gx} size={[0.08, topY + 0.1 - 0.9, 0.08]} pos={[gx, (topY + 0.1 + 0.9) / 2, -0.32]} color="#D8E2E8" />
      ))}
      <Box size={[1.9, 0.1, 0.12]} pos={[0, topY + 0.1, -0.32]} color="#1F9E95" />
      {/* carriage on the crossbar + arm reaching out over the bed */}
      <Box size={[0.16, 0.22, 0.2]} pos={[x, topY + 0.02, -0.25]} color="#E8EEF2" />
      <Box size={[0.08, 0.06, 0.28]} pos={[x, topY - 0.04, -0.1]} color="#E8EEF2" />
      <Box size={[0.12, 0.16, 0.12]} pos={[x, topY - 0.12, 0]} color="#E8EEF2" />
      <Box size={[0.13, 0.03, 0.13]} pos={[x, topY - 0.05, 0]} color="#F2A33A" />
      <Cyl r={0.025} h={0.08} pos={[x, topY - 0.23, 0]} color="#3A3E58" />
      {on > 0.02 && (
        <>
          {/* beam: hot core + soft glow, straight down onto the blade */}
          <mesh position={[x, (topY - 0.27 + hitY) / 2, 0]}>
            <cylinderGeometry args={[0.004 * on, 0.004 * on, topY - 0.27 - hitY, 8]} />
            <meshBasicMaterial color={new THREE.Color('#FF6A5A').multiplyScalar(3 * flick)} toneMapped={false} />
          </mesh>
          <mesh position={[x, (topY - 0.27 + hitY) / 2, 0]}>
            <cylinderGeometry args={[0.02 * on, 0.02 * on, topY - 0.27 - hitY, 12, 1, true]} />
            <meshBasicMaterial color="#FF3A2A" transparent opacity={0.3 * on} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
          </mesh>
          <mesh position={[x, hitY + 0.004, 0]}>
            <sphereGeometry args={[0.022 * on * flick, 12, 8]} />
            <meshBasicMaterial color={new THREE.Color('#FFD0C0').multiplyScalar(2.5)} toneMapped={false} />
          </mesh>
          <pointLight position={[x, hitY + 0.08, 0.05]} color="#FF4A3A" intensity={2.2 * on} distance={2.2} decay={2} />
          <Sparks pos={[x, hitY + 0.01, 0]} times={Array.from({length: 40}, (_, i) => i * 0.18)} color="#FFB0A0" n={8} speed={1.1} life={0.22} />
        </>
      )}
    </group>
  );
};

const Whiteboard: React.FC<{pos: V3}> = ({pos}) => {
  const tex = textTex('whiteboard', 512, 300, (g) => {
    g.fillStyle = '#F8FAFA';
    g.fillRect(0, 0, 512, 300);
    g.strokeStyle = '#2E5A9A';
    g.lineWidth = 5;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(40, 230);
    g.bezierCurveTo(120, 60, 220, 260, 300, 100);
    g.stroke();
    g.strokeStyle = '#E5533D';
    g.beginPath();
    g.moveTo(330, 60);
    g.lineTo(470, 200);
    g.moveTo(470, 60);
    g.lineTo(330, 200);
    g.stroke();
    g.fillStyle = '#1C1838';
    g.font = font(40);
    g.fillText('Fe + C = ??', 40, 60);
    g.font = font(30);
    g.fillText('1500°C', 330, 260);
  });
  return (
    <group position={pos}>
      <Box size={[1.7, 1.05, 0.04]} pos={[0, 0, -0.03]} color="#B8C4CC" />
      <mesh>
        <planeGeometry args={[1.6, 0.95]} />
        <meshStandardMaterial map={tex} roughness={0.6} />
      </mesh>
    </group>
  );
};

const CeilingLight: React.FC<{pos: V3}> = ({pos}) => (
  <group position={pos}>
    <Box size={[1.6, 0.06, 0.4]} pos={[0, 0.04, 0]} color="#C8D2D8" />
    <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <planeGeometry args={[1.5, 0.32]} />
      <meshBasicMaterial color={new THREE.Color('#F0FAFF').multiplyScalar(1.6)} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  </group>
);

export type LabFx = {
  laser?: number; // 0..1
  laserSweep?: [number, number];
  sabre?: 'scanner' | 'none';
  sabreLift?: number; // 0..1: raised off the bed (not used when held)
  screens?: 'scan' | 'error';
  trophy?: 'bench' | 'drop' | 'none' | 'melt';
  trophyDropAt?: number;
  melt?: [number, number];
  door?: [number, number]; // door open amount over the shot
  doorAt?: number;
  pressBar?: 'hot-folded' | 'none';
  pressHits?: number[];
  furnace?: number; // furnace glow 0..1
  dial?: [number, number];
  benchItems?: ('folded-bar' | 'pure-box' | 'pure-bar' | 'blank-blade' | 'blank-blade-front' | 'crucible' | 'cracked' | 'ingot' | 'sabre')[];
  boxOpenAt?: number;
  crackAt?: number;
};

export const LabHD: React.FC<{fx: LabFx; dur: number; p: number}> = ({fx, dur, p}) => {
  const {t} = useScene();
  const lerp = (r?: [number, number], d = 0) => (r ? r[0] + (r[1] - r[0]) * smooth(p) : d);
  const doorOpen = fx.door ? fx.door[0] + (fx.door[1] - fx.door[0]) * smooth((t - (fx.doorAt ?? 0)) / 0.9) : 0;
  const flash = fx.screens ? 0.6 + 0.4 * (Math.sin(t * 9) > 0 ? 1 : 0) : 1;
  const items = fx.benchItems ?? [];
  // the press ram cycles down on each hit
  const ram = (fx.pressHits ?? []).reduce((m, h) => Math.max(m, Math.exp(-Math.pow((t - h) / 0.09, 2))), 0);
  const dropK = fx.trophy === 'drop' ? smooth((t - (fx.trophyDropAt ?? 0.3) + 0.22) / 0.22) : 1;
  const melt = lerp(fx.melt);
  return (
    <group>
      {/* floor: pale teal-grey tiles */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <TexToon tex="brick-floor" color="#C8DCDC" repeat={[22, 22]} normal={0.4} reliefOnly />
      </mesh>
      {/* walls */}
      <TBox size={[14, 4.4, 0.3]} pos={[0, 2.2, -4.0]} tex="plaster" color="#E2EEEE" />
      <TBox size={[0.3, 4.4, 10]} pos={[-5.2, 2.2, 0]} tex="plaster" color="#D6E6E6" />
      <TBox size={[0.3, 4.4, 10]} pos={[5.2, 2.2, 0]} tex="plaster" color="#D6E6E6" />
      <Box size={[14, 0.22, 0.05]} pos={[0, 1.15, -3.84]} color="#1F9E95" />
      <Box size={[14, 0.08, 0.05]} pos={[0, 1.32, -3.84]} color={C.accent} />
      <Box size={[14, 0.2, 10]} pos={[0, 4.4, 0]} color="#B8C8CC" />
      {[-2.6, 0, 2.6].map((x) => (
        <CeilingLight key={x} pos={[x, 4.25, -0.8]} />
      ))}
      {/* forge door in the back wall: warm light spills in when it opens */}
      <group position={DOOR}>
        <Box size={[1.5, 2.55, 0.2]} pos={[0, 1.27, 0.06]} color="#7A4A30" />
        <mesh position={[0, 1.15, 0.05]}>
          <planeGeometry args={[1.2, 2.3]} />
          <meshBasicMaterial color={new THREE.Color('#FF9A40').multiplyScalar(0.6 + 1.4 * doorOpen)} toneMapped={false} />
        </mesh>
        <group position={[-0.6, 0, 0.17]} rotation={[0, -doorOpen * 1.75, 0]}>
          <TBox size={[1.2, 2.3, 0.07]} pos={[0.6, 1.15, 0]} tex="planks" color="#A86F48" />
          <Ball r={0.04} pos={[1.08, 1.1, 0.05]} color={C.gold} />
        </group>
        {doorOpen > 0.02 && (
          <>
            <pointLight position={[0, 1.4, 0.8]} color="#FFA048" intensity={14 * doorOpen} distance={7} decay={2} />
            <LightBeam from={[0, 2.3, 0.1]} to={[0.4, 0, 2.6]} r0={0.55} r1={1.5} color="#FFB060" strength={0.3 * doorOpen} />
            <Motes count={40} box={[1.2, 2.2, 1.5]} center={[0.2, 1.2, 0.8]} color="#FFB060" size={0.035} rise={0.15} seed={53} opacity={doorOpen} />
          </>
        )}
      </group>
      {/* 1 scanner bed + laser gantry */}
      <group position={SCANNER}>
        <Box size={[1.7, 0.08, 0.8]} pos={[0, SCAN_TOP - 0.04, 0]} color="#E8EEF2" />
        <Box size={[1.5, 0.012, 0.6]} pos={[0, SCAN_TOP + 0.002, 0]} color="#1E3A4A" />
        {[-0.75, 0.75].map((x) => (
          <Box key={x} size={[0.1, SCAN_TOP - 0.08, 0.6]} pos={[x, (SCAN_TOP - 0.08) / 2, 0]} color="#B8C6CE" />
        ))}
        <Box size={[1.4, 0.06, 0.06]} pos={[0, 0.25, 0]} color="#1F9E95" />
      </group>
      <Laser on={fx.laser ?? 0} sweep={fx.laserSweep} dur={dur} />
      {fx.sabre === 'scanner' && <Sabre pos={[-0.32, SCAN_TOP + 0.012 + (fx.sabreLift ?? 0) * 0.5, 0.0]} rot={[-Math.PI / 2, 0, 0]} />}
      {/* 2 monitor wall */}
      <group position={[1.7, 0, -3.2]}>
        <TBox size={[2.6, 0.08, 0.8]} pos={[0, 0.95, 0]} tex="planks" color="#E8E0D8" />
        {[-1.15, 1.15].map((x) => (
          <Box key={x} size={[0.08, 0.95, 0.7]} pos={[x, 0.47, 0]} color="#9AA8B0" />
        ))}
        <Monitor pos={[-0.62, 1.73, -0.12]} rotY={0.12} kind={fx.screens ?? 'graph'} flash={flash} />
        <Monitor pos={[0.62, 1.73, -0.12]} rotY={-0.12} kind={fx.screens === 'scan' ? 'error' : fx.screens === 'error' ? 'error' : 'graph'} flash={fx.screens ? flash : 1} />
        {/* 3 coffee mug, 4 keyboard */}
        <Cyl r={0.05} h={0.11} pos={[1.0, 1.045, 0.2]} color="#E5533D" />
        <Box size={[0.6, 0.03, 0.2]} pos={[0, 1.005, 0.22]} color="#2A2E44" />
      </group>
      {/* 5 CNC machine */}
      <group position={[-1.6, 0, -3.2]}>
        <Box size={[1.4, 1.5, 0.9]} pos={[0, 0.75, 0]} color="#E2E8EC" />
        <Box size={[1.42, 0.12, 0.92]} pos={[0, 1.35, 0]} color="#1F9E95" />
        <mesh position={[0, 0.85, 0.452]}>
          <planeGeometry args={[0.9, 0.6]} />
          <meshBasicMaterial color={new THREE.Color('#A8E8F0').multiplyScalar(0.9)} toneMapped={false} />
        </mesh>
        <Box size={[0.24, 0.3, 0.06]} pos={[0.55, 1.0, 0.47]} color="#2A2E44" />
        <Ball r={0.035} pos={[0.55, 0.8, 0.5]} color="#E5533D" emissive="#E5533D" />
      </group>
      {/* 6 hydraulic press (Try 1) */}
      <group position={PRESS}>
        <Box size={[0.9, 0.2, 0.7]} pos={[0, 0.1, 0]} color="#2E5A6A" />
        <Box size={[0.7, 0.55, 0.5]} pos={[0, 0.48, 0]} color="#3A6E7E" />
        {[-0.38, 0.38].map((x) => (
          <Cyl key={x} r={0.05} h={2.1} pos={[x, 1.25, 0]} color="#B8C6CE" />
        ))}
        <Box size={[1.0, 0.25, 0.6]} pos={[0, 2.25, 0]} color="#2E5A6A" />
        <Box size={[0.6, 0.22, 0.42]} pos={[0, 1.55 - ram * 0.48, 0]} color="#F2A33A" />
        <Cyl r={0.07} h={0.6} pos={[0, 1.95 - ram * 0.24, 0]} color="#D8E2E8" />
        {fx.pressBar === 'hot-folded' && (
          <>
            <Billet pos={[0, 0.78, 0]} size={[0.42, 0.05 - ram * 0.015, 0.12]} look="hot-folded" />
            <pointLight position={[0, 0.95, 0.4]} color="#FF8A3A" intensity={2.5} distance={2} decay={2} />
            <Sparks pos={[0, 0.82, 0]} times={fx.pressHits ?? []} n={16} scale={0.45} />
          </>
        )}
      </group>
      {/* 7 furnace (Try 3) with temperature dial */}
      <group position={FURNACE}>
        <Box size={[1.0, 1.3, 0.9]} pos={[0, 0.65, 0]} color="#5A6478" />
        <Box size={[1.04, 0.1, 0.94]} pos={[0, 1.33, 0]} color="#3A4258" />
        <mesh position={[0.0, 0.72, 0.452]}>
          <planeGeometry args={[0.52, 0.42]} />
          <meshBasicMaterial color={new THREE.Color('#FF7A2A').multiplyScalar(0.4 + 1.9 * (fx.furnace ?? 0.3))} toneMapped={false} />
        </mesh>
        <Box size={[0.6, 0.06, 0.06]} pos={[0, 0.98, 0.46]} color="#2A2E44" />
        <Dial pos={[0.0, 1.18, 0.47]} value={lerp(fx.dial, 0.15)} s={0.65} />
        <pointLight position={[0, 0.8, 0.9]} color="#FF8A3A" intensity={4 * (fx.furnace ?? 0.3)} distance={3} decay={2} />
      </group>
      {/* 8 Vik's workbench + clamp, goggles, toolbox */}
      <group position={BENCH}>
        <TBox size={[1.6, 0.08, 0.8]} pos={[0, BENCH_TOP - 0.04, 0]} tex="planks" color="#D8B890" />
        {[-0.72, 0.72].map((x) => (
          <Box key={x} size={[0.08, BENCH_TOP - 0.08, 0.7]} pos={[x, (BENCH_TOP - 0.08) / 2, 0]} color="#7A8A98" />
        ))}
        {/* clamp */}
        <Box size={[0.06, 0.16, 0.06]} pos={[0.66, BENCH_TOP + 0.08, -0.25]} color="#E5533D" />
        <Box size={[0.18, 0.04, 0.06]} pos={[0.6, BENCH_TOP + 0.16, -0.25]} color="#E5533D" />
        {/* goggles */}
        {[-1, 1].map((sd) => (
          <mesh key={sd} position={[-0.58 + sd * 0.045, BENCH_TOP + 0.02, -0.22]} rotation={[-Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.035, 0.01, 8, 16]} />
            <Toon color="#2E5A6A" />
          </mesh>
        ))}
        {(fx.trophy === 'bench' || fx.trophy === 'drop') && (
          <Trophy pos={[0.25, BENCH_TOP, -0.05]} rotY={-0.25} s={1.6} drop={(1 - dropK) * 0.5} />
        )}
        {items.includes('folded-bar') && <Billet pos={[-0.12, BENCH_TOP + 0.018, -0.22]} rot={[0, 0.0, 0]} size={[0.5, 0.035, 0.1]} look="folded" />}
        {items.includes('pure-bar') && <Billet pos={[-0.1, BENCH_TOP + 0.02, -0.2]} rot={[0, 0, 0]} size={[0.42, 0.04, 0.1]} look="pure" label />}
        {items.includes('pure-box') && <GiftBox pos={[-0.1, BENCH_TOP, 0.08]} openAt={fx.boxOpenAt ?? 0.4} />}
        {items.includes('blank-blade') && <Sabre pos={[-0.55, BENCH_TOP + 0.01, 0.12]} rot={[-Math.PI / 2, 0, -0.05]} look="blank" />}
        {items.includes('blank-blade-front') && <Sabre pos={[-0.62, BENCH_TOP + 0.01, 0.36]} rot={[-Math.PI / 2, 0, -0.08]} look="blank" />}
        {items.includes('sabre') && <Sabre pos={[-0.55, BENCH_TOP + 0.01, 0.12]} rot={[-Math.PI / 2, 0, -0.05]} look="wootz" />}
        {items.includes('ingot') && <Ingot pos={[0.3, BENCH_TOP, 0.12]} />}
      </group>
      {/* 9 toolbox, 10 fire extinguisher, 11 whiteboard, 12 shelf with jars, 13 plant */}
      <group position={[4.3, 0, -2.6]}>
        <Box size={[0.8, 0.9, 0.5]} pos={[0, 0.45, 0]} color="#E5533D" />
        {[0.2, 0.42, 0.64].map((y) => (
          <Box key={y} size={[0.7, 0.02, 0.02]} pos={[0, y, 0.26]} color="#9A2A20" />
        ))}
      </group>
      <group position={[4.9, 0, -0.4]}>
        <Cyl r={0.12} h={0.6} pos={[0, 0.3, 0]} color="#D83A2A" />
        <Cyl r={0.04} h={0.12} pos={[0, 0.66, 0]} color="#2A2838" />
      </group>
      <Whiteboard pos={[3.6, 2.15, -3.83]} />
      <group position={[-0.3, 2.75, -3.75]}>
        <Box size={[1.4, 0.06, 0.35]} pos={[0, 0, 0]} color="#9AA8B0" />
        {[-0.45, -0.1, 0.25, 0.5].map((x, i) => (
          <Cyl key={x} r={0.08} h={0.24} pos={[x, 0.15, 0]} color={['#7FD0C8', '#F2A33A', '#B8C6CE', '#2BA39A'][i]} />
        ))}
      </group>
      <PlantPot pos={[4.4, 0, 0.8]} s={0.9} flowers={false} />
      {/* crucible + bench props for Try 3 (on the furnace-side table) */}
      {(items.includes('crucible') || items.includes('cracked')) && (
        <group position={[-1.55, 0, -1.2]}>
          <TBox size={[0.9, 0.08, 0.6]} pos={[0, 0.86, 0]} tex="planks" color="#9AA8B0" />
          {[-0.38, 0.38].map((x) => (
            <Box key={x} size={[0.06, 0.82, 0.5]} pos={[x, 0.41, 0]} color="#7A8A98" />
          ))}
          <Crucible pos={[0, 0.9, 0]} s={1.6} glow={items.includes('cracked') ? Math.max(0, 0.3 - (t - (fx.crackAt ?? 0)) * 0.15) : 0.3} open={items.includes('cracked') ? smooth((t - (fx.crackAt ?? 0)) / 0.25) : 0} />
        </group>
      )}
      {/* trophy melting into a crucible (payoff) */}
      {fx.trophy === 'melt' && (
        <group position={[0.5, 0, 0.9]}>
          <Cyl r={0.36} h={0.75} pos={[0, 0.375, 0]} color="#5A6478" />
          <mesh position={[0, 0.76, 0]}>
            <cylinderGeometry args={[0.24, 0.2, 0.06, 24]} />
            <meshBasicMaterial color={new THREE.Color('#FF8A2A').multiplyScalar(1.5)} toneMapped={false} />
          </mesh>
          <Trophy pos={[0, 0.74, 0]} s={1.5} melt={melt} />
          <pointLight position={[0, 1.1, 0.4]} color="#FF8A3A" intensity={5} distance={3} decay={2} />
          <Steam center={[0, 0.85, 0]} spread={0.4} amount={0.8} color="#FFD8B0" />
        </group>
      )}
    </group>
  );
};

const GiftBox: React.FC<{pos: V3; openAt: number}> = ({pos, openAt}) => {
  const {t} = useScene();
  const k = smooth((t - openAt) / 0.35);
  return (
    <group position={pos}>
      <Box size={[0.5, 0.11, 0.18]} pos={[0, 0.055, 0]} color="#1F9E95" />
      <Box size={[0.48, 0.02, 0.16]} pos={[0, 0.112, 0]} color="#F6F2E8" />
      <group position={[0, 0.11, -0.09]} rotation={[-k * 1.9, 0, 0]}>
        <Box size={[0.52, 0.03, 0.2]} pos={[0, 0.015, 0.1]} color="#167A74" />
        <Box size={[0.06, 0.035, 0.2]} pos={[0, 0.017, 0.1]} color={C.accent} />
      </group>
      {k > 0.2 && <pointLight position={[0, 0.4, 0.2]} color="#E8F4FF" intensity={1.6 * k} distance={1.2} decay={2} />}
      {k > 0.3 && <Sparks pos={[0, 0.16, 0]} times={[openAt + 0.1, openAt + 0.4]} color="#F0F8FF" n={10} speed={0.8} life={0.5} />}
      {/* the gleaming bar lifts out of the box */}
      <Billet pos={[0, 0.07 + 0.16 * smooth((t - openAt - 0.25) / 0.5), 0]} rot={[0, 0, 0]} size={[0.42, 0.04, 0.1]} look="pure" label />
    </group>
  );
};

export const Ingot: React.FC<{pos: V3; s?: number}> = ({pos, s = 1}) => (
  <group position={pos} scale={s}>
    <mesh position={[0, 0.03, 0]} castShadow receiveShadow>
      <boxGeometry args={[0.26, 0.06, 0.11]} />
      <meshStandardMaterial color="#D8A030" metalness={1} roughness={0.16} envMapIntensity={2.4} />
    </mesh>
    <mesh position={[0, 0.0615, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.22, 0.08]} />
      <meshStandardMaterial color="#F0C050" metalness={1} roughness={0.05} envMapIntensity={2.8} />
    </mesh>
  </group>
);

/* =================================================================== */
/* MUSEUM case                                                          */
/* =================================================================== */
export const CASE: V3 = [0, 0, 0];
export const MuseumHD: React.FC = () => {
  const label = textTex('museum-label', 512, 128, (g) => {
    g.fillStyle = '#C9A040';
    g.fillRect(0, 0, 512, 128);
    g.strokeStyle = '#7A5A18';
    g.lineWidth = 8;
    g.strokeRect(8, 8, 496, 112);
    g.fillStyle = '#2A1E0A';
    g.font = font(40);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('Damascus sabre', 256, 48);
    g.font = font(30);
    g.fillText('17th c.', 256, 92);
  });
  return (
    <group>
      <Ground tex="planks" color="#B07A58" rep={0.8} size={30} />
      <TBox size={[12, 4.5, 0.3]} pos={[0, 2.25, -3.2]} tex="plaster" color="#5A4A8A" />
      <TBox size={[0.3, 4.5, 8]} pos={[-4.5, 2.25, 0]} tex="plaster" color="#4E427E" />
      <TBox size={[0.3, 4.5, 8]} pos={[4.5, 2.25, 0]} tex="plaster" color="#4E427E" />
      <Box size={[12, 0.14, 0.06]} pos={[0, 0.9, -3.03]} color={C.accent} />
      {/* plinth + velvet stand + sabre */}
      <TBox size={[1.5, 0.95, 0.75]} pos={[0, 0.475, 0]} tex="sandstone-blocks" color="#F2DCC0" />
      <Box size={[1.4, 0.06, 0.65]} pos={[0, 0.98, 0]} color="#7A1F3A" />
      {[-0.35, 0.3].map((x) => (
        <Box key={x} size={[0.06, 0.12, 0.2]} pos={[x, 1.07, 0]} color="#7A1F3A" />
      ))}
      <Sabre pos={[-0.42, 1.14, 0.0]} rot={[-0.25, 0, 0.02]} s={1.15} sheen={0.7} />
      {/* glass case: thin edges + faint panes */}
      <mesh position={[0, 1.42, 0]}>
        <boxGeometry args={[1.42, 0.82, 0.66]} />
        <meshPhysicalMaterial color="#DDE8FF" transparent opacity={0.08} roughness={0.02} metalness={0} clearcoat={1} depthWrite={false} />
      </mesh>
      {[
        [-0.71, 0.33], [0.71, 0.33], [-0.71, -0.33], [0.71, -0.33],
      ].map(([x, z], i) => (
        <Box key={i} size={[0.025, 0.82, 0.025]} pos={[x, 1.42, z]} color="#C9A040" />
      ))}
      <Box size={[1.45, 0.03, 0.69]} pos={[0, 1.84, 0]} color="#C9A040" />
      {/* brass label on the plinth */}
      <mesh position={[0, 0.72, 0.377]}>
        <planeGeometry args={[0.6, 0.15]} />
        <meshStandardMaterial map={label} metalness={0.6} roughness={0.35} envMapIntensity={0.8} />
      </mesh>
      {/* spotlight */}
      <LightBeam from={[0.2, 4.2, 0.4]} to={[0, 1.0, 0]} r0={0.12} r1={0.85} color="#FFE2B0" strength={0.3} />
      <spotLight position={[0.2, 4.2, 0.6]} angle={0.35} penumbra={0.6} intensity={12} distance={8} decay={2} color="#FFE8C0" castShadow />
      {/* other exhibits: vases, shield, rope barrier */}
      {[-3, 3].map((x, i) => (
        <group key={x} position={[x, 0, -2.2]}>
          <TBox size={[0.7, 1.0, 0.7]} pos={[0, 0.5, 0]} tex="sandstone-blocks" color="#E8D0B0" />
          <Cyl r={0.18} r2={0.1} h={0.55} pos={[0, 1.28, 0]} color={i ? '#2BA39A' : '#C0583A'} />
          <Ball r={0.2} pos={[0, 1.16, 0]} color={i ? '#2BA39A' : '#C0583A'} />
        </group>
      ))}
      <group position={[-1.8, 2.3, -3.02]}>
        <mesh>
          <circleGeometry args={[0.45, 32]} />
          <Toon color="#8A5A36" />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <circleGeometry args={[0.12, 20]} />
          <Toon color={C.gold} />
        </mesh>
      </group>
      <Lantern pos={[2.2, 2.6, -2.7]} glow={0.8} />
      {[-1.4, 1.4].map((x) => (
        <group key={x} position={[x, 0, 1.3]}>
          <Cyl r={0.04} h={0.9} pos={[0, 0.45, 0]} color="#C9A040" />
          <Ball r={0.06} pos={[0, 0.92, 0]} color="#C9A040" />
        </group>
      ))}
      <mesh position={[0, 0.78, 1.3]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.025, 0.025, 2.8, 8]} />
        <Toon color="#7A1F3A" />
      </mesh>
    </group>
  );
};

// water drop rolling along the blade (macro): position along the blade 0..1
export const WaterDrop: React.FC<{along: number; s?: number}> = ({along, s = 1}) => {
  const u = clamp01(along);
  const x = u * BLADE_L;
  const y = 0.16 * u * u;
  return (
    <mesh position={[x, y, 0.009]} scale={[1.4 * s, 1 * s, 0.7 * s]}>
      <sphereGeometry args={[0.009, 18, 12]} />
      <meshPhysicalMaterial color="#E8F4FF" transmission={0.6} roughness={0.02} clearcoat={1} metalness={0} transparent opacity={0.85} envMapIntensity={1.4} />
    </mesh>
  );
};

/* =================================================================== */
/* ORE HILLSIDE                                                         */
/* =================================================================== */
const Basket: React.FC<{pos: V3; s?: number; ore?: number; rotY?: number}> = ({pos, s = 1, ore = 1, rotY = 0}) => (
  <group position={pos} scale={s} rotation={[0, rotY, 0]}>
    <mesh position={[0, 0.16, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.32, 0.22, 0.32, 20, 1, true]} />
      <TexToon tex="planks" color="#D8A868" repeat={[3, 0.6]} side={THREE.DoubleSide} />
    </mesh>
    <Cyl r={0.22} h={0.02} pos={[0, 0.01, 0]} color="#B8875A" />
    <mesh position={[0, 0.32, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.32, 0.02, 6, 24]} />
      <Toon color="#A8783E" />
    </mesh>
    {ore > 0 && <Grit pos={[0, 0.2 + 0.1 * ore, 0]} r={0.28} n={110} heap={0.12 * ore} seed={7} />}
  </group>
);

const VillageFurnace: React.FC<{pos: V3; glow?: number}> = ({pos, glow = 1}) => {
  const {t} = useScene();
  const flick = 0.85 + 0.15 * Math.sin(t * 13) * Math.sin(t * 5.1);
  return (
    <group position={pos}>
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.75, 28, 18, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <TexToon tex="plaster" color="#C87850" repeat={[3, 2]} />
      </mesh>
      <Cyl r={0.18} r2={0.12} h={0.5} pos={[0, 0.9, 0]} color="#A86040" />
      <mesh position={[0, 0.28, 0.68]} rotation={[-0.25, 0, 0]}>
        <circleGeometry args={[0.24, 24]} />
        <meshBasicMaterial color={new THREE.Color('#FF8A2A').multiplyScalar(1.1 * flick * glow)} toneMapped={false} />
      </mesh>
      {[-0.1, 0.1].map((x, i) => (
        <Crucible key={x} pos={[x, 0.16, 0.66]} s={0.9} glow={glow * 0.6} cake="none" />
      ))}
      <pointLight position={[0, 0.4, 1.1]} color="#FF8A3A" intensity={3 * flick * glow} distance={4} decay={2} />
      <Motes count={30} box={[0.4, 1.4, 0.4]} center={[0, 1.6, 0]} color="#FFA040" size={0.04} rise={0.5} seed={61} />
      <Steam center={[0, 1.2, 0]} spread={0.3} amount={0.6} color="#9A8A90" seed={4} />
    </group>
  );
};

// rock face with dark ore seams; `empty` greys the seams out (mines ran dry)
export const ORE_FACE: V3 = [0, 0, -3];
const OreFace: React.FC<{empty?: boolean}> = ({empty}) => {
  const rocks = useMemo(() => {
    const r = mulberry(91);
    return Array.from({length: 46}, () => ({x: (r() - 0.5) * 9, y: r() * 3.2, z: -r() * 0.8, s: 0.5 + r() * 0.8, c: r()}));
  }, []);
  const seams = useMemo(() => {
    const r = mulberry(93);
    const out: {x: number; y: number; z: number; s: number}[] = [];
    for (const [y0, k] of [[0.9, 0.12], [1.8, -0.08], [2.6, 0.06]] as const)
      for (let i = 0; i < 60; i++) {
        const x = -4 + (i / 60) * 8;
        out.push({x, y: y0 + Math.sin(x * 0.8) * 0.25 + x * k + (r() - 0.5) * 0.12, z: 0.32 + r() * 0.08, s: 0.05 + r() * 0.06});
      }
    return out;
  }, []);
  return (
    <group position={ORE_FACE}>
      {rocks.map((k, i) => (
        <mesh key={i} position={[k.x, k.y, k.z - 0.6]} rotation={[k.c * 3, k.c * 5, 0]} castShadow receiveShadow>
          <dodecahedronGeometry args={[k.s, 0]} />
          <TexToon tex="sandstone-wall" color={k.c < 0.5 ? '#C06A44' : '#A8583A'} repeat={[1, 1]} />
        </mesh>
      ))}
      <TBox size={[10, 3.6, 0.6]} pos={[0, 1.8, -0.2]} tex="sandstone-wall" color="#B8603E" />
      {seams.map((s, i) => (
        <mesh key={`s${i}`} position={[s.x, s.y, s.z]} rotation={[i, i * 1.3, 0]}>
          <dodecahedronGeometry args={[s.s, 0]} />
          <meshStandardMaterial color={empty ? '#8A6A5A' : '#2A2830'} metalness={empty ? 0 : 0.7} roughness={empty ? 0.9 : 0.35} envMapIntensity={0.9} />
        </mesh>
      ))}
    </group>
  );
};

export type HillFx = {furnace?: boolean; empty?: boolean; scrape?: [number, number]; dust?: boolean};
export const HillsideHD: React.FC<{fx: HillFx; p: number}> = ({fx, p}) => {
  const {t} = useScene();
  const sx = fx.scrape ? fx.scrape[0] + (fx.scrape[1] - fx.scrape[0]) * smooth(p) : 0;
  return (
    <group>
      <Ground tex="plaster" color="#C0704A" rep={0.5} size={120} />
      {/* rolling red hills behind */}
      <Ball r={9} pos={[-12, -5, -18]} scale={[1.6, 1, 1]} color="#B4603C" />
      <Ball r={11} pos={[10, -6.5, -22]} scale={[1.8, 1, 1]} color="#A85838" />
      <Ball r={7} pos={[0, -4.2, -26]} scale={[2.2, 1, 1]} color="#9A5236" />
      <OreFace empty={fx.empty} />
      {/* baskets of ore, wooden props, shrubs */}
      {!fx.empty && (
        <>
          <Basket pos={[-1.4, 0, -1.2]} s={1.1} />
          <Basket pos={[2.1, 0, -1.6]} s={0.9} rotY={0.5} />
        </>
      )}
      <Basket pos={[-2.8, 0, -0.6]} s={0.9} ore={fx.empty ? 0 : 1} />
      {fx.scrape && <Basket pos={[sx, 0, -2.2]} s={1.0} ore={0} rotY={0.3} />}
      {fx.dust && <Steam center={[sx + 0.2, 0.1, -2.2]} spread={0.9} amount={0.9} color="#C89070" seed={12} />}
      {fx.dust && <Motes count={60} box={[3, 1.5, 1.5]} center={[sx, 0.6, -2]} color="#E8B890" size={0.05} rise={0.08} seed={71} />}
      {[-3.6, 3.4].map((x, i) => (
        <group key={x} position={[x, 0, -2.0 + i * 0.4]}>
          <Box size={[0.08, 1.6, 0.08]} pos={[0, 0.8, 0]} color="#7A4A2E" />
          <Box size={[0.9, 0.06, 0.06]} pos={[0, 1.55, 0]} color="#7A4A2E" />
        </group>
      ))}
      {[-4.4, 4.6, 6.0].map((x, i) => (
        <group key={x} position={[x, 0, -1 - i]}>
          <Ball r={0.45} pos={[0, 0.35, 0]} color="#5E8A44" />
          <Ball r={0.3} pos={[0.35, 0.3, 0.1]} color="#4E7A3C" />
        </group>
      ))}
      {fx.furnace && <VillageFurnace pos={[1.4, 0, 0.6]} />}
      {/* a pick + a wooden ladder against the face */}
      <group position={[3.2, 0, -2.4]} rotation={[0, 0, 0.25]}>
        {[-0.2, 0.2].map((x) => (
          <Box key={x} size={[0.06, 2.4, 0.06]} pos={[x, 1.2, 0]} color="#8A5A36" />
        ))}
        {[0.3, 0.7, 1.1, 1.5, 1.9].map((y) => (
          <Box key={y} size={[0.4, 0.05, 0.05]} pos={[0, y, 0]} color="#8A5A36" />
        ))}
      </group>
      <group position={[-0.6, 0.05, -1.0]} rotation={[0, 0.6, Math.PI / 2 - 0.1]}>
        <Cyl r={0.025} h={0.9} pos={[0, 0, 0]} color="#8A5A36" />
        <Box size={[0.5, 0.05, 0.05]} pos={[0, 0.45, 0]} color="#5A5C76" />
      </group>
      <Motes count={50} box={[8, 3, 4]} center={[0, 1.6, -1]} color="#FFE2A8" size={0.035} rise={0.02} seed={t > 99 ? 1 : 77} />
    </group>
  );
};

/* =================================================================== */
/* forge extras: banded hot cake on the anvil, side-by-side blades      */
/* =================================================================== */
// The cake on the anvil, being hammered: bands appear with each strike.
export const BandedCake: React.FC<{pos: V3; strikes: number[]; glow?: number; s?: number}> = ({pos, strikes, glow = 1, s = 1}) => {
  const {t} = useScene();
  const done = strikes.filter((h) => t >= h).length;
  const since = done ? t - strikes[done - 1] : 9;
  const band = clamp01(done / Math.max(1, strikes.length)) * (0.4 + 0.6 * smooth(since / 0.25)) + (done ? 0.12 : 0);
  const squash = done ? 1 - 0.06 * Math.exp(-since * 12) : 1;
  const geo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.11, 0.115, 0.035, 36, 1);
    return g;
  }, []);
  const c = new THREE.Color('#ffffff').multiplyScalar(1.25 * glow);
  return (
    <group position={pos} scale={[s * (1 + (1 - squash) * 0.5), s * squash, s * 0.85]}>
      <mesh geometry={geo} position={[0, 0.0175, 0]}>
        <meshBasicMaterial map={hotIron()} color={c} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.0356, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.108, 36]} />
        <meshBasicMaterial map={hotBandsTex()} color={c} transparent opacity={Math.min(1, band)} toneMapped={false} depthWrite={false} />
      </mesh>
      <pointLight position={[0, 0.15, 0.1]} color="#FF7A2A" intensity={3 * glow} distance={2} decay={2} />
    </group>
  );
};

// the smith's hammer coming down onto the cake (insert); impact at each strike time
export const HammerHead: React.FC<{pos: V3; strikes: number[]}> = ({pos, strikes}) => {
  const {t} = useScene();
  // height above the impact point: up between strikes, fast fall
  let h = 0.5;
  for (const s of strikes) {
    const d = t - s;
    if (d > -0.35 && d <= 0) h = Math.min(h, 0.5 * Math.pow(-d / 0.35, 1.8));
    if (d > 0 && d < 0.4) h = Math.min(h, 0.5 * smooth(d / 0.4));
  }
  return (
    <group position={[pos[0], pos[1] + h + 0.04, pos[2]]}>
      <mesh castShadow>
        <boxGeometry args={[0.1, 0.075, 0.075]} />
        <meshStandardMaterial color="#5A5C70" metalness={0.6} roughness={0.4} envMapIntensity={0.6} />
      </mesh>
      <mesh position={[0, 0.03, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.016, 0.016, 0.34, 10]} />
        <Toon color="#8A5A36" />
      </mesh>
    </group>
  );
};

// open clay crucible full of ore grit (the vanadium close-up)
export const OrePot: React.FC<{pos: V3; s?: number; specks?: number; glintAt?: number}> = ({pos, s = 1, specks = 9, glintAt = 0.4}) => (
  <group position={pos} scale={s}>
    <mesh position={[0, 0.07, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.1, 0.075, 0.14, 28, 1, true]} />
      <meshStandardMaterial color="#B8754A" roughness={0.9} side={THREE.DoubleSide} />
    </mesh>
    <mesh position={[0, 0.141, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.1, 0.008, 8, 32]} />
      <meshStandardMaterial color="#C8855A" roughness={0.9} />
    </mesh>
    <Cyl r={0.075} h={0.01} pos={[0, 0.005, 0]} color="#A8653A" />
    <Grit pos={[0, 0.11, 0]} r={0.092} n={220} heap={0.03} seed={19} specks={specks} glintT={glintAt} />
  </group>
);

/* lighting presets used by this Short live in presets.ts (lab, museum, forge-dark) */
export {TCyl};
