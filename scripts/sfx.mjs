// Generates the studio's simple SFX in code (no assets needed):
//   public/sfx/ding.wav, music-bed.wav (loopable 16 s drone + pulse)
import fs from 'node:fs';
import path from 'node:path';

const SR = 44100;
const out = path.resolve('public/sfx');
fs.mkdirSync(out, {recursive: true});

const writeWav = (file, ch) => {
  const n = ch[0].length;
  const nc = ch.length;
  const buf = Buffer.alloc(44 + n * nc * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * nc * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(nc, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * nc * 2, 28); buf.writeUInt16LE(nc * 2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * nc * 2, 40);
  for (let i = 0; i < n; i++) for (let c = 0; c < nc; c++) {
    const v = Math.max(-1, Math.min(1, ch[c][i]));
    buf.writeInt16LE(Math.round(v * 32767), 44 + (i * nc + c) * 2);
  }
  fs.writeFileSync(path.join(out, file), buf);
  console.log('wrote', file);
};

let seed = 1;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;

// ding: bell partials with exponential decay, 1.6 s
{
  const n = Math.round(SR * 1.6);
  const L = new Float32Array(n);
  const partials = [[1318.5, 1, 2.2], [2637, 0.45, 3.5], [3951, 0.25, 5], [1975.5, 0.3, 2.8]];
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let v = 0;
    for (const [f, a, d] of partials) v += a * Math.sin(2 * Math.PI * f * t) * Math.exp(-d * t);
    L[i] = v * 0.35 * Math.min(1, t * 400);
  }
  writeWav('ding.wav', [L, L]);
}

// music bed: tanpura-like drone (Sa–Pa) with soft pulse; seamless 16 s loop
{
  const dur = 16;
  const n = SR * dur;
  const L = new Float32Array(n), R = new Float32Array(n);
  const sa = 130.81; // C3
  const notes = [sa, sa * 1.5, sa * 2, sa * 0.5];
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let l = 0, r = 0;
    notes.forEach((f, k) => {
      // integer cycles per loop so it loops cleanly
      const fq = Math.round(f * dur) / dur;
      const sw = 0.5 + 0.5 * Math.sin((2 * Math.PI * (k + 1) * t) / dur);
      for (let h = 1; h <= 5; h++) {
        const s = Math.sin(2 * Math.PI * fq * h * t + k) / (h * 1.6);
        l += s * (k % 2 ? 0.7 : 1) * (0.6 + 0.4 * sw);
        r += s * (k % 2 ? 1 : 0.7) * (0.6 + 0.4 * (1 - sw));
      }
    });
    // soft pulse every half second (tabla-ish thump)
    const beat = t % 0.5;
    const thump = Math.sin(2 * Math.PI * 70 * beat) * Math.exp(-beat * 18) * 0.6;
    L[i] = (l * 0.09 + thump * 0.5);
    R[i] = (r * 0.09 + thump * 0.5);
  }
  writeWav('music-bed.wav', [L, R]);
}

// ring: soft metallic ring for a tap on iron, 2.2 s
{
  const n = Math.round(SR * 2.2);
  const L = new Float32Array(n);
  const partials = [[392, 1, 1.6], [1037, 0.5, 2.4], [1871, 0.3, 3.4], [2950, 0.15, 5]];
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let v = 0;
    for (const [f, a, d] of partials) v += a * Math.sin(2 * Math.PI * f * t) * Math.exp(-d * t);
    L[i] = v * 0.3 * Math.min(1, t * 300);
  }
  writeWav('ring.wav', [L, L]);
}

// clang: hammer on hot iron, 0.5 s
{
  const n = Math.round(SR * 0.5);
  const L = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const noise = rnd() * Math.exp(-t * 60) * 0.6;
    const tone = (Math.sin(2 * Math.PI * 880 * t) + 0.6 * Math.sin(2 * Math.PI * 2310 * t) + 0.35 * Math.sin(2 * Math.PI * 3720 * t)) * Math.exp(-t * 14);
    L[i] = (noise + tone * 0.35) * 0.6;
  }
  writeWav('clang.wav', [L, L]);
}

// rain: loopable 6 s bed of soft hiss + random drop ticks
{
  const n = SR * 6;
  const L = new Float32Array(n), R = new Float32Array(n);
  let lp1 = 0, lp2 = 0;
  for (let i = 0; i < n; i++) {
    lp1 += 0.12 * (rnd() - lp1);
    lp2 += 0.12 * (rnd() - lp2);
    L[i] = lp1 * 0.5;
    R[i] = lp2 * 0.5;
  }
  for (let k = 0; k < 900; k++) {
    const at = Math.floor(((rnd() + 1) / 2) * (n - 800));
    const ch = k % 2 ? L : R;
    const f = 2000 + ((rnd() + 1) / 2) * 3000;
    for (let j = 0; j < 600; j++) ch[at + j] += Math.sin((2 * Math.PI * f * j) / SR) * Math.exp(-j / 90) * 0.08;
  }
  // crossfade ends for a seamless loop
  const xf = SR * 0.3;
  for (let i = 0; i < xf; i++) {
    const k = i / xf;
    L[i] = L[i] * k + L[n - xf + i] * (1 - k);
    R[i] = R[i] * k + R[n - xf + i] * (1 - k);
  }
  writeWav('rain.wav', [L.subarray(0, n - xf), R.subarray(0, n - xf)]);
}
