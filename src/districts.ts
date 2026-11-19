// The Lagos run: real areas you ride through one after another, each with its own look, traffic
// and places to pick up from. Some areas join with a junction you have to turn at; others (like
// the bridge) you just ride straight into.
import * as THREE from 'three'
import { bake } from './bake'
import { mat, WALL_COLORS, wallMaterial } from './models'
import type { Kind } from './models'

export type Style = 'estate' | 'towers' | 'leafy' | 'market' | 'bridge' | 'campus' | 'busy' | 'port' | 'beach' | 'town'

export interface District {
  name: string
  style: Style
  walls: number[] // indexes into the shared wall colours (they light up at night)
  height: [number, number]
  palms: number // 0-1, how leafy the street is
  // the traffic mix: more danfos at Oshodi, more okadas at the market, cars on the island
  traffic: Kind[]
  places: string[] // where jobs pick up from
  streets: string[] // where customers live
  // how you get here from the area before: turn at a junction, or ride straight on
  enter: 'straight' | 'left' | 'right'
}

const mix = (danfo: number, car: number, keke: number, okada: number, pothole: number): Kind[] => [
  ...Array<Kind>(danfo).fill('danfo'), ...Array<Kind>(car).fill('car'), ...Array<Kind>(keke).fill('keke'),
  ...Array<Kind>(okada).fill('okada'), ...Array<Kind>(pothole).fill('pothole'),
]

export const DISTRICTS: District[] = [
  { name: 'Lekki Phase 1', style: 'estate', walls: [9, 5, 6, 0], height: [4, 9], palms: 0.7, traffic: mix(1, 3, 1, 1, 1), enter: 'straight',
    places: ['Shoprite, Lekki', 'Circle Mall', 'Lekki Market', 'Ebeano, Chevron'], streets: ['Admiralty Way', 'Fola Osibo Rd', 'Bisola Durosinmi-Etti Dr'] },
  { name: 'Victoria Island', style: 'towers', walls: [9, 0, 8], height: [15, 33], palms: 0.3, traffic: mix(1, 4, 0, 1, 1), enter: 'left',
    places: ['Spar, Victoria Island', 'Eko Hotel', 'Mega Plaza', 'Bogobiri House'], streets: ['Adeola Odeku St', 'Ozumba Mbadiwe Ave', 'Akin Adesola St'] },
  { name: 'Ikoyi', style: 'leafy', walls: [9, 6, 8], height: [4, 8], palms: 1, traffic: mix(0, 4, 0, 1, 1), enter: 'right',
    places: ['Falomo Shopping Centre', 'Ikoyi Club', 'Hard Rock Cafe', 'Polo Club'], streets: ['Bourdillon Rd', 'Awolowo Rd', 'Kingsway Rd'] },
  { name: 'Obalende', style: 'busy', walls: [0, 1, 4, 3], height: [4, 10], palms: 0.2, traffic: mix(4, 1, 2, 2, 2), enter: 'left',
    places: ['Obalende Bus Park', 'Obalende Suya Spot', 'Dodan Barracks Gate'], streets: ['Ojo Giwa St', 'Keffi St', 'Glover Rd'] },
  { name: 'Marina', style: 'towers', walls: [9, 0, 8], height: [12, 30], palms: 0.2, traffic: mix(2, 3, 1, 1, 1), enter: 'straight',
    places: ['CMS Bus Terminal', 'Cathedral Church of Christ', 'Marina Jetty', 'Broad Street Post Office'], streets: ['Marina Rd', 'Force Rd', 'Catholic Mission St'] },
  { name: 'Balogun Market', style: 'market', walls: [2, 0, 3, 5, 1], height: [4, 8], palms: 0.1, traffic: mix(1, 1, 3, 4, 2), enter: 'right',
    places: ['Balogun Market', 'Idumota', 'Tinubu Square', 'Jankara Market'], streets: ['Breadfruit St', 'Martins St', 'Broad St'] },
  { name: 'Third Mainland Bridge', style: 'bridge', walls: [], height: [0, 0], palms: 0, traffic: mix(2, 4, 0, 0, 1), enter: 'straight',
    places: [], streets: [] },
  { name: 'Yaba', style: 'campus', walls: [2, 7, 0, 3], height: [5, 14], palms: 0.4, traffic: mix(2, 2, 2, 2, 2), enter: 'right',
    places: ['Yaba Market', 'Tejuosho Market', 'UNILAG Main Gate', 'Co-Creation Hub'], streets: ['Herbert Macaulay Way', 'Sabo Rd', 'Commercial Ave'] },
  { name: 'Surulere', style: 'town', walls: [1, 4, 6, 7], height: [5, 11], palms: 0.4, traffic: mix(2, 2, 2, 2, 2), enter: 'left',
    places: ['Mama Cass, Surulere', 'National Stadium', 'Ojuelegba Junction', 'Leisure Mall'], streets: ['Bode Thomas St', 'Adeniran Ogunsanya St', 'Ligali Ayorinde St'] },
  { name: 'Oshodi', style: 'busy', walls: [0, 2, 4], height: [4, 12], palms: 0.1, traffic: mix(5, 1, 2, 2, 2), enter: 'straight',
    places: ['Oshodi Interchange', 'Oshodi Market', 'Arena Market'], streets: ['Agege Motor Rd', 'Bolade St', 'Mafoluku Rd'] },
  { name: 'Ikeja', style: 'town', walls: [3, 9, 0, 5], height: [6, 16], palms: 0.5, traffic: mix(2, 3, 1, 2, 1), enter: 'right',
    places: ['Computer Village', 'Ikeja City Mall', 'Allen Avenue Roundabout', 'Ikeja GRA Spar'], streets: ['Allen Avenue', 'Opebi Rd', 'Obafemi Awolowo Way'] },
  { name: 'Agege', style: 'busy', walls: [0, 2, 3, 4], height: [3, 9], palms: 0.3, traffic: mix(3, 1, 3, 3, 2), enter: 'straight',
    places: ['Agege Station', 'Pen Cinema', 'Agege Bread Bakery Row'], streets: ['Old Abeokuta Rd', 'Oba Ogunji Rd', 'Dopemu Rd'] },
  { name: 'Maryland', style: 'town', walls: [9, 1, 8], height: [6, 14], palms: 0.4, traffic: mix(2, 3, 1, 1, 1), enter: 'left',
    places: ['Maryland Mall', 'Maryland Bus Stop', 'Anthony Village Market'], streets: ['Mobolaji Bank Anthony Way', 'Ikorodu Rd', 'Anthony Village Rd'] },
  { name: 'Ketu', style: 'market', walls: [2, 0, 3], height: [3, 8], palms: 0.1, traffic: mix(3, 1, 2, 3, 3), enter: 'straight',
    places: ['Mile 12 Market', 'Ketu Bus Stop', 'Ojota New Garage'], streets: ['Ikorodu Rd', 'Demurin St', 'Ajelogo Rd'] },
  { name: 'Magodo', style: 'estate', walls: [9, 5, 6], height: [4, 8], palms: 0.6, traffic: mix(0, 4, 1, 1, 1), enter: 'left',
    places: ['Magodo Shopping Complex', 'CMD Road Junction', 'Magodo Phase 2 Gate'], streets: ['CMD Rd', 'Shangisha Rd', 'Kosoko St'] },
  { name: 'Ikorodu', style: 'town', walls: [4, 6, 1], height: [3, 7], palms: 0.6, traffic: mix(3, 1, 3, 2, 3), enter: 'right',
    places: ['Ikorodu Garage', 'Ikorodu Market', 'Odogunyan'], streets: ['Lagos Rd', 'Sagamu Rd', 'Ayangburen Rd'] },
  { name: 'Apapa', style: 'port', walls: [9, 3], height: [4, 8], palms: 0.1, traffic: mix(2, 2, 0, 1, 3), enter: 'right',
    places: ['Apapa Wharf', 'Apapa Mall', 'Tin Can Island'], streets: ['Liverpool Rd', 'Creek Rd', 'Warehouse Rd'] },
  { name: 'Festac Town', style: 'estate', walls: [9, 6, 5, 8], height: [5, 10], palms: 0.5, traffic: mix(2, 2, 2, 1, 1), enter: 'left',
    places: ['Festac 2nd Avenue', 'Festac Mall', '7th Avenue Market'], streets: ['22 Road', '4th Avenue', '23 Road'] },
  { name: 'Lekki Conservation Centre', style: 'leafy', walls: [9, 6], height: [3, 6], palms: 0.9, traffic: mix(1, 3, 1, 1, 1), enter: 'right',
    places: ['Lekki Conservation Centre', 'Chevron Roundabout', 'Jakande Market'], streets: ['Lekki-Epe Expressway', 'Orchid Rd', 'Chevron Dr'] },
  { name: 'Ajah', style: 'town', walls: [0, 4, 6], height: [3, 8], palms: 0.6, traffic: mix(3, 2, 2, 2, 2), enter: 'straight',
    places: ['Ajah Market', 'Chicken Republic, Ajah', 'Abraham Adesanya Roundabout'], streets: ['Addo Rd', 'Badore Rd', 'Lekki-Epe Expressway'] },
  { name: 'Badagry', style: 'beach', walls: [9, 6], height: [3, 6], palms: 1, traffic: mix(1, 2, 2, 2, 2), enter: 'right',
    places: ['Badagry Marina', 'Point of No Return', 'Badagry Market'], streets: ['Marina Rd', 'Mobee Rd', 'Topo Rd'] },
]

// how far you ride through each area (metres)
export const DISTRICT_LEN = 620

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]
const rand = (a: number, b: number) => a + Math.random() * (b - a)
const chance = (p: number) => Math.random() < p

// Everything is built from a few shared shapes, then each plot is merged into a handful of meshes
// (one per material), so a street full of detail is still only a few draw calls on a cheap phone.
const BOX = new THREE.BoxGeometry(1, 1, 1)
const CYL = new THREE.CylinderGeometry(1, 1, 1, 10)
const CONE = new THREE.ConeGeometry(1, 1, 8)
const BALL = new THREE.IcosahedronGeometry(1, 0)
const PLANE = new THREE.PlaneGeometry(1, 1)

function part(geo: THREE.BufferGeometry, m: THREE.Material, sx: number, sy: number, sz: number, x: number, y: number, z: number, ry = 0) {
  const mesh = new THREE.Mesh(geo, m)
  mesh.scale.set(sx, sy, sz)
  mesh.position.set(x, y, z)
  mesh.rotation.y = ry
  return mesh
}
const cube = (m: THREE.Material, w: number, h: number, d: number, x: number, y: number, z: number) => part(BOX, m, w, h, d, x, y + h / 2, z)

const GLASS = new THREE.MeshStandardMaterial({ color: 0x5f86b5, roughness: 0.15, metalness: 0.6, flatShading: true, emissive: 0x8fb6ff, emissiveIntensity: 0 })
const GLASS_TEAL = new THREE.MeshStandardMaterial({ color: 0x4f9a9a, roughness: 0.15, metalness: 0.6, flatShading: true, emissive: 0x9ff0e8, emissiveIntensity: 0 })
const WATER = new THREE.MeshStandardMaterial({ color: 0x2d5f7f, roughness: 0.2, metalness: 0.3 })
const SAND = new THREE.MeshStandardMaterial({ color: 0xe0c48e, roughness: 1 })
WATER.userData.noShadow = SAND.userData.noShadow = true
// the glass towers glow a little at night too
export const nightMaterials = [GLASS, GLASS_TEAL]

const CONCRETE = mat(0xb7b2a8, { rough: 0.95 })
// a wall in one of the area's colours, with a weathered facade
type Facade = 'louvre' | 'slider' | 'commercial' | 'curtain'
const wallOf = (d: District, kind: Facade = chance(0.5) ? 'louvre' : 'slider') => wallMaterial(WALL_COLORS[pick(d.walls.length ? d.walls : [9])], kind)
const GRIME = mat(0x5f594f, { rough: 1 })
const AC = mat(0xe4e4e0, { rough: 0.6 })
const CONE4 = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4)
CONE4.rotateY(Math.PI / 4) // a square pyramid: a hipped roof
// long-span roofing sheets in the colours you see on Lagos houses
const ROOFS = [0x7a2e2e, 0x2b4c7e, 0x2f6b4f, 0x5b5f66, 0x8a3b1f].map((c) => mat(c, { rough: 0.5, metal: 0.4 }))
const LAUNDRY = [0xffffff, 0xd62828, 0x1d4ed8, 0xf6c21a, 0x15803d, 0xe0569b, 0xf77f00].map((c) => mat(c, { rough: 0.9 }))

// fence walls: off-white, grimy at the bottom, some painted with the warnings every Lagos landlord uses
const FENCE_TEXT = ['', 'THIS HOUSE IS NOT FOR SALE', 'POST NO BILL', 'BEWARE OF 419', '']
const fenceMats = new Map<string, THREE.MeshStandardMaterial>()
function fenceMat() {
  const text = pick(FENCE_TEXT)
  let m = fenceMats.get(text)
  if (!m) {
    const W = 320, H = 88 // 8 m x 2.2 m
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H
    const c = cv.getContext('2d')!
    c.fillStyle = '#ece6d8'; c.fillRect(0, 0, W, H)
    for (let i = 0; i < 400; i++) { c.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`; c.fillRect(Math.random() * W, Math.random() * H, 3 + Math.random() * 8, 2 + Math.random() * 6) }
    const grd = c.createLinearGradient(0, H * 0.55, 0, H); grd.addColorStop(0, 'rgba(60,55,45,0)'); grd.addColorStop(1, 'rgba(60,55,45,0.45)')
    c.fillStyle = grd; c.fillRect(0, 0, W, H)
    c.fillStyle = '#c9c2b2'; c.fillRect(0, 0, W, 6) // the coping on top
    if (text) {
      c.fillStyle = 'rgba(150,20,20,0.85)'; c.font = '900 13px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'
      // centred on the seam so it sits in the middle of each fence
      c.fillText(text, 0, H * 0.45); c.fillText(text, W, H * 0.45)
    }
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, flatShading: true })
    m.userData.uv = [8, 2.2]
    fenceMats.set(text, m)
  }
  return m
}
const DARK = mat(0x2b2f36, { rough: 0.8 })
const SHUTTER = mat(0x6f747c, { rough: 0.6, metal: 0.3 })
const METAL = mat(0x4a4f57, { rough: 0.5, metal: 0.5 })
const WOOD = mat(0x8b5e3c, { rough: 0.9 })
const TANK = mat(0x1f2329, { rough: 0.6 })
const SKIN = [mat(0x4a2c1e), mat(0x5c3825), mat(0x3a2416), mat(0x6b4430)]
// Ankara and everyday clothes
const CLOTH = [0xe63946, 0xf4a261, 0x2a9d8f, 0x264653, 0xe9c46a, 0x6a2c91, 0x1d3557, 0xf1faee, 0x8ac926, 0xd62828].map((c) => mat(c, { rough: 0.9 }))
const UMBRELLA = [0xf6c21a, 0xd62828, 0x1d4ed8, 0x15803d, 0xf97316, 0xffffff].map((c) => mat(c, { rough: 0.7 }))
const GOODS = [0xd62828, 0xf97316, 0x15803d, 0xf6c21a, 0x7c3aed, 0x8b5e3c, 0xfafafa].map((c) => mat(c, { rough: 0.8 }))
const TARP = mat(0x2563eb, { rough: 0.71 })

// shop and kiosk signs, painted the way they are on Lagos streets
const SHOPS = [
  ["God's Grace Ventures", '#1d4ed8'], ['Mama Nkechi Provisions', '#b91c1c'], ['POS · Transfer · Withdrawal', '#15803d'],
  ['Iya Basira Buka', '#c2410c'], ['Blessed Hands Salon', '#7e22ce'], ['Recharge Card Sold Here', '#ca8a04'],
  ['Divine Favour Phones', '#0f766e'], ['Alhaji & Sons Electricals', '#1e3a8a'], ['Chop Life Restaurant', '#b91c1c'],
  ['Hope Pharmacy', '#15803d'], ['Mega Tyres & Vulcanizer', '#334155'], ['Ankara Palace Fabrics', '#a21caf'],
  ['Fresh Fish & Pepper', '#0369a1'], ['Kiakia Pickup Point', '#2f5bd3'], ['Success Barbing Saloon', '#9a3412'], ['Jesus Is Lord Plaza', '#1e40af'],
  ['Atlantic Trust Bank', '#7f1d1d'], ['Marina Towers', '#0f172a'], ['Lagoon View Hotel', '#14532d'], ['Eko Capital House', '#1e3a8a'],
]
// every sign is painted into one tall texture; each sign "material" just points at its strip of it
let signAtlas: THREE.MeshStandardMaterial | null = null
const signMats: THREE.Material[] = []
function signMat(i: number) {
  if (!signAtlas) {
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 64 * SHOPS.length
    const c = canvas.getContext('2d')!
    SHOPS.forEach(([text, bg], k) => {
      const y = k * 64
      c.fillStyle = bg; c.fillRect(0, y, 256, 64)
      c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(0, y + 58, 256, 6) // dirt along the bottom edge
      c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle'
      let size = 30; c.font = `800 ${size}px Arial`
      while (c.measureText(text).width > 236 && size > 14) { size -= 2; c.font = `800 ${size}px Arial` }
      c.fillText(text, 128, y + 32)
    })
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4
    signAtlas = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.12 })
    SHOPS.forEach((_, k) => {
      const m = new THREE.MeshBasicMaterial()
      // canvas row k (from the top) is v from 1 - (k + 1) / n to 1 - k / n
      m.userData = { atlas: signAtlas, rect: [1 - (k + 1) / SHOPS.length, 1 - k / SHOPS.length] }
      signMats.push(m)
    })
  }
  return signMats[i]
}

// a person standing (or sitting) on the pavement; some traders carry a tray of goods on their head
function person(g: THREE.Group, x: number, z: number, opts: { sit?: boolean; tray?: boolean; face?: number } = {}) {
  const cloth = pick(CLOTH), skin = pick(SKIN)
  const base = opts.sit ? 0.45 : 0
  if (opts.sit) g.add(cube(WOOD, 0.4, 0.42, 0.4, x, 0.2, z)) // a stool
  else g.add(cube(DARK, 0.32, 0.78, 0.18, x, 0.2, z))
  g.add(cube(cloth, 0.44, 0.62, 0.26, x, 0.2 + 0.78 + base - (opts.sit ? 0.4 : 0), z))
  const top = 0.2 + 1.4 + base - (opts.sit ? 0.4 : 0)
  g.add(part(BALL, skin, 0.15, 0.17, 0.15, x, top + 0.12, z))
  if (chance(0.4)) g.add(part(CONE, pick(CLOTH), 0.2, 0.22, 0.2, x, top + 0.3, z)) // a gele or cap
  if (opts.tray) {
    g.add(part(CYL, mat(0xc0c4ca, { metal: 0.6, rough: 0.3 }), 0.42, 0.05, 0.42, x, top + 0.32, z))
    for (let i = 0; i < 4; i++) g.add(part(BALL, pick(GOODS), 0.1, 0.1, 0.1, x + rand(-0.2, 0.2), top + 0.4, z + rand(-0.2, 0.2)))
  }
}

// a big trading umbrella over a table of goods, with the trader beside it
function umbrellaStall(g: THREE.Group, x: number, z: number) {
  const top = pick(UMBRELLA)
  g.add(part(CYL, METAL, 0.04, 2.4, 0.04, x, 1.2, z))
  g.add(part(CONE, top, 1.35, 0.55, 1.35, x, 2.55, z))
  g.add(cube(WOOD, 1.2, 0.08, 0.8, x, 0.75, z), cube(WOOD, 0.08, 0.75, 0.08, x - 0.5, 0, z - 0.3), cube(WOOD, 0.08, 0.75, 0.08, x + 0.5, 0, z + 0.3))
  const goods = pick(GOODS)
  for (let i = 0; i < 6; i++) g.add(part(BALL, chance(0.7) ? goods : pick(GOODS), 0.12, 0.12, 0.12, x + rand(-0.45, 0.45), 0.92, z + rand(-0.28, 0.28)))
  person(g, x + 0.2, z + 0.75, { sit: chance(0.6) })
}

// a wooden or container kiosk: POS, recharge cards, provisions
function kiosk(g: THREE.Group, x: number, z: number, side: number) {
  const body = pick([mat(0xf6c21a), mat(0x15803d), mat(0x1d4ed8), mat(0xe9e4d8)])
  g.add(cube(body, 1.7, 2.2, 1.7, x, 0, z))
  g.add(cube(DARK, 0.06, 0.9, 1.2, x - side * 0.86, 1.0, z)) // the hatch
  g.add(cube(WOOD, 0.45, 0.06, 1.3, x - side * 1.05, 0.95, z)) // counter
  g.add(cube(mat(0x9aa3ad, { metal: 0.4 }), 2.0, 0.08, 2.0, x, 2.2, z)) // zinc roof
  const sign = part(PLANE, signMat(chance(0.5) ? 2 : 5), 1.6, 0.4, 1, x - side * 0.87, 2.0, z, -side * Math.PI / 2)
  g.add(sign)
}

function busStop(g: THREE.Group, x: number, z: number, side: number) {
  g.add(cube(METAL, 0.08, 2.4, 0.08, x - 0.8, 0, z - 1.8), cube(METAL, 0.08, 2.4, 0.08, x - 0.8, 0, z + 1.8))
  g.add(cube(mat(0xf6c21a), 1.8, 0.12, 4.2, x, 2.4, z)) // the yellow roof
  g.add(cube(mat(0x1d4ed8), 0.06, 1.2, 3.6, x + side * 0.85, 1.0, z)) // back panel
  g.add(cube(METAL, 0.5, 0.08, 3.2, x + side * 0.4, 0.5, z)) // bench
  for (let i = 0; i < 3; i++) person(g, x + rand(-0.4, 0.3), z + rand(-1.5, 1.5), { sit: chance(0.5) })
}

function wheelbarrow(g: THREE.Group, x: number, z: number) {
  g.add(cube(METAL, 0.7, 0.35, 1.1, x, 0.35, z), part(CYL, DARK, 0.2, 0.08, 0.2, x, 0.2, z - 0.6))
  for (let i = 0; i < 4; i++) g.add(part(BALL, pick(GOODS), 0.14, 0.14, 0.14, x + rand(-0.2, 0.2), 0.8, z + rand(-0.3, 0.3)))
}

function parkedBike(g: THREE.Group, x: number, z: number) {
  g.add(part(CYL, DARK, 0.3, 0.1, 0.3, x, 0.3, z - 0.6), part(CYL, DARK, 0.3, 0.1, 0.3, x, 0.3, z + 0.6))
  g.add(cube(mat(0xc0392b), 0.28, 0.3, 1.0, x, 0.45, z), cube(DARK, 0.26, 0.1, 0.5, x, 0.75, z + 0.15))
}

// ---------- trees seen along Lagos roads, trunks painted white at the bottom ----------
const BARK = mat(0x6b4a32, { rough: 0.95 })
const WHITEWASH = mat(0xf2f0ea, { rough: 0.9 })
const LEAF = [0x2f7d32, 0x3a8f3c, 0x276b2b, 0x4c9a3f].map((c) => mat(c, { rough: 0.85 }))
const MANGO_LEAF = mat(0x1f5c26, { rough: 0.85 })
const FLAME = [0xe2492b, 0xf06b2a, 0xd8381f].map((c) => mat(c, { rough: 0.8 }))
function trunk(g: THREE.Group, x: number, z: number, h: number, r = 0.18) {
  g.add(part(CYL, BARK, r, h, r, x, h / 2, z))
  g.add(part(CYL, WHITEWASH, r + 0.02, 1.0, r + 0.02, x, 0.5, z))
}
// the tropical almond: flat layered tiers, the commonest shade tree on Lagos streets
function almondTree(g: THREE.Group, x: number, z: number) {
  trunk(g, x, z, 4.6)
  // tiers of leaves, each a few lumpy clumps rather than one flat disc
  const leaf = pick(LEAF)
  for (const [y, r] of [[2.9, 1.9], [3.8, 1.5], [4.7, 1.0]]) {
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.random()
      g.add(part(BALL, chance(0.75) ? leaf : pick(LEAF), r * 0.6, 0.38, r * 0.6, x + Math.cos(a) * r * 0.45, y + rand(-0.1, 0.12), z + Math.sin(a) * r * 0.45))
    }
  }
}
// neem (dogonyaro): a rounded, bushy crown
function neemTree(g: THREE.Group, x: number, z: number) {
  trunk(g, x, z, 3.4)
  const leaf = pick(LEAF)
  for (let i = 0; i < 4; i++) g.add(part(BALL, leaf, rand(0.9, 1.3), rand(0.8, 1.1), rand(0.9, 1.3), x + rand(-0.6, 0.6), 3.6 + rand(-0.2, 0.5), z + rand(-0.6, 0.6)))
}
// mango: a dense dark dome, often in compounds
function mangoTree(g: THREE.Group, x: number, z: number) {
  trunk(g, x, z, 2.6, 0.22)
  g.add(part(BALL, MANGO_LEAF, 1.9, 1.6, 1.9, x, 3.7, z))
}
// flamboyant (flame tree): a wide umbrella crown of red-orange flowers
function flameTree(g: THREE.Group, x: number, z: number) {
  trunk(g, x, z, 3.6)
  for (let i = 0; i < 5; i++) g.add(part(BALL, i < 2 ? pick(LEAF) : pick(FLAME), rand(1.0, 1.4), 0.55, rand(1.0, 1.4), x + rand(-1.1, 1.1), 3.9 + rand(-0.1, 0.3), z + rand(-1.1, 1.1)))
}
function tree(g: THREE.Group, x: number, z: number, d: District) {
  const r = Math.random()
  if (d.style === 'leafy' || d.style === 'estate') (r < 0.35 ? almondTree : r < 0.6 ? mangoTree : r < 0.8 ? flameTree : neemTree)(g, x, z)
  else (r < 0.5 ? almondTree : r < 0.8 ? neemTree : flameTree)(g, x, z)
}

// ---------- market buildings ----------
let zincMat: THREE.Material | null = null
function zinc() {
  // corrugated roofing sheets, some rusting
  if (!zincMat) {
    const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64
    const c = canvas.getContext('2d')!
    for (let x = 0; x < 64; x += 4) { c.fillStyle = x % 8 ? '#9aa1a8' : '#7d848b'; c.fillRect(x, 0, 4, 64) }
    for (let i = 0; i < 7; i++) { c.fillStyle = `rgba(150,72,30,${0.25 + Math.random() * 0.35})`; c.fillRect(Math.random() * 56, Math.random() * 56, 6 + Math.random() * 14, 6 + Math.random() * 12) }
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace
    zincMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.4, flatShading: true, side: THREE.DoubleSide })
  }
  return zincMat
}
const FABRIC = [0xd62828, 0xf77f00, 0x6a2c91, 0x0f8a4a, 0x1d4ed8, 0xf6c21a, 0xe0569b, 0x00a6a6].map((c) => mat(c, { rough: 0.9 }))
const INSIDE = mat(0x1c1a17, { rough: 1 })

// a row of lock-up shops: one storey, a zinc roof sloping to the road, each shop with its own sign,
// goods stacked out front and fabric hanging from the eaves; a trader at most doors
function lockupRow(g: THREE.Group, d: District, side: number, w: number, depth: number) {
  const front = -side * w / 2
  const units = Math.max(2, Math.round(depth / 3))
  const uw = depth / units
  g.add(cube(wallOf(d), w, 3.2, depth, 0, 0, 0))
  const roof = part(BOX, zinc(), w + 1.8, 0.06, depth + 0.2, -side * 0.9, 3.55, 0)
  roof.rotation.z = side * 0.12
  g.add(roof)
  for (let u = 0; u < units; u++) {
    const z = -depth / 2 + uw * (u + 0.5)
    g.add(cube(INSIDE, 0.1, 2.3, uw * 0.8, front - side * 0.02, 0, z)) // the open doorway
    g.add(part(PLANE, signMat(Math.floor(Math.random() * SHOPS.length)), uw * 0.9, 0.55, 1, front - side * 0.08, 2.75, z, -side * Math.PI / 2))
    // goods out front: sacks and cartons, or rolls of fabric
    if (chance(0.5)) for (let k = 0; k < 3; k++) g.add(cube(chance(0.5) ? mat(0xe8dcc0) : pick(GOODS), 0.5, 0.45, 0.5, front - side * rand(0.4, 1.0), k < 2 ? 0 : 0.45, z + rand(-uw / 3, uw / 3)))
    else for (let k = 0; k < 3; k++) g.add(part(CYL, pick(FABRIC), 0.16, 1.1, 0.16, front - side * (0.5 + k * 0.32), 0.55, z + rand(-0.3, 0.3)))
    // fabric and clothes hanging from the roof edge
    if (chance(0.6)) for (let k = 0; k < 3; k++) g.add(cube(pick(FABRIC), 0.04, 1.2, 0.45, front - side * 1.4, 2.0, z - uw / 3 + k * (uw / 3)))
    if (chance(0.6)) person(g, front - side * 1.1, z + rand(-uw / 3, uw / 3), { sit: chance(0.6) })
  }
}

// a "plaza": three or four storeys of small shops opening onto open walkways, signs on every floor
function plaza(g: THREE.Group, d: District, side: number, w: number, depth: number) {
  const floors = 3 + (chance(0.4) ? 1 : 0)
  const front = -side * w / 2
  g.add(cube(wallOf(d, 'commercial'), w, floors * 3, depth, 0, 0, 0))
  g.add(cube(CONCRETE, w + 0.3, 0.4, depth + 0.3, 0, floors * 3, 0))
  for (let f = 0; f < floors; f++) {
    const y = f * 3
    if (f > 0) {
      g.add(cube(CONCRETE, 1.2, 0.18, depth, front - side * 0.6, y, 0)) // the walkway
      g.add(cube(METAL, 0.05, 0.9, depth, front - side * 1.18, y + 0.18, 0)) // its railing
    }
    const signs = Math.max(2, Math.floor(depth / 2.6))
    for (let i = 0; i < signs; i++) {
      const z = -depth / 2 + (depth / signs) * (i + 0.5)
      g.add(part(PLANE, signMat(Math.floor(Math.random() * SHOPS.length)), depth / signs * 0.9, 0.5, 1, front - side * 0.06, y + 2.55, z, -side * Math.PI / 2))
      g.add(cube(INSIDE, 0.08, 2.0, depth / signs * 0.6, front - side * 0.02, y + 0.2, z))
    }
  }
  // the plaza's own big name sign on the roof
  g.add(part(PLANE, signMat(15), depth * 0.8, 1.0, 1, front - side * 0.1, floors * 3 + 1.0, 0, -side * Math.PI / 2))
  g.add(cube(METAL, 0.1, 1.2, 0.1, front, floors * 3, -depth * 0.35), cube(METAL, 0.1, 1.2, 0.1, front, floors * 3, depth * 0.35))
}

// an open market shed: a zinc roof on poles over rows of tables, traders and goods
function marketShed(g: THREE.Group, side: number, w: number, depth: number) {
  const roof = part(BOX, zinc(), w + 1, 0.06, depth, 0, 3.4, 0)
  roof.rotation.z = side * 0.08
  g.add(roof)
  for (const x of [-w / 2, w / 2]) for (const z of [-depth / 2 + 0.3, depth / 2 - 0.3]) g.add(part(CYL, WOOD, 0.08, 3.4, 0.08, x, 1.7, z))
  for (let r = 0; r < 2; r++) for (let i = 0; i < 3; i++) {
    const x = -w / 4 + r * (w / 2), z = -depth / 3 + i * (depth / 3)
    g.add(cube(WOOD, 1.6, 0.08, 1.0, x, 0.8, z))
    const goods = pick(GOODS)
    for (let k = 0; k < 7; k++) g.add(part(BALL, chance(0.75) ? goods : pick(GOODS), 0.13, 0.13, 0.13, x + rand(-0.6, 0.6), 0.96, z + rand(-0.35, 0.35)))
    if (chance(0.7)) person(g, x + rand(-0.5, 0.5), z + 0.75, { sit: chance(0.5) })
  }
}

// details that make a wall look lived in: AC units by the windows, a grimy band at the bottom
function liveIn(g: THREE.Group, side: number, w: number, depth: number, floors: number) {
  const front = -side * w / 2
  g.add(cube(GRIME, 0.04, 0.7, depth, front - side * 0.02, 0, 0))
  for (let f = 0; f < floors; f++) {
    // window bays sit every 3.2 m (the facade texture is mapped in metres)
    for (let z = Math.ceil((-depth / 2 - 1.6) / 3.2) * 3.2 + 1.6; z < depth / 2 - 0.6; z += 3.2) {
      if (z < -depth / 2 + 0.6) continue
      if (f > 0 && chance(0.18)) g.add(cube(AC, 0.3, 0.55, 0.8, front - side * 0.17, f * 3 + 0.55, z + 1.15))
    }
  }
}

// a Lagos building: storeys of concrete with weathered paint, louvre windows and bars, balconies with
// laundry, a water tank on a stand or a satellite dish on the roof, a shop below; now and then one
// still under construction. In the estates and Ikoyi: a duplex with a coloured hipped roof.
function lagosBuilding(g: THREE.Group, d: District, side: number, w: number, depth: number) {
  const front = -side * w / 2 // the face towards the road
  if ((d.style === 'estate' || d.style === 'leafy') && chance(0.7)) {
    const h = 6
    g.add(cube(wallOf(d, 'louvre'), w, h, depth, 0, 0, 0))
    g.add(part(CONE4, pick(ROOFS), w + 1.0, 2.0, depth + 1.0, 0, h + 1.0, 0))
    g.add(cube(CONCRETE, 1.6, 0.2, 3.2, front - side * 0.8, 3, 0)) // a porch roof
    for (const z of [-1.4, 1.4]) g.add(cube(wallMaterial(WALL_COLORS[9]), 0.25, 3, 0.25, front - side * 1.5, 0, z))
    liveIn(g, side, w, depth, 2)
    return h
  }
  const floors = Math.max(1, Math.round(rand(d.height[0], d.height[1]) / 3))
  const h = floors * 3
  const unfinished = (d.style === 'busy' || d.style === 'town' || d.style === 'estate') && chance(0.1)
  if (unfinished) {
    // grey frame, open floors, blocks half laid and rebar sticking out of the top
    for (let f = 0; f <= floors; f++) g.add(cube(CONCRETE, w, 0.25, depth, 0, f * 3, 0))
    for (const cx of [-w / 2 + 0.2, w / 2 - 0.2]) for (const cz of [-depth / 2 + 0.2, 0, depth / 2 - 0.2]) {
      g.add(cube(CONCRETE, 0.3, h, 0.3, cx, 0, cz))
      g.add(cube(METAL, 0.04, 0.8, 0.04, cx, h, cz))
    }
    g.add(cube(CONCRETE, w * 0.98, 3, depth * 0.98, 0, 0, 0))
    g.add(cube(mat(0x9d978c), w * 0.9, 1.2, depth * 0.9, 0, 3.25, 0)) // blocks half laid on the first floor
  } else {
    g.add(cube(wallOf(d), w, h, depth, 0, 0, 0))
    g.add(cube(CONCRETE, w + 0.2, 0.4, depth + 0.2, 0, h, 0)) // parapet
    for (let f = 1; f < floors; f++) {
      if (!chance(0.55)) continue
      // a balcony with a railing, often with washing drying on a line
      const bz = depth * 0.55
      g.add(cube(CONCRETE, 1.0, 0.15, bz, front - side * 0.5, f * 3, 0))
      g.add(cube(METAL, 0.05, 0.9, bz, front - side * 0.98, f * 3 + 0.15, 0))
      if (chance(0.6)) {
        g.add(cube(METAL, 0.02, 0.02, bz * 0.9, front - side * 0.75, f * 3 + 2.1, 0))
        for (let k = 0; k < 5; k++) g.add(cube(pick(LAUNDRY), 0.03, rand(0.5, 0.8), rand(0.35, 0.6), front - side * 0.75, f * 3 + 1.4, -bz * 0.4 + k * bz * 0.2))
      }
    }
    // a black water tank up on a steel stand, or a satellite dish
    if (chance(0.6)) {
      const tx = rand(-w / 4, w / 4), tz = rand(-depth / 5, depth / 5)
      for (const [lx, lz] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) g.add(cube(METAL, 0.08, 1.4, 0.08, tx + lx, h + 0.4, tz + lz))
      g.add(part(CYL, TANK, 0.7, 1.3, 0.7, tx, h + 2.45, tz))
    }
    if (chance(0.35)) g.add(part(CYL, mat(0xe5e7eb), 0.45, 0.05, 0.45, rand(-w / 4, w / 4), h + 1.0, depth / 3))
    liveIn(g, side, w, depth, floors)
  }
  // the ground floor: a shop with its painted sign and a shutter (houses in quiet areas)
  if (d.style !== 'leafy' && d.style !== 'estate' || chance(0.3)) {
    g.add(cube(SHUTTER, 0.08, 2.2, depth * 0.6, front - side * 0.05, 0, 0))
    g.add(part(PLANE, signMat(Math.floor(Math.random() * SHOPS.length)), depth * 0.75, 0.7, 1, front - side * 0.07, 2.65, 0, -side * Math.PI / 2))
    if (chance(0.5)) g.add(cube(pick(UMBRELLA), 1.0, 0.1, depth * 0.7, front - side * 0.5, 2.3, 0)) // an awning
  }
  return h
}

// one plot beside the road: a building (or the lagoon, containers, the beach) plus the life on the
// pavement in front of it. The group is `depth` long along the road; the game lines them up.
export function plot(d: District, side: -1 | 1, wantLandmark = false): THREE.Group {
  if (wantLandmark && side === 1) { const l = landmark(d); if (l) return l }
  const g = new THREE.Group()
  let w = rand(6, 9), depth = rand(6, 10)
  // the pavement in front of the building, in the plot's own coordinates (towards the road is -side)
  const kerbX = (off: number) => -side * (w / 2 + off)

  switch (d.style) {
    case 'bridge': {
      depth = 12
      const water = new THREE.Mesh(PLANE, WATER)
      water.scale.set(90, depth + 0.2, 1)
      water.rotation.x = -Math.PI / 2
      water.position.set(side * 45 - side * 3, 0.06, 0)
      g.add(water)
      g.add(cube(CONCRETE, 0.5, 1.0, depth, -side * 3.2, 0.15, 0)) // the bridge wall
      if (chance(0.3)) for (let i = 0; i < 3; i++) {
        // Makoko stilt houses out on the lagoon
        const hx = side * rand(22, 40), hz = rand(-4, 4)
        g.add(cube(pick([mat(0x7a5a3a), mat(0x8f6a45), mat(0x5c4630)]), 2.4, 1.6, 2.2, hx, 1.0, hz), cube(mat(0x9aa3ad, { metal: 0.4 }), 2.8, 0.2, 2.6, hx, 2.6, hz))
        for (const sx of [-1, 1]) g.add(cube(WOOD, 0.12, 1.2, 0.12, hx + sx, -0.2, hz))
      }
      w = 0
      break
    }
    case 'towers': {
      // Victoria Island: an office tower set back on a stone-and-glass podium (a banking hall or a hotel
      // lobby with a canopy), or a 5 to 8 storey office block; plant rooms and masts on the roofs
      w = rand(10, 13); depth = rand(11, 15)
      const front = -side * w / 2
      const glass = wallMaterial(pick([0xa9bccb, 0x9fb5bd, 0xb7c3cc, 0x93a9bb]), 'curtain')
      const podium = wallOf(d, 'commercial')
      const corp = 16 + Math.floor(Math.random() * 4)
      if (chance(0.6)) {
        const floors = Math.round(rand(d.height[0], d.height[1]) / 3)
        const th = floors * 3
        g.add(cube(podium, w, 6.4, depth, 0, 0, 0))
        g.add(cube(CONCRETE, w + 0.3, 0.3, depth + 0.3, 0, 6.4, 0))
        // the tower stands back from the road
        const tw = w - 3.5, td = depth - 3
        g.add(cube(glass, tw, th - 6.4, td, side * 1.4, 6.7, 0))
        g.add(cube(CONCRETE, tw + 0.3, 0.6, td + 0.3, side * 1.4, th + 0.3, 0)) // parapet
        g.add(cube(CONCRETE, tw * 0.45, 2.4, td * 0.4, side * 1.6, th + 0.9, 0)) // plant room
        g.add(cube(METAL, 0.1, 4, 0.1, side * 1.6, th + 3.3, td * 0.15)) // mast
        g.add(part(PLANE, signMat(corp), td * 0.7, 1.1, 1, side * 1.4 - side * tw / 2 - side * 0.05, th - 1.4, 0, -side * Math.PI / 2))
      } else {
        const floors = 5 + Math.floor(Math.random() * 4)
        g.add(cube(chance(0.5) ? glass : podium, w, floors * 3, depth, 0, 0, 0))
        g.add(cube(CONCRETE, w + 0.3, 0.5, depth + 0.3, 0, floors * 3, 0))
        g.add(cube(CONCRETE, w * 0.35, 2.2, depth * 0.3, 0, floors * 3 + 0.5, depth * 0.2))
        g.add(part(PLANE, signMat(corp), depth * 0.6, 1.0, 1, front - side * 0.06, floors * 3 - 1.2, 0, -side * Math.PI / 2))
      }
      // the entrance: a canopy over glass doors, a security post and a few cars' worth of tidy pavement
      g.add(cube(CONCRETE, 2.2, 0.25, 4.5, front - side * 1.1, 3.3, 0))
      for (const z of [-2, 2]) g.add(cube(METAL, 0.12, 3.3, 0.12, front - side * 2.0, 0, z))
      g.add(part(PLANE, signMat(corp), 3.6, 0.6, 1, front - side * 0.06, 4.6, 0, -side * Math.PI / 2))
      for (let z = -depth / 2 + 1; z < depth / 2; z += 3) g.add(cube(DARK, 0.2, 0.8, 0.2, kerbX(3.6), 0, z))
      if (chance(0.6)) g.add(cube(CONCRETE, 1.2, 0.6, 1.2, kerbX(1.6), 0, depth / 3), part(BALL, mat(0x2d8a3e), 0.7, 0.8, 0.7, kerbX(1.6), 1.2, depth / 3))
      if (chance(0.5)) person(g, kerbX(2.4), rand(-2, 2))
      break
    }
    case 'port': {
      // Apapa: a port wall with wire on top, containers stacked behind it, and the trucks that queue
      // along every road to the wharf, parked on the pavement
      w = 7; depth = rand(9, 12)
      const front = -side * w / 2
      g.add(cube(CONCRETE, 0.3, 2.6, depth, front - side * 0.4, 0, 0))
      for (let z = -depth / 2; z < depth / 2; z += 0.6) g.add(cube(METAL, 0.04, 0.5, 0.04, front - side * 0.4, 2.6, z))
      const rows = 1 + Math.floor(Math.random() * 3)
      for (let r = 0; r < rows; r++) for (const z of [-depth / 4, depth / 4]) {
        g.add(cube(mat(pick([0xb91c1c, 0x1d4ed8, 0xc2410c, 0x0f766e, 0x6c757d, 0xca8a04]), { rough: 0.6, metal: 0.3 }), 6, 2.5, depth / 2 - 0.2, side * 0.5, r * 2.55, z))
      }
      if (chance(0.55)) {
        // a truck with its container, nose towards the wharf
        const tx = kerbX(2.6)
        g.add(cube(mat(pick([0xf2f2f2, 0x1d4ed8, 0xb91c1c])), 2.3, 2.6, 2.4, tx, 0.4, -depth / 2 + 1.6))
        g.add(cube(mat(0x1f2937), 2.0, 0.8, 0.1, tx, 1.9, -depth / 2 + 0.38))
        g.add(cube(mat(pick([0xc2410c, 0x0f766e, 0x6c757d])), 2.4, 2.6, 7.2, tx, 1.1, 1.2))
        g.add(cube(DARK, 2.2, 0.5, 9.5, tx, 0.4, 0.2))
        for (const z of [-depth / 2 + 1.6, -0.5, 2.5, 4.0]) for (const s2 of [-1.05, 1.05]) g.add(part(CYL, DARK, 0.5, 0.35, 0.5, tx + s2, 0.5, z).rotateZ(Math.PI / 2))
      } else if (chance(0.5)) person(g, kerbX(2), rand(-2, 2))
      break
    }
    case 'beach': {
      const sand = new THREE.Mesh(PLANE, SAND)
      sand.scale.set(14, depth + 0.2, 1)
      sand.rotation.x = -Math.PI / 2
      sand.position.set(0, 0.04, 0)
      const sea = new THREE.Mesh(PLANE, WATER)
      sea.scale.set(80, depth + 0.2, 1)
      sea.rotation.x = -Math.PI / 2
      sea.position.set(side * 47, 0.05, 0)
      g.add(sand, sea)
      if (chance(0.5)) g.add(cube(wallMaterial(WALL_COLORS[9]), 3, 2.6, 3, side * 2, 0, 0), cube(WOOD, 3.6, 0.3, 3.6, side * 2, 2.6, 0))
      if (chance(0.4)) umbrellaStall(g, kerbX(2.2) + side * 4, 0)
      w = 6
      break
    }
    default: {
      const r0 = Math.random()
      if (d.style === 'market') {
        if (r0 < 0.45) lockupRow(g, d, side, w, depth)
        else if (r0 < 0.75) marketShed(g, side, w, depth)
        else plaza(g, d, side, w, depth)
      } else if (d.style === 'busy') {
        if (r0 < 0.35) lockupRow(g, d, side, w, depth)
        else if (r0 < 0.55) plaza(g, d, side, w, depth)
        else lagosBuilding(g, d, side, w, depth)
      } else if (d.style === 'town' || d.style === 'campus') {
        if (r0 < 0.2) lockupRow(g, d, side, w, depth)
        else if (r0 < 0.3) plaza(g, d, side, w, depth)
        else lagosBuilding(g, d, side, w, depth)
      } else lagosBuilding(g, d, side, w, depth)
      // a shade tree on the pavement, more of them in the quieter, leafier areas
      const treeChance = { leafy: 0.75, estate: 0.6, campus: 0.5, town: 0.35, busy: 0.15, market: 0.1 }[d.style as string] ?? 0.3
      if (chance(treeChance)) tree(g, kerbX(3.0), rand(-depth / 3, depth / 3), d)
      // the pavement: what's on it depends on the area
      const z0 = rand(-depth / 3, depth / 3)
      if (d.style === 'market') {
        // umbrellas and stalls shoulder to shoulder, a tarp, traders and shoppers
        umbrellaStall(g, kerbX(2.2), -depth / 4)
        umbrellaStall(g, kerbX(2.2), depth / 4)
        if (chance(0.5)) g.add(cube(TARP, 2.4, 0.06, depth * 0.6, kerbX(1.2), 2.6, 0))
        if (chance(0.6)) person(g, kerbX(3.3), z0, { tray: chance(0.6) })
        if (chance(0.4)) wheelbarrow(g, kerbX(3.4), -z0)
      } else if (d.style === 'busy') {
        const r = Math.random()
        if (r < 0.3) busStop(g, kerbX(2.4), 0, side)
        else if (r < 0.6) kiosk(g, kerbX(2.2), z0, side)
        else umbrellaStall(g, kerbX(2.3), z0)
        if (chance(0.6)) person(g, kerbX(3.4), -z0, { tray: chance(0.5) })
        if (chance(0.3)) parkedBike(g, kerbX(3.6), z0 + 1.5)
      } else if (d.style === 'leafy' || d.style === 'estate') {
        // a fence wall with a black gate in front of the house
        // a high fence wall with a black steel gate, as around every Lagos compound
        g.add(cube(fenceMat(), 0.25, 2.2, depth, kerbX(0.9), 0, 0))
        // the gate to one side, so the painted warning in the middle stays readable
        const gz = (chance(0.5) ? -1 : 1) * (depth / 2 - 1.5)
        g.add(cube(DARK, 0.3, 2.1, 2.4, kerbX(0.92), 0, gz))
        for (let k = 0; k < 6; k++) g.add(cube(DARK, 0.05, 0.3, 0.05, kerbX(0.95), 2.1, gz - 1.1 + k * 0.44)) // spikes on the gate
        if (chance(0.25)) person(g, kerbX(2.2), z0)
      } else {
        // town and campus: a kiosk or a stall now and then, people about, a generator humming
        const r = Math.random()
        if (r < 0.25) kiosk(g, kerbX(2.2), z0, side)
        else if (r < 0.45) umbrellaStall(g, kerbX(2.3), z0)
        else if (r < 0.55) busStop(g, kerbX(2.4), 0, side)
        if (chance(0.5)) person(g, kerbX(3.2), -z0, { tray: chance(0.3) })
        if (chance(0.25)) g.add(cube(mat(0xca8a04), 0.7, 0.55, 0.5, kerbX(0.8), 0, -z0)) // generator
      }
    }
  }
  const baked = bake(g)
  baked.userData.width = w
  baked.userData.depth = depth
  return baked
}

// free a plot's merged geometry when it is replaced
export function disposePlot(g: THREE.Object3D) {
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).geometry.dispose() })
}

// a pedestrian bridge over the road, as on Ikorodu Road and at Oshodi: stairs either side, people crossing
export function footbridge() {
  const g = new THREE.Group()
  const deckY = 7.6
  g.add(cube(CONCRETE, 22, 0.5, 2.6, 0, deckY, 0))
  for (const s of [-1, 1]) {
    g.add(cube(METAL, 22, 1.0, 0.08, 0, deckY + 0.5, s * 1.25)) // railings
    g.add(cube(CONCRETE, 0.6, deckY, 0.6, s * 10.5, 0, 0)) // pillars beyond the pavements
    g.add(cube(CONCRETE, 0.6, deckY, 0.6, s * 5.0, 0, 0))
    // the stairs down to the pavement, going away from the road
    const stair = cube(CONCRETE, 2.0, 0.4, 9, s * 12, deckY / 2, -4)
    stair.rotation.x = 0.7
    g.add(stair)
  }
  g.add(cube(mat(0x15803d), 6, 1.1, 0.1, 0, deckY - 0.6, 1.34)) // a banner on the side
  // people crossing, up on the deck
  const walkers = new THREE.Group()
  for (let i = 0; i < 4; i++) person(walkers, rand(-9, 9), rand(-0.6, 0.6))
  walkers.position.y = deckY + 0.25
  g.add(walkers)
  return bake(g)
}

function body(w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)
  mesh.position.set(x, y, z)
  mesh.castShadow = true
  return mesh
}

function signCanvas(lines: { text: string; font: string; color: string; y: number }[], w = 512, h = 192, bg = '#0f6b3a') {
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const c = canvas.getContext('2d')!
  c.fillStyle = bg; c.beginPath(); c.roundRect(4, 4, w - 8, h - 8, 18); c.fill()
  c.strokeStyle = '#ffffff'; c.lineWidth = 6; c.beginPath(); c.roundRect(14, 14, w - 28, h - 28, 12); c.stroke()
  c.textAlign = 'center'; c.textBaseline = 'middle'
  for (const l of lines) {
    let size = parseInt(l.font)
    c.font = l.font
    while (c.measureText(l.text).width > w - 60 && size > 18) { size -= 2; c.font = l.font.replace(/\d+px/, `${size}px`) }
    c.fillStyle = l.color; c.fillText(l.text, w / 2, l.y)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// a big green road sign over the road: "Welcome to Yaba", or "← Turn left · Yaba" before a junction
export function gantry(title: string, sub: string, dir: 'straight' | 'left' | 'right') {
  const g = new THREE.Group()
  const pole = mat(0x6c757d, { metal: 0.5, rough: 0.4 })
  g.add(body(0.25, 6.4, 0.25, pole, -4.6, 3.2, 0), body(0.25, 6.4, 0.25, pole, 4.6, 3.2, 0), body(9.5, 0.25, 0.25, pole, 0, 6.3, 0))
  const arrow = dir === 'left' ? '←  ' : dir === 'right' ? '' : ''
  const after = dir === 'right' ? '  →' : ''
  const tex = signCanvas([
    { text: `${arrow}${title}${after}`, font: '800 60px Arial', color: '#ffffff', y: 82 },
    { text: sub, font: '700 30px Arial', color: '#ffe680', y: 142 },
  ])
  const board = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 2.4), new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.35 }))
  board.position.set(0, 5.1, 0.15)
  g.add(board)
  g.userData.dispose = () => { tex.dispose(); board.geometry.dispose() }
  return g
}

// a crossroads: asphalt across the road and pavements, with zebra crossings either side
let zebraTex: THREE.Texture | null = null
export function junction() {
  const g = new THREE.Group()
  const cross = new THREE.Mesh(new THREE.PlaneGeometry(70, 9), mat(0x3f434c, { rough: 0.95 }))
  cross.rotation.x = -Math.PI / 2
  cross.position.y = 0.215
  cross.receiveShadow = true
  zebraTex ??= (() => {
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 32
    const c = canvas.getContext('2d')!
    for (let x = 0; x < 256; x += 32) { c.fillStyle = '#f1f1f1'; c.fillRect(x, 0, 18, 32) }
    const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; return t
  })()
  g.add(cross)
  for (const z of [-5.4, 5.4]) {
    const zebra = new THREE.Mesh(new THREE.PlaneGeometry(7.8, 1.6), new THREE.MeshBasicMaterial({ map: zebraTex, transparent: true }))
    zebra.rotation.x = -Math.PI / 2
    zebra.position.set(0, 0.02, z)
    g.add(zebra)
  }
  // traffic lights on the corners
  for (const s of [-1, 1]) {
    const tl = new THREE.Group()
    tl.add(body(0.14, 3.4, 0.14, mat(0x2b2f38), 0, 1.7, 0), body(0.4, 1.1, 0.35, mat(0x111318), 0, 3.6, 0))
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), mat(0x2fd27a, { emissive: 0x2fd27a, emissiveIntensity: 1.6 }))
    lamp.position.set(0, 3.3, 0.18)
    tl.add(lamp)
    // on the pavement corners, out past the kerb
    tl.position.set(s * 5.4, 0.2, 5)
    tl.name = 'tl'
    g.add(tl)
  }
  return g
}

// ---------- one landmark per area, so each part of Lagos is recognisable as you ride in ----------
// built with the road on the left (-x), like any plot on the right-hand side of the street
const boards = new Map<string, THREE.MeshStandardMaterial>()
function board(text: string, sub = '', bg = '#14532d', fg = '#ffffff') {
  const key = `${text}|${sub}|${bg}|${fg}`
  let m = boards.get(key)
  if (!m) {
    const W = 512, H = 128
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H
    const c = cv.getContext('2d')!
    c.fillStyle = bg; c.fillRect(0, 0, W, H)
    c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 4; c.strokeRect(8, 8, W - 16, H - 16)
    c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle'
    let size = sub ? 52 : 62; c.font = `900 ${size}px Arial`
    while (c.measureText(text).width > W - 48 && size > 18) { size -= 2; c.font = `900 ${size}px Arial` }
    c.fillText(text, W / 2, sub ? 50 : H / 2)
    if (sub) { c.globalAlpha = 0.85; c.font = '700 24px Arial'; c.fillText(sub, W / 2, 97); c.globalAlpha = 1 }
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4
    m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.22 })
    m.userData.noShadow = true
    boards.set(key, m)
  }
  return m
}
// a board facing the road, four times as wide as it is tall
const sign = (g: THREE.Group, m: THREE.Material, wid: number, x: number, y: number, z: number) => g.add(part(PLANE, m, wid, wid / 4, 1, x, y, z, -Math.PI / 2))

const WHITE = mat(0xf1efe8, { rough: 0.8 })
const GRASS = mat(0x4f8f3a, { rough: 1 })
const ASPHALT = mat(0x3d4048, { rough: 0.95 })
const DANFO = mat(0xf2b705, { rough: 0.55 })
const STRIPE = mat(0x15161a)
const WIN = mat(0x1d2a33, { rough: 0.2, metal: 0.5 })
const NG_GREEN = mat(0x138a3e, { rough: 0.7 })
const CRANE = [mat(0xc0392b, { rough: 0.5, metal: 0.3 }), mat(0xf2f2f2, { rough: 0.5, metal: 0.3 })]
const FLOOD = mat(0xfff6d8, { emissive: 0xfff2c0, emissiveIntensity: 0.8 })

// the yellow bus with black stripes that every Lagosian knows
function danfoBus(g: THREE.Group, x: number, z: number, ry = 0) {
  const b = new THREE.Group()
  b.add(cube(DANFO, 2.0, 1.85, 4.8, 0, 0.42, 0), cube(WIN, 2.04, 0.62, 3.7, 0, 1.4, -0.35))
  b.add(cube(STRIPE, 2.06, 0.12, 4.84, 0, 0.95, 0), cube(STRIPE, 2.06, 0.08, 4.84, 0, 1.18, 0))
  b.add(cube(WIN, 1.8, 0.7, 0.06, 0, 1.3, -2.42), cube(METAL, 1.9, 0.08, 3.6, 0, 2.27, 0.2)) // windscreen, roof rack
  for (const wx of [-1.0, 1.0]) for (const wz of [-1.6, 1.6]) b.add(part(CYL, DARK, 0.4, 0.3, 0.4, wx, 0.4, wz).rotateZ(Math.PI / 2))
  b.position.set(x, 0, z); b.rotation.y = ry
  g.add(b)
}
// an arch over an entrance, its name board facing the road
function archGate(g: THREE.Group, x: number, z0: number, z1: number, h: number, m: THREE.Material, pillar = WHITE) {
  for (const z of [z0, z1]) g.add(cube(pillar, 1.0, h, 1.0, x, 0, z))
  g.add(cube(pillar, 1.2, 1.4, Math.abs(z1 - z0) + 1.0, x, h - 0.2, (z0 + z1) / 2))
  sign(g, m, Math.min(Math.abs(z1 - z0) + 0.6, 9), x - 0.62, h + 0.5, (z0 + z1) / 2)
}
function crowd(g: THREE.Group, n: number, x0: number, x1: number, z0: number, z1: number) {
  for (let i = 0; i < n; i++) person(g, rand(x0, x1), rand(z0, z1), { tray: chance(0.2) })
}
function motorPark(g: THREE.Group, w: number, depth: number, name: string, routes: string) {
  const f = -w / 2
  g.add(cube(ASPHALT, w, 0.05, depth, 0, 0, 0))
  for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) if (chance(0.85)) danfoBus(g, f + 4 + r * 5.5, -depth / 2 + 3 + i * 5.2, rand(-0.06, 0.06))
  // a zinc shelter for the waiting passengers, touts calling out the routes
  const roof = part(BOX, zinc(), 3.2, 0.06, depth * 0.7, w / 2 - 2, 3.0, 0); roof.rotation.z = 0.1; g.add(roof)
  for (const z of [-depth * 0.33, 0, depth * 0.33]) g.add(part(CYL, METAL, 0.06, 3.0, 0.06, w / 2 - 3.4, 1.5, z))
  crowd(g, 9, f + 1, w / 2 - 1, -depth / 2 + 1, depth / 2 - 1)
  for (const z of [-depth / 2 + 3.2, depth / 2 - 3.2]) g.add(cube(METAL, 0.18, 4.6, 0.18, f + 0.4, 0, z))
  sign(g, board(name, routes, '#1d4ed8'), 8.5, f + 0.25, 5.4, 0)
}

export function landmark(d: District): THREE.Group | null {
  const g = new THREE.Group()
  let w = 12, depth = 18
  switch (d.name) {
    case 'Lekki Phase 1':
    case 'Magodo': {
      // the estate gate: an arch over the side road, a gatehouse, a boom barrier and high fences
      w = 14; depth = 18
      const f = -w / 2
      const mag = d.name === 'Magodo'
      g.add(cube(ASPHALT, w, 0.04, 5, 0, 0, -2))
      archGate(g, f + 1.2, -5, 1, 5.4, board(mag ? 'Magodo GRA Phase 2' : 'Lekki Phase 1', 'Residents & guests · drive slowly', mag ? '#1e3a8a' : '#7a2e2e'), WHITE)
      g.add(cube(WHITE, 3, 2.8, 3, f + 2.6, 0, 4.4), part(CONE4, ROOFS[mag ? 1 : 0], 4, 1.4, 4, f + 2.6, 3.5, 4.4))
      g.add(cube(WIN, 0.06, 0.9, 1.6, f + 1.08, 1.3, 4.4))
      g.add(cube(mat(0xd62828), 0.12, 0.12, 4.4, f + 2.2, 1.0, -2), cube(WHITE, 0.14, 0.14, 1.2, f + 2.2, 1.0, -2)) // boom
      person(g, f + 2.0, 2.4)
      g.add(cube(fenceMat(), 0.25, 2.4, 6, f + 0.6, 0, -8.5 + 0.5), cube(fenceMat(), 0.25, 2.4, 3, f + 0.6, 0, 7.5))
      const h = new THREE.Group(); lagosBuilding(h, d, 1, 7, 7); h.position.set(3.5, 0, 5.5); g.add(h)
      const h2 = new THREE.Group(); lagosBuilding(h2, d, 1, 7, 6); h2.position.set(3.5, 0, -6.5); g.add(h2)
      almondTree(g, f - 2.4, 7.2)
      break
    }
    case 'Victoria Island': {
      // a landmark tower: a stone podium, a glass shaft with setbacks and a lit crown
      w = 18; depth = 20
      const f = -w / 2
      const glass = wallMaterial(0x8fb0c8, 'curtain')
      g.add(cube(wallOf(d, 'commercial'), w, 8, depth, 0, 0, 0))
      g.add(cube(glass, 13, 46, 13, 1.5, 8, 0), cube(glass, 10, 14, 10, 1.5, 54, 0), cube(glass, 7, 8, 7, 1.5, 68, 0))
      for (const y of [54, 68]) g.add(cube(CONCRETE, y === 54 ? 13.4 : 10.4, 0.5, y === 54 ? 13.4 : 10.4, 1.5, y - 0.25, 0))
      g.add(cube(FLOOD, 7.4, 0.4, 7.4, 1.5, 76, 0), cube(METAL, 0.3, 12, 0.3, 1.5, 76, 0))
      g.add(cube(CONCRETE, 3, 0.3, 8, f - 1.5, 4, 0))
      for (const z of [-3.6, 3.6]) g.add(cube(METAL, 0.16, 4, 0.16, f - 2.8, 0, z))
      sign(g, board('Atlantic Tower', 'Victoria Island', '#0f172a'), 7, f - 0.06, 6.0, 0)
      for (const z of [-7, 7]) g.add(cube(CONCRETE, 1.4, 0.7, 1.4, f - 2.2, 0, z), part(BALL, mat(0x2d8a3e), 0.8, 0.9, 0.8, f - 2.2, 1.4, z))
      crowd(g, 3, f - 3.5, f - 1.5, -6, 6)
      break
    }
    case 'Ikoyi': {
      // the club grounds: a long white rail, a polo lawn, flame trees and the clubhouse at the back
      w = 30; depth = 30
      const f = -w / 2
      g.add(cube(GRASS, w, 0.06, depth, 0, 0, 0))
      for (const y of [0.55, 1.05]) g.add(cube(WHITE, 0.12, 0.12, depth, f + 0.3, y, 0))
      for (let z = -depth / 2; z <= depth / 2; z += 2.5) g.add(cube(WHITE, 0.16, 1.2, 0.16, f + 0.3, 0, z))
      g.add(cube(WHITE, 8, 6, 16, w / 2 - 5, 0, 0), part(CONE4, ROOFS[2], 9.5, 2.2, 17.5, w / 2 - 5, 7.1, 0))
      for (let z = -6; z <= 6; z += 3) g.add(cube(WIN, 0.06, 2.2, 1.6, w / 2 - 9.05, 2.6, z))
      for (const z of [-11, -3, 6, 12]) flameTree(g, f + rand(3, 8), z)
      sign(g, board('Ikoyi Club', 'Members & guests', '#14532d'), 5, f + 0.15, 2.4, -9)
      break
    }
    case 'Obalende': w = 22; depth = 24; motorPark(g, w, depth, 'Obalende Motor Park', 'CMS · Ajah · Oshodi · Yaba'); break
    case 'Ikorodu': w = 22; depth = 24; motorPark(g, w, depth, 'Ikorodu Garage', 'Mile 12 · Ketu · Ojota · Maryland'); break
    case 'Balogun Market':
    case 'Ajah':
    case 'Ketu': {
      // the market gate: an arch over the way in, sheds behind, traders and shoppers packed in front
      w = 12; depth = 20
      const f = -w / 2
      const name = ({ Ajah: 'Ajah Market', Ketu: 'Mile 12 International Market' } as Record<string, string>)[d.name] ?? 'Balogun Market'
      archGate(g, f + 0.8, -3.5, 3.5, 5.0, board(name, d.name === 'Ketu' ? 'Foodstuff · wholesale & retail' : 'Welcome · keep your bag in front', d.name === 'Ketu' ? '#15803d' : '#b91c1c'), mat(0xf6c21a))
      if (d.name === 'Ketu') {
        // Mile 12: baskets of tomatoes and pepper, sacks of onions, a lorry being offloaded
        const BASKET = mat(0xb08d57, { rough: 1 }), TOMATO = mat(0xd62828), ONION = mat(0xc9a66b)
        for (let k = 0; k < 14; k++) {
          const bx = f - rand(0.6, 3.4), bz = rand(-9.5, 9.5)
          g.add(part(CYL, BASKET, 0.42, 0.45, 0.42, bx, 0.22, bz))
          for (let t = 0; t < 4; t++) g.add(part(BALL, chance(0.7) ? TOMATO : mat(0xf97316), 0.13, 0.13, 0.13, bx + rand(-0.2, 0.2), 0.5, bz + rand(-0.2, 0.2)))
        }
        for (let k = 0; k < 6; k++) g.add(part(BALL, ONION, 0.4, 0.35, 0.4, f + 1.5, 0.3, -9 + k * 0.9))
        g.add(cube(mat(0x1d4ed8), 2.3, 2.4, 2.2, f + 2.2, 0.4, 8.6), cube(mat(0x8b5e3c), 2.4, 1.4, 5, f + 2.2, 1.0, 4.8), cube(DARK, 2.2, 0.5, 7, f + 2.2, 0.4, 5.8))
      }
      for (const z of [-7.5, 7.5]) { const s = new THREE.Group(); marketShed(s, 1, 9, 5.5); s.position.set(1, 0, z); g.add(s) }
      const back = new THREE.Group(); lockupRow(back, d, 1, 5, 7); back.position.set(3.5, 0, 0); g.add(back)
      for (const z of [-7, -2.5, 2.5, 7]) umbrellaStall(g, f - 2.2, z)
      crowd(g, 10, f - 3.6, f + 3, -9, 9)
      break
    }
    case 'Yaba': {
      // the university gate: two tall concrete pylons and a deep arch with the name, a gatehouse, students
      w = 18; depth = 22
      const f = -w / 2
      g.add(cube(ASPHALT, w, 0.04, 7, 0, 0, 0))
      for (const z of [-4.6, 4.6]) g.add(cube(CONCRETE, 2.4, 9, 2.2, f + 1.4, 0, z))
      g.add(cube(CONCRETE, 2.8, 2.2, 11.6, f + 1.4, 7.4, 0))
      sign(g, board('University of Lagos', 'Akoka · Yaba', '#1e3a8a'), 9.6, f - 0.02, 8.5, 0)
      g.add(cube(WHITE, 2.6, 2.6, 2.6, f + 5, 0, -7.5), cube(CONCRETE, 3.2, 0.3, 3.2, f + 5, 2.6, -7.5))
      const fac = new THREE.Group(); fac.add(cube(wallMaterial(WALL_COLORS[0], 'louvre'), 8, 12, 9, 0, 0, 0)); fac.position.set(w / 2 - 4.5, 0, 6.5); g.add(fac)
      for (const z of [-9, 9]) almondTree(g, f + 2.5, z)
      g.add(cube(GRASS, w - 4, 0.05, depth, 2, 0, 0))
      crowd(g, 8, f - 3.5, f + 6, -6, 6)
      break
    }
    case 'Surulere': {
      // the National Stadium: a concrete bowl with green-and-white bands and four floodlight towers
      w = 46; depth = 42
      const cx = 4, R = 16
      g.add(cube(ASPHALT, w, 0.04, depth, 0, 0, 0))
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2
        const x = cx + Math.cos(a) * R, z = Math.sin(a) * R * 0.85
        g.add(part(BOX, CONCRETE, 7, 9, 3.9, x, 4.5, z, -a))
        g.add(part(BOX, i % 2 ? NG_GREEN : WHITE, 0.5, 2.4, 3.95, cx + Math.cos(a) * (R + 3.4), 7.2, Math.sin(a) * (R + 3.4) * 0.85, -a))
      }
      g.add(part(CYL, GRASS, R - 3.2, 0.3, (R - 3.2) * 0.85, cx, 0.2, 0))
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const x = cx + sx * (R + 1), z = sz * (R * 0.85 + 1)
        g.add(cube(METAL, 0.6, 26, 0.6, x, 0, z), cube(METAL, 3.6, 2.4, 0.4, x, 25, z), cube(FLOOD, 3.2, 2.0, 0.1, x, 25.2, z - sz * 0.28))
      }
      sign(g, board('National Stadium', 'Surulere · Lagos', '#138a3e'), 9, -w / 2 + 0.2, 3.4, -12)
      for (const z of [-15.5, -8.5]) g.add(cube(METAL, 0.18, 2.4, 0.18, -w / 2 + 0.3, 0, z))
      crowd(g, 6, -w / 2 - 3, -w / 2 + 4, -14, 4)
      break
    }
    case 'Oshodi': {
      // the transport interchange: three glass towers of different heights over a bus terminal
      w = 20; depth = 26
      const f = -w / 2
      g.add(cube(CONCRETE, w, 5, depth, 0, 0, 0))
      for (const [z, h] of [[-8, 26], [0, 38], [8, 22]] as [number, number][]) {
        g.add(part(BOX, GLASS_TEAL, 11, h, 7, 2, 5 + h / 2, z), cube(CONCRETE, 11.4, 0.5, 7.4, 2, 5 + h, z))
      }
      g.add(cube(CONCRETE, 4, 0.35, depth, f - 2, 4.4, 0))
      for (let z = -depth / 2 + 2; z < depth / 2; z += 6) g.add(cube(METAL, 0.2, 4.4, 0.2, f - 3.6, 0, z))
      for (const [z, c] of [[-6, 0xc0392b], [6, 0x1d4ed8]] as [number, number][]) {
        g.add(cube(mat(c, { rough: 0.5 }), 2.4, 2.9, 11, f - 1.6, 0.35, z), cube(WIN, 2.44, 0.9, 10, f - 1.6, 1.8, z))
      }
      sign(g, board('Oshodi Transport Interchange', 'Terminal 1 · 2 · 3', '#0f766e'), 12, f - 0.04, 6.4, 0)
      crowd(g, 8, f - 3.5, f - 0.5, -10, 10)
      break
    }
    case 'Ikeja': {
      // Computer Village: plazas packed with phone shops, umbrellas and boards right along the kerb
      w = 12; depth = 22
      const f = -w / 2
      plaza(g, d, 1, w, depth)
      sign(g, board('Computer Village', 'Phones · Laptops · Repairs', '#0f172a'), 10, f - 0.15, 10.2, 0)
      for (let z = -9; z <= 9; z += 3) {
        umbrellaStall(g, f - 2.3, z)
        if (chance(0.6)) g.add(part(PLANE, board(pick(['Phones & Accessories', 'Screen Repair', 'UK Used Laptops', 'Chargers · Cases']), '', pick(['#1d4ed8', '#b91c1c', '#15803d'])), 1.6, 0.4, 1, f - 3.0, 1.15, z + 0.6, -Math.PI / 2))
      }
      crowd(g, 10, f - 3.8, f - 0.5, -10, 10)
      break
    }
    case 'Maryland': {
      // Maryland Mall: a big dark box with a sloping glass face, and its car park
      w = 26; depth = 30
      const f = -w / 2
      g.add(cube(ASPHALT, w, 0.04, depth, 0, 0, 0))
      g.add(cube(mat(0x1f2329, { rough: 0.4, metal: 0.3 }), 16, 18, 26, 5, 0, 0))
      const face = part(BOX, GLASS, 0.4, 14, 20, -3.4, 8.5, 0); face.rotation.z = -0.25; g.add(face)
      sign(g, board('Maryland Mall', 'Open daily', '#111827'), 10, -3.4 - 0.4, 15, 0)
      for (let i = 0; i < 6; i++) g.add(cube(mat(pick([0xe5e7eb, 0x111827, 0x9ca3af, 0x7f1d1d]), { rough: 0.4, metal: 0.4 }), 1.9, 1.3, 4.2, f + 3.5 + (i % 2) * 3.5, 0.15, -10 + Math.floor(i / 2) * 8))
      crowd(g, 4, f - 3, f + 1, -8, 8)
      break
    }
    case 'Apapa': {
      // the port: the wall and its gate, containers stacked high and the red-and-white quay cranes
      w = 26; depth = 24
      const f = -w / 2
      g.add(cube(CONCRETE, 0.3, 2.8, depth, f + 0.4, 0, 0))
      sign(g, board('Apapa Port', 'Authorised vehicles only', '#1e3a8a'), 6, f + 0.2, 4.2, 0)
      for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) if (chance(0.85)) g.add(cube(mat(pick([0xb91c1c, 0x1d4ed8, 0xc2410c, 0x0f766e, 0x6c757d, 0xca8a04]), { rough: 0.6, metal: 0.3 }), 2.4, 2.5, 6, f + 3 + i * 2.6, r * 2.55, rand(-8, -2)))
      for (const cz of [4, 11]) {
        for (const x of [0, 8]) for (const z of [-2.5, 2.5]) g.add(cube(CRANE[(x / 8) % 2], 0.6, 24, 0.6, x, 0, cz + z))
        g.add(cube(CRANE[0], 26, 1.4, 1.2, 2, 24, cz), cube(CRANE[1], 3, 3, 3.6, 3, 21, cz))
        for (let k = 0; k < 4; k++) g.add(cube(CRANE[k % 2], 0.25, 0.25, 5, k * 2.6, 12 + k, cz))
      }
      break
    }
    case 'Festac Town': {
      // the four-storey blocks of flats built for FESTAC '77, each with an open stairwell up the front
      w = 12; depth = 24
      const f = -w / 2
      for (const z of [-6.5, 6.5]) {
        g.add(cube(wallMaterial(WALL_COLORS[pick([9, 6, 5])], 'louvre'), 9, 12, 10, 0.5, 0, z))
        g.add(cube(CONCRETE, 9.4, 0.4, 10.4, 0.5, 12, z), cube(CONCRETE, 2.2, 12.6, 2.6, f + 0.4, 0, z))
        for (let fl = 1; fl < 4; fl++) g.add(cube(METAL, 0.05, 0.9, 6, f + 0.92, fl * 3, z), cube(CONCRETE, 1.0, 0.15, 6, f + 0.5, fl * 3, z))
        for (let k = 0; k < 4; k++) g.add(cube(pick(LAUNDRY), 0.03, 0.6, 0.5, f + 0.7, 6 + 1.6, z - 2 + k))
      }
      sign(g, board('Festac Town', "Built for FESTAC '77", '#7a2e2e'), 5, f - 0.6, 2.6, 0)
      g.add(cube(METAL, 0.12, 2.5, 0.12, f - 0.6, 0, -2.2), cube(METAL, 0.12, 2.5, 0.12, f - 0.6, 0, 2.2))
      neemTree(g, f - 2.6, 0)
      break
    }
    case 'Badagry': {
      // the Point of No Return: a memorial arch on the sand, the sea beyond
      w = 14; depth = 20
      const sand = new THREE.Mesh(PLANE, SAND); sand.scale.set(w, depth + 0.2, 1); sand.rotation.x = -Math.PI / 2; sand.position.y = 0.04
      const sea = new THREE.Mesh(PLANE, WATER); sea.scale.set(80, depth + 0.2, 1); sea.rotation.x = -Math.PI / 2; sea.position.set(47, 0.05, 0)
      g.add(sand, sea)
      const STONE = mat(0x8a7d6b, { rough: 0.95 })
      for (const z of [-3, 3]) g.add(cube(STONE, 1.4, 7, 1.4, 1, 0, z))
      g.add(cube(STONE, 1.8, 1.4, 7.6, 1, 6.6, 0))
      sign(g, board('Point of No Return', 'Badagry · in memory of the enslaved', '#3f3a33'), 6.2, 0.05, 9.1, 0)
      for (const z of [-8, 7]) { g.add(part(CYL, BARK, 0.15, 6, 0.15, 3, 3, z)); for (let k = 0; k < 6; k++) g.add(part(CONE, LEAF[1], 0.35, 2.6, 0.35, 3 + Math.cos(k) * 1.2, 6, z + Math.sin(k) * 1.2)) }
      crowd(g, 4, -3, 5, -6, 6)
      break
    }
    case 'Marina': {
      // the Cathedral Church of Christ: a stone nave with a steep roof and a tall square tower and spire
      w = 16; depth = 26
      const f = -w / 2
      const STONE = mat(0xb9a98f, { rough: 0.95 }), SLATE = mat(0x4b4f58, { rough: 0.6 })
      g.add(cube(GRASS, w, 0.05, depth, 0, 0, 0))
      g.add(cube(STONE, 9, 9, 18, 1.5, 0, 2))
      g.add(part(CONE4, SLATE, 9.8, 5, 18.8, 1.5, 11.5, 2))
      g.add(cube(STONE, 5, 24, 5, 1.5, 0, -9.5), cube(STONE, 5.6, 0.6, 5.6, 1.5, 24, -9.5))
      g.add(part(CONE4, SLATE, 5.4, 10, 5.4, 1.5, 29.6, -9.5), cube(METAL, 0.12, 2.4, 0.12, 1.5, 34.4, -9.5), cube(METAL, 1.2, 0.12, 0.12, 1.5, 35.8, -9.5))
      for (let z = -4; z <= 9; z += 3.2) g.add(cube(mat(0x2b4c7e, { rough: 0.2, metal: 0.4 }), 0.06, 4.2, 1.1, 1.5 - 4.53, 2.2, z)) // tall windows
      g.add(cube(WOOD, 0.08, 3.4, 1.8, 1.5 - 2.53, 0, -9.5)) // the door in the tower
      for (let z = -depth / 2; z <= depth / 2; z += 1.2) g.add(cube(METAL, 0.06, 1.6, 0.06, f + 0.3, 0, z))
      g.add(cube(METAL, 0.06, 0.06, depth, f + 0.3, 1.5, 0))
      sign(g, board('Cathedral Church of Christ', 'Marina · Lagos', '#3f3a33'), 5.6, f + 0.2, 2.1, 6)
      neemTree(g, f + 3, 10)
      crowd(g, 3, f - 3, f - 0.8, -6, 6)
      break
    }
    case 'Agege': {
      // the Red Line station: a raised platform under a long roof, the tracks behind and a train in
      w = 18; depth = 34
      const f = -w / 2
      g.add(cube(CONCRETE, 6, 1.2, depth, f + 4, 0, 0))
      const roof = part(BOX, mat(0xe5e7eb, { rough: 0.4, metal: 0.4 }), 7, 0.3, depth - 4, f + 4, 5.4, 0); roof.rotation.z = -0.06; g.add(roof)
      for (let z = -depth / 2 + 3; z < depth / 2 - 2; z += 5) g.add(cube(mat(0xc0392b, { metal: 0.3 }), 0.25, 4.2, 0.25, f + 4, 1.2, z))
      g.add(cube(wallMaterial(WALL_COLORS[9], 'commercial'), 4, 6, 8, f + 2.6, 0, -depth / 2 + 4)) // the ticket hall
      sign(g, board('Agege Station', 'Red Line · Oyingbo – Agbado', '#b91c1c'), 6, f + 0.55, 7.1, -depth / 2 + 4)
      for (const x of [f + 8.2, f + 9.6, f + 12.2, f + 13.6]) g.add(cube(METAL, 0.12, 0.15, depth, x, 0.05, 0)) // rails
      for (let z = -depth / 2; z < depth / 2; z += 1.2) g.add(cube(WOOD, 2.2, 0.08, 0.3, f + 8.9, 0, z), cube(WOOD, 2.2, 0.08, 0.3, f + 12.9, 0, z))
      const CAR = mat(0xf1f1f1, { rough: 0.35, metal: 0.3 }), RED = mat(0xc0392b)
      for (let c = 0; c < 3; c++) {
        const z = -10 + c * 10.4
        g.add(cube(CAR, 3, 3.4, 10, f + 8.9, 0.6, z), cube(RED, 3.04, 0.4, 10.04, f + 8.9, 1.5, z), cube(WIN, 3.06, 0.9, 8.6, f + 8.9, 2.4, z))
      }
      crowd(g, 7, f + 2, f + 6, -12, 14)
      break
    }
    case 'Lekki Conservation Centre': {
      // the nature reserve: a wooden gate, dense forest and the canopy walkway strung between the trees
      w = 22; depth = 30
      const f = -w / 2
      g.add(cube(mat(0x3c6b2e, { rough: 1 }), w, 0.05, depth, 0, 0, 0))
      archGate(g, f + 1, -3, 3, 4.6, board('Lekki Conservation Centre', 'Canopy walk · nature trail', '#14532d'), WOOD)
      for (let k = 0; k < 18; k++) {
        const x = f + rand(4, w - 1), z = rand(-depth / 2 + 1, depth / 2 - 1)
        if (Math.abs(z) < 3.5 && x < f + 7) continue
        const r = Math.random(); (r < 0.4 ? mangoTree : r < 0.7 ? neemTree : almondTree)(g, x, z)
      }
      // the canopy walkway: a narrow deck on poles high in the trees
      const pts = [[f + 6, -12], [f + 10, -6], [f + 8, 2], [f + 13, 9], [f + 11, 14]]
      for (let i = 0; i < pts.length; i++) {
        const [x, z] = pts[i]
        g.add(cube(WOOD, 0.3, 9, 0.3, x, 0, z), cube(WOOD, 1.6, 0.15, 1.6, x, 9, z))
        if (i) {
          const [px, pz] = pts[i - 1], dx = x - px, dz = z - pz, len = Math.hypot(dx, dz)
          const deck = part(BOX, WOOD, 0.7, 0.08, len, (x + px) / 2, 9, (z + pz) / 2, Math.atan2(dx, dz)); g.add(deck)
          g.add(part(BOX, mat(0xd9c27a), 0.05, 0.05, len, (x + px) / 2 - 0.3, 9.9, (z + pz) / 2, Math.atan2(dx, dz)))
        }
      }
      crowd(g, 3, f - 2.5, f + 1, -5, 5)
      break
    }
    default: return null
  }
  const baked = bake(g)
  baked.userData.width = w
  baked.userData.depth = depth
  baked.userData.landmark = true
  return baked
}
