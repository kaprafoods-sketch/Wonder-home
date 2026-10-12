// wonderhome-scene.js
// Shared Three.js scene for Wonder Home V.
//   createScene({ container, mode: 'hero' | 'tour', quality })
// Hero mode builds only the site, the seven floor shells and the roof, and drives the camera
// from scroll + pointer through KEYFRAMES (wonderhome-data.js). Tour mode is the same scene;
// wonderhome-tour.js adds the interior, OrbitControls, labels and walk mode on top of it.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  PX, CX, CY, wx, wz, FH, WH, SLAB, STILT, LEVELS, elev, BOUNDS, UNITS, ROOMS, DOORS, FLOOR_BASE,
  solid, sub, union, edgesOf, doorIntervals, interiorLines, exteriorParts, railParts,
  BASE_MOOD, KEYFRAMES, PINS,
} from './wonderhome-data.js';

// ---------- Materials ----------
const M = {};
const mat = (k, color, o = {}) => (M[k] = new THREE.MeshStandardMaterial({ color, roughness: o.r ?? 0.85, metalness: o.m ?? 0, ...o.extra }));
mat('wallInt', 0xf3eee6); mat('wallExt', 0xefe7da); mat('slab', 0xd8d0c3);
mat('woodDark', 0x4e3220, { r: 0.6 }); mat('wood', 0x8a5a36, { r: 0.6 }); mat('woodLight', 0xb98c5e, { r: 0.6 });
mat('louver', 0x8a5730, { r: 0.55 });
mat('linen', 0xebe4d8); mat('white', 0xf7f6f2, { r: 0.35 }); mat('sofa', 0x7f8b7f); mat('cushion', 0x3555a8);
mat('cabinet', 0x5f6b58, { r: 0.6 }); mat('counter', 0x2f2d2b, { r: 0.3 }); mat('metal', 0xa7abb0, { r: 0.35, m: 0.6 });
mat('screen', 0x111214, { r: 0.2 }); mat('rug', 0xb9a58a); mat('plant', 0x4c7a3c); mat('pot', 0x6b4a33);
mat('rail', 0x2a2a2a, { r: 0.4, m: 0.5 }); mat('column', 0xe9e1d3); mat('paving', 0xbab1a2); mat('road', 0x2b2c2f, { r: 0.95 });
mat('grass', 0x26332c); mat('trunk', 0x4a3424); mat('leaf', 0x3f6233, { extra: { flatShading: true } }); mat('stairs', 0xcac2b5);
M.glass = new THREE.MeshStandardMaterial({ color: 0xa8cad8, transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.1, depthWrite: false });
M.railGlass = new THREE.MeshStandardMaterial({ color: 0x9cc3cc, transparent: true, opacity: 0.35, roughness: 0.05, depthWrite: false });
M.glassLit = new THREE.MeshStandardMaterial({ color: 0x2a1d08, emissive: 0xffc53d, emissiveIntensity: 0.95, roughness: 0.3 });
M.lamp = new THREE.MeshBasicMaterial({ color: 0xffe3a3 });
M.mark = new THREE.MeshBasicMaterial({ color: 0xd8d2c4 });


// ---------- Merged geometry, walls, furniture ----------
// batch of boxes merged per material
class Batch {
  constructor() { this.g = {}; this.solids = []; }
  box(k, cx, cy, cz, sx, sy, sz, solidBox = false) {
    if (sx <= 0.001 || sy <= 0.001 || sz <= 0.001) return;
    const g = new THREE.BoxGeometry(sx, sy, sz); g.translate(cx, cy, cz);
    (this.g[k] ||= []).push(g);
    if (solidBox) this.solids.push([cx - sx / 2, cx + sx / 2, cz - sz / 2, cz + sz / 2]);
  }
  add(k, g) { (this.g[k] ||= []).push(g); }
  build(group, shadows = true) {
    for (const [k, list] of Object.entries(this.g)) {
      const mesh = new THREE.Mesh(mergeGeometries(list), M[k]);
      const transparent = M[k].transparent;
      mesh.castShadow = shadows && !transparent; mesh.receiveShadow = !transparent;
      group.add(mesh);
    }
    return group;
  }
}

// a wall line piece, in px along the line
function lineBox(B, k, axis, c, s, t, y0, y1, thick, solidBox) {
  const len = (t - s) * PX, mid = (s + t) / 2;
  if (axis === 'h') B.box(k, wx(mid), (y0 + y1) / 2, wz(c), len, y1 - y0, thick, solidBox);
  else B.box(k, wx(c), (y0 + y1) / 2, wz(mid), thick, y1 - y0, len, solidBox);
}
function buildLine(B, axis, c, parts, openings, thick, wallKey, glassKey) {
  const ext = thick / 2 / PX;
  for (const [s, t] of parts) {
    let pieces = [[s, t]];
    for (const o of openings) pieces = sub(pieces, o.s, o.t);
    for (const [ps, pt] of pieces) {
      const a = Math.abs(ps - s) < 0.5 ? ps - ext : ps, b = Math.abs(pt - t) < 0.5 ? pt + ext : pt;
      lineBox(B, wallKey, axis, c, a, b, 0, WH, thick, true);
    }
    for (const o of openings) {
      const a = Math.max(o.s, s), b = Math.min(o.t, t);
      if (b - a < 0.5) continue;
      if (o.kind === 'door') lineBox(B, wallKey, axis, c, a, b, 2.1, WH, thick);
      else {
        lineBox(B, wallKey, axis, c, a, b, 0, o.sill, thick, true);
        lineBox(B, wallKey, axis, c, a, b, o.head, WH, thick);
        lineBox(B, o.small && glassKey === 'glassLit' ? 'louver' : glassKey, axis, c, a, b, o.sill, o.head, 0.04);
      }
    }
  }
}
function windowFor(p) {
  const t = p.room.type;
  const doors = doorIntervals(p.axis, p.c);
  let avail = [[p.s, p.t]];
  for (const [a, b] of doors) avail = sub(avail, a - 0.3 / PX, b + 0.3 / PX);
  if (!avail.length) return null;
  const best = avail.reduce((m, q) => (q[1] - q[0] > m[1] - m[0] ? q : m));
  const len = (best[1] - best[0]) * PX, mid = (best[0] + best[1]) / 2;
  if (['bed', 'liv', 'study', 'kit'].includes(t) && len >= 1.1) {
    const w = Math.min(t === 'kit' ? 1.2 : 1.8, len - 0.5) / PX;
    return { kind: 'win', s: mid - w / 2, t: mid + w / 2, sill: t === 'kit' ? 1.05 : 0.75, head: 2.25 };
  }
  if (t === 'toi' && len >= 0.8) { const w = 0.6 / PX; return { kind: 'win', s: mid - w / 2, t: mid + w / 2, sill: 1.5, head: 2.1, small: true }; }
  return null;
}

function buildWalls(B, { interior, glassKey }) {
  if (interior) {
    for (const L of interiorLines.values()) {
      const opens = doorIntervals(L.axis, L.c).map(([s, t]) => ({ kind: 'door', s, t }));
      buildLine(B, L.axis, L.c, union(L.parts), opens, 0.12, 'wallInt', glassKey);
    }
  }
  for (const p of exteriorParts) {
    const opens = doorIntervals(p.axis, p.c).map(([s, t]) => ({ kind: 'door', s, t }));
    const w = windowFor(p); if (w) opens.push(w);
    buildLine(B, p.axis, p.c, [[p.s, p.t]], opens, 0.22, 'wallExt', glassKey);
  }
  for (const p of railParts) {
    lineBox(B, 'railGlass', p.axis, p.c, p.s, p.t, 0.05, 1.0, 0.03, true);
    lineBox(B, 'rail', p.axis, p.c, p.s, p.t, 1.0, 1.06, 0.06);
  }
  for (const r of ROOMS) {
    if (r.type === 'void') continue;
    const sx = (r.x1 - r.x0) * PX, sz = (r.y1 - r.y0) * PX;
    B.box('slab', wx((r.x0 + r.x1) / 2), -SLAB / 2 - (r.type === 'bal' ? 0.03 : 0), wz((r.y0 + r.y1) / 2), sx, SLAB, sz);
  }
}

// ---------- Furniture ----------
function rect(r) { return { X0: wx(r.x0), X1: wx(r.x1), Z0: wz(r.y0), Z1: wz(r.y1) }; }
const OPP = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };
function wallLen(r, side) { const b = rect(r); return side === 'top' || side === 'bottom' ? b.X1 - b.X0 : b.Z1 - b.Z0; }
function perpLen(r, side) { const b = rect(r); return side === 'top' || side === 'bottom' ? b.Z1 - b.Z0 : b.X1 - b.X0; }
// object of size len (along wall) x depth, back against wall `side`, centred `along` metres from wall start
function against(r, side, along, len, depth, inset = 0) {
  const b = rect(r), g = 0.07 + inset, W = wallLen(r, side);
  const a = Math.min(Math.max(along, len / 2 + 0.07), W - len / 2 - 0.07);
  if (side === 'top') return { cx: b.X0 + a, cz: b.Z0 + g + depth / 2, sx: len, sz: depth };
  if (side === 'bottom') return { cx: b.X0 + a, cz: b.Z1 - g - depth / 2, sx: len, sz: depth };
  if (side === 'left') return { cx: b.X0 + g + depth / 2, cz: b.Z0 + a, sx: depth, sz: len };
  return { cx: b.X1 - g - depth / 2, cz: b.Z0 + a, sx: depth, sz: len };
}
const put = (B, k, o, y0, h, solidBox = false) => B.box(k, o.cx, y0 + h / 2, o.cz, o.sx, h, o.sz, solidBox);
const freeSides = r => ['top', 'left', 'right', 'bottom'].filter(s => !r.doorSides.has(s) && !r.openSides.has(s));

function furnish(B, r) {
  const free = freeSides(r);
  const pick = (cands, ok) => cands.find(ok);
  if (r.type === 'bed') {
    const bw = Math.min(wallLen(r, 'top'), wallLen(r, 'left')) > 3.1 ? 1.8 : 1.5;
    const side = pick(free, s => perpLen(r, s) >= 2.7 && wallLen(r, s) >= bw + 1.2) || pick(['top', 'left', 'right', 'bottom'], s => perpLen(r, s) >= 2.5 && wallLen(r, s) >= bw + 0.3);
    if (!side) return;
    const W = wallLen(r, side), mid = W / 2;
    put(B, 'woodDark', against(r, side, mid, bw, 2.05), 0, 0.32, true);
    put(B, 'linen', against(r, side, mid, bw - 0.06, 1.95, 0.08), 0.32, 0.2);
    put(B, 'white', against(r, side, mid - bw / 4, bw / 2 - 0.12, 0.38, 0.14), 0.52, 0.12);
    put(B, 'white', against(r, side, mid + bw / 4, bw / 2 - 0.12, 0.38, 0.14), 0.52, 0.12);
    put(B, 'woodDark', against(r, side, mid, bw + 0.1, 0.08), 0, 1.05);
    if (W >= bw + 1.2) { put(B, 'wood', against(r, side, mid - bw / 2 - 0.3, 0.45, 0.42), 0, 0.5); put(B, 'wood', against(r, side, mid + bw / 2 + 0.3, 0.45, 0.42), 0, 0.5); }
    const o = OPP[side];
    if (free.includes(o) && perpLen(r, side) >= 2.05 + 1.3) put(B, 'woodLight', against(r, o, wallLen(r, o) / 2, Math.min(1.8, wallLen(r, o) - 0.9), 0.6), 0, 2.2, true);
    else {
      const perp = ['top', 'bottom'].includes(side) ? ['left', 'right'] : ['top', 'bottom'];
      const ps = perp.find(s => free.includes(s));
      if (ps && wallLen(r, ps) >= 2.05 + 1.6) {
        const len = 1.2, start = side === 'top' || side === 'left';
        put(B, 'woodLight', against(r, ps, start ? wallLen(r, ps) - 0.1 - len / 2 : 0.1 + len / 2, len, 0.6), 0, 2.2, true);
      }
    }
  } else if (r.type === 'study') {
    const side = pick(free, s => perpLen(r, s) >= 2.1) || 'top';
    put(B, 'woodDark', against(r, side, 0.55, 0.95, 1.95), 0, 0.3, true);
    put(B, 'linen', against(r, side, 0.55, 0.9, 1.9, 0.03), 0.3, 0.18);
    const ds = free.find(s => s !== side && s !== OPP[side]) || OPP[side];
    put(B, 'woodLight', against(r, ds, wallLen(r, ds) - 0.8, 1.2, 0.6), 0.72, 0.04);
    put(B, 'woodLight', against(r, ds, wallLen(r, ds) - 0.8, 1.2, 0.6), 0, 0.72);
  } else if (r.type === 'liv') {
    const b = rect(r), w = b.X1 - b.X0, d = b.Z1 - b.Z0;
    const longs = w >= d ? ['top', 'bottom'] : ['left', 'right'];
    const L = Math.max(w, d), S = Math.min(w, d);
    const side = longs.find(s => free.includes(s)) || longs[0];
    const opp = OPP[side];
    const sa = L >= 5.2 ? L * 0.27 : L / 2;
    put(B, 'sofa', against(r, side, sa, 2.2, 0.85), 0, 0.42, true);
    put(B, 'sofa', against(r, side, sa, 2.2, 0.22), 0.42, 0.42);
    put(B, 'cushion', against(r, side, sa - 0.6, 0.42, 0.14, 0.24), 0.42, 0.36);
    put(B, 'cushion', against(r, side, sa + 0.6, 0.42, 0.14, 0.24), 0.42, 0.36);
    put(B, 'rug', against(r, side, sa, 2.4, Math.min(1.7, S - 1.0), 0.6), 0, 0.012);
    put(B, 'woodDark', against(r, side, sa, 1.0, 0.55, 1.15), 0, 0.38);
    put(B, 'woodDark', against(r, opp, sa, 1.7, 0.4), 0, 0.48, true);
    put(B, 'screen', against(r, opp, sa, 1.25, 0.05, 0.05), 0.95, 0.72);
    if (L >= 5.2) {
      const da = L * 0.73, ti = (S - 0.9) / 2 - 0.07;
      put(B, 'wood', against(r, side, da, 1.6, 0.9, ti), 0.72, 0.05, true);
      put(B, 'woodDark', against(r, side, da, 1.4, 0.7, ti + 0.1), 0, 0.72);
      for (const k of [-0.55, 0, 0.55]) {
        put(B, 'cushion', against(r, side, da + k, 0.44, 0.44, ti - 0.5), 0, 0.46);
        put(B, 'cushion', against(r, side, da + k, 0.44, 0.44, ti + 0.96), 0, 0.46);
      }
      put(B, 'lamp', against(r, side, da, 0.5, 0.5, ti + 0.2), 2.2, 0.08);
    }
  } else if (r.type === 'kit') {
    const sides = free.slice().sort((p, q) => wallLen(r, q) - wallLen(r, p));
    const s1 = sides[0]; if (!s1) return;
    const W1 = wallLen(r, s1);
    put(B, 'cabinet', against(r, s1, W1 / 2, W1 - 0.14, 0.6), 0, 0.86, true);
    put(B, 'counter', against(r, s1, W1 / 2, W1 - 0.14, 0.62), 0.86, 0.04);
    put(B, 'screen', against(r, s1, W1 * 0.3, 0.6, 0.5, 0.05), 0.9, 0.02);
    put(B, 'metal', against(r, s1, W1 * 0.72, 0.6, 0.42, 0.08), 0.9, 0.02);
    put(B, 'cabinet', against(r, s1, W1 / 2, W1 - 0.14, 0.35), 1.5, 0.7);
    const perp = ['top', 'bottom'].includes(s1) ? ['left', 'right'] : ['top', 'bottom'];
    const s2 = perp.find(s => free.includes(s));
    if (s2) {
      const W2 = wallLen(r, s2), len = Math.min(W2 - 0.8, 1.8);
      if (len > 0.6) {
        const nearStart = s1 === 'top' || s1 === 'left';
        const along = nearStart ? 0.67 + len / 2 : W2 - 0.67 - len / 2;
        put(B, 'cabinet', against(r, s2, along, len, 0.6), 0, 0.86, true);
        put(B, 'counter', against(r, s2, along, len, 0.62), 0.86, 0.04);
      }
    }
  } else if (r.type === 'toi') {
    const side = free.slice().sort((p, q) => wallLen(r, q) - wallLen(r, p))[0] || 'top';
    const W = wallLen(r, side);
    put(B, 'white', against(r, side, 0.45, 0.4, 0.62), 0, 0.42);
    put(B, 'white', against(r, side, 0.45, 0.44, 0.18), 0.42, 0.4);
    if (W >= 1.5) { put(B, 'white', against(r, side, W - 0.4, 0.55, 0.45), 0.7, 0.16); put(B, 'woodDark', against(r, side, W - 0.4, 0.55, 0.42), 0.25, 0.45); put(B, 'metal', against(r, side, W - 0.4, 0.5, 0.02), 1.15, 0.7); }
  } else if (r.type === 'bal') {
    const b = rect(r), w = b.X1 - b.X0, d = b.Z1 - b.Z0, long = w >= d;
    const pots = long ? [[b.X0 + 0.35, (b.Z0 + b.Z1) / 2], [b.X1 - 0.35, (b.Z0 + b.Z1) / 2]] : [[(b.X0 + b.X1) / 2, b.Z0 + 0.35], [(b.X0 + b.X1) / 2, b.Z1 - 0.35]];
    for (const [x, z] of pots) { B.box('pot', x, 0.22, z, 0.4, 0.44, 0.4); B.box('plant', x, 0.65, z, 0.5, 0.5, 0.5); }
    if (Math.max(w, d) > 3) { const cx = (b.X0 + b.X1) / 2, cz = (b.Z0 + b.Z1) / 2; B.box('woodLight', cx, 0.25, cz, 0.5, 0.5, 0.5); B.box('cushion', cx + (long ? 0.7 : 0), 0.22, cz + (long ? 0 : 0.7), 0.5, 0.44, 0.5); B.box('cushion', cx - (long ? 0.7 : 0), 0.22, cz - (long ? 0 : 0.7), 0.5, 0.44, 0.5); }
  } else if (r.type === 'stair') {
    const b = rect(r), fw = (b.Z1 - b.Z0 - 0.15) / 2, n = 10, tread = 0.27, rise = FH / 2 / n;
    for (let i = 0; i < n; i++) {
      B.box('stairs', b.X0 + 0.25 + i * tread + tread / 2, (i + 1) * rise / 2, b.Z1 - fw / 2, tread, (i + 1) * rise, fw);
      B.box('stairs', b.X0 + 0.25 + (n - 1 - i) * tread + tread / 2, FH / 2 + (i + 1) * rise / 2 - 0.01, b.Z0 + fw / 2, tread, 0.12, fw);
    }
    B.box('stairs', b.X1 - (b.X1 - b.X0 - 0.25 - n * tread) / 2, FH / 4, (b.Z0 + b.Z1) / 2, b.X1 - b.X0 - 0.25 - n * tread, FH / 2, b.Z1 - b.Z0);
    B.box('wallInt', (b.X0 + b.X1) / 2 - 0.2, 0.5, (b.Z0 + b.Z1) / 2, b.X1 - b.X0 - 0.9, 1.0, 0.12, true);
  } else if (r.type === 'lift') {
    const b = rect(r);
    B.box('metal', (b.X0 + b.X1) / 2, 1.05, b.Z1 - 0.02, 0.95, 2.1, 0.04);
  }
}

// ---------- Builders ----------
function makeSky() {
  const c = document.createElement('canvas'); c.width = 2; c.height = 256;
  const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#0b1330'); gr.addColorStop(0.42, '#1b2f6e'); gr.addColorStop(0.74, '#3555a8'); gr.addColorStop(0.92, '#7f93c9'); gr.addColorStop(1, '#c3cbe2');
  g.fillStyle = gr; g.fillRect(0, 0, 2, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function buildSite(scene) {
  const site = new THREE.Group(); scene.add(site);
    const B = new Batch();
    const hw = (BOUNDS.x1 - BOUNDS.x0) * PX / 2, hd = (BOUNDS.y1 - BOUNDS.y0) * PX / 2;
    B.box('grass', 0, -0.06, 0, 320, 0.1, 320);
    B.box('paving', 0, -0.01, 2, hw * 2 + 8, 0.02, hd * 2 + 10);
    const roadZ = hd + 9;
    B.box('road', 0, 0.0, roadZ, 320, 0.03, 9);
    B.box('paving', 0, 0.06, hd + 3.6, 320, 0.12, 2.2);
    for (let x = -150; x < 150; x += 6) B.box('lamp', x, 0.02, roadZ, 2.6, 0.01, 0.14);
    // boundary wall with gate opening
    const bw = (x0, z0, x1, z1) => B.box('wallExt', (x0 + x1) / 2, 0.55, (z0 + z1) / 2, Math.abs(x1 - x0) || 0.2, 1.1, Math.abs(z1 - z0) || 0.2, false);
    bw(-hw - 4, -hd - 3, hw + 4, -hd - 3); bw(-hw - 4, -hd - 3, -hw - 4, hd + 2.4); bw(hw + 4, -hd - 3, hw + 4, hd + 2.4);
    bw(-hw - 4, hd + 2.4, -4, hd + 2.4); bw(4, hd + 2.4, hw + 4, hd + 2.4);
    // stilt columns
    for (let x = wx(BOUNDS.x0) + 0.3; x <= wx(BOUNDS.x1) - 0.2; x += (wx(BOUNDS.x1) - wx(BOUNDS.x0) - 0.5) / 4)
      for (let z = wz(BOUNDS.y0) + 0.3; z <= wz(BOUNDS.y1) - 0.2; z += (wz(BOUNDS.y1) - wz(BOUNDS.y0) - 0.5) / 4)
        B.box('column', x, STILT / 2, z, 0.45, STILT, 0.45, false);
    // stilt core (stairs + lift lobby) and parking bays
    const cx0 = wx(40), cx1 = wx(455), cz0 = wz(325), cz1 = wz(580);
    B.box('wallExt', (cx0 + cx1) / 2, STILT / 2, cz0, cx1 - cx0, STILT, 0.22); B.box('wallExt', cx0, STILT / 2, (cz0 + cz1) / 2, 0.22, STILT, cz1 - cz0);
    B.box('wallExt', cx1, STILT / 2, (cz0 + cz1) / 2, 0.22, STILT, cz1 - cz0);
    B.box('glassLit', (cx0 + cx1) / 2, 1.4, cz1, cx1 - cx0, 2.8, 0.05);
    for (let x = wx(470); x < wx(1180); x += 2.6) B.box('mark', x, 0.005, wz(1100), 0.08, 0.01, 5);
    for (let x = wx(60); x < wx(1180); x += 2.6) if (x > cx1 + 0.4 || true) B.box('mark', x, 0.005, wz(250), 0.08, 0.01, 4.6);
    // trees
    const trees = [[-hw - 8, -8], [-hw - 9, 4], [-hw - 7, 14], [hw + 8, -10], [hw + 9, 2], [hw + 7, 12], [-14, -hd - 9], [0, -hd - 10], [14, -hd - 8], [-hw - 2, hd + 6], [hw + 2, hd + 6], [-26, hd + 6], [26, hd + 6]];
    for (const [x, z] of trees) {
      B.box('trunk', x, 1.3, z, 0.3, 2.6, 0.3);
      const s = 2.6 + ((x * 7 + z * 3) % 5 + 5) % 5 * 0.25;
      const c1 = new THREE.IcosahedronGeometry(s * 0.62, 1); c1.scale(1, 0.85, 1); c1.translate(x, 2.5 + s * 0.5, z); B.add('leaf', c1);
      const c2 = new THREE.IcosahedronGeometry(s * 0.45, 1); c2.translate(x + 0.5, 3.2 + s * 0.6, z - 0.4); B.add('leaf', c2);
    }
    for (let x = -60; x <= 60; x += 20) { B.box('rail', x, 2.5, hd + 4.4, 0.1, 5, 0.1); B.box('lamp', x, 5.0, hd + 4.8, 0.3, 0.14, 0.9); }
    // neighbouring blocks
    for (const [x, z, w, h, d] of [[-48, -30, 16, 22, 14], [46, -36, 18, 28, 16], [-60, 10, 14, 16, 18], [62, 14, 14, 19, 14], [-30, -60, 20, 30, 16], [24, -70, 22, 25, 16]])
      B.box('wallExt', x, h / 2, z, w, h, d);
    B.build(site);
    const street = new THREE.PointLight(0xffc98a, 30, 26, 1.6); street.position.set(0, 5, hd + 4.6); scene.add(street);
  return { site, street };
}

function buildShellsAndRoof(scene) {
  const shellGeo = new THREE.Group();
  { const B = new Batch(); buildWalls(B, { interior: false, glassKey: 'glassLit' }); B.build(shellGeo); }
  const shells = [];
  for (let L = 0; L < LEVELS; L++) { const g = shellGeo.clone(); g.position.y = elev(L); scene.add(g); shells.push(g); }
  // roof: slab, parapet and stair headroom
  const roof = new THREE.Group(); roof.position.y = elev(LEVELS); scene.add(roof);
  {
    const B = new Batch();
    for (const r of ROOMS) if (r.type !== 'void' && r.type !== 'bal') B.box('slab', wx((r.x0 + r.x1) / 2), -SLAB / 2, wz((r.y0 + r.y1) / 2), (r.x1 - r.x0) * PX, SLAB, (r.y1 - r.y0) * PX);
    for (const p of exteriorParts) lineBox(B, 'wallExt', p.axis, p.c, p.s - 6, p.t + 6, 0, 1.0, 0.22);
    B.box('wallExt', (wx(40) + wx(455)) / 2, 1.5, (wz(325) + wz(500)) / 2, wx(455) - wx(40), 3.0, wz(500) - wz(325));
    B.box('woodDark', (wx(40) + wx(455)) / 2, 3.05, (wz(325) + wz(500)) / 2, wx(455) - wx(40) + 0.4, 0.12, wz(500) - wz(325) + 0.4);
    B.build(roof);
  }
  return { shells, roof };
}

// Detailed interior of one typical floor. Built lazily, only for the tour.
export function buildInterior(scene) {
  const interior = new THREE.Group(); interior.visible = false; scene.add(interior);
  const floorMeshes = []; let walkSolids = [];
  {
    const B = new Batch();
    buildWalls(B, { interior: true, glassKey: 'glass' });
    for (const r of ROOMS) if (r.type !== 'void') furnish(B, r);
    B.build(interior);
    walkSolids = B.solids;
    for (const r of ROOMS) {
      if (r.type === 'void') continue;
      const m = new THREE.Mesh(new THREE.BoxGeometry((r.x1 - r.x0) * PX, 0.02, (r.y1 - r.y0) * PX), new THREE.MeshStandardMaterial({ color: FLOOR_BASE[r.type] ?? 0xdddddd, roughness: r.type === 'liv' || r.type === 'hall' ? 0.35 : 0.8 }));
      m.position.set(wx((r.x0 + r.x1) / 2), 0.01, wz((r.y0 + r.y1) / 2)); m.receiveShadow = true;
      m.userData.room = r; r.floor = m; floorMeshes.push(m); interior.add(m);
    }
  }
  return { interior, floorMeshes, walkSolids };
}

// ---------- Camera helpers ----------
export const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smooth = t => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
export function exteriorPose(aspect) {
  const fit = Math.max(1, 0.95 / aspect), narrow = aspect < 0.8, f = fit * (narrow ? 1.18 : 1);
  return { pos: new THREE.Vector3(30 * f, 16 + 4 * (f - 1), 46 * f), target: new THREE.Vector3(0, narrow ? 1 : 11, 0) };
}
function moodOf(kf) { const m = { ...BASE_MOOD, ...kf.mood }; return m; }

// ---------- Scene ----------
export function createScene({ container, mode = 'hero', quality = {}, viewShift = null } = {}) {
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const mobile = coarse || window.innerWidth < 760;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const q = { maxDpr: mobile ? 1.5 : 2, shadows: !mobile, antialias: !mobile, ...quality };

  const renderer = new THREE.WebGLRenderer({ antialias: q.antialias, powerPreference: 'high-performance', preserveDrawingBuffer: !!q.preserveDrawingBuffer });
  let dprCap = q.maxDpr;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
  renderer.shadowMap.enabled = q.shadows;
  renderer.shadowMap.type = mode === 'tour' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = BASE_MOOD.exposure;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = makeSky();
  scene.fog = new THREE.Fog(0x41579a, 90, 260);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 600);

  const hemi = new THREE.HemisphereLight(0xdfe6f7, 0x2a3358, 1.3); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe2c4, 1.9);
  sun.position.set(-38, 34, 30); sun.castShadow = q.shadows;
  const sm = mode === 'tour' ? 2048 : 1024; sun.shadow.mapSize.set(sm, sm);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 34, bottom: -20, near: 5, far: 140 });
  sun.shadow.bias = -0.0004; scene.add(sun);
  const amb = new THREE.AmbientLight(0xffffff, 0.25); scene.add(amb);

  const { site, street } = buildSite(scene);
  const { shells, roof } = buildShellsAndRoof(scene);
  if (!q.shadows) scene.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });

  const ctx = {
    THREE, renderer, scene, camera, mode, reduce, coarse, mobile,
    groups: { site, shells, roof, interior: null },
    lights: { sun, hemi, amb, street }, M,
    frame: null, // tour mode sets a per frame callback
    dirty: true,
  };

  // ----- hero camera rig -----
  const kfs = KEYFRAMES.map(k => ({ ...k, P: new THREE.Vector3(...k.pos), T: new THREE.Vector3(...k.target), m: moodOf(k) }));
  const rig = {
    s: 0, sTarget: 0,                 // section progress (0 = hero, 1 = overview, ...)
    px: 0, py: 0, pxT: 0, pyT: 0,     // pointer parallax
    orbit: 0, orbitOn: false,         // idle auto orbit (radians)
    pos: new THREE.Vector3(), target: new THREE.Vector3(), mood: { ...BASE_MOOD },
  };
  const tmpP = new THREE.Vector3(), tmpT = new THREE.Vector3(), off = new THREE.Vector3(), sph = new THREE.Spherical();

  function poseAt(s, aspect) {
    const i = Math.max(0, Math.min(kfs.length - 1, Math.floor(s)));
    const j = Math.min(kfs.length - 1, i + 1), t = smooth(Math.max(0, Math.min(1, s - i)));
    const out = { P: new THREE.Vector3(), T: new THREE.Vector3(), m: {} };
    const narrow = aspect < 0.8, fitRaw = Math.max(1, 0.95 / aspect);
    const fixed = (k) => {
      const f = Math.min(fitRaw * (narrow ? 1.18 : 1), k.fitCap || 1.5);
      const T = k.T.clone(); if (narrow && k.narrowTargetY != null) T.y = k.narrowTargetY;
      const o = k.P.clone().sub(k.T); o.x *= f; o.z *= f;
      const P = T.clone().add(o); P.y += 4 * (f - 1) * (k.P.y > 8 ? 1 : 0.2);
      return { P, T };
    };
    const a = fixed(kfs[i]), b = fixed(kfs[j]);
    out.P.lerpVectors(a.P, b.P, t); out.T.lerpVectors(a.T, b.T, t);
    for (const key of Object.keys(BASE_MOOD)) {
      const va = kfs[i].m[key], vb = kfs[j].m[key];
      out.m[key] = Array.isArray(va) ? [lerp(va[0], vb[0], t), lerp(va[1], vb[1], t)] : lerp(va, vb, t);
    }
    return out;
  }

  function applyMood(m) {
    sun.intensity = m.sun; hemi.intensity = m.hemi; amb.intensity = m.amb; street.intensity = m.street;
    M.glassLit.emissiveIntensity = m.windows; scene.backgroundIntensity = m.sky;
    renderer.toneMappingExposure = m.exposure; scene.fog.near = m.fog[0]; scene.fog.far = m.fog[1];
    if (Math.abs(camera.fov - m.fov) > 0.01) { camera.fov = m.fov; camera.updateProjectionMatrix(); }
  }

  function heroUpdate(dt, now) {
    let moving = false;
    const k = 1 - Math.pow(0.001, dt);              // frame rate independent damping
    const ds = rig.sTarget - rig.s;
    if (Math.abs(ds) > 1e-4) { rig.s += ds * Math.min(1, k * 1.6); moving = true; } else rig.s = rig.sTarget;
    if (coarse && !reduce) { rig.pxT = Math.sin(now / 5200) * 0.5; rig.pyT = Math.sin(now / 7300) * 0.35; } // idle drift on touch
    const dpx = rig.pxT - rig.px, dpy = rig.pyT - rig.py;
    if (Math.abs(dpx) + Math.abs(dpy) > 1e-4) { rig.px += dpx * k * 0.9; rig.py += dpy * k * 0.9; moving = true; }
    if (rig.orbitOn) { rig.orbit += dt * 0.035; moving = true; }
    else if (Math.abs(rig.orbit) > 1e-4) { rig.orbit *= Math.pow(0.02, dt); moving = true; } else rig.orbit = 0;

    const pose = poseAt(rig.s, camera.aspect);
    off.copy(pose.P).sub(pose.T); sph.setFromVector3(off);
    sph.theta += rig.px * THREE.MathUtils.degToRad(2.5) + rig.orbit;
    sph.phi = THREE.MathUtils.clamp(sph.phi - rig.py * THREE.MathUtils.degToRad(1), 0.15, Math.PI * 0.497);
    off.setFromSpherical(sph);
    rig.pos.copy(pose.T).add(off); rig.target.copy(pose.T);
    camera.position.copy(rig.pos); camera.lookAt(rig.target);
    applyMood(pose.m); rig.mood = pose.m;
    return moving || coarse;
  }

  // ----- public hero API -----
  ctx.setScrollProgress = s => { const v = reduce ? 0 : s; if (v !== rig.sTarget) { rig.sTarget = v; ctx.dirty = true; } };
  ctx.setPointer = (nx, ny) => { if (reduce || coarse) return; rig.pxT = nx; rig.pyT = ny; ctx.dirty = true; };
  ctx.setIdle = on => { if (reduce) return; rig.orbitOn = on; ctx.dirty = true; };
  ctx.getPose = () => ({ pos: camera.position.clone(), target: (ctx.controls ? ctx.controls.target : rig.target).clone() });
  ctx.keyframeCount = kfs.length;

  // pins projected to CSS pixels
  const pinV = new THREE.Vector3();
  ctx.projectPins = () => {
    const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight;
    return PINS.map(p => {
      pinV.set(...p.pos).project(camera);
      const visible = pinV.z < 1 && Math.abs(pinV.x) < 0.96 && Math.abs(pinV.y) < 0.92;
      return { id: p.id, x: (pinV.x * 0.5 + 0.5) * w, y: (-pinV.y * 0.5 + 0.5) * h, visible };
    });
  };

  // ----- sizing, loop, pausing -----
  function resize() {
    const w = container.clientWidth || window.innerWidth, h = container.clientHeight || window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
    renderer.setSize(w, h, false); renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%';
    camera.aspect = w / h;
    const sh = viewShift ? viewShift(w, h) : null;   // frame the building off centre so text panels don't cover it
    if (sh) camera.setViewOffset(w, h, sh[0], sh[1], w, h); else camera.clearViewOffset();
    camera.updateProjectionMatrix(); ctx.dirty = true;
    if (ctx.onResize) ctx.onResize(w, h);
  }
  ctx.resize = resize;
  window.addEventListener('resize', resize);
  resize();
  if (mode === 'hero') { const p = poseAt(0, camera.aspect); camera.position.copy(p.P); camera.lookAt(p.T); rig.target.copy(p.T); applyMood(p.m); }
  else { const p = exteriorPose(camera.aspect); camera.position.copy(p.pos); camera.lookAt(p.target); }

  let running = true, visible = true, last = performance.now(), slow = 0, frames = 0;
  ctx.onFirstFrame = null;
  const tick = now => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    let render = ctx.dirty; ctx.dirty = false;
    if (ctx.frame) { if (ctx.frame(dt, now) !== false) render = true; }
    else if (heroUpdate(dt, now)) render = true;
    if (!render) return;
    renderer.render(scene, camera);
    if (ctx.afterRender) ctx.afterRender();
    frames++;
    if (frames === 1 && ctx.onFirstFrame) ctx.onFirstFrame();
    // adaptive resolution: drop pixel ratio if frames are slow for a sustained stretch
    if (dt > 0.028) slow++; else slow = Math.max(0, slow - 1);
    if (slow > 45 && dprCap > 1.0) { dprCap = Math.max(1.0, dprCap - 0.25); slow = 0; resize(); }
  };
  const setLoop = () => renderer.setAnimationLoop(running && visible ? tick : null);
  ctx.pause = () => { running = false; setLoop(); };
  ctx.resume = () => { running = true; last = performance.now(); ctx.dirty = true; setLoop(); };
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; last = performance.now(); setLoop(); });
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { visible = es[0].isIntersecting && !document.hidden; setLoop(); }).observe(container);
  setLoop();

  ctx.applyBaseMood = () => applyMood(BASE_MOOD);
  ctx.applyMood = applyMood;
  ctx.currentMood = () => ({ ...rig.mood, fog: [...rig.mood.fog] });
  ctx.heroPose = () => { const p = poseAt(rig.s, camera.aspect); return { pos: p.P, target: p.T, mood: p.m }; };
  ctx.BASE_MOOD = BASE_MOOD;
  ctx.heroRig = rig;
  return ctx;
}

export { M, FLOOR_BASE };
