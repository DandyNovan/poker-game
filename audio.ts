/** Procedural Web Audio SFX. Unlock on the first gesture. */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfx: GainNode | null = null;
let enabled = true;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C({ latencyHint: "interactive" });
    master = ctx.createGain();
    sfx = ctx.createGain();
    sfx.gain.value = 0.7;
    master.gain.value = 0.85;
    sfx.connect(master);
    master.connect(ctx.destination);
  }
  return ctx;
}

export function setSoundEnabled(on: boolean): void {
  enabled = on;
  if (master && ctx) {
    master.gain.setTargetAtTime(on ? 0.85 : 0, ctx.currentTime, 0.02);
  }
}

export function unlockAudio(): void {
  const c = ac();
  if (c && c.state === "suspended") void c.resume();
}

export function resumeAudio(): void {
  if (ctx?.state === "suspended") void ctx.resume();
}

function beep(freq: number, dur: number, type: OscillatorType, gain = 0.08, slide?: number): void {
  if (!enabled) return;
  const c = ac();
  if (!c || !sfx) return;
  if (c.state === "suspended") return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), c.currentTime + dur);
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.exponentialRampToValueAtTime(gain, c.currentTime + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  osc.connect(g);
  g.connect(sfx);
  osc.start();
  osc.stop(c.currentTime + dur + 0.02);
  osc.onended = () => {
    osc.disconnect();
    g.disconnect();
  };
}

function noise(dur: number, gain = 0.04, hp = 800): void {
  if (!enabled) return;
  const c = ac();
  if (!c || !sfx) return;
  if (c.state === "suspended") return;
  const n = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const data = n.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = n;
  const f = c.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = hp;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  src.connect(f);
  f.connect(g);
  g.connect(sfx);
  src.start();
  src.stop(c.currentTime + dur);
}

export const sfxPlay = {
  deal: () => {
    noise(0.05, 0.035, 1200);
    beep(420 + Math.random() * 40, 0.06, "triangle", 0.03);
  },
  chip: () => beep(180 + Math.random() * 40, 0.07, "square", 0.04, 0.7),
  check: () => beep(520, 0.05, "sine", 0.03),
  fold: () => {
    noise(0.08, 0.03, 600);
    beep(220, 0.1, "sine", 0.04, 0.5);
  },
  raise: () => {
    beep(340, 0.09, "triangle", 0.05, 1.4);
    beep(510, 0.12, "sine", 0.03);
  },
  allin: () => {
    beep(160, 0.18, "sawtooth", 0.05, 2.2);
    beep(480, 0.16, "triangle", 0.04);
  },
  win: () => {
    beep(523, 0.12, "sine", 0.05);
    setTimeout(() => beep(659, 0.12, "sine", 0.05), 90);
    setTimeout(() => beep(784, 0.18, "sine", 0.05), 180);
  },
  lose: () => beep(196, 0.22, "sine", 0.04, 0.6),
  click: () => beep(760, 0.03, "square", 0.02),
};
