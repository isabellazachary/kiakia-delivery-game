import './style.css'
import { Game, type ExtraState, type HudState, type Mode, type ShiftState, type ShiftSummary } from './game'
import { DISTRICTS } from './districts'
import { BIKES, garage, OUTFITS, type Item } from './shop'
import { music, sfx } from './sound'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

// Best results are kept on this device only; private browsing may refuse storage, which is fine
const load = (k: string) => { try { return Number(localStorage.getItem(k)) || 0 } catch { return 0 } }
const save = (k: string, n: number) => { try { localStorage.setItem(k, String(n)) } catch { /* still playable */ } }
let best = load('kiakia-dash-best')
let bestShift = load('kiakia-dash-best-shift')

const host = $('game')
const hud = document.querySelector<HTMLElement>('.hud')!
const shud = document.querySelector<HTMLElement>('.shud')!
const start = $('start')
const over = $('over')
const shiftOver = $('shiftOver')
const naira = (n: number) => `${n < 0 ? '−' : ''}₦${Math.abs(Math.round(n)).toLocaleString('en-NG')}`
const showBest = () => {
  const parts = []
  if (bestShift) parts.push(`Best shift: ${naira(bestShift)}`)
  if (best) parts.push(`Best dash: ${best.toLocaleString()} pts`)
  $('best-start').textContent = parts.join(' · ')
  $('best-over').textContent = best ? `Your best: ${best.toLocaleString()} points` : ''
}
showBest()
const showWallet = () => { $('wallet').textContent = naira(garage.wallet); $('gWallet').textContent = naira(garage.wallet) }
showWallet()
let runCoins = 0
const coinsWon = () => { const t = runCoins ? `+${naira(runCoins * 10)} in coins · wallet ${naira(garage.wallet)}` : ''; document.querySelectorAll('.coins-won').forEach((e) => { e.textContent = t }) }

const helmet = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 15a9 9 0 0 1 18 0v2H3z" fill="currentColor"/><path d="M12 6v5h9" fill="none" stroke="rgba(11,23,56,.55)" stroke-width="2"/></svg>'
const helmets = (n: number) => [0, 1, 2].map((i) => `<i class="${i < n ? 'on' : ''}">${helmet}</i>`).join('')
const clock = (s: number) => { const t = Math.max(0, Math.ceil(s)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}` }

function toast(title: string, body: string, tone: 'good' | 'bad' | 'info') {
  const box = $('toasts')
  const el = document.createElement('div')
  el.className = `toast ${tone}`
  el.innerHTML = `<b></b><span></span>`
  el.querySelector('b')!.textContent = title
  el.querySelector('span')!.textContent = body
  if (!body) el.querySelector('span')!.remove()
  box.prepend(el)
  // one message at a time, briefly, so the road stays the focus
  while (box.children.length > 1) box.lastElementChild!.remove()
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400) }, 2600)
}

const game = new Game(host, {
  hud(s: HudState) {
    $('score').textContent = s.score.toLocaleString()
    const lives = $('lives')
    lives.innerHTML = helmets(s.lives)
    lives.setAttribute('aria-label', `${s.lives} helmet${s.lives === 1 ? '' : 's'} left`)
  },
  over(s: HudState) {
    const record = s.score > best && best > 0
    const first = best === 0
    if (s.score > best) { best = s.score; save('kiakia-dash-best', best) }
    const st = game.runStats
    showBest()
    setTimeout(() => {
      over.hidden = false; hud.hidden = true; $('combo').hidden = true; runEnded(); $('again').focus()
      $('overTag').textContent = record ? 'Your best run' : 'Crashed'
      $('record').hidden = !record
      // the numbers count up, one after another
      countUp($('final-score'), s.score, 900)
      document.querySelectorAll<HTMLElement>('#runStats b').forEach((b, i) => setTimeout(() => countUp(b, st[b.dataset.k as keyof typeof st] as number, 600), 350 + i * 140))
      if (record || (first && s.score > 300)) { confetti(); sfx.record() }
    }, 900)
  },
  shift(s: ShiftState) {
    const tag = $('jobTag')
    tag.textContent = s.stage === 'pickup' ? 'Pick up' : s.stage === 'dropoff' ? 'Deliver' : 'Next job'
    tag.className = `job-tag ${s.stage}`
    $('jobPlace').textContent = s.stage === 'between' ? 'Looking for a job…' : s.place
    $('jobDist').textContent = s.stage === 'between' ? '' : `${Math.round(s.toGo)} m`
    const t = $('jobTime')
    t.textContent = s.stage === 'between' ? '' : s.timeLeft < 0 ? `late ${clock(-s.timeLeft)}` : clock(s.timeLeft)
    t.className = s.timeLeft < 0 ? 'late' : s.timeLeft < 8 ? 'soon' : ''
    $('sEarn').textContent = naira(s.earnings)
    const fuel = $('sFuel')
    fuel.style.width = `${s.fuel}%`
    fuel.className = s.fuel < 28 ? 'low' : ''
    $('sLives').innerHTML = helmets(s.lives)
  },
  shiftOver(s: ShiftSummary) {
    const record = s.earnings > bestShift
    if (record) { bestShift = s.earnings; save('kiakia-dash-best-shift', bestShift) }
    $('soReason').textContent = s.reason
    $('soEarn').textContent = naira(s.earnings)
    $('soDel').textContent = String(s.deliveries)
    $('soRate').textContent = s.rating === null ? '–' : `${s.rating.toFixed(1)}★`
    $('soBest').textContent = record && s.earnings > 0 ? 'Your best shift yet!' : bestShift ? `Best shift: ${naira(bestShift)}` : ''
    showBest()
    setTimeout(() => { shiftOver.hidden = false; shud.hidden = true; $('toasts').innerHTML = ''; runEnded(); $('shiftAgain').focus() }, 700)
  },
  toast,
  countdown(n) {
    const c = $('count')
    c.textContent = n === null ? 'Go!' : String(n)
    c.classList.remove('show'); void c.offsetWidth; c.classList.add('show')
  },
  popup(text) {
    const p = $('pop')
    p.textContent = text
    p.classList.remove('show'); void p.offsetWidth; p.classList.add('show')
  },
  flash() {
    const f = $('flash')
    f.classList.remove('show'); void f.offsetWidth; f.classList.add('show')
  },
  extra(s: ExtraState) {
    runCoins = s.coins
    // the combo meter: shows from 3 catches in a row, with the multiplier and a bar that drains
    const cb = $('combo')
    cb.hidden = !game.playing || s.combo < 3
    if (!cb.hidden) {
      $('comboMult').textContent = `×${s.mult}`
      $('comboN').textContent = String(s.combo)
      $('comboBar').style.width = `${Math.max(0, s.comboLeft) * 100}%`
      cb.className = `m${s.mult}`
    }
    document.querySelectorAll('.coins-run').forEach((e) => { e.textContent = naira(s.coins * 10) })
    const turn = $('turn')
    turn.hidden = !s.turn || !game.playing
    if (s.turn) {
      turn.className = s.turn
      turn.querySelector('.arrow')!.textContent = s.turn === 'left' ? '←' : '→'
      turn.querySelector('b')!.textContent = `Turn ${s.turn}`
    }
    const pw = $('power')
    pw.hidden = !s.power
    if (s.power) {
      pw.className = s.power.kind
      pw.querySelector('.pw-icon')!.textContent = s.power.kind === 'boost' ? '⚡' : '🧲'
      pw.querySelector('.pw-name')!.textContent = s.power.kind === 'boost' ? 'Go-slow buster' : 'Parcel magnet'
      ;(pw.querySelector('.pw-bar i') as HTMLElement).style.width = `${Math.max(0, s.power.left / s.power.total) * 100}%`
    }
  },
  area(name: string) {
    const a = $('area')
    a.querySelector('b')!.textContent = name
    a.classList.remove('show'); void a.offsetWidth; a.classList.add('show')
    clearTimeout(areaTimer)
    areaTimer = setTimeout(() => a.classList.remove('show'), 2600)
  },
})
let areaTimer = 0

if (new URLSearchParams(location.search).has('bot')) (window as unknown as { __game: Game }).__game = game

// numbers that count up on the results screen
function countUp(el: HTMLElement, to: number, ms: number) {
  const t0 = performance.now()
  const step = (now: number) => {
    const k = Math.min(1, (now - t0) / ms)
    el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))).toLocaleString()
    if (k < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}
// a short burst of Kiakia-coloured confetti for a new best
function confetti() {
  const box = $('confetti')
  box.innerHTML = ''
  const cols = ['#f6c21a', '#2f5bd3', '#ffffff', '#3ee08f', '#ff6b4a']
  for (let i = 0; i < 70; i++) {
    const p = document.createElement('i')
    p.style.left = `${Math.random() * 100}%`
    p.style.background = cols[i % cols.length]
    p.style.setProperty('--d', `${(Math.random() - 0.5) * 240}px`)
    p.style.setProperty('--r', `${Math.random() * 720 - 360}deg`)
    p.style.animationDelay = `${Math.random() * 0.4}s`
    p.style.animationDuration = `${1.6 + Math.random() * 1.2}s`
    box.append(p)
  }
  setTimeout(() => { box.innerHTML = '' }, 3400)
}

function runEnded() {
  $('turn').hidden = true; $('power').hidden = true
  showWallet(); coinsWon()
}

// ---------- garage ----------
const garageEl = $('garage')
let tab: 'bikes' | 'outfits' = 'bikes'
function renderGarage() {
  showWallet()
  const list: Item[] = tab === 'bikes' ? BIKES : OUTFITS
  const ul = $('items')
  ul.innerHTML = ''
  for (const it of list) {
    const owned = garage.owns(it.id), using = garage.using(it.id)
    const li = document.createElement('li')
    if (using) li.className = 'using'
    const sw = document.createElement('span')
    sw.className = 'swatch'
    for (const c of it.colors) { const i = document.createElement('i'); i.style.background = `#${c.toString(16).padStart(6, '0')}`; sw.append(i) }
    const nm = document.createElement('span')
    nm.className = 'nm'
    const b = document.createElement('b'); b.textContent = it.name
    const sm = document.createElement('small'); sm.textContent = using ? 'Riding with this' : owned ? 'Yours' : it.price ? naira(it.price) : 'Free'
    nm.append(b, sm)
    const btn = document.createElement('button')
    if (using) { btn.textContent = 'In use'; btn.disabled = true }
    else if (owned) btn.textContent = 'Use'
    else { btn.textContent = `Buy ${naira(it.price)}`; btn.className = 'buy'; btn.disabled = garage.wallet < it.price }
    btn.addEventListener('click', () => {
      if (garage.choose(it.id)) { game.setLook(garage.look()); renderGarage() }
    })
    li.append(sw, nm, btn)
    ul.append(li)
  }
}
document.querySelectorAll<HTMLButtonElement>('.tab').forEach((t) => t.addEventListener('click', () => {
  tab = t.dataset.tab as 'bikes' | 'outfits'
  document.querySelectorAll('.tab').forEach((x) => { x.classList.toggle('on', x === t); x.setAttribute('aria-selected', String(x === t)) })
  renderGarage()
}))
$('openGarage').addEventListener('click', () => { start.hidden = true; garageEl.hidden = false; renderGarage(); $('closeGarage').focus() })
$('closeGarage').addEventListener('click', () => { garageEl.hidden = true; start.hidden = false; showWallet(); $('openGarage').focus() })

// ---------- where to start: any area of Lagos, or a surprise; remembered on this device ----------
const areaSel = $('startArea') as HTMLSelectElement
const startable = DISTRICTS.map((d, i) => ({ d, i })).filter(({ d }) => d.style !== 'bridge')
areaSel.innerHTML = '<option value="any">Surprise me 🎲</option>' + startable.map(({ d, i }) => `<option value="${i}">${d.name}</option>`).join('')
try { const saved = localStorage.getItem('kiakia-dash-area'); if (saved && areaSel.querySelector(`option[value="${saved}"]`)) areaSel.value = saved } catch { /* fine */ }
const pickArea = () => areaSel.value === 'any' ? startable[Math.floor(Math.random() * startable.length)].i : Number(areaSel.value)
let nextFrom = pickArea()
game.preview(nextFrom)
areaSel.addEventListener('change', () => {
  try { localStorage.setItem('kiakia-dash-area', areaSel.value) } catch { /* fine */ }
  nextFrom = pickArea()
  game.preview(nextFrom)
})

let lastMode: Mode = 'shift'
const play = (mode: Mode) => {
  lastMode = mode
  start.hidden = true
  over.hidden = true
  shiftOver.hidden = true
  garageEl.hidden = true
  runCoins = 0
  coinsWon()
  hud.hidden = mode !== 'arcade'
  shud.hidden = mode !== 'shift'
  pausedEl.hidden = true
  $('combo').hidden = true
  game.start(mode, nextFrom)
  // a surprise start picks a fresh area every run
  if (areaSel.value === 'any') nextFrom = pickArea()
  // the first few runs: a quick how-to while the countdown runs
  const runs = Number(localStorage.getItem('kiakia-dash-runs') || 0)
  try { localStorage.setItem('kiakia-dash-runs', String(runs + 1)) } catch { /* fine */ }
  if (runs < 3) { const h = $('hint'); h.hidden = false; h.classList.remove('show'); void h.offsetWidth; h.classList.add('show'); setTimeout(() => { h.hidden = true }, 4200) }
}
const menu = () => { music.stop(0.4); showWallet(); game.preview(nextFrom); pausedEl.hidden = true; over.hidden = true; shiftOver.hidden = true; hud.hidden = true; shud.hidden = true; start.hidden = false; $('shift').focus() }

// ---------- pause ----------
const pausedEl = $('paused')
const setPause = (on: boolean) => {
  if (!game.playing) return
  game.pause(on)
  pausedEl.hidden = !on
  if (on) $('resume').focus()
}
document.querySelectorAll<HTMLButtonElement>('.pause-btn').forEach((b) => b.addEventListener('click', () => { setPause(true); b.blur() }))
$('resume').addEventListener('click', () => setPause(false))
$('restart').addEventListener('click', () => { pausedEl.hidden = true; game.pause(false); play(lastMode) })
$('quit').addEventListener('click', () => { game.pause(false); game.quit(); menu() })
// switching apps or tabs pauses the ride, so you never come back to a crash
document.addEventListener('visibilitychange', () => { if (document.hidden && game.playing && !game.isPaused) setPause(true) })
$('shift').addEventListener('click', () => play('shift'))
$('play').addEventListener('click', () => play('arcade'))
$('again').addEventListener('click', () => play('arcade'))
$('shiftAgain').addEventListener('click', () => play('shift'))
$('toMenu').addEventListener('click', menu)
$('toMenu2').addEventListener('click', menu)

document.querySelectorAll<HTMLButtonElement>('.mute').forEach((b) => b.addEventListener('click', () => {
  const off = sfx.toggle()
  document.querySelectorAll<HTMLButtonElement>('.mute').forEach((m) => {
    m.setAttribute('aria-pressed', String(off))
    m.setAttribute('aria-label', off ? 'Turn sound on' : 'Turn sound off')
    m.classList.toggle('off', off)
  })
  b.blur()
}))

// keyboard: arrows or A / D to steer, Enter or Space to (re)start
window.addEventListener('keydown', (e) => {
  if ((e.key === 'Escape' || e.key === 'p' || e.key === 'P') && game.playing) setPause(!game.isPaused)
  else if (game.isPaused) return
  else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') game.steer(-1)
  else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') game.steer(1)
  else if ((e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') && game.playing) game.jump()
  else if ((e.key === 'Enter' || e.key === ' ') && !game.playing && document.activeElement?.tagName !== 'BUTTON') play(lastMode)
  else return
  e.preventDefault()
})

// touch and mouse: swipe left or right, or tap the left or right half of the screen
let downX = 0
let downY = 0
host.addEventListener('pointerdown', (e) => { downX = e.clientX; downY = e.clientY })
host.addEventListener('pointerup', (e) => {
  const dx = e.clientX - downX
  const dy = e.clientY - downY
  if (game.isPaused) return
  if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) game.steer(dx < 0 ? -1 : 1)
  else if (dy < -30 && Math.abs(dy) > Math.abs(dx)) game.jump() // swipe up to hop
  else if (Math.abs(dx) < 12 && Math.abs(dy) < 12) game.steer(e.clientX < window.innerWidth / 2 ? -1 : 1)
})

// works offline once loaded (production only, so development always shows the latest code)
if (import.meta.env.PROD && 'serviceWorker' in navigator) window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => { /* still playable online */ }) })
