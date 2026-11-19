// Sound effects and a little Afrobeat-style groove, all made on the fly with the Web Audio API (no files).
// Browsers only allow sound after the player has tapped or pressed a key, so audio starts on the first input.
let ctx: AudioContext | null = null
let master: GainNode | null = null
let muted = false
const audio = () => {
  if (!ctx) {
    ctx = new AudioContext()
    master = ctx.createGain()
    master.gain.value = 0.9
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => { /* resumes on the next tap */ })
  return ctx
}

function beep(freq: number, ms: number, type: OscillatorType, gain: number, slideTo?: number, at = 0) {
  if (muted) return
  try {
    const c = audio()
    const t = c.currentTime + at
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = type
    o.frequency.setValueAtTime(freq, t)
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + ms / 1000)
    g.gain.setValueAtTime(gain, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000)
    o.connect(g).connect(master!)
    o.start(t)
    o.stop(t + ms / 1000 + 0.02)
  } catch { /* no audio on this device: play silently */ }
}

// a short burst of filtered noise: shakers, hand claps, tyre whoosh
let noiseBuf: AudioBuffer | null = null
function noise(t: number, ms: number, gain: number, freq: number, q = 0.8, type: BiquadFilterType = 'highpass', dest?: AudioNode) {
  const c = audio()
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  const s = c.createBufferSource(); s.buffer = noiseBuf
  const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q
  const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000)
  s.connect(f).connect(g).connect(dest ?? master!)
  s.start(t, Math.random() * 0.3); s.stop(t + ms / 1000 + 0.02)
}

// ---------- the groove: kick, shaker, clap, bass and a bright pluck, scheduled a little ahead ----------
// Afrobeat feel: a busy shaker, the kick on 1 and the "and" of 2, a clap on 2 and 4, a bouncing bass.
const STEPS = 16
const KICK = [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0]
const CLAP = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1]
const SHAK = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
const BASS = [45, 0, 0, 45, 0, 0, 52, 0, 50, 0, 0, 48, 0, 45, 0, 0] // MIDI notes, 0 = rest
const LEAD = [[76, 0, 79, 0, 0, 81, 0, 79, 76, 0, 0, 74, 0, 76, 0, 0], [72, 0, 74, 0, 76, 0, 79, 0, 0, 76, 0, 74, 72, 0, 0, 0]]
const hz = (n: number) => 440 * Math.pow(2, (n - 69) / 12)
let musicBus: GainNode | null = null
let playing = false
let step = 0
let bar = 0
let nextT = 0
let timer = 0
let intensity = 0 // 0 calm .. 1 flat out: adds layers and a little tempo

function schedule() {
  const c = audio()
  const bpm = 104 + intensity * 14
  const dur = 60 / bpm / 4
  while (nextT < c.currentTime + 0.12) {
    const t = nextT, s = step
    if (!muted) {
      if (KICK[s]) { // a punchy kick: a sine sweeping down
        const o = c.createOscillator(), g = c.createGain()
        o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14)
        g.gain.setValueAtTime(0.55, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22)
        o.connect(g).connect(musicBus!); o.start(t); o.stop(t + 0.24)
      }
      if (SHAK[s]) noise(t, 40, s % 2 ? 0.05 : 0.09, 7000, 0.7, 'highpass', musicBus!)
      if (CLAP[s] && bar > 0) { noise(t, 120, 0.22, 1600, 0.9, 'bandpass', musicBus!); noise(t + 0.012, 90, 0.14, 1800, 0.9, 'bandpass', musicBus!) }
      if (BASS[s] && bar > 0) {
        const o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain()
        o.type = 'sawtooth'; o.frequency.value = hz(BASS[s] - 12 + (bar % 4 === 3 ? 2 : 0))
        f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(220, t + 0.2)
        g.gain.setValueAtTime(0.22, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur * 2.2)
        o.connect(f).connect(g).connect(musicBus!); o.start(t); o.stop(t + dur * 2.4)
      }
      const lead = LEAD[(bar >> 1) % 2][s]
      if (lead && bar > 1 && intensity > 0.25) { // the bright highlife-style pluck joins once you're moving
        const o = c.createOscillator(), g = c.createGain()
        o.type = 'triangle'; o.frequency.value = hz(lead)
        g.gain.setValueAtTime(0.09 + intensity * 0.04, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.28)
        o.connect(g).connect(musicBus!); o.start(t); o.stop(t + 0.3)
      }
    }
    nextT += dur
    step = (step + 1) % STEPS
    if (step === 0) bar++
  }
}

export const music = {
  start() {
    try {
      const c = audio()
      if (!musicBus) { musicBus = c.createGain(); musicBus.connect(master!) }
      musicBus.gain.cancelScheduledValues(c.currentTime)
      musicBus.gain.setValueAtTime(0.0001, c.currentTime)
      musicBus.gain.exponentialRampToValueAtTime(0.32, c.currentTime + 0.6)
      if (playing) return
      playing = true; step = 0; bar = 0; nextT = c.currentTime + 0.05
      timer = window.setInterval(schedule, 25)
    } catch { /* silent */ }
  },
  stop(fade = 0.5) {
    if (!playing || !ctx || !musicBus) return
    const c = ctx
    musicBus.gain.cancelScheduledValues(c.currentTime)
    musicBus.gain.setValueAtTime(musicBus.gain.value, c.currentTime)
    musicBus.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + fade)
    window.setTimeout(() => { clearInterval(timer); playing = false }, fade * 1000 + 50)
  },
  pause(on: boolean) { if (!ctx) return; if (on) ctx.suspend().catch(() => {}); else ctx.resume().catch(() => {}) },
  set intensity(v: number) { intensity = Math.max(0, Math.min(1, v)) },
}

export const sfx = {
  coin: () => { beep(880, 90, 'square', 0.08); beep(1320, 120, 'square', 0.08, undefined, 0.07) },
  // each coin in a row rings a little higher, so a long trail sounds like a run up the scale
  tick: (n = 0) => beep(1320 * Math.pow(2, Math.min(n, 12) / 24), 60, 'square', 0.04),
  crash: () => { beep(180, 380, 'sawtooth', 0.12, 50); try { noise(audio().currentTime, 260, 0.35, 900, 0.6, 'lowpass') } catch { /* silent */ } },
  swish: () => beep(420, 60, 'triangle', 0.04, 620),
  jump: () => beep(300, 180, 'triangle', 0.07, 760),
  land: () => { try { noise(audio().currentTime, 90, 0.18, 500, 0.7, 'lowpass') } catch { /* silent */ } },
  close: () => { beep(660, 80, 'triangle', 0.06, 990); beep(990, 140, 'triangle', 0.06, 1480, 0.07) },
  combo: (m: number) => { beep(523 * Math.pow(2, (m - 2) / 6), 120, 'square', 0.06); beep(784 * Math.pow(2, (m - 2) / 6), 160, 'square', 0.06, undefined, 0.09) },
  power: () => { beep(520, 120, 'sawtooth', 0.06, 1400); beep(1400, 160, 'triangle', 0.06, undefined, 0.11) },
  record: () => [523, 659, 784, 1047].forEach((f, i) => beep(f, 220, 'square', 0.06, undefined, i * 0.11)),
  toggle: () => { muted = !muted; if (musicBus && ctx) musicBus.gain.value = muted ? 0 : 0.32; return muted },
  get muted() { return muted },
}

// a short buzz on phones that support it (Android); iPhones just ignore it
export const buzz = (ms: number | number[]) => { try { if (!muted) navigator.vibrate?.(ms) } catch { /* no vibration */ } }
