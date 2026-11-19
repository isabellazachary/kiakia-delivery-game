// Merging scenery for cheap phones: every plain-coloured part becomes one vertex-coloured mesh, shop signs
// share one texture, and each textured material gets one mesh, so a whole plot is a handful of draw calls.
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// the one material for every plain colour (the colour lives on the vertices)
export const PAINT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0.08, flatShading: true })
const tmp = new THREE.Color()

export function bake(g: THREE.Object3D) {
  const groups = new Map<THREE.Material, THREE.BufferGeometry[]>()
  const out = new THREE.Group()
  g.updateMatrixWorld(true)
  g.traverse((o) => {
    // wires and other lines are kept as they are
    if ((o as THREE.LineSegments).isLineSegments) {
      const l = o as THREE.LineSegments
      const geo = l.geometry.clone()
      geo.applyMatrix4(l.matrixWorld)
      out.add(new THREE.LineSegments(geo, l.material))
      return
    }
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    const geo = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()
    geo.applyMatrix4(m.matrixWorld)
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k)
    let mt = m.material as THREE.Material
    const ud = mt.userData
    if (ud.uv) {
      // facades and fences are mapped in metres, reading left to right from the road; roofs get plain wall
      const scale = ud.uv as [number, number]
      const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv
      for (let i = 0; i < pos.count; i++) {
        const nx = nor.getX(i), ny = nor.getY(i), nz = nor.getZ(i)
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
        if (Math.abs(ny) > 0.5) uv.setXY(i, 0.003, 0.997)
        else if (Math.abs(nx) >= Math.abs(nz)) uv.setXY(i, (nx < 0 ? z : -z) / scale[0], y / scale[1])
        else uv.setXY(i, (nz > 0 ? x : -x) / scale[0], y / scale[1])
      }
    } else if (ud.atlas) {
      // a shop sign: squeeze its picture into its strip of the shared sign texture
      const [v0, v1] = ud.rect as [number, number]
      const uv = geo.attributes.uv
      for (let i = 0; i < uv.count; i++) uv.setY(i, v0 + uv.getY(i) * (v1 - v0))
      mt = ud.atlas as THREE.Material
    } else if (ud.solid) {
      const c = (mt as THREE.MeshStandardMaterial).color
      tmp.copy(c)
      const cols = new Float32Array(geo.attributes.position.count * 3)
      for (let i = 0; i < cols.length; i += 3) { cols[i] = tmp.r; cols[i + 1] = tmp.g; cols[i + 2] = tmp.b }
      geo.setAttribute('color', new THREE.BufferAttribute(cols, 3))
      mt = PAINT
    }
    if (!groups.has(mt)) groups.set(mt, [])
    groups.get(mt)!.push(geo)
  })
  for (const [mt, geos] of groups) {
    const merged = mergeGeometries(geos, false)
    for (const geo of geos) geo.dispose()
    if (!merged) continue
    const mesh = new THREE.Mesh(merged, mt)
    mesh.castShadow = !mt.userData.noShadow
    mesh.receiveShadow = true
    out.add(mesh)
  }
  out.userData = { ...g.userData }
  return out
}
