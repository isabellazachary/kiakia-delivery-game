// The garage: ₦ coins you collect on the road buy new bikes and rider outfits.
// Everything is kept on this device only (private browsing may refuse storage, which is fine).
import { DEFAULT_LOOK, type Look } from './models'

export interface Item { id: string; name: string; price: number; colors: number[] }
export const BIKES: (Item & { bike: number })[] = [
  { id: 'kiakia', name: 'Kiakia Blue', price: 0, bike: 0x2f5bd3, colors: [0x2f5bd3] },
  { id: 'boxer', name: 'Boxer Red', price: 400, bike: 0xc0392b, colors: [0xc0392b] },
  { id: 'danfo', name: 'Danfo Yellow', price: 900, bike: 0xf2b705, colors: [0xf2b705] },
  { id: 'night', name: 'Night Rider', price: 1500, bike: 0x15171c, colors: [0x15171c] },
  { id: 'green', name: 'Naija Green', price: 2500, bike: 0x0f8a4a, colors: [0x0f8a4a] },
  { id: 'pink', name: 'Owambe Pink', price: 3500, bike: 0xe0569b, colors: [0xe0569b] },
  { id: 'gold', name: 'Gold Plated', price: 6000, bike: 0xd4a017, colors: [0xd4a017] },
]
export const OUTFITS: (Item & Omit<Look, 'bike'>)[] = [
  { id: 'classic', name: 'Kiakia Classic', price: 0, jacket: 0x1d3f9e, helmet: 0xf6c21a, legs: 0x23262d, colors: [0x1d3f9e, 0xf6c21a] },
  { id: 'eagles', name: 'Super Eagles', price: 600, jacket: 0x0f8a4a, helmet: 0xffffff, legs: 0xffffff, colors: [0x0f8a4a, 0xffffff] },
  { id: 'ankara', name: 'Ankara Orange', price: 1200, jacket: 0xf77f00, helmet: 0x6a2c91, legs: 0x3a1f5c, colors: [0xf77f00, 0x6a2c91] },
  { id: 'reflect', name: 'Hi-Vis Vest', price: 2000, jacket: 0xd7f205, helmet: 0xffffff, legs: 0x23262d, colors: [0xd7f205, 0xffffff] },
  { id: 'agbada', name: 'Sunday Agbada', price: 3000, jacket: 0xf2efe6, helmet: 0xb08d57, legs: 0xf2efe6, colors: [0xf2efe6, 0xb08d57] },
  { id: 'owambe', name: 'Owambe Gold', price: 5000, jacket: 0xd4a017, helmet: 0x7a1f3d, legs: 0x7a1f3d, colors: [0xd4a017, 0x7a1f3d] },
]

interface Save { wallet: number; owned: string[]; bike: string; outfit: string }
const KEY = 'kiakia-dash-garage'
function read(): Save {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Save | null
    if (s && typeof s.wallet === 'number') return s
  } catch { /* start fresh */ }
  return { wallet: 0, owned: ['kiakia', 'classic'], bike: 'kiakia', outfit: 'classic' }
}
let save = read()
const write = () => { try { localStorage.setItem(KEY, JSON.stringify(save)) } catch { /* still playable */ } }

export const garage = {
  get wallet() { return save.wallet },
  owns: (id: string) => save.owned.includes(id),
  using: (id: string) => save.bike === id || save.outfit === id,
  earn(n: number) { if (n > 0) { save.wallet += Math.round(n); write() } },
  // buys it if needed and you can afford it, then puts it on; false if you're short of coins
  choose(id: string): boolean {
    const item = [...BIKES, ...OUTFITS].find((i) => i.id === id)
    if (!item) return false
    if (!save.owned.includes(id)) {
      if (save.wallet < item.price) return false
      save.wallet -= item.price
      save.owned.push(id)
    }
    if (BIKES.some((b) => b.id === id)) save.bike = id
    else save.outfit = id
    write()
    return true
  },
  look(): Look {
    const b = BIKES.find((x) => x.id === save.bike) ?? BIKES[0]
    const o = OUTFITS.find((x) => x.id === save.outfit) ?? OUTFITS[0]
    return { ...DEFAULT_LOOK, bike: b.bike, jacket: o.jacket, helmet: o.helmet, legs: o.legs }
  },
  reload() { save = read() },
}
