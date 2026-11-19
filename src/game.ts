// Kiakia Delivery in 3D: ride up a three-lane Lagos road, switch lanes to dodge danfos, kekes, okadas,
// cars and potholes, and grab parcels on the way. The road speeds up the longer you last, and the
// evening falls as you ride. The rider stays at z = 0; the world moves towards the camera (+z).
import * as THREE from 'three'
import { billboard, build, BULB_MAT, electricPole, palm, POLE_GAP, rider, stopMarker, streetLight, wallMaterials, type Kind, type Look, type StopType } from './models'
import { DISTRICT_LEN, DISTRICTS, disposePlot, footbridge, gantry, junction, nightMaterials, plot, type District } from './districts'
import { garage } from './shop'
import { bake } from './bake'
import { buzz, music, sfx } from './sound'

// game feel: jumping, close calls, combos and a moment of slow motion
const JUMP_TIME = 0.62 // seconds in the air
const JUMP_H = 1.55 // metres at the top of the hop
const CLOSE_WINDOW = 0.9 // a close call counts if you changed lane this recently
const CLOSE_POINTS = 50
const HOP_POINTS = 20
const COIN_POINTS = 5
const COMBO_KEEP = 2.6 // seconds a combo survives without a new catch
const MAX_MULT = 5

// three wide lanes, so changing lanes reads clearly
const LANE_X = [-2.7, 0, 2.7]
const ROAD_HALF = 4.3
const LANE_TIME = 0.26 // seconds for a lane change, eased
// the kerbs, drains and pavements stop just in front of the camera: running them past it
// drew them folded into a V at the bottom of tall phone screens
const STRIP_LEN = 336
const STRIP_Z = 6 - STRIP_LEN / 2
const SPAWN_Z = -150
const DESPAWN_Z = 14

const IDLE_SPEED = 12 // metres per second on the start screen
const START_SPEED = 20
const MAX_SPEED = 44
const SPEED_UP = 0.4 // per second of play
const LIVES = 3
const HIT_GRACE_S = 1.3
const PARCEL_POINTS = 25
const COUNTDOWN_S = 3
const DUSK_AFTER_S = 75 // seconds of riding until it's fully night
const PUFF_GEO = new THREE.SphereGeometry(1, 8, 6)

const NAMES = ['Ada', 'Chidi', 'Tunde', 'Ngozi', 'Femi', 'Bisi', 'Kemi', 'Uche', 'Seun', 'Halima', 'Emeka', 'Funke', 'Musa', 'Zainab', 'Tobi', 'Amaka']
const COIN_VALUE = 10 // naira per coin
const TURN_BONUS = 30
const POWER_EVERY = [20, 30] // seconds between power-ups
const POWER_TIME = { boost: 5, magnet: 9 }
const ITEMS = [
  { name: 'a birthday cake', fragile: true }, { name: 'jollof rice', fragile: true }, { name: 'a phone', fragile: true },
  { name: 'shoes', fragile: false }, { name: 'documents', fragile: false }, { name: 'fabric', fragile: false },
  { name: 'a laptop', fragile: true }, { name: 'groceries', fragile: false }, { name: 'a perfume', fragile: true },
]

// each thing's real half-width (across the road) and half-length (along it), measured from the models
const SIZE: Record<Kind, [number, number]> = { danfo: [0.86, 1.95], car: [0.8, 1.8], keke: [0.66, 1.25], okada: [0.26, 0.92], pothole: [0.95, 0.62], parcel: [0.5, 0.45], coin: [0.42, 0.4], boost: [0.6, 0.55], magnet: [0.6, 0.55] }
const RIDER_HW = 0.32 // the rider and bike, half-width and half-length
const RIDER_HL = 0.95
const FORGIVE = 0.14 // shaved off every hitbox so a near miss is a miss
// how fast each kind comes towards you relative to the road (1 = lying on the road)
// All traffic moves with the flow at the same pace, so rows never drift into each other and close
// every lane; potholes lie on the road (pace 1), so they're placed further out to arrive with their row.
const TRAFFIC_PACE = 0.76
const PACE: Record<Kind, number> = { danfo: TRAFFIC_PACE, car: TRAFFIC_PACE, keke: TRAFFIC_PACE, okada: TRAFFIC_PACE, pothole: 1, parcel: 1, coin: 1, boost: 1, magnet: 1 }
const POTHOLE_LEAD = -SPAWN_Z / TRAFFIC_PACE + SPAWN_Z // extra distance so a pothole reaches you with its row
// things you collect rather than crash into
const PICKUP_KINDS: Kind[] = ['parcel', 'coin', 'boost', 'magnet']

interface Thing { kind: Kind; lane: number; obj: THREE.Group; wobble: number; wheels: THREE.Object3D[]; spinner?: THREE.Object3D; ring?: THREE.Object3D; air?: number; passed?: boolean; hopped?: boolean; arced?: boolean }
export interface RunStats { distance: number; coins: number; closeCalls: number; hops: number; bestCombo: number; bonus: number }
interface Prop { obj: THREE.Object3D; len: number; side: -1 | 1; kind: 'building' | 'palm' | 'light' | 'billboard' | 'pole' }
interface Burst { points: THREE.Points; vel: Float32Array; life: number }
interface Puff { mesh: THREE.Mesh; life: number; vx: number; vy: number }

export interface HudState { score: number; parcels: number; lives: number }
export type Mode = 'arcade' | 'shift'
export interface ShiftState {
  stage: 'pickup' | 'dropoff' | 'between'
  place: string
  item: string
  fragile: boolean
  toGo: number // metres to the next stop
  timeLeft: number // seconds the customer is promised
  earnings: number // naira, after Kiakia's 12%
  deliveries: number
  rating: number | null
  fuel: number // 0-100
  damage: number // 0-100, the parcel you're carrying
  lives: number
}
export interface ShiftSummary { deliveries: number; earnings: number; rating: number | null; reason: string; best: boolean }
export type Power = 'boost' | 'magnet'
// coins, the area you're in, the power-up running and the turn to make
export interface ExtraState { coins: number; district: string; power: { kind: Power; left: number; total: number } | null; turn: 'left' | 'right' | null; turnTo: string; mult: number; combo: number; comboLeft: number }
export interface GameEvents {
  hud(s: HudState): void
  over(s: HudState): void
  shift(s: ShiftState): void
  shiftOver(s: ShiftSummary): void
  toast(title: string, body: string, tone: 'good' | 'bad' | 'info'): void
  countdown(n: number | null): void
  popup(text: string): void
  flash(): void
  extra(s: ExtraState): void
  area(name: string): void
}

function canvasTexture(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  draw(canvas.getContext('2d')!)
  const t = new THREE.CanvasTexture(canvas)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = 8
  return t
}

// sky colours for golden hour and for night; everything in between is blended
const SKY = {
  day: { top: new THREE.Color(0x5f86c9), mid: new THREE.Color(0xf2b57a), bottom: new THREE.Color(0xf3d9b5), sun: new THREE.Color(0xffc98a), hemi: new THREE.Color(0xbcd4ff) },
  night: { top: new THREE.Color(0x050a1f), mid: new THREE.Color(0x2a1f5c), bottom: new THREE.Color(0xd2557a), sun: new THREE.Color(0x7d8cff), hemi: new THREE.Color(0x2b3566) },
}

export class Game {
  readonly renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(60, 1, 0.1, 400)
  private clock = new THREE.Clock()
  private sun = new THREE.DirectionalLight(0xffffff, 2.4)
  private hemi = new THREE.HemisphereLight(0xbcd4ff, 0x3a2a1a, 0.9)
  private headlight = new THREE.SpotLight(0xfff1cf, 0, 28, 0.45, 0.6, 1.4)
  private skyMat: THREE.ShaderMaterial
  private roadTex: THREE.Texture
  private walkTex: THREE.Texture
  private kerbTex: THREE.Texture
  private drainTex: THREE.Texture
  private player = rider()
  private things: Thing[] = []
  private props: Prop[] = []
  private bursts: Burst[] = []
  private puffs: Puff[] = []
  private streaks: THREE.LineSegments
  private sunDisc!: THREE.Mesh
  private camK = 0 // 0 on wide screens, up to 1 on tall phones: the camera pulls back so all three lanes fit
  private on: GameEvents

  private mode: Mode = 'arcade'
  private job = { stage: 'between' as ShiftState['stage'], from: '', to: '', item: '', fragile: false, toGo: 0, timeLeft: 0, fare: 0, damage: 0, wait: 0 }
  private stop: { type: StopType; lane: number; obj: THREE.Group; z: number } | null = null
  private earnings = 0
  private deliveries = 0
  private ratings: number[] = []
  private fuel = 100
  private shiftTick = 0
  private lane = 1
  private x = 0
  private laneFrom = 0
  private laneT = 1
  private camX = 0
  private bridges: THREE.Object3D[] = []
  private untilBridge = 260
  private speed = IDLE_SPEED
  private distance = 0
  private untilRow = 60
  private parcels = 0
  private lives = LIVES
  private grace = 0
  private time = 0
  private countdown = 0
  private shake = 0
  private dusk = 0
  private running = false
  private paused = false

  // the Lagos run: which area you're in, where the next one starts and the sign or junction before it
  private dIdx = 0
  private lmArea = '' // the area whose landmark has been placed
  private nextAt = DISTRICT_LEN
  private marker: { objs: THREE.Object3D[]; z: number; dir: 'straight' | 'left' | 'right'; done: boolean } | null = null
  private turning: { t: number; dir: -1 | 1; swapped: boolean } | null = null
  private yaw = 0
  private coins = 0
  private power: { kind: Power; left: number } | null = null
  private untilPower = 25
  private extraTick = 0

  // game feel
  private jumpT = 0 // seconds of air left; 0 on the road
  private hop = 0 // height off the road right now
  private sinceSteer = 9 // seconds since the last lane change, for close calls
  private combo = 0
  private comboLeft = 0
  private bonus = 0
  private timeScale = 1
  private slowLeft = 0
  private roll = 0
  private stats: RunStats = { distance: 0, coins: 0, closeCalls: 0, hops: 0, bestCombo: 0, bonus: 0 }
  private userPaused = false

  constructor(host: HTMLElement, on: GameEvents) {
    this.on = on
    // phones draw at a lower resolution with cheaper shadows; they still look sharp, and stay smooth
    const phone = Math.min(window.innerWidth, window.innerHeight) < 700 || window.matchMedia('(pointer: coarse)').matches
    this.renderer = new THREE.WebGLRenderer({ antialias: window.devicePixelRatio < 2, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, phone ? 1.5 : 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = phone ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    host.appendChild(this.renderer.domElement)

    // sky: a big sphere painted with a three-colour gradient
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { top: { value: SKY.day.top.clone() }, mid: { value: SKY.day.mid.clone() }, bottom: { value: SKY.day.bottom.clone() } },
      vertexShader: 'varying vec3 vPos; void main(){ vPos = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying vec3 vPos; void main(){ float h = vPos.y; vec3 c = h > 0.08 ? mix(mid, top, smoothstep(0.08, 0.55, h)) : mix(bottom, mid, smoothstep(-0.05, 0.08, h)); gl_FragColor = vec4(c, 1.0); }',
    })
    const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), this.skyMat)
    this.scene.add(sky)
    // the setting sun, low over the end of the road
    const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(14, 32), new THREE.MeshBasicMaterial({ color: 0xffe2a8, fog: false }))
    sunDisc.position.set(30, 22, -280)
    this.sunDisc = sunDisc
    this.scene.add(sunDisc)
    // a light harmattan haze softens the far end of the road, so the eye stays on what's coming
    this.scene.fog = new THREE.Fog(SKY.day.bottom.clone(), 34, 150)

    this.scene.add(this.hemi)
    this.sun.position.set(-8, 14, 6)
    this.sun.castShadow = true
    this.sun.shadow.mapSize.set(phone ? 512 : 1024, phone ? 512 : 1024)
    const sc = this.sun.shadow.camera
    sc.left = -14; sc.right = 14; sc.top = 24; sc.bottom = -10; sc.near = 1; sc.far = 60
    this.sun.shadow.bias = -0.0008
    this.scene.add(this.sun, this.sun.target)

    // road, kerbs and pavements, each with a texture that scrolls
    this.roadTex = canvasTexture(256, 512, (c) => {
      // worn Lagos asphalt: darker patches where it's been mended, oil stains, cracks, faded paint
      c.fillStyle = '#4b4f57'; c.fillRect(0, 0, 256, 512)
      for (let i = 0; i < 2600; i++) { c.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${Math.random() * 0.06})`; c.fillRect(Math.random() * 256, Math.random() * 512, 2, 2) }
      for (let i = 0; i < 5; i++) { c.fillStyle = `rgba(20,22,26,${0.25 + Math.random() * 0.2})`; c.fillRect(20 + Math.random() * 200, Math.random() * 480, 18 + Math.random() * 40, 14 + Math.random() * 50) }
      for (let i = 0; i < 6; i++) { c.fillStyle = 'rgba(10,10,12,0.18)'; c.beginPath(); c.ellipse(40 + Math.random() * 176, Math.random() * 512, 8 + Math.random() * 10, 14 + Math.random() * 16, 0, 0, Math.PI * 2); c.fill() }
      c.strokeStyle = 'rgba(15,15,18,0.35)'; c.lineWidth = 1.2
      for (let i = 0; i < 8; i++) { let x = Math.random() * 256, y = Math.random() * 512; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (Math.random() - 0.5) * 18; y += 6 + Math.random() * 10; c.lineTo(x, y) } c.stroke() }
      c.fillStyle = 'rgba(242,194,48,0.85)'; c.fillRect(6, 0, 6, 512); c.fillRect(244, 0, 6, 512)
      for (const x of [85, 168]) for (let y = 0; y < 512; y += 128) { c.fillStyle = `rgba(238,241,246,${0.55 + Math.random() * 0.3})`; c.fillRect(x - 3, y + 20, 6, 70) }
    })
    this.roadTex.repeat.set(1, 18)
    const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_HALF * 2, 360), new THREE.MeshStandardMaterial({ map: this.roadTex, roughness: 0.92 }))
    road.rotation.x = -Math.PI / 2
    road.position.z = -150
    road.receiveShadow = true
    this.scene.add(road)
    this.kerbTex = canvasTexture(32, 128, (c) => { c.fillStyle = '#111'; c.fillRect(0, 0, 32, 128); c.fillStyle = '#f6c21a'; c.fillRect(0, 0, 32, 64) })
    this.kerbTex.repeat.set(1, 90)
    this.walkTex = canvasTexture(128, 128, (c) => {
      c.fillStyle = '#b9b2a5'; c.fillRect(0, 0, 128, 128)
      c.strokeStyle = 'rgba(70,60,50,0.35)'; c.lineWidth = 3
      for (let i = 0; i <= 128; i += 32) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, 128); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(128, i); c.stroke() }
    })
    this.walkTex.repeat.set(2, 90)
    this.drainTex = canvasTexture(32, 128, (c) => {
      c.fillStyle = '#9b968c'; c.fillRect(0, 0, 32, 128)
      c.fillStyle = '#1c1f22'; c.fillRect(7, 0, 18, 128)
      c.fillStyle = 'rgba(70,80,60,0.5)'; for (let y = 0; y < 128; y += 9) c.fillRect(8 + Math.random() * 10, y, 6, 4)
      c.fillStyle = '#7d786f'; for (let y = 0; y < 128; y += 32) c.fillRect(0, y, 32, 4) // slab joints
    })
    this.drainTex.repeat.set(1, 90)
    for (const side of [-1, 1] as const) {
      const kerb = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.22, STRIP_LEN), new THREE.MeshStandardMaterial({ map: this.kerbTex, roughness: 0.8 }))
      kerb.position.set(side * (ROAD_HALF + 0.17), 0.11, STRIP_Z)
      kerb.receiveShadow = true
      // an open concrete drain between the kerb and the pavement, as along most Lagos roads
      const drain = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, STRIP_LEN), new THREE.MeshStandardMaterial({ map: this.drainTex, roughness: 0.9 }))
      drain.position.set(side * (ROAD_HALF + 0.62), 0.2, STRIP_Z)
      drain.receiveShadow = true
      this.scene.add(drain)
      const walk = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.2, STRIP_LEN), new THREE.MeshStandardMaterial({ map: this.walkTex, roughness: 0.95 }))
      walk.position.set(side * (ROAD_HALF + 0.35 + 2.2), 0.1, STRIP_Z)
      walk.receiveShadow = true
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 360), new THREE.MeshStandardMaterial({ color: 0x6b5a45, roughness: 1 }))
      ground.rotation.x = -Math.PI / 2
      ground.position.set(side * 48, -0.01, -150)
      this.scene.add(kerb, walk, ground)
    }

    // the street on both sides: buildings with gaps, then palms, lights and the odd billboard
    for (const side of [-1, 1] as const) {
      this.buildStreet(side, DISTRICTS[0])
      for (let z2 = 6; z2 > SPAWN_Z; z2 -= 16) {
        const r = Math.random()
        const kind: Prop['kind'] = r < 0.06 ? 'billboard' : r < 0.55 ? 'palm' : 'light'
        // each one merged into a couple of meshes, so a long street stays light on phones
        const p = bake(kind === 'billboard' ? billboard(side) : kind === 'palm' ? palm() : streetLight(side))
        p.position.set(side * (ROAD_HALF + 1.4 + (kind === 'billboard' ? 2.2 : 0)), 0.2, z2 + side * 4)
        if (kind === 'palm') p.rotation.y = Math.random() * Math.PI * 2
        this.scene.add(p)
        this.props.push({ obj: p, len: 16, side, kind })
      }
      // electricity poles in their own row, so each one's wires reach the next
      for (let z3 = 2; z3 > SPAWN_Z - 30; z3 -= POLE_GAP) {
        const pole = bake(electricPole(side))
        pole.position.set(side * (ROAD_HALF + 1.15), 0.2, z3)
        this.scene.add(pole)
        this.props.push({ obj: pole, len: POLE_GAP, side, kind: 'pole' })
      }
    }

    this.setLook(garage.look())

    // speed streaks near the camera once you're going fast
    const sg = new THREE.BufferGeometry()
    const pos = new Float32Array(60 * 6)
    for (let i = 0; i < 60; i++) this.resetStreak(pos, i, true)
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    this.streaks = new THREE.LineSegments(sg, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, fog: false }))
    this.scene.add(this.streaks)

    this.fit()
    const warm: THREE.Object3D[] = (['danfo', 'car', 'keke', 'okada', 'pothole', 'parcel'] as Kind[]).map((k) => { const o = build[k](); o.position.set(0, 0, -30); this.scene.add(o); return o })
    // everything else that turns up later (footbridges, road signs, junctions, every area's buildings and
    // landmarks) is drawn once now, hidden in the fog, so nothing stutters the first time it appears
    const later: THREE.Object3D[] = [footbridge(), gantry('Kiakia', 'Lagos State', 'left'), junction()]
    for (const d of DISTRICTS) later.push(plot(d, 1), plot(d, 1, true))
    for (const o of later) { o.position.set(0, 0, -30); this.scene.add(o); warm.push(o) }
    this.puff(0, -20, 0.1, false)
    this.renderer.compile(this.scene, this.camera)
    this.renderer.render(this.scene, this.camera)
    for (const o of warm) this.scene.remove(o)
    for (const o of later) { disposePlot(o); (o.userData.dispose as (() => void) | undefined)?.() }
    window.addEventListener('resize', () => this.fit())
    window.addEventListener('orientationchange', () => setTimeout(() => this.fit(), 300))
    window.visualViewport?.addEventListener('resize', () => this.fit())
    if ('ResizeObserver' in window) new ResizeObserver(() => this.fit()).observe(host)
    document.addEventListener('visibilitychange', () => { this.paused = document.hidden; this.clock.getDelta() })
    this.renderer.setAnimationLoop(() => this.frame())
  }

  get playing() { return this.running }

  // the bike and outfit from the garage
  setLook(look: Look) {
    this.scene.remove(this.player.group)
    this.player = rider(look)
    this.player.group.position.x = this.x
    this.scene.add(this.player.group)
    // one real light for the headlamp (no shadows, so it stays cheap on phones); dark until dusk
    this.headlight.position.set(0, 1, -0.8)
    this.headlight.target.position.set(0, 0, -10)
    this.player.group.add(this.headlight, this.headlight.target)
  }

  // ---------- the Lagos run ----------
  private get area(): District { return DISTRICTS[this.dIdx % DISTRICTS.length] }
  private get nextArea(): District { return DISTRICTS[(this.dIdx + 1) % DISTRICTS.length] }
  // the area a spot `ahead` metres up the road belongs to: straight-on areas start at their sign,
  // but past a junction you're still on the same road until you actually turn
  private areaAhead(ahead: number): District {
    return this.distance + ahead >= this.nextAt && this.nextArea.enter === 'straight' ? this.nextArea : this.area
  }

  // one side of the street, from the camera to the far end, all in one area's style. Only the near
  // part is built at once; the rest follows one plot a frame (see streetQ), so a turn never stutters
  private addPlot(side: -1 | 1, d: District, z: number) {
    // the area's landmark stands a little way up the road on the right, so you see it as you arrive
    const lm = side === 1 && z < -45 && this.lmArea !== d.name
    if (lm) this.lmArea = d.name
    const b = plot(d, side, lm)
    const w = b.userData.width as number
    const dep = b.userData.depth as number
    b.position.set(side * (ROAD_HALF + 4.9 + w / 2 + Math.random() * 1.5), 0, z - dep / 2)
    this.scene.add(b)
    const prop: Prop = { obj: b, len: dep + 1 + Math.random() * 3, side, kind: 'building' }
    this.props.push(prop)
    return prop
  }
  private streetQ: { side: -1 | 1; d: District; last: Prop }[] = []
  private buildStreet(side: -1 | 1, d: District) {
    let z = 10
    let last: Prop | null = null
    while (z > -50) { last = this.addPlot(side, d, z); z -= last.len }
    if (last) this.streetQ.push({ side, d, last })
  }
  private continueStreet() {
    for (let i = this.streetQ.length - 1; i >= 0; i--) {
      const q = this.streetQ[i]
      const z = q.last.obj.position.z + (q.last.obj.userData.depth as number) / 2 - q.last.len
      if (z <= SPAWN_Z - 40) { this.streetQ.splice(i, 1); continue }
      q.last = this.addPlot(q.side, q.d, z)
    }
  }
  // palms, lamps and billboards to suit the area: no palms or adverts on the bridge, palms everywhere on the beach
  private dress(p: Prop, d: District) {
    // coconut palms where they really grow: the beach, Lekki, Ikoyi, VI; few in the markets
    if (p.kind === 'palm') p.obj.visible = d.style !== 'bridge' && Math.random() < d.palms * 0.8
    else if (p.kind === 'billboard') p.obj.visible = d.style !== 'bridge' && d.style !== 'beach' && Math.random() < 0.4
    else if (p.kind === 'light') p.obj.visible = true
    else if (p.kind === 'pole') p.obj.visible = d.style !== 'bridge' && d.style !== 'towers'
  }
  // swap the whole street for a new area (after a turn, or at the start of a run)
  private rebuildStreet() {
    this.lmArea = ''
    this.streetQ = []
    for (let i = this.props.length - 1; i >= 0; i--) {
      const p = this.props[i]
      if (p.kind !== 'building') continue
      this.scene.remove(p.obj)
      disposePlot(p.obj)
      this.props.splice(i, 1)
    }
    this.buildStreet(-1, this.area)
    this.buildStreet(1, this.area)
    // between runs nothing is moving, so the whole street can be laid out at once
    if (!this.running) while (this.streetQ.length) this.continueStreet()
    for (const p of this.props) this.dress(p, this.area)
  }
  private clearBridges() {
    for (const b of this.bridges) { this.scene.remove(b); disposePlot(b) }
    this.bridges = []
  }
  private clearMarker() {
    if (!this.marker) return
    for (const o of this.marker.objs) { this.scene.remove(o); (o.userData.dispose as (() => void) | undefined)?.() }
    this.marker = null
  }
  // the sign (and junction) before the next area comes into view
  private placeMarker(ahead: number) {
    const next = this.nextArea
    const objs: THREE.Object3D[] = []
    if (next.enter === 'straight') {
      const g = gantry(`Welcome to ${next.name}`, next.style === 'bridge' ? 'Mind your speed · Lagos Lagoon' : 'Lagos State', 'straight')
      g.position.z = -ahead
      objs.push(g)
    } else {
      const j = junction()
      j.position.z = -ahead
      const g = gantry(next.name, `Turn ${next.enter} at the junction`, next.enter)
      g.position.z = -ahead + 30
      objs.push(j, g)
      // no buildings sitting on the crossroads
      for (const p of this.props) {
        const half = p.kind === 'building' ? (p.obj.userData.depth as number) / 2 : 1
        if (Math.abs(p.obj.position.z + ahead) < half + 5) p.obj.visible = false
      }
    }
    for (const o of objs) this.scene.add(o)
    this.marker = { objs, z: -ahead, dir: next.enter, done: false }
  }
  private enterNext() {
    this.dIdx++
    this.nextAt = this.distance + DISTRICT_LEN
    this.on.area(this.area.name)
    this.emitExtra()
  }
  private startTurn(dir: -1 | 1) {
    if (!this.marker) return
    this.marker.done = true
    this.turning = { t: 0, dir, swapped: false }
    sfx.swish()
  }
  // halfway through the turn, when the camera is looking down the side street, the new area appears
  private finishTurn() {
    for (const t of this.things) this.scene.remove(t.obj)
    this.things = []
    this.clearMarker()
    this.clearBridges()
    if (this.stop) this.clearStop()
    this.enterNext()
    this.rebuildStreet()
    this.untilRow = 40
    this.coins += TURN_BONUS / COIN_VALUE
    garage.earn(TURN_BONUS)
    this.on.popup(`Nice turn! +₦${TURN_BONUS}`)
    sfx.coin()
  }
  private emitExtra() {
    const m = this.marker
    const turnSoon = m && !m.done && m.dir !== 'straight' && m.z > -45 && m.z < 3 ? m.dir : null
    this.on.extra({
      coins: this.coins, district: this.area.name, turn: turnSoon, turnTo: this.nextArea.name,
      power: this.power ? { kind: this.power.kind, left: this.power.left, total: POWER_TIME[this.power.kind] } : null,
      mult: this.mult, combo: this.combo, comboLeft: this.comboLeft / COMBO_KEEP,
    })
  }

  // for automated play-testing only (switched on with ?bot in the address)
  readonly hits: { kind: Kind; dx: number; dz: number }[] = []
  debug() {
    return {
      lane: this.lane, x: this.x, stop: this.stop ? { lane: this.stop.lane, z: this.stop.z, type: this.stop.type } : null,
      things: this.things.map((t) => ({ kind: t.kind, lane: t.lane, x: t.obj.position.x, z: t.obj.position.z })),
      job: { ...this.job }, earnings: this.earnings, deliveries: this.deliveries, fuel: this.fuel, lives: this.lives, running: this.running,
    }
  }

  // play-testing only: jump to an area and keep the rider safe, to look at every part of Lagos
  peek(i: number) {
    this.dIdx = i; this.nextAt = this.distance + DISTRICT_LEN; this.clearMarker(); this.rebuildStreet()
    for (const t of this.things) this.scene.remove(t.obj)
    this.things = []; this.lives = 99
  }

  fit() {
    const host = this.renderer.domElement.parentElement!
    // measured every time the screen changes (rotating, Safari's bars, iPad split view); never 0
    const w = host.clientWidth || window.innerWidth, h = host.clientHeight || window.innerHeight
    if (!w || !h) return
    // false: the CSS keeps the canvas filling the screen, so a stale size can't leave it as a strip
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    // tall phone screens: the camera rises and pulls back, so all three lanes and the traffic in them fit
    const aspect = w / h
    this.camK = THREE.MathUtils.clamp((1.05 - aspect) / 0.6, 0, 1)
    this.camera.userData.baseFov = 58 + this.camK * 10
    this.camera.updateProjectionMatrix()
  }

  // the menu: show the street of the area the rider will start in
  preview(from: number) {
    if (this.running || this.dIdx === from) return
    this.dIdx = from
    this.clearMarker()
    this.rebuildStreet()
  }

  start(mode: Mode = 'arcade', from = 0) {
    this.mode = mode
    // start in the area the rider picked (jobs come from there too)
    const fresh = this.dIdx !== from
    this.dIdx = from
    for (const t of this.things) this.scene.remove(t.obj)
    this.things = []
    this.clearStop()
    this.earnings = 0
    this.deliveries = 0
    this.ratings = []
    this.fuel = 100
    if (mode === 'shift') this.newJob(true)
    this.lane = 1
    this.speed = START_SPEED
    this.distance = 0
    this.untilRow = 70
    this.parcels = 0
    this.lives = LIVES
    this.grace = 0
    this.time = 0
    this.dusk = 0
    this.countdown = COUNTDOWN_S
    this.coins = 0
    this.jumpT = 0; this.hop = 0; this.sinceSteer = 9
    this.combo = 0; this.comboLeft = 0; this.bonus = 0
    this.timeScale = 1; this.slowLeft = 0
    this.userPaused = false; this.paused = false
    this.stats = { distance: 0, coins: 0, closeCalls: 0, hops: 0, bestCombo: 0, bonus: 0 }
    music.start(); music.intensity = 0
    this.power = null
    this.untilPower = 18 + Math.random() * 8
    this.turning = null
    this.yaw = 0
    this.clearMarker()
    this.clearBridges()
    this.untilBridge = 200
    this.laneFrom = this.x
    this.laneT = 0
    this.nextAt = DISTRICT_LEN
    if (fresh) this.rebuildStreet()
    this.on.area(this.area.name)
    this.emitExtra()
    this.running = true
    this.player.group.visible = true
    this.emitHud()
    if (mode === 'shift') this.emitShift()
  }

  steer(dir: -1 | 1) {
    if (!this.running || this.countdown > 0 || this.turning) return
    // at a junction, swiping the way the sign points takes the turn
    const m = this.marker
    if (m && !m.done && m.dir !== 'straight' && m.z > -7 && m.z < 3 && dir === (m.dir === 'left' ? -1 : 1)) { this.startTurn(dir); return }
    const next = Math.max(0, Math.min(2, this.lane + dir))
    if (next !== this.lane) { this.laneFrom = this.x; this.laneT = 0; this.lane = next; this.sinceSteer = 0; sfx.swish() }
  }

  // hop: clears potholes and reaches the coins that float above them
  jump() {
    if (!this.running || this.countdown > 0 || this.turning || this.jumpT > 0 || this.userPaused) return
    this.jumpT = JUMP_TIME
    sfx.jump()
  }

  // pause from the button, Esc or P; the music waits too
  pause(on: boolean) {
    if (!this.running) return
    this.userPaused = on
    this.paused = on || document.hidden
    music.pause(on)
    this.clock.getDelta()
  }
  get isPaused() { return this.userPaused }
  // leave a run without a results screen (from the pause menu)
  quit() {
    this.running = false
    this.userPaused = false; this.paused = false
    this.grace = 0; this.jumpT = 0; this.hop = 0
    this.player.group.visible = true
    this.clearStop()
    music.stop(0.3)
  }
  get runStats(): RunStats { return { ...this.stats, distance: Math.round(this.distance), bonus: this.bonus } }

  // the multiplier grows with every catch in a row: ×2 after 8, ×3 after 16 ... up to ×5
  private get mult() { return Math.min(MAX_MULT, 1 + Math.floor(this.combo / 8)) }
  private catch(points: number) {
    const before = this.mult
    this.combo++
    this.comboLeft = COMBO_KEEP
    this.stats.bestCombo = Math.max(this.stats.bestCombo, this.combo)
    this.bonus += points * this.mult
    if (this.mult > before) { this.on.popup(`×${this.mult} combo!`); sfx.combo(this.mult); buzz(20) }
  }

  private score() { return Math.floor(this.distance / 2) + this.parcels * PARCEL_POINTS + this.bonus }
  private emitHud() { this.on.hud({ score: this.score(), parcels: this.parcels, lives: this.lives }) }

  // a new row of traffic: one or two lanes blocked (never all three), often a parcel in a free lane
  private spawnRow() {
    const lanes = [0, 1, 2].sort(() => Math.random() - 0.5)
    const blocked = Math.random() < Math.min(0.4, 0.12 + this.time / 160) ? 2 : 1
    const kinds: Kind[] = this.areaAhead(-SPAWN_Z).traffic
    // during a shift, the lane with the next stop stays clear near it
    const nearStop = this.stop && Math.abs(this.stop.z - SPAWN_Z) < 26 ? this.stop.lane : -1
    const free = nearStop >= 0 ? lanes.filter((l) => l !== nearStop) : lanes
    // never all three lanes: at least one stays open in every row
    for (let i = 0; i < Math.min(blocked, free.length - (nearStop >= 0 ? 0 : 1), 2); i++) {
      const kind = kinds[Math.floor(Math.random() * kinds.length)]
      this.addThing(kind, free[i], kind === 'pothole' ? POTHOLE_LEAD : 0)
    }
    if (this.mode === 'arcade' && Math.random() < 0.3) this.addThing('parcel', lanes[2], 0)
    // a trail of ₦ coins down the free lane: most rows have one, some long, some weaving across to the next free lane
    else if (Math.random() < 0.7) {
      const n = 6 + Math.floor(Math.random() * 6)
      const weave = blocked === 1 && Math.random() < 0.35
      for (let k = 0; k < n; k++) this.addThing('coin', weave && k >= n / 2 ? lanes[1] : lanes[2], 5 + k * 2.4)
    }
    // over a pothole, sometimes an arc of coins you can only reach by jumping
    for (const t of this.things) if (t.kind === 'pothole' && !t.arced && t.obj.position.z < SPAWN_Z + 1 && t.obj.position.z > SPAWN_Z - POTHOLE_LEAD - 1 && Math.random() < 0.6) {
      t.arced = true // one arc per pothole
      for (let k = 0; k < 5; k++) this.addThing('coin', t.lane, -(t.obj.position.z - SPAWN_Z) - 4.8 + k * 2.4, Math.sin((k / 4) * Math.PI) * 1.35)
    }
    if (this.untilPower <= 0) {
      this.addThing(Math.random() < 0.5 ? 'boost' : 'magnet', lanes[2], 22)
      this.untilPower = POWER_EVERY[0] + Math.random() * (POWER_EVERY[1] - POWER_EVERY[0])
    }
  }
  private addThing(kind: Kind, lane: number, offset: number, air = 0) {
    const obj = build[kind]()
    obj.position.set(LANE_X[lane] + (kind === 'pothole' || PICKUP_KINDS.includes(kind) ? 0 : (Math.random() - 0.5) * 0.3), air, SPAWN_Z - offset)
    this.scene.add(obj)
    const wheels: THREE.Object3D[] = []
    obj.traverse((o) => { if (o.parent !== obj && o.type === 'Group' && o.children.length === 2) wheels.push(o) })
    this.things.push({ kind, lane, obj, wobble: Math.random() * 10, wheels, spinner: obj.getObjectByName('spin'), ring: obj.getObjectByName('ring'), air })
  }

  // ---------- delivery shift ----------
  private newJob(first = false) {
    const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]
    const item = pick(ITEMS)
    // jobs come from the area you're riding through (the bridge has none, so the next area's)
    const d = this.area.places.length ? this.area : this.nextArea
    this.job = {
      stage: 'pickup', from: pick(d.places), to: `${pick(NAMES)} · ${pick(d.streets)}`, item: item.name, fragile: item.fragile,
      toGo: first ? 220 : 260 + Math.random() * 220, timeLeft: 0, fare: 0, damage: 0, wait: 0,
    }
    this.job.timeLeft = this.job.toGo / 20 + 14
  }

  private clearStop() {
    if (!this.stop) return
    this.scene.remove(this.stop.obj)
    ;(this.stop.obj.userData.dispose as () => void)?.()
    this.stop = null
  }

  private placeStop(type: StopType, name: string, ahead: number) {
    this.clearStop()
    const lane = Math.floor(Math.random() * 3)
    const obj = stopMarker(type, name)
    const z = -ahead
    obj.position.set(LANE_X[lane], 0, z)
    this.scene.add(obj)
    // move any traffic out of that lane near the stop
    for (let i = this.things.length - 1; i >= 0; i--) {
      const t = this.things[i]
      // slower traffic just ahead would be caught up by the stop, so clear 35 m ahead of it too
      const dz = t.obj.position.z - z
      if (t.lane === lane && dz > -14 && dz < 35) { this.scene.remove(t.obj); this.things.splice(i, 1) }
    }
    this.stop = { type, lane, obj, z }
  }

  private emitShift() {
    const avg = this.ratings.length ? this.ratings.reduce((a, b) => a + b, 0) / this.ratings.length : null
    this.on.shift({
      stage: this.job.stage, place: this.job.stage === 'pickup' ? this.job.from : this.job.to, item: this.job.item, fragile: this.job.fragile,
      toGo: Math.max(0, this.job.toGo), timeLeft: this.job.timeLeft, earnings: this.earnings, deliveries: this.deliveries,
      rating: avg, fuel: this.fuel, damage: this.job.damage, lives: this.lives,
    })
  }

  private endShift(reason: string) {
    this.running = false
    music.stop(1)
    this.grace = 0
    this.player.group.visible = true
    this.clearStop()
    const avg = this.ratings.length ? this.ratings.reduce((a, b) => a + b, 0) / this.ratings.length : null
    this.on.shiftOver({ deliveries: this.deliveries, earnings: this.earnings, rating: avg, reason, best: false })
  }

  private updateShift(dt: number, move: number) {
    const j = this.job
    // fuel burns with distance; a station appears when it runs low
    this.fuel = Math.max(0, this.fuel - move / 42)
    if (this.fuel <= 0) { this.endShift('You ran out of fuel.'); return }

    if (j.stage === 'between') {
      j.wait -= dt
      if (j.wait <= 0) this.newJob()
    } else {
      j.toGo -= move
      j.timeLeft -= dt
    }

    const wantFuel = this.fuel < 28 && (!this.stop || this.stop.type !== 'fuel') && (j.stage === 'between' || j.toGo > 140)
    if (wantFuel) { this.placeStop('fuel', `Total, ${this.area.style === 'bridge' ? 'Oworonshoki' : this.area.name}`, 110); this.on.toast('Fuel low · station ahead', '', 'info') }
    else if (j.stage !== 'between' && !this.stop && j.toGo < 150) this.placeStop(j.stage === 'pickup' ? 'pickup' : 'dropoff', j.stage === 'pickup' ? j.from : j.to, j.toGo)

    if (this.stop) {
      const st = this.stop
      st.z += move
      st.obj.position.z = st.z
      const beam = st.obj.getObjectByName('beam')
      if (beam) beam.rotation.y += dt
      const sign = st.obj.getObjectByName('sign')
      if (sign) sign.position.y = 3.4 + Math.sin(performance.now() / 300) * 0.12
      const inLane = Math.abs(LANE_X[st.lane] - this.x) < 1.1
      if (inLane && Math.abs(st.z) < 1.7) this.arrive(st.type)
      else if (st.z > 4) {
        // rode past it
        const type = st.type
        this.clearStop()
        if (type === 'fuel') this.on.toast('Missed the station', '', 'bad')
        else { j.toGo = 180; this.on.toast(`Missed the ${type === 'pickup' ? 'pickup' : 'drop-off'}`, '', 'bad'); sfx.crash() }
      }
    }

    this.shiftTick -= dt
    if (this.shiftTick <= 0) { this.emitShift(); this.shiftTick = 0.15 }
  }

  private arrive(type: StopType) {
    const j = this.job
    const at = new THREE.Vector3(this.x, 1, -0.5)
    this.clearStop()
    if (type === 'fuel') {
      const litres = Math.round((100 - this.fuel) * 0.06 * 10) / 10
      const cost = Math.round(litres * 1150 / 10) * 10
      this.fuel = 100
      this.earnings -= cost
      this.burst(at, 0xffb020)
      sfx.coin()
      this.on.popup(`Fuel −₦${cost.toLocaleString('en-NG')}`)
      return
    }
    if (type === 'pickup') {
      const trip = 360 + Math.random() * 360
      j.stage = 'dropoff'
      j.toGo = trip
      j.timeLeft = trip / 21 + 12
      j.fare = Math.round((900 + trip * 2.2) / 50) * 50 // what the customer pays
      this.burst(at, 0x3d7bff)
      sfx.coin()
      this.on.popup('Picked up!')
      this.emitShift()
      return
    }
    // delivered
    const late = j.timeLeft < 0
    let pay = j.fare * 0.88 // the rider keeps 88%
    if (late) pay *= 0.85
    pay *= 1 - j.damage / 200
    const tip = !late && j.damage === 0 && j.timeLeft > 8 ? 200 : 0
    pay = Math.round((pay + tip) / 10) * 10
    let stars = 5 - (late ? 1.5 : 0) - j.damage / 30
    stars = Math.max(1, Math.round(stars * 2) / 2)
    this.earnings += pay
    this.deliveries++
    this.ratings.push(stars)
    garage.earn(50) // every delivery adds ₦50 to your garage wallet too
    this.burst(at, 0x2fd27a)
    sfx.coin()
    this.on.popup(`+₦${pay.toLocaleString('en-NG')}`)
    // the popup shows the pay; no extra message
    j.stage = 'between'
    j.wait = 2.5
    this.emitShift()
  }

  // the sign or junction before the next area: place it, move it, and see whether you turned
  private updateRoute(move: number) {
    const toNext = this.nextAt - this.distance
    if (!this.marker && !this.turning && toNext < 170 && toNext > 20) this.placeMarker(toNext)
    const m = this.marker
    if (m) {
      m.z += move
      // the sign goes once you've ridden under it, so it can't block the camera behind you
      for (const o of m.objs) {
        o.position.z += move
        if (o.userData.dispose && o.position.z > 1) o.visible = false
        // the junction's traffic lights go once you're past them, so they can't block the camera
        if (o.position.z > -4) o.traverse((c) => { if (c.name === 'tl') c.visible = false })
      }
      if (!m.done) {
        if (m.dir === 'straight' && toNext <= 0) { m.done = true; this.enterNext() }
        else if (m.dir !== 'straight' && m.z > 3.5) {
          // rode straight past the junction: stay in this area, another turn comes up later
          m.done = true
          this.nextAt = this.distance + 320
          this.on.toast('Missed the turn', '', 'bad')
          sfx.crash()
        }
      }
      if (m.done && m.objs.every((o) => o.position.z > DESPAWN_Z + 40)) this.clearMarker()
    }
    // pedestrian bridges over the busier roads
    this.untilBridge -= move
    if (this.untilBridge <= 0) {
      if (['busy', 'town', 'market', 'campus', 'estate'].includes(this.areaAhead(170).style) && !this.marker) {
        const b = footbridge()
        b.position.z = -170
        this.scene.add(b)
        this.bridges.push(b)
      }
      this.untilBridge = 380 + Math.random() * 260
    }
    for (let i = this.bridges.length - 1; i >= 0; i--) {
      const b = this.bridges[i]
      b.position.z += move
      if (b.position.z > DESPAWN_Z + 20) { this.scene.remove(b); disposePlot(b); this.bridges.splice(i, 1) }
    }
    this.extraTick -= move / Math.max(this.speed, 1)
    if (this.extraTick <= 0) { this.emitExtra(); this.extraTick = 0.12 }
  }

  private resetStreak(pos: Float32Array, i: number, anywhere = false) {
    const side = Math.random() < 0.5 ? -1 : 1
    const x = side * (2 + Math.random() * 6)
    const y = 0.5 + Math.random() * 5
    const z = anywhere ? -Math.random() * 60 : -60 - Math.random() * 10
    pos.set([x, y, z, x, y, z - 3 - Math.random() * 3], i * 6)
  }

  // a small gold sparkle where a coin was caught (fewer particles than a full burst)
  private sparkle(at: THREE.Vector3) { this.burst(new THREE.Vector3(at.x, at.y + 0.75, at.z), 0xffd34d, 10) }

  private burst(at: THREE.Vector3, color: number, n = 40) {
    const g = new THREE.BufferGeometry()
    const p = new Float32Array(n * 3)
    const v = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      p.set([at.x, at.y, at.z], i * 3)
      const a = Math.random() * Math.PI * 2, u = Math.random() * 2 - 1, s = 3 + Math.random() * 4
      v.set([Math.cos(a) * Math.sqrt(1 - u * u) * s, Math.abs(u) * s + 2, Math.sin(a) * Math.sqrt(1 - u * u) * s], i * 3)
    }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3))
    const points = new THREE.Points(g, new THREE.PointsMaterial({ color, size: 0.22, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))
    this.scene.add(points)
    this.bursts.push({ points, vel: v, life: 0.9 })
  }

  private puff(x: number, z: number, size: number, dark: boolean) {
    const m = new THREE.Mesh(PUFF_GEO, new THREE.MeshBasicMaterial({ color: dark ? 0x3a3a3f : 0xdedede, transparent: true, opacity: dark ? 0.7 : 0.14, depthWrite: false }))
    m.scale.setScalar(size)
    m.position.set(x, dark ? 0.5 : 0.32, z)
    this.scene.add(m)
    this.puffs.push({ mesh: m, life: dark ? 1.2 : 0.35, vx: (Math.random() - 0.5) * 1.2, vy: dark ? 1.4 : 0.3 })
  }

  private frame() {
    const dt = Math.min(0.05, this.clock.getDelta())
    if (this.paused) return
    // a moment of slow motion after a close call or the last crash, easing back to full speed
    if (this.slowLeft > 0) { this.slowLeft -= dt; this.timeScale = THREE.MathUtils.lerp(this.timeScale, 0.4, Math.min(1, dt * 18)) }
    else this.timeScale = THREE.MathUtils.lerp(this.timeScale, 1, Math.min(1, dt * 6))
    this.update(dt * this.timeScale)
    this.renderer.render(this.scene, this.camera)
  }

  private update(dt: number) {
    let move = 0
    if (this.running) {
      if (this.countdown > 0) {
        const before = Math.ceil(this.countdown)
        this.countdown -= dt
        const now = Math.ceil(this.countdown)
        if (this.countdown <= 0) { this.on.countdown(null); sfx.coin() } else if (now !== before || this.countdown > COUNTDOWN_S - dt) { this.on.countdown(now); sfx.swish() }
        move = IDLE_SPEED * dt
      } else {
        this.time += dt
        this.speed = this.mode === 'shift' ? Math.min(38, 18 + 0.25 * this.time) : Math.min(MAX_SPEED, START_SPEED + SPEED_UP * this.time)
        // the Go-slow buster: faster, and you slip through traffic
        if (this.power?.kind === 'boost') this.speed *= 1.35
        move = this.speed * dt
        this.distance += move
        if (!this.turning) {
          this.untilRow -= move
          this.untilPower -= dt
          if (this.untilRow <= 0) { this.spawnRow(); this.untilRow = this.speed * (1.15 + Math.random() * 0.5) }
        }
        if (this.power) {
          this.power.left -= dt
          if (this.power.left <= 0) { this.power = null; this.emitExtra() }
        }
        this.sinceSteer += dt
        if (this.comboLeft > 0) { this.comboLeft -= dt; if (this.comboLeft <= 0) { this.combo = 0; this.emitExtra() } }
        music.intensity = (this.speed - START_SPEED) / (MAX_SPEED - START_SPEED)
        this.updateRoute(move)
        if (Math.floor(this.distance / 2) !== Math.floor((this.distance - move) / 2)) this.emitHud()
        if (this.mode === 'shift') this.updateShift(dt, move)
      }
    } else {
      move = IDLE_SPEED * dt
    }

    // evening falls as you ride
    this.dusk = Math.min(1, this.running ? this.time / DUSK_AFTER_S : 0)
    const d = this.dusk
    ;(this.skyMat.uniforms.top.value as THREE.Color).copy(SKY.day.top).lerp(SKY.night.top, d)
    ;(this.skyMat.uniforms.mid.value as THREE.Color).copy(SKY.day.mid).lerp(SKY.night.mid, d)
    ;(this.skyMat.uniforms.bottom.value as THREE.Color).copy(SKY.day.bottom).lerp(SKY.night.bottom, d)
    ;(this.scene.fog as THREE.Fog).color.copy(this.skyMat.uniforms.bottom.value as THREE.Color)
    this.sun.color.copy(SKY.day.sun).lerp(SKY.night.sun, d)
    this.sun.intensity = 2.4 - d * 1.3
    this.hemi.color.copy(SKY.day.hemi).lerp(SKY.night.hemi, d)
    this.hemi.intensity = 0.95 - d * 0.3
    this.sunDisc.position.y = 22 - d * 40
    // lit windows and streetlights, set once for every building and lamp
    for (const m of wallMaterials()) m.emissiveIntensity = d * 1.4
    for (const m of nightMaterials) m.emissiveIntensity = d * 0.5
    BULB_MAT.emissiveIntensity = 0.2 + d * 3
    // the bike's own lights only come on once it's dark, then its headlamp lights up the road and the cars ahead
    this.player.setNight(d)
    this.headlight.intensity = THREE.MathUtils.smoothstep(d, 0.6, 0.75) * 40

    // the world scrolls towards the camera
    const roadShift = move / 20
    this.roadTex.offset.y += roadShift
    this.kerbTex.offset.y += move / 4
    this.drainTex.offset.y += move / 4
    this.walkTex.offset.y += move / 4
    // at most one new building per frame, so a burst of them never makes a frame late on a slow phone
    let built = false
    // a new street still being laid out ahead: carry on with it, and don't recycle its buildings meanwhile
    if (this.streetQ.length) { this.continueStreet(); built = true }
    for (const p of this.props) {
      p.obj.position.z += move
      if (p.obj.position.z > DESPAWN_Z + 8 && !(p.kind === 'building' && built)) {
        // send it back to the far end of its row
        let far: Prop | null = null
        for (const q of this.props) if (q.side === p.side && q.kind === p.kind && q !== p && (!far || q.obj.position.z < far.obj.position.z)) far = q
        const farZ = far ? far.obj.position.z : 0
        if (p.kind === 'building') {
          built = true
          // a new plot in the style of the area it will be in
          const farHalf = far ? (far.obj.userData.depth as number) / 2 : 0
          const gap = 1 + Math.random() * 3
          const ahead = this.areaAhead(-(farZ - farHalf - gap))
          // the first plot of a new area on the right is its landmark
          const lm = p.side === 1 && this.lmArea !== ahead.name
          if (lm) this.lmArea = ahead.name
          const b = plot(ahead, p.side, lm)
          const dep = b.userData.depth as number
          b.position.set(p.side * (ROAD_HALF + 4.9 + (b.userData.width as number) / 2 + Math.random() * 1.5), 0, farZ - farHalf - gap - dep / 2)
          this.scene.remove(p.obj)
          disposePlot(p.obj)
          this.scene.add(b)
          p.obj = b
        } else {
          p.obj.position.z = farZ - p.len
          this.dress(p, this.areaAhead(-p.obj.position.z))
        }
      }
    }

    // the rider: glide to the lane, lean into it, spin the wheels
    // an eased lane change: quick to start, gentle to settle, with a lean that follows it
    const targetX = LANE_X[this.lane]
    if (this.laneT < 1) {
      this.laneT = Math.min(1, this.laneT + dt / LANE_TIME)
      const e = 1 - Math.pow(1 - this.laneT, 3)
      this.x = this.laneFrom + (targetX - this.laneFrom) * e
    } else this.x = targetX
    this.player.group.position.x = this.x
    const lean = THREE.MathUtils.clamp((this.x - targetX) * 0.16, -0.32, 0.32)
    this.player.lean.rotation.z = THREE.MathUtils.damp(this.player.lean.rotation.z, lean, 9, dt)
    // the hop: up and down in an arc, a little tilt back on the way up, a puff of dust on landing
    if (this.jumpT > 0) {
      this.jumpT = Math.max(0, this.jumpT - dt)
      const k = 1 - this.jumpT / JUMP_TIME
      this.hop = Math.sin(k * Math.PI) * JUMP_H
      this.player.lean.rotation.x = -Math.sin(k * Math.PI * 2) * 0.12
      if (this.jumpT === 0) { this.hop = 0; this.player.lean.rotation.x = 0; this.puff(this.x, 0.2, 0.25, false); this.puff(this.x, -0.2, 0.22, false); sfx.land(); this.shake = Math.max(this.shake, 0.08) }
    }
    this.player.group.position.y = this.hop + Math.sin(performance.now() / 90) * 0.015
    const spin = (this.running && this.countdown <= 0 ? this.speed : IDLE_SPEED) * dt / 0.34
    for (const w of this.player.wheels) w.rotation.x -= spin
    if (this.grace > 0) {
      this.grace -= dt
      this.player.group.visible = this.grace > 0 ? Math.floor(this.grace * 12) % 2 === 0 : true
    }

    // traffic and parcels
    for (let i = this.things.length - 1; i >= 0; i--) {
      const t = this.things[i]
      t.obj.position.z += (this.running ? this.speed : IDLE_SPEED) * PACE[t.kind] * dt
      t.wobble += dt
      if (t.kind === 'parcel' || t.kind === 'boost' || t.kind === 'magnet') {
        t.spinner!.rotation.y += dt * 2.4
        t.spinner!.position.y = (t.kind === 'parcel' ? 0.95 : 1) + Math.sin(t.wobble * 3) * 0.15
        t.ring!.scale.setScalar(1 + Math.sin(t.wobble * 6) * 0.1)
      } else if (t.kind === 'coin') {
        t.spinner!.rotation.y += dt * 4
      }
      // the parcel magnet pulls coins and parcels across to you
      if (this.power?.kind === 'magnet' && (t.kind === 'coin' || t.kind === 'parcel') && t.obj.position.z > -32 && t.obj.position.z < 2) {
        t.obj.position.x += (this.x - t.obj.position.x) * Math.min(1, dt * 7)
      } else if (t.kind !== 'pothole' && !PICKUP_KINDS.includes(t.kind)) {
        t.obj.position.x = LANE_X[t.lane] + Math.sin(t.wobble * 0.8) * 0.05
        const turn = this.speed * PACE[t.kind] * dt / 0.35
        for (const w of t.wheels) w.rotation.x -= turn
      }
      if (t.obj.position.z > DESPAWN_Z) {
        this.scene.remove(t.obj)
        this.things.splice(i, 1)
        continue
      }
      // collisions: same lane (by position, so mid-change still counts) and overlapping along the road
      if (!this.running || this.countdown > 0 || this.turning) continue
      // a close call: a vehicle in the next lane goes past just after you swerved out of its way
      if (!t.passed && t.obj.position.z > 1.4 && t.kind !== 'pothole' && !PICKUP_KINDS.includes(t.kind)) {
        t.passed = true
        const dx = Math.abs(t.obj.position.x - this.x)
        if (dx > 1.4 && dx < 3.4 && this.sinceSteer < CLOSE_WINDOW && this.grace <= 0) {
          this.stats.closeCalls++
          this.catch(CLOSE_POINTS)
          this.on.popup(`Close call! +${CLOSE_POINTS * this.mult}`)
          this.slowLeft = 0.28
          sfx.close(); buzz(15)
          this.sinceSteer = 9 // one close call per swerve
        }
      }
      // a hit only when the two boxes really overlap, using the vehicle's actual position and size
      const [hw, hl] = SIZE[t.kind]
      const give = PICKUP_KINDS.includes(t.kind) ? -0.25 : FORGIVE // pickups are easy to grab, vehicles easy to slip past
      const overlapX = Math.abs(t.obj.position.x - this.x) < hw + RIDER_HW - give
      const overlapZ = Math.abs(t.obj.position.z - -0.05) < hl + RIDER_HL - give
      if (!overlapX || !overlapZ) continue
      if (t.kind === 'coin') {
        // coins in the air only come to you if you're up there with them
        if (Math.abs((t.air ?? 0) - this.hop) > 0.8) continue
        this.coins++
        this.stats.coins++
        garage.earn(COIN_VALUE)
        this.catch(COIN_POINTS)
        sfx.tick(this.combo % 12)
        this.sparkle(t.obj.position)
        this.scene.remove(t.obj)
        this.things.splice(i, 1)
        this.emitExtra()
        continue
      }
      // jumping over a pothole: no damage, and a little bonus
      if (t.kind === 'pothole' && this.hop > 0.3) {
        if (!t.hopped) { t.hopped = true; this.stats.hops++; this.catch(HOP_POINTS); this.on.popup(`Hop! +${HOP_POINTS * this.mult}`) }
        continue
      }
      if (t.kind === 'boost' || t.kind === 'magnet') {
        this.power = { kind: t.kind, left: POWER_TIME[t.kind] }
        this.burst(new THREE.Vector3(t.obj.position.x, 1, t.obj.position.z), t.kind === 'boost' ? 0x45d0ff : 0xff4d6d)
        this.on.popup(t.kind === 'boost' ? 'Go-slow buster!' : 'Parcel magnet!')
        sfx.power()
        this.scene.remove(t.obj)
        this.things.splice(i, 1)
        this.emitExtra()
        continue
      }
      if (t.kind === 'parcel') {
        this.parcels++
        this.catch(0)
        this.burst(new THREE.Vector3(t.obj.position.x, 1, t.obj.position.z), 0xffd34d)
        this.on.popup(`+${PARCEL_POINTS}`)
        sfx.coin()
        this.scene.remove(t.obj)
        this.things.splice(i, 1)
        this.emitHud()
      } else if (this.grace <= 0 && this.power?.kind !== 'boost') {
        this.hits.push({ kind: t.kind, dx: Math.abs(t.obj.position.x - this.x), dz: Math.abs(t.obj.position.z + 0.05) })
        this.lives--
        this.grace = HIT_GRACE_S
        this.shake = 0.5
        this.combo = 0; this.comboLeft = 0 // a crash breaks the combo
        this.on.flash()
        sfx.crash(); buzz(this.lives <= 0 ? [60, 40, 120] : 70)
        if (this.lives <= 0) { this.slowLeft = 0.7; music.stop(1.2) }
        for (let k = 0; k < 6; k++) this.puff(this.x + (Math.random() - 0.5), -0.5 + Math.random(), 0.35 + Math.random() * 0.25, true)
        this.burst(new THREE.Vector3(this.x, 1, -0.6), 0xff6b4a)
        this.emitHud()
        if (this.mode === 'shift' && this.job.stage === 'dropoff') {
          const hit = this.job.fragile ? 40 : 25
          this.job.damage = Math.min(100, this.job.damage + hit)
          this.on.toast(`Parcel damaged ${this.job.damage}%`, '', 'bad')
          this.emitShift()
        }
        if (this.lives <= 0) {
          if (this.mode === 'shift') this.endShift('You crashed three times.')
          else {
            this.running = false
            this.grace = 0
            this.player.group.visible = true
            this.on.over({ score: this.score(), parcels: this.parcels, lives: 0 })
          }
        }
      }
    }

    // sparkles and smoke
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i]
      b.life -= dt
      const attr = b.points.geometry.getAttribute('position') as THREE.BufferAttribute
      const p = attr.array as Float32Array
      for (let k = 0; k < p.length; k += 3) {
        b.vel[k + 1] -= 9 * dt
        p[k] += b.vel[k] * dt; p[k + 1] += b.vel[k + 1] * dt; p[k + 2] += b.vel[k + 2] * dt + move
      }
      attr.needsUpdate = true
      ;(b.points.material as THREE.PointsMaterial).opacity = Math.max(0, b.life / 0.9)
      if (b.life <= 0) { this.scene.remove(b.points); b.points.geometry.dispose(); this.bursts.splice(i, 1) }
    }
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const f = this.puffs[i]
      f.life -= dt
      f.mesh.position.x += f.vx * dt
      f.mesh.position.y += f.vy * dt
      f.mesh.position.z += move * 0.9 + dt * 2
      f.mesh.scale.multiplyScalar(1 + dt * 1.6)
      const m = f.mesh.material as THREE.MeshBasicMaterial
      m.opacity = Math.max(0, m.opacity - dt * 0.6)
      if (f.life <= 0) { this.scene.remove(f.mesh); m.dispose(); this.puffs.splice(i, 1) }
    }

    // speed streaks
    const fast = this.running ? Math.max(0, (this.speed - 32) / (MAX_SPEED - 32)) : 0
    const sm = this.streaks.material as THREE.LineBasicMaterial
    sm.opacity = 0.35 * fast
    if (fast > 0) {
      const attr = this.streaks.geometry.getAttribute('position') as THREE.BufferAttribute
      const p = attr.array as Float32Array
      for (let i = 0; i < 60; i++) {
        p[i * 6 + 2] += move * 2.2; p[i * 6 + 5] += move * 2.2
        if (p[i * 6 + 2] > 8) this.resetStreak(p, i)
      }
      attr.needsUpdate = true
    }

    // camera: behind and above the rider, drifting with the lane; wider when fast; shakes on a crash
    const baseFov = (this.camera.userData.baseFov as number) ?? 58
    const fov = baseFov + fast * 12
    if (Math.abs(this.camera.fov - fov) > 0.05) { this.camera.fov += (fov - this.camera.fov) * Math.min(1, dt * 3); this.camera.updateProjectionMatrix() }
    this.shake = Math.max(0, this.shake - dt)
    const sx = (Math.random() - 0.5) * this.shake * 0.8
    const sy = (Math.random() - 0.5) * this.shake * 0.8
    const k = this.camK
    this.camX = THREE.MathUtils.damp(this.camX, this.x, 5, dt)
    this.camera.position.set(this.camX * (0.5 - k * 0.3) + sx, 3.3 + k * 3.4 + sy, 6.6 + k * 5.2)
    this.camera.lookAt(this.camX * (0.7 - k * 0.35), 1.1 - k * 0.3 + this.hop * 0.25, -9 - k * 6)
    // the camera leans with the rider in a lane change, like a real chase cam
    this.roll = THREE.MathUtils.damp(this.roll, this.player.lean.rotation.z * 0.3, 6, dt)
    this.camera.rotateZ(this.roll)
    // turning at a junction: the camera swings into the side street, the new area appears, and it swings back
    if (this.turning) {
      const tr = this.turning
      tr.t += dt / 1.0
      if (tr.t >= 0.5 && !tr.swapped) { tr.swapped = true; this.finishTurn() }
      const e = tr.t < 0.5 ? THREE.MathUtils.smoothstep(tr.t, 0, 0.5) : 1 - THREE.MathUtils.smoothstep(tr.t, 0.5, 1)
      this.yaw = -tr.dir * e * (tr.t < 0.5 ? 1.1 : -1.1)
      if (tr.t >= 1) { this.turning = null; this.yaw = 0 }
    }
    if (this.yaw) this.camera.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), this.yaw)

    // the sun's shadow follows the rider
    this.sun.position.set(this.x - 7, 15, 4)
    this.sun.target.position.set(this.x, 0, -6)
  }
}
