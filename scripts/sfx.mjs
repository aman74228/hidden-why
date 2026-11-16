// Generates the studio's simple SFX in code (no assets needed):
//   public/sfx/whoosh.wav, ding.wav, music-bed.wav (loopable 16 s drone + pulse)
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

// whoosh: band-passed noise with a rising-then-falling sweep, 0.6 s
{
  const n = Math.round(SR * 0.6);
  const L = new Float32Array(n), R = new Float32Array(n);
  let lp = 0, bp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const env = Math.sin(Math.PI * Math.pow(t, 0.7)) ** 2;
    const f = 300 + 2600 * Math.sin(Math.PI * t);
    const a = Math.min(0.99, (2 * Math.PI * f) / SR);
    const x = rnd();
    lp += a * (x - lp);
    bp += a * (lp - bp);
    const v = (lp - bp) * 2.2 * env;
    const pan = t; // sweeps left → right
    L[i] = v * (1 - pan * 0.6);
    R[i] = v * (0.4 + pan * 0.6);
  }
  writeWav('whoosh.wav', [L, R]);
}

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
