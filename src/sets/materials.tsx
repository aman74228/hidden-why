import {useThree} from '@react-three/fiber';
import React, {useEffect, useMemo, useState} from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';
import * as THREE from 'three';
import {RGBELoader} from 'three/examples/jsm/loaders/RGBELoader.js';
import {toonRamp} from './toon';

// CC0 texture + HDRI library (public/tex/<name>/{diff,nor}.jpg, public/hdri/<name>.hdr;
// fetched by scripts/fetch_assets.py, credits in public/tex/credits.json).
export type TexName =
  | 'sandstone-wall'
  | 'sandstone-paving'
  | 'sandstone-blocks'
  | 'cobbles'
  | 'plaster'
  | 'rust'
  | 'rust-coarse'
  | 'steel'
  | 'planks'
  | 'brick-floor';

const base = new Map<string, THREE.Texture>();
const pending = new Map<string, Promise<THREE.Texture>>();

const load = (key: string, url: string, srgb: boolean) => {
  if (!pending.has(key)) {
    const h = delayRender(`texture ${key}`, {timeoutInMilliseconds: 60000});
    pending.set(
      key,
      new Promise<THREE.Texture>((res, rej) => {
        new THREE.TextureLoader().load(
          url,
          (t) => {
            t.wrapS = t.wrapT = THREE.RepeatWrapping;
            t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
            t.anisotropy = 4;
            base.set(key, t);
            continueRender(h);
            res(t);
          },
          undefined,
          (e) => {
            continueRender(h);
            rej(e);
          },
        );
      }),
    );
  }
  return pending.get(key)!;
};

// Returns a clone with its own repeat/offset (shares the image), or null until loaded.
export const useTex = (name: TexName, kind: 'diff' | 'nor', repeat: [number, number] = [1, 1], offset: [number, number] = [0, 0]) => {
  const key = `${name}/${kind}`;
  const [tex, setTex] = useState<THREE.Texture | null>(() => base.get(key) ?? null);
  useEffect(() => {
    if (tex) return;
    load(key, staticFile(`tex/${name}/${kind}.jpg`), kind === 'diff').then(setTex).catch(() => undefined);
  }, [key]);
  return useMemo(() => {
    if (!tex) return null;
    const c = tex.clone();
    c.repeat.set(repeat[0], repeat[1]);
    c.offset.set(offset[0], offset[1]);
    c.needsUpdate = true;
    return c;
  }, [tex, repeat[0], repeat[1], offset[0], offset[1]]);
};

// Toon material with a CC0 photo texture. `color` tints the photo towards the
// palette; `normal` adds surface relief that still bands under the toon ramp.
export const TexToon: React.FC<{
  tex: TexName;
  repeat?: [number, number];
  offset?: [number, number];
  color?: string;
  normal?: number;
  emissive?: string;
  emissiveIntensity?: number;
  side?: THREE.Side;
  reliefOnly?: boolean; // use only the normal map (uniform colour, texture relief)
}> = ({tex, repeat = [1, 1], offset = [0, 0], color = '#ffffff', normal = 0.8, emissive, emissiveIntensity = 0.5, side, reliefOnly}) => {
  const map = useTex(tex, 'diff', repeat, offset);
  const nor = useTex(tex, 'nor', repeat, offset);
  const ns = useMemo(() => new THREE.Vector2(normal, normal), [normal]);
  return (
    <meshToonMaterial
      key={map ? 'm' : 'n'}
      color={color}
      map={reliefOnly ? null : map}
      normalMap={nor}
      normalScale={ns}
      gradientMap={toonRamp()}
      emissive={emissive ?? '#000000'}
      emissiveIntensity={emissive ? emissiveIntensity : 0}
      side={side}
    />
  );
};

// Physically based variant (for metal that should catch the HDRI: puddles,
// the pillar-iron bar's glassy skin, the shiny new gate).
export const TexPBR: React.FC<{
  tex?: TexName;
  repeat?: [number, number];
  color?: string;
  metalness?: number;
  roughness?: number;
  clearcoat?: number;
  iridescence?: number;
  envMapIntensity?: number;
  normal?: number;
  transparent?: boolean;
  opacity?: number;
}> = ({tex, repeat = [1, 1], color = '#ffffff', metalness = 0.6, roughness = 0.4, clearcoat = 0, iridescence = 0, envMapIntensity = 1, normal = 0.6, transparent, opacity}) => {
  const map = useTex(tex ?? 'steel', 'diff', repeat);
  const nor = useTex(tex ?? 'steel', 'nor', repeat);
  const ns = useMemo(() => new THREE.Vector2(normal, normal), [normal]);
  return (
    <meshPhysicalMaterial
      key={map ? 'm' : 'n'}
      color={color}
      map={tex ? map : null}
      normalMap={tex ? nor : null}
      normalScale={ns}
      metalness={metalness}
      roughness={roughness}
      clearcoat={clearcoat}
      clearcoatRoughness={0.05}
      iridescence={iridescence}
      iridescenceIOR={1.6}
      iridescenceThicknessRange={[200, 600]}
      envMapIntensity={envMapIntensity}
      transparent={transparent}
      opacity={opacity}
    />
  );
};

/* ---------------- HDRI environment ---------------- */
export type HdriName = 'sunset' | 'overcast' | 'dusk';
const hdrPending = new Map<string, Promise<THREE.DataTexture>>();
const loadHdr = (name: HdriName) => {
  if (!hdrPending.has(name)) {
    const h = delayRender(`hdri ${name}`, {timeoutInMilliseconds: 60000});
    hdrPending.set(
      name,
      new Promise((res, rej) =>
        new RGBELoader().load(
          staticFile(`hdri/${name}.hdr`),
          (t) => {
            continueRender(h);
            res(t);
          },
          undefined,
          (e) => {
            continueRender(h);
            rej(e);
          },
        ),
      ),
    );
  }
  return hdrPending.get(name)!;
};

const pmremCache = new Map<string, THREE.Texture>();
// Holds the frame (delayRender) until the PMREM environment is built AND
// applied to the scene, so metal never renders black on the first frame.
export const Env: React.FC<{name: HdriName; intensity?: number}> = ({name, intensity = 1}) => {
  const {gl, scene, invalidate} = useThree();
  const [env, setEnv] = useState<THREE.Texture | null>(() => pmremCache.get(name) ?? null);
  const [handle] = useState(() => (pmremCache.has(name) ? null : delayRender(`env ${name}`, {timeoutInMilliseconds: 60000})));
  useEffect(() => {
    if (env) return;
    loadHdr(name)
      .then((hdr) => {
        hdr.mapping = THREE.EquirectangularReflectionMapping;
        const pm = new THREE.PMREMGenerator(gl);
        const rt = pm.fromEquirectangular(hdr);
        pm.dispose();
        pmremCache.set(name, rt.texture);
        setEnv(rt.texture);
      })
      .catch(() => handle !== null && continueRender(handle));
  }, [name]);
  useEffect(() => {
    scene.environment = env;
    (scene as unknown as {environmentIntensity: number}).environmentIntensity = intensity;
    invalidate();
    if (env && handle !== null) requestAnimationFrame(() => requestAnimationFrame(() => continueRender(handle)));
  }, [env, intensity, scene]);
  return null;
};

/* ---------------- hammered wrought iron (generated, deterministic) ---------------- */
// Dark grey-brown, mottled from hand forging, with small pits; the same canvas
// drives a bump map so the pits read under the light. Dull metallic sheen.
const rng = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};
let ironTex: {map: THREE.CanvasTexture; bump: THREE.CanvasTexture} | null = null;
export const hammeredIron = () => {
  if (ironTex) return ironTex;
  const S = 512;
  const r = rng(7);
  const col = document.createElement('canvas');
  const bmp = document.createElement('canvas');
  col.width = col.height = bmp.width = bmp.height = S;
  const g = col.getContext('2d')!;
  const b = bmp.getContext('2d')!;
  g.fillStyle = '#4a4038';
  g.fillRect(0, 0, S, S);
  b.fillStyle = '#808080';
  b.fillRect(0, 0, S, S);
  const wrap = (fn: (x: number, y: number) => void, x: number, y: number) => {
    for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) fn(x + dx, y + dy);
  };
  // hammer facets: soft overlapping ovals, slightly lighter or darker
  for (let i = 0; i < 520; i++) {
    const x = r() * S, y = r() * S, rr = 10 + r() * 28, l = r();
    const c = l < 0.5 ? `rgba(26,20,16,${0.07 + r() * 0.07})` : `rgba(140,122,104,${0.05 + r() * 0.06})`;
    const bc = `rgba(${l < 0.5 ? 60 : 170},${l < 0.5 ? 60 : 170},${l < 0.5 ? 60 : 170},0.18)`;
    wrap((px, py) => {
      g.fillStyle = c;
      g.beginPath();
      g.ellipse(px, py, rr, rr * 0.75, r() * 3, 0, 6.283);
      g.fill();
      b.fillStyle = bc;
      b.beginPath();
      b.ellipse(px, py, rr, rr * 0.75, 0, 0, 6.283);
      b.fill();
    }, x, y);
  }
  // pits: tiny dark holes with a faint light rim
  for (let i = 0; i < 520; i++) {
    const x = r() * S, y = r() * S, rr = 0.6 + r() * 1.6;
    wrap((px, py) => {
      g.fillStyle = 'rgba(14,10,8,0.7)';
      g.beginPath();
      g.arc(px, py, rr, 0, 6.283);
      g.fill();
      b.fillStyle = '#202020';
      b.beginPath();
      b.arc(px, py, rr, 0, 6.283);
      b.fill();
    }, x, y);
  }
  // faint brown-grey streaks along the forging direction
  for (let i = 0; i < 60; i++) {
    const x = r() * S;
    g.fillStyle = `rgba(${90 + r() * 30},${76 + r() * 20},${62 + r() * 15},0.07)`;
    g.fillRect(x, 0, 1 + r() * 4, S);
  }
  const map = new THREE.CanvasTexture(col);
  map.colorSpace = THREE.SRGBColorSpace;
  const bump = new THREE.CanvasTexture(bmp);
  for (const t of [map, bump]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
  }
  ironTex = {map, bump};
  return ironTex;
};

export const IronMat: React.FC<{repeat?: [number, number]; tint?: string; sheen?: number}> = ({repeat = [1, 1], tint = '#5a524b', sheen = 0.4}) => {
  const {map, bump} = hammeredIron();
  const [m, bm] = useMemo(() => {
    const a = map.clone();
    const c = bump.clone();
    for (const t of [a, c]) {
      t.repeat.set(repeat[0], repeat[1]);
      t.needsUpdate = true;
    }
    return [a, c];
  }, [repeat[0], repeat[1]]);
  return <meshStandardMaterial color={tint} map={m} bumpMap={bm} bumpScale={2.4} metalness={0.6} roughness={0.5} envMapIntensity={sheen} />;
};

// Faint carved inscription band (rows of small Brahmi-like glyph strokes).
let inscTex: THREE.CanvasTexture | null = null;
export const inscription = () => {
  if (inscTex) return inscTex;
  const W = 1024, H = 128;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  g.fillStyle = '#808080';
  g.fillRect(0, 0, W, H);
  const r = rng(29);
  g.strokeStyle = '#3a3a3a';
  g.lineCap = 'round';
  for (let row = 0; row < 4; row++) {
    const y0 = 18 + row * 28;
    let x = 8;
    while (x < W - 20) {
      const w = 10 + r() * 8;
      g.lineWidth = 2.2;
      g.beginPath();
      g.moveTo(x, y0);
      g.lineTo(x + w, y0); // head line
      const n = 1 + Math.floor(r() * 3);
      for (let k = 0; k < n; k++) {
        const sx = x + r() * w;
        g.moveTo(sx, y0);
        if (r() < 0.5) g.lineTo(sx + (r() - 0.5) * 8, y0 + 14);
        else g.arc(sx, y0 + 8, 4 + r() * 3, -1.5, 1.5 + r() * 2);
      }
      g.stroke();
      x += w + 5 + r() * 6;
    }
  }
  inscTex = new THREE.CanvasTexture(c);
  inscTex.wrapS = THREE.RepeatWrapping;
  return inscTex;
};
