// Low-poly 3D models for Kiakia Delivery, built from simple shapes in code (no model files).
// Units: 1 = about a metre. Every model faces down the road (towards -z), sitting on y = 0.
import * as THREE from 'three'

const mats = new Map<string, THREE.MeshStandardMaterial>()
// one shared material per colour keeps the draw calls down
export function mat(color: number, opts: { rough?: number; metal?: number; emissive?: number; emissiveIntensity?: number } = {}) {
  const key = `${color}-${opts.rough ?? 0.7}-${opts.metal ?? 0}-${opts.emissive ?? 0}-${opts.emissiveIntensity ?? 0}`
  let m = mats.get(key)
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? 0.7, metalness: opts.metal ?? 0, emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.emissiveIntensity ?? 0, flatShading: true })
    // plain colours (nothing glowing) can be merged into one vertex-coloured mesh when scenery is baked
    m.userData.solid = !(opts.emissiveIntensity ?? 0)
    mats.set(key, m)
  }
  return m
}

function box(w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)
  mesh.position.set(x, y, z)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function wheel(r: number, width: number) {
  const g = new THREE.Group()
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(r, r, width, 14), mat(0x1a1a1f, { rough: 0.9 }))
  tyre.rotation.z = Math.PI / 2
  tyre.castShadow = true
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.45, r * 0.45, width + 0.02, 8), mat(0xc9ced6, { metal: 0.6, rough: 0.35 }))
  hub.rotation.z = Math.PI / 2
  g.add(tyre, hub)
  return g
}

// canvas-drawn textures for logos and signs
function canvasTexture(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  draw(canvas.getContext('2d')!)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

let kTex: THREE.Texture | null = null
function kiakiaBoxTexture() {
  kTex ??= canvasTexture(128, 128, (c) => {
    c.fillStyle = '#2f5bd3'; c.fillRect(0, 0, 128, 128)
    c.fillStyle = '#ffffff'; c.font = '900 84px Arial Black, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'
    c.fillText('K', 64, 70)
  })
  return kTex
}

// ---------- the player: a Kiakia rider on a delivery bike ----------
export interface Rider { group: THREE.Group; lean: THREE.Group; wheels: THREE.Group[]; setNight: (d: number) => void }
// the colours bought in the garage
export interface Look { bike: number; jacket: number; helmet: number; legs: number }
export const DEFAULT_LOOK: Look = { bike: 0x2f5bd3, jacket: 0x1d3f9e, helmet: 0xf6c21a, legs: 0x23262d }
export function rider(look: Look = DEFAULT_LOOK): Rider {
  const group = new THREE.Group()
  const lean = new THREE.Group() // tilts into lane changes
  group.add(lean)
  const front = wheel(0.34, 0.12); front.position.set(0, 0.34, -0.72)
  const back = wheel(0.34, 0.14); back.position.set(0, 0.34, 0.62)
  lean.add(front, back)
  const blue = mat(look.bike, { rough: 0.45, metal: 0.2 })
  lean.add(box(0.34, 0.32, 1.1, blue, 0, 0.62, -0.02)) // body
  lean.add(box(0.3, 0.12, 0.6, mat(0x111318), 0, 0.84, 0.18)) // seat
  lean.add(box(0.08, 0.5, 0.08, mat(0x9aa3b2, { metal: 0.6, rough: 0.3 }), 0, 0.88, -0.62)) // fork
  lean.add(box(0.7, 0.05, 0.06, mat(0x22252b), 0, 1.12, -0.58)) // handlebar
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff4c2, emissive: 0xfff1a8, emissiveIntensity: 0, flatShading: true })
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), lampMat)
  lamp.position.set(0, 0.95, -0.74)
  lean.add(lamp)
  // night lights: a soft beam from the headlamp, a pool of light on the road ahead, a red tail light on the box
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff1c4, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })
  const beam = new THREE.Mesh(new THREE.ConeGeometry(0.75, 5.5, 20, 1, true), beamMat)
  beam.rotation.x = Math.PI / 2 - 0.18 // tip at the lamp, opening forward and slightly down
  beam.position.set(0, 0.45, -3.44)
  beam.visible = false
  lean.add(beam)
  const poolMat = new THREE.MeshBasicMaterial({ map: lightPoolTexture(), color: 0xfff0c0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(3, 15), poolMat)
  pool.rotation.x = -Math.PI / 2
  pool.position.set(0, 0.03, -9.5)
  pool.visible = false
  group.add(pool)
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xff3b30, emissive: 0xff2a1f, emissiveIntensity: 0.4 })
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.03), tailMat)
  tail.position.set(0, 1.02, 0.91)
  lean.add(tail)
  // the delivery box with the Kiakia K
  const kbox = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.52, 0.56), [mat(0x2f5bd3), mat(0x2f5bd3), mat(0x2f5bd3), mat(0x2f5bd3), new THREE.MeshStandardMaterial({ map: kiakiaBoxTexture(), roughness: 0.5 }), new THREE.MeshStandardMaterial({ map: kiakiaBoxTexture(), roughness: 0.5 })])
  kbox.position.set(0, 1.22, 0.62)
  kbox.castShadow = true
  lean.add(kbox)
  // the rider
  const jacket = mat(look.jacket, { rough: 0.8 })
  lean.add(box(0.46, 0.56, 0.3, jacket, 0, 1.22, 0.05)) // torso
  const torsoLean = lean.children[lean.children.length - 1]
  torsoLean.rotation.x = -0.35
  lean.add(box(0.12, 0.42, 0.12, jacket, -0.24, 1.18, -0.24)) // arms
  lean.add(box(0.12, 0.42, 0.12, jacket, 0.24, 1.18, -0.24))
  lean.children.slice(-2).forEach((a) => { a.rotation.x = -0.9 })
  lean.add(box(0.16, 0.5, 0.16, mat(look.legs), -0.16, 0.86, 0.06)) // legs
  lean.add(box(0.16, 0.5, 0.16, mat(look.legs), 0.16, 0.86, 0.06))
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.21, 14, 10), mat(look.helmet, { rough: 0.3, metal: 0.1 }))
  helmet.position.set(0, 1.62, -0.06)
  helmet.castShadow = true
  const visor = box(0.3, 0.1, 0.12, mat(0x0b1738, { rough: 0.15, metal: 0.5 }), 0, 1.6, -0.22)
  lean.add(helmet, visor)
  // d is how dark it is (0 day, 1 night); the lights stay off until it's properly dark, then switch on
  const setNight = (d: number) => {
    const on = THREE.MathUtils.smoothstep(d, 0.6, 0.75)
    lampMat.emissiveIntensity = on * 6.6
    beamMat.opacity = on * 0.05
    poolMat.opacity = on * 0.95
    beam.visible = pool.visible = on > 0.02
    tailMat.emissiveIntensity = on * 3
  }
  return { group, lean, wheels: [front, back], setNight }
}

// a soft oval of light for the road ahead of the headlamp
let poolTex: THREE.Texture | null = null
function lightPoolTexture() {
  poolTex ??= canvasTexture(128, 256, (c) => {
    // brightest a little ahead of the bike, fading out up the road and to the sides
    c.save(); c.translate(64, 150); c.scale(1, 2.1)
    const g = c.createRadialGradient(0, 0, 2, 0, 0, 60)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.5, 'rgba(255,255,255,.4)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    c.fillStyle = g
    c.fillRect(-64, -72, 128, 144); c.restore()
  })
  return poolTex
}

// ---------- traffic ----------
export type Kind = 'danfo' | 'car' | 'keke' | 'okada' | 'pothole' | 'parcel' | 'coin' | 'boost' | 'magnet'

export function danfo() {
  const g = new THREE.Group()
  const yellow = mat(0xf2b705, { rough: 0.5 })
  g.add(box(1.7, 1.55, 3.9, yellow, 0, 1.15, 0))
  g.add(box(1.72, 0.14, 3.92, mat(0x111111), 0, 0.72, 0)) // black stripe
  g.add(box(1.72, 0.1, 3.92, mat(0x111111), 0, 1.32, 0))
  const glass = mat(0x24334f, { rough: 0.15, metal: 0.4 })
  g.add(box(1.5, 0.55, 0.06, glass, 0, 1.55, -1.96)) // windscreen
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) g.add(box(0.04, 0.42, 0.62, glass, s * 0.86, 1.6, -1.2 + i * 0.8))
  g.add(box(1.5, 0.12, 1.6, mat(0x5a4a3a), 0, 2.0, 0.6)) // roof rack load
  for (const z of [-1.3, 1.3]) for (const s of [-0.78, 0.78]) { const w = wheel(0.38, 0.22); w.position.set(s, 0.38, z); g.add(w) }
  return g
}

const CAR_COLOURS = [0xd94040, 0xffffff, 0x2a2d34, 0x3b82c4, 0x9aa3ad, 0x1f7a4d]
export function car() {
  const g = new THREE.Group()
  const paint = mat(CAR_COLOURS[Math.floor(Math.random() * CAR_COLOURS.length)], { rough: 0.35, metal: 0.25 })
  g.add(box(1.6, 0.6, 3.6, paint, 0, 0.62, 0))
  g.add(box(1.36, 0.5, 1.8, paint, 0, 1.15, 0.15))
  const glass = mat(0x1d2a40, { rough: 0.1, metal: 0.5 })
  g.add(box(1.3, 0.42, 0.05, glass, 0, 1.13, -0.76))
  g.add(box(1.38, 0.38, 1.5, glass, 0, 1.14, 0.15))
  const tail = mat(0xff3b30, { emissive: 0xff2a1f, emissiveIntensity: 0.9 })
  g.add(box(0.35, 0.14, 0.04, tail, -0.55, 0.78, 1.81), box(0.35, 0.14, 0.04, tail, 0.55, 0.78, 1.81))
  for (const z of [-1.15, 1.15]) for (const s of [-0.75, 0.75]) { const w = wheel(0.33, 0.2); w.position.set(s, 0.33, z); g.add(w) }
  return g
}

export function keke() {
  const g = new THREE.Group()
  const body = mat(0x1d9a5b, { rough: 0.5 })
  const yellow = mat(0xf2c230, { rough: 0.5 })
  g.add(box(1.25, 0.9, 1.6, body, 0, 0.85, 0.25))
  g.add(box(0.7, 0.7, 0.8, body, 0, 0.7, -0.9))
  g.add(box(1.32, 0.08, 2.4, yellow, 0, 1.9, 0)) // canopy
  for (const s of [-0.6, 0.6]) g.add(box(0.06, 0.9, 0.06, mat(0x2b2b2b), s, 1.45, -0.6))
  g.add(box(1.1, 0.5, 0.05, mat(0x1d2a40, { rough: 0.1 }), 0, 1.5, -0.62))
  for (const s of [-0.55, 0.55]) { const w = wheel(0.26, 0.16); w.position.set(s, 0.26, 0.75); g.add(w) }
  const fw = wheel(0.26, 0.16); fw.position.set(0, 0.26, -1.1); g.add(fw)
  return g
}

export function okada() {
  const g = new THREE.Group()
  const fw = wheel(0.32, 0.1); fw.position.set(0, 0.32, -0.7)
  const bw = wheel(0.32, 0.1); bw.position.set(0, 0.32, 0.6)
  g.add(fw, bw)
  g.add(box(0.3, 0.3, 1.1, mat(0xc0392b, { rough: 0.4 }), 0, 0.62, 0))
  const shirt = mat([0xe67e22, 0x8e44ad, 0x16a085][Math.floor(Math.random() * 3)])
  const t = box(0.42, 0.52, 0.28, shirt, 0, 1.18, 0.05); t.rotation.x = -0.25; g.add(t)
  g.add(box(0.15, 0.5, 0.15, mat(0x2d2d33), -0.15, 0.84, 0.06), box(0.15, 0.5, 0.15, mat(0x2d2d33), 0.15, 0.84, 0.06))
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 8), mat(0x3a2418))
  head.position.set(0, 1.56, -0.02); head.castShadow = true; g.add(head)
  // a passenger, as okadas usually carry one
  const p = box(0.4, 0.48, 0.26, mat(0xdcdcdc), 0, 1.16, 0.45); p.rotation.x = -0.15; g.add(p)
  const ph = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8), mat(0x4a2c1e)); ph.position.set(0, 1.52, 0.45); g.add(ph)
  return g
}

export function pothole() {
  const g = new THREE.Group()
  // pale broken asphalt around the edge, so the hole stands out from the road
  const rim = new THREE.Mesh(new THREE.RingGeometry(0.78, 1.08, 18), mat(0x9a9488, { rough: 1 }))
  rim.rotation.x = -Math.PI / 2
  rim.scale.set(1.25, 0.8, 1)
  rim.position.y = 0.011
  rim.receiveShadow = true
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.85, 18), new THREE.MeshBasicMaterial({ color: 0x08090c }))
  hole.rotation.x = -Math.PI / 2
  hole.scale.set(1.25, 0.8, 1)
  hole.position.y = 0.012
  // a puddle sheen inside
  const water = new THREE.Mesh(new THREE.CircleGeometry(0.5, 14), mat(0x4a6688, { rough: 0.05, metal: 0.6 }))
  water.rotation.x = -Math.PI / 2
  water.scale.set(1.25, 0.8, 1)
  water.position.y = 0.014
  // a warning cone at the far edge, with a glowing band so it shows at night too
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.85, 12), mat(0xff6a13, { rough: 0.6, emissive: 0xff5a00, emissiveIntensity: 0.35 }))
  cone.position.set(0.55, 0.45, -0.62)
  cone.castShadow = true
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.13, 12), mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.9 }))
  band.position.set(0.55, 0.45, -0.62)
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.06, 0.56), mat(0x1b1d22))
  base.position.set(0.55, 0.025, -0.62)
  g.add(rim, hole, water, cone, band, base)
  return g
}

const GLOW_GEO = new THREE.SphereGeometry(0.75, 12, 8)
const GLOW_MAT = new THREE.MeshBasicMaterial({ color: 0xffc94d, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending })
const RING_MAT = new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false })
const RING_GEO = new THREE.RingGeometry(0.55, 0.78, 32)
export function parcel() {
  const g = new THREE.Group()
  const spin = new THREE.Group()
  spin.name = 'spin'
  const brown = mat(0xc98b4f, { rough: 0.8 })
  const b = box(0.62, 0.48, 0.62, brown, 0, 0, 0)
  const tape = mat(0xf1e3c8, { rough: 0.6 })
  spin.add(b, box(0.64, 0.5, 0.12, tape, 0, 0, 0), box(0.12, 0.5, 0.64, tape, 0, 0, 0))
  spin.position.y = 0.95
  g.add(spin)
  // a soft glowing ring under it so it reads as "grab me"
  const ring = new THREE.Mesh(RING_GEO, RING_MAT)
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.03
  ring.name = 'ring'
  const glow = new THREE.Mesh(GLOW_GEO, GLOW_MAT)
  glow.position.y = 0.95
  glow.name = 'glow'
  g.add(ring, glow)
  return g
}

// ₦ coins: lines of them along a free lane
let nairaTex: THREE.Texture | null = null
let coinFace: THREE.MeshStandardMaterial | null = null
let coinRim: THREE.Material | null = null
const COIN_GEO = new THREE.CylinderGeometry(0.34, 0.34, 0.08, 20)
export function coin() {
  nairaTex ??= canvasTexture(128, 128, (c) => {
    c.fillStyle = '#f6c21a'; c.beginPath(); c.arc(64, 64, 62, 0, Math.PI * 2); c.fill()
    c.strokeStyle = '#c99300'; c.lineWidth = 8; c.beginPath(); c.arc(64, 64, 52, 0, Math.PI * 2); c.stroke()
    c.fillStyle = '#9a6b00'; c.font = '900 72px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('₦', 64, 68)
  })
  const g = new THREE.Group()
  const spin = new THREE.Group()
  spin.name = 'spin'
  // one shared pair of materials for every coin, so long coin trails stay cheap to draw
  coinFace ??= new THREE.MeshStandardMaterial({ map: nairaTex, emissive: 0xffc23a, emissiveMap: nairaTex, emissiveIntensity: 0.35, roughness: 0.3, metalness: 0.5 })
  coinRim ??= mat(0xe0a800, { rough: 0.3, metal: 0.6, emissive: 0xffb000, emissiveIntensity: 0.2 })
  const c = new THREE.Mesh(COIN_GEO, [coinRim, coinFace, coinFace])
  c.rotation.x = Math.PI / 2
  spin.add(c)
  spin.position.y = 0.75
  g.add(spin)
  return g
}

const POWER_RING = new THREE.RingGeometry(0.6, 0.85, 32)
function powerBase(color: number) {
  const g = new THREE.Group()
  const ring = new THREE.Mesh(POWER_RING, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }))
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.03
  ring.name = 'ring'
  const glow = new THREE.Mesh(GLOW_GEO, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending }))
  glow.position.y = 1
  const spin = new THREE.Group()
  spin.name = 'spin'
  spin.position.y = 1
  g.add(ring, glow, spin)
  return { g, spin }
}

// Go-slow buster: a lightning bolt. Speeds you up and lets you slip through traffic for a few seconds
export function boost() {
  const { g, spin } = powerBase(0x45d0ff)
  const m = mat(0xffe24a, { emissive: 0xffc400, emissiveIntensity: 0.9, rough: 0.3 })
  const a = box(0.22, 0.6, 0.14, m, 0.08, 0.2, 0); a.rotation.z = -0.5
  const b = box(0.22, 0.6, 0.14, m, -0.08, -0.2, 0); b.rotation.z = -0.5
  const mid = box(0.4, 0.14, 0.14, m, 0, 0, 0)
  spin.add(a, b, mid)
  return g
}

// Parcel magnet: pulls ₦ coins and parcels to you from every lane
export function magnet() {
  const { g, spin } = powerBase(0xff4d6d)
  const red = mat(0xe63946, { rough: 0.35, metal: 0.3, emissive: 0xff2a3a, emissiveIntensity: 0.4 })
  const tip = mat(0xe9ecef, { metal: 0.6, rough: 0.3 })
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.1, 8, 16, Math.PI), red)
  arc.rotation.z = Math.PI
  spin.add(arc, box(0.2, 0.28, 0.2, red, -0.28, 0.14, 0), box(0.2, 0.28, 0.2, red, 0.28, 0.14, 0), box(0.2, 0.12, 0.2, tip, -0.28, 0.33, 0), box(0.2, 0.12, 0.2, tip, 0.28, 0.33, 0))
  return g
}

export const build: Record<Kind, () => THREE.Group> = { danfo, car, keke, okada, pothole, parcel, coin, boost, magnet }

// ---------- scenery ----------
// faded Lagos paint: cream, peach, terracotta, faded blue, sage, dusty pink, pale yellow, brown, concrete grey, white
const WALLS = [0xe6dcc6, 0xdfae8e, 0xc58a6e, 0xa7b9c3, 0xb3c2a2, 0xdcb8ae, 0xe2cf92, 0xb59e82, 0xc4c0b8, 0xece8de]

// Weathered facades, drawn once and shared by every wall colour (the colour tints them). One texture is
// four window bays by three storeys (12.8 m x 9 m), mapped in metres so windows line up with real floors.
export const FACADE_W = 12.8
export const FACADE_H = 9
const PX = 20 // pixels per metre
type FacadeKind = 'louvre' | 'slider' | 'commercial' | 'curtain'
const facadeCache = new Map<FacadeKind, { map: THREE.Texture; glow: THREE.Texture }>()
function facade(kind: FacadeKind) {
  let f = facadeCache.get(kind)
  if (f) return f
  const W = FACADE_W * PX, H = FACADE_H * PX
  const day = document.createElement('canvas'); day.width = W; day.height = H
  const night = document.createElement('canvas'); night.width = W; night.height = H
  const c = day.getContext('2d')!, n = night.getContext('2d')!
  if (kind === 'curtain') {
    // an office tower's glass curtain wall: panels between aluminium mullions, a floor band every 3 m,
    // the sky reflected lighter towards the top of each panel, some panels tinted darker
    n.fillStyle = '#000'; n.fillRect(0, 0, W, H)
    const pw = 1.6 * PX, ph = 3 * PX
    for (let y = 0; y < H; y += ph) for (let x = 0; x < W; x += pw) {
      const tone = 150 + Math.random() * 60
      const grd = c.createLinearGradient(0, y, 0, y + ph)
      grd.addColorStop(0, `rgb(${tone + 40},${tone + 55},${tone + 70})`); grd.addColorStop(1, `rgb(${tone - 30},${tone - 15},${tone})`)
      c.fillStyle = grd; c.fillRect(x, y, pw, ph)
      if (Math.random() < 0.6) { n.fillStyle = Math.random() < 0.75 ? '#fff1c8' : '#cfe3ff'; n.fillRect(x + 2, y + 6, pw - 4, ph - 14) }
    }
    c.fillStyle = '#d9dde2'; for (let x = 0; x < W; x += pw) c.fillRect(x, 0, 2, H) // mullions
    c.fillStyle = '#5c6670'; for (let y = 0; y < H; y += ph) c.fillRect(0, y + ph - 6, W, 6) // floor bands
  } else {
  // old paint: uneven, faded, with patches where plaster has peeled to grey block
  c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H)
  for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${Math.random() * 0.05})`; c.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 10, 2 + Math.random() * 10) }
  for (let i = 0; i < 6; i++) { c.fillStyle = `rgba(120,115,105,${0.18 + Math.random() * 0.15})`; c.beginPath(); c.ellipse(Math.random() * W, Math.random() * H, 6 + Math.random() * 14, 4 + Math.random() * 9, Math.random(), 0, Math.PI * 2); c.fill() }
  n.fillStyle = '#000'; n.fillRect(0, 0, W, H)
  const bayW = 3.2 * PX, storeyH = 3 * PX
  for (let s = 0; s < 3; s++) for (let b = 0; b < 4; b++) {
    const x0 = b * bayW, top = H - (s + 1) * storeyH // canvas y grows down; storey 0 is at the bottom
    const ww = (kind === 'commercial' ? 2.2 : 1.4) * PX, wh = (kind === 'commercial' ? 1.7 : 1.3) * PX
    const wx = x0 + (bayW - ww) / 2, wy = top + 0.9 * PX
    // a ledge line between floors, darker where water sits
    c.fillStyle = 'rgba(70,65,58,0.28)'; c.fillRect(x0, top + storeyH - 3, bayW, 3)
    // rain streaks running down from the sill and from the floor above
    for (let k = 0; k < 4; k++) {
      const sx = wx + Math.random() * ww, len = (0.8 + Math.random() * 1.4) * PX
      const grd = c.createLinearGradient(0, wy + wh, 0, wy + wh + len)
      grd.addColorStop(0, 'rgba(40,38,34,0.32)'); grd.addColorStop(1, 'rgba(40,38,34,0)')
      c.fillStyle = grd; c.fillRect(sx, wy + wh, 2 + Math.random() * 3, len)
    }
    for (let k = 0; k < 3; k++) {
      const sx = x0 + Math.random() * bayW, len = (0.4 + Math.random() * 0.9) * PX
      const grd = c.createLinearGradient(0, top, 0, top + len)
      grd.addColorStop(0, 'rgba(40,38,34,0.25)'); grd.addColorStop(1, 'rgba(40,38,34,0)')
      c.fillStyle = grd; c.fillRect(sx, top, 3 + Math.random() * 4, len)
    }
    // the window: frame, glass (louvre slats or sliding panes), sometimes a curtain, burglar-proof bars
    c.fillStyle = '#cfc9bc'; c.fillRect(wx - 3, wy - 3, ww + 6, wh + 6)
    c.fillStyle = kind === 'commercial' ? '#3d4b5a' : '#4a5563'; c.fillRect(wx, wy, ww, wh)
    if (Math.random() < 0.45) { c.fillStyle = ['#b23a3a', '#e3c27a', '#6a8caf', '#f1e9d8', '#7a5c8e'][Math.floor(Math.random() * 5)]; c.fillRect(wx + (Math.random() < 0.5 ? 0 : ww / 2), wy, ww / 2, wh) }
    if (kind === 'louvre') { c.fillStyle = 'rgba(220,230,240,0.35)'; for (let y = wy + 3; y < wy + wh; y += 4) c.fillRect(wx, y, ww, 1.2) }
    else { c.fillStyle = '#9aa1a8'; c.fillRect(wx + ww / 2 - 1, wy, 2, wh) }
    // burglar-proof bars on homes; offices and shops in the business districts have plain glass
    if (kind !== 'commercial') {
      c.strokeStyle = '#1f242b'; c.lineWidth = 1.6
      for (let bx = wx + 4; bx < wx + ww; bx += 5) { c.beginPath(); c.moveTo(bx, wy); c.lineTo(bx, wy + wh); c.stroke() }
      c.beginPath(); c.moveTo(wx, wy + wh / 2); c.lineTo(wx + ww, wy + wh / 2); c.stroke()
    }
    // at night some windows glow, some stay dark
    if (Math.random() < 0.55) { n.fillStyle = Math.random() < 0.8 ? '#ffd27a' : '#cfe3ff'; n.fillRect(wx, wy, ww, wh) }
  }
  }
  const mk = (cv: HTMLCanvasElement) => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t }
  f = { map: mk(day), glow: mk(night) }
  facadeCache.set(kind, f)
  return f
}

// one material per colour and facade; they all light up at dusk (the game sets that once a frame)
const facadeMats = new Map<string, THREE.MeshStandardMaterial>()
const allWalls: THREE.MeshStandardMaterial[] = []
export function wallMaterial(color: number, kind: FacadeKind = 'louvre') {
  const key = `${color}-${kind}`
  let m = facadeMats.get(key)
  if (!m) {
    const f = facade(kind)
    const glass = kind === 'curtain'
    m = new THREE.MeshStandardMaterial({ color, map: f.map, roughness: glass ? 0.35 : 0.92, metalness: glass ? 0.15 : 0, flatShading: true, emissiveMap: f.glow, emissive: glass ? 0xfff1d6 : 0xffc46b, emissiveIntensity: 0 })
    m.userData.uv = [FACADE_W, FACADE_H] // map in metres
    facadeMats.set(key, m)
    allWalls.push(m)
  }
  return m
}
export const WALL_COLORS = WALLS
// every facade material made so far, for the night lights; also the plain colour list for old callers
export function wallMaterials() {
  if (!allWalls.length) for (const c of WALLS) wallMaterial(c)
  return allWalls
}

export function building(side: -1 | 1) {
  const g = new THREE.Group()
  const w = 4 + Math.random() * 4
  const h = 4 + Math.random() * 9
  const d = 5 + Math.random() * 5
  const wall = wallMaterials()[Math.floor(Math.random() * WALLS.length)]
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wall)
  body.position.y = h / 2
  body.castShadow = true
  body.receiveShadow = true
  g.add(body)
  // a shop awning on some
  if (Math.random() < 0.55) {
    const aw = box(0.9, 0.12, d * 0.8, mat([0xe63946, 0x2a9d8f, 0xf4a261, 0x2f5bd3][Math.floor(Math.random() * 4)]), -side * (w / 2 + 0.4), 2.6, 0)
    aw.rotation.z = side * 0.25
    g.add(aw)
  }
  // a water tank on the roof, very Lagos
  if (Math.random() < 0.5) {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.1, 12), mat(0x222831))
    tank.position.set((Math.random() - 0.5) * w * 0.5, h + 0.55, (Math.random() - 0.5) * d * 0.4)
    tank.castShadow = true
    g.add(tank)
  }
  g.userData.width = w
  g.userData.depth = d
  return g
}

export function palm() {
  const g = new THREE.Group()
  const trunkMat = mat(0x8b5e3c, { rough: 0.9 })
  let y = 0
  for (let i = 0; i < 6; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.14 - i * 0.012, 0.17 - i * 0.012, 0.9, 7), trunkMat)
    seg.position.set(i * 0.06, y + 0.45, 0)
    seg.rotation.z = -0.05
    seg.castShadow = true
    g.add(seg)
    y += 0.88
  }
  const leaf = mat(0x2d8a3e, { rough: 0.7 })
  for (let i = 0; i < 7; i++) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.28, 2.2, 4), leaf)
    const a = (i / 7) * Math.PI * 2
    f.position.set(0.36 + Math.cos(a) * 0.8, y, Math.sin(a) * 0.8)
    f.rotation.set(Math.sin(a) * 1.25, 0, -Math.cos(a) * 1.25)
    f.castShadow = true
    g.add(f)
  }
  return g
}

export const BULB_MAT = new THREE.MeshStandardMaterial({ color: 0xfff2c4, emissive: 0xffd98a, emissiveIntensity: 0.2 })
export function streetLight(side: -1 | 1) {
  const g = new THREE.Group()
  const pole = mat(0x3a3f4a, { metal: 0.5, rough: 0.4 })
  g.add(box(0.12, 5, 0.12, pole, 0, 2.5, 0))
  g.add(box(1.3, 0.1, 0.12, pole, -side * 0.6, 5, 0))
  const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.3), BULB_MAT)
  bulb.position.set(-side * 1.15, 4.92, 0)
  bulb.name = 'bulb'
  g.add(bulb)
  return g
}

let billboardTex: THREE.Texture | null = null
export function billboard(side: -1 | 1) {
  billboardTex ??= canvasTexture(512, 256, (c) => {
    const grd = c.createLinearGradient(0, 0, 512, 256)
    grd.addColorStop(0, '#2f5bd3'); grd.addColorStop(1, '#0b1738')
    c.fillStyle = grd; c.fillRect(0, 0, 512, 256)
    c.fillStyle = '#ffffff'; c.beginPath(); c.roundRect(28, 64, 128, 128, 28); c.fill()
    c.fillStyle = '#2f5bd3'; c.font = '900 96px Arial Black, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('K', 92, 134)
    c.textAlign = 'left'; c.fillStyle = '#ffffff'; c.font = '900 72px Arial Black, Arial'; c.fillText('Kiakia', 182, 108)
    c.fillStyle = '#f6c21a'; c.font = '700 30px Arial'; c.fillText('Same-day delivery', 184, 168)
    c.fillStyle = '#b9c3e3'; c.font = '600 22px Arial'; c.fillText('kiakia-ng.vercel.app', 184, 206)
  })
  const g = new THREE.Group()
  const pole = mat(0x2b2f38, { metal: 0.4 })
  g.add(box(0.2, 6, 0.2, pole, -1.6, 3, 0), box(0.2, 6, 0.2, pole, 1.6, 3, 0))
  const board = new THREE.Mesh(new THREE.PlaneGeometry(5, 2.5), new THREE.MeshStandardMaterial({ map: billboardTex, emissive: 0xffffff, emissiveMap: billboardTex, emissiveIntensity: 0.25, side: THREE.DoubleSide }))
  board.position.y = 6.2
  board.rotation.y = side * -0.5
  board.castShadow = true
  g.add(board)
  return g
}

// ---------- delivery-shift stops: a glowing pad on the road, a light beam you can see from far away,
// and a sign with the place name ----------
export type StopType = 'pickup' | 'dropoff' | 'fuel'
const STOP_COLOR: Record<StopType, number> = { pickup: 0x3d7bff, dropoff: 0x2fd27a, fuel: 0xffb020 }
const STOP_LABEL: Record<StopType, string> = { pickup: 'PICK UP', dropoff: 'DELIVER', fuel: 'FUEL' }
const BEAM_GEO = new THREE.CylinderGeometry(0.9, 0.9, 14, 20, 1, true)
const PAD_GEO = new THREE.PlaneGeometry(2.1, 3)

function signTexture(type: StopType, name: string) {
  return canvasTexture(512, 200, (c) => {
    const col = '#' + STOP_COLOR[type].toString(16).padStart(6, '0')
    c.fillStyle = 'rgba(8,14,36,0.92)'; c.beginPath(); c.roundRect(4, 4, 504, 192, 36); c.fill()
    c.fillStyle = col; c.beginPath(); c.roundRect(4, 4, 504, 64, [36, 36, 0, 0]); c.fill()
    c.fillStyle = '#ffffff'; c.font = '800 40px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'
    c.fillText(STOP_LABEL[type], 256, 38)
    let size = 46
    c.font = `700 ${size}px Arial`
    while (c.measureText(name).width > 470 && size > 24) { size -= 2; c.font = `700 ${size}px Arial` }
    c.fillText(name, 256, 132)
  })
}

export function stopMarker(type: StopType, name: string) {
  const g = new THREE.Group()
  const color = STOP_COLOR[type]
  const pad = new THREE.Mesh(PAD_GEO, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, depthWrite: false }))
  pad.rotation.x = -Math.PI / 2
  pad.position.y = 0.02
  const edge = new THREE.Mesh(new THREE.RingGeometry(1.15, 1.35, 4, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false }))
  edge.rotation.set(-Math.PI / 2, 0, Math.PI / 4)
  edge.scale.set(1.25, 1.75, 1)
  edge.position.y = 0.03
  edge.name = 'edge'
  const beam = new THREE.Mesh(BEAM_GEO, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }))
  beam.position.y = 7
  beam.name = 'beam'
  const tex = signTexture(type, name)
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.4), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }))
  sign.position.y = 3.4
  sign.name = 'sign'
  g.add(pad, edge, beam, sign)
  if (type === 'fuel') {
    const pump = new THREE.Group()
    pump.add(box(0.7, 1.6, 0.5, mat(0xd62828), 0, 0.8, 0), box(0.5, 0.35, 0.05, mat(0x111111), 0, 1.25, -0.27))
    pump.position.set(1.9, 0, 0)
    g.add(pump)
  }
  g.userData.dispose = () => { tex.dispose(); (sign.geometry as THREE.BufferGeometry).dispose() }
  return g
}

// a concrete electricity pole with a crossarm, insulators and the wires sagging to the next pole
// (POLE_GAP metres up the road), now and then with a transformer: the wires are everywhere in Lagos
export const POLE_GAP = 24
const WIRE_MAT = new THREE.LineBasicMaterial({ color: 0x1b1d21 })
export function electricPole(side: -1 | 1) {
  const g = new THREE.Group()
  const conc = mat(0x9c978e, { rough: 0.9 })
  g.add(box(0.22, 8.4, 0.22, conc, 0, 4.2, 0))
  g.add(box(2.4, 0.14, 0.14, mat(0x5a4632), 0, 7.6, 0)) // the crossarm (across the pavement)
  const ins = mat(0x8fb3c9, { rough: 0.3 })
  const xs = [-1.05, -0.35, 0.35, 1.05].map((x) => x * side)
  for (const x of xs) g.add(box(0.08, 0.18, 0.08, ins, x, 7.76, 0))
  if (Math.random() < 0.15) g.add(box(0.7, 1.0, 0.6, mat(0x6b7280, { metal: 0.4 }), side * 0.45, 6.2, 0)) // transformer
  // each wire droops between this pole and the next one up the road
  const pts: number[] = []
  const N = 10
  for (const x of xs) for (let i = 0; i < N; i++) {
    const t0 = i / N, t1 = (i + 1) / N
    const sag = (t: number) => 7.85 - Math.sin(t * Math.PI) * 0.9
    pts.push(x, sag(t0), -t0 * POLE_GAP, x, sag(t1), -t1 * POLE_GAP)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
  g.add(new THREE.LineSegments(geo, WIRE_MAT))
  return g
}
