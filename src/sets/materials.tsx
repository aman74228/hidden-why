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
