// wonderhome-data.js
// Plan data, project facts, scroll keyframes and hotspot pins for Wonder Home V.
// Pure data: no Three.js import. Shared by index.html (hero) and tour.html (full tour)
// so the two never drift apart. Plan coordinates are pixels traced from the architect's
// typical floor plan (about 17.2 px per foot); wx()/wz() convert to metres in world space.

const FACTS_CARPET_LOADING = 0.08;
const PX = 0.3048 / 17.2;
const CX = 617.5, CY = 695;
const wx = p => (p - CX) * PX;
const wz = p => (p - CY) * PX;
const FH = 3.0, WH = 2.85, SLAB = 0.15, STILT = 3.2, LEVELS = 7;
const elev = L => STILT + L * FH;
const LEVEL_NAMES = ['UG', '1', '2', '3', '4', '5', '6'];
const LEVEL_LONG = ['Upper ground', '1st floor', '2nd floor', '3rd floor', '4th floor', '5th floor', '6th floor'];
const BOUNDS = { x0: 40, x1: 1195, y0: 75, y1: 1315 };

const UNITS = {
  F1: { type: '3 BHK', area: 1670, tint: 0x9fb3e6, entry: [835, 540], from: [780, 540] },
  F2: { type: '3 BHK', area: 1410, tint: 0xc5d2f0, entry: [580, 625], from: [580, 560] },
  F3: { type: '3 BHK', area: 1570, tint: 0x7f98d6, entry: [330, 625], from: [330, 560] },
  F4: { type: '2 BHK + Study', area: 1175, tint: 0xdbe3f5, entry: [715, 455], from: [715, 540] },
  F5: { type: '2 BHK', area: 1075, tint: 0xaebfe8, entry: [285, 290], from: [285, 360] },
};

const ROOMS = [];
const R = (unit, name, dims, type, x0, y0, x1, y1, group) => ROOMS.push({ unit, name, dims, type, x0, y0, x1, y1, group });
// Common core
R(null, 'Staircase', '', 'stair', 40, 325, 235, 500, 'C');
R(null, 'Service area', '', 'lobby', 235, 325, 335, 500, 'C');
R(null, 'Shaft', '', 'shaft', 335, 325, 455, 380);
R(null, 'Lift', '1800 × 1800', 'lift', 335, 380, 455, 500);
R(null, 'Passage', '5′ wide', 'lobby', 235, 500, 795, 580, 'C');
// F5
R('F5', 'Cut-out', '', 'void', 40, 75, 98, 160);
R('F5', 'Balcony', '', 'bal', 98, 75, 160, 160);
R('F5', 'Kitchen', '6′10½″ × 6′8″', 'kit', 40, 160, 160, 325, 'F5L');
R('F5', 'Drawing room', '14′4½″ × 14′3″', 'liv', 160, 75, 400, 325, 'F5L');
R('F5', 'Toilet', '5′4″ × 6′1″', 'toi', 400, 75, 510, 125);
R('F5', 'Toilet', '11′8½″ × 5′', 'toi', 400, 125, 510, 265);
R('F5', 'Hall', '', 'hall', 400, 265, 510, 325, 'F5L');
R(null, 'Shaft', '', 'shaft', 510, 75, 685, 125);
R('F5', 'Bedroom', '11′8½″ × 9′10″', 'bed', 510, 125, 685, 325);
R('F5', 'Bedroom', '13′2″ × 9′10″', 'bed', 455, 325, 685, 500);
// F4
R(null, 'Shaft', '', 'shaft', 685, 75, 860, 125);
R('F4', 'Kitchen', '5′10½″ × 10′', 'kit', 685, 125, 860, 200, 'F4L');
R('F4', 'Drawing room', '13′2″ × 10′', 'liv', 685, 200, 860, 450, 'F4L');
R('F4', 'Entry', '', 'hall', 685, 450, 745, 500, 'F4L');
R(null, 'Shaft', '', 'shaft', 745, 450, 860, 500);
R('F4', 'Children room', '8′4″ × 9′1½″', 'study', 860, 75, 1020, 230);
R('F4', 'Hall', '', 'hall', 860, 230, 1020, 290, 'F4L');
R('F4', 'Bedroom', '12′ × 10′', 'bed', 1020, 75, 1195, 290);
R('F4', 'Toilet', '6′1″ × 4′11″', 'toi', 860, 290, 950, 395);
R('F4', 'Toilet', '5′11″ × 4′11″', 'toi', 860, 395, 950, 500);
R('F4', 'Bedroom', '12′4½″ × 10′2½″', 'bed', 950, 290, 1130, 500);
R('F4', 'Balcony', '4′ wide', 'bal', 1130, 290, 1195, 500);
// F1
R('F1', 'Drawing / dining', '27′10″ × 11′5″', 'liv', 795, 500, 990, 1000, 'F1L');
R('F1', 'Bedroom', '12′3½″ × 11′6″', 'bed', 990, 500, 1195, 715);
R('F1', 'Kitchen', '8′1″ × 7′10½″', 'kit', 990, 715, 1130, 860);
R('F1', 'Balcony', '4′ wide', 'bal', 1130, 715, 1195, 940);
R('F1', 'Toilet', '4′6″ × 7′6″', 'toi', 990, 860, 1130, 940);
R('F1', 'Hall', '', 'hall', 990, 940, 1065, 1035, 'F1L');
R('F1', 'Toilet', '4′5″ × 7′2″', 'toi', 1065, 940, 1195, 1035);
R('F1', 'Bedroom', '12′7½″ × 11′5″', 'bed', 795, 1000, 990, 1245);
R('F1', 'Bedroom', '12′10″ × 11′6″', 'bed', 990, 1035, 1195, 1245);
R('F1', 'Toilet', '4′6″ × 6′6″', 'toi', 795, 1245, 915, 1315);
R('F1', 'Balcony', '4′ wide', 'bal', 915, 1245, 1195, 1315);
// F2
R('F2', 'Drawing / dining', '24′8½″ × 10′10″', 'liv', 430, 580, 610, 1005);
R('F2', 'Bedroom', '11′1½″ × 10′3″', 'bed', 610, 580, 795, 775);
R('F2', 'Kitchen', '6′11″ × 7′5½″', 'kit', 610, 775, 740, 900);
R(null, 'Shaft', '', 'shaft', 740, 775, 795, 900);
R('F2', 'Toilet', '4′2″ × 6′11″', 'toi', 610, 900, 795, 960);
R('F2', 'Bedroom', '15′4½″ × 11′0½″', 'bed', 610, 960, 795, 1230);
R('F2', 'Bedroom', '10′10½″ × 10′0½″', 'bed', 430, 1005, 610, 1230);
R('F2', 'Toilet', '4′6″ × 6′4″', 'toi', 430, 1230, 545, 1315);
R('F2', 'Balcony', '4′ wide', 'bal', 545, 1230, 710, 1315);
R('F2', 'Toilet', '4′6″ × 4′9″', 'toi', 710, 1230, 795, 1315);
// F3
R('F3', 'Bedroom', '12′9″ × 10′11½″', 'bed', 40, 500, 235, 715);
R('F3', 'Drawing / dining', '22′5½″ × 10′11½″', 'liv', 235, 580, 430, 1000, 'F3L');
R('F3', 'Kitchen', '7′8½″ × 8′1½″', 'kit', 95, 715, 235, 850);
R(null, 'Shaft', '', 'shaft', 40, 715, 95, 935);
R('F3', 'Toilet', '4′3″ × 8′1½″', 'toi', 95, 850, 235, 925);
R('F3', 'Hall', '', 'hall', 160, 925, 235, 1010, 'F3L');
R('F3', 'Toilet', '4′5″ × 6′8″', 'toi', 40, 935, 160, 1010);
R('F3', 'Bedroom', '13′0½″ × 10′11½″', 'bed', 40, 1010, 235, 1250);
R('F3', 'Bedroom', '13′1½″ × 10′11½″', 'bed', 235, 1000, 430, 1250);
R('F3', 'Toilet', '4′6″ × 6′4″', 'toi', 310, 1250, 430, 1315);
R('F3', 'Balcony', '4′ wide', 'bal', 40, 1250, 310, 1315);

// Doors: [axis, line coord, centre, width m]. 'h' = wall running along x at y = coord.
const DOORS = [
  ['h', 500, 395, 1.0],
  ['h', 325, 285, 0.95], ['v', 400, 100, 0.7], ['v', 510, 195, 0.75], ['v', 510, 295, 0.85], ['h', 325, 483, 0.8], ['v', 160, 118, 0.8],
  ['h', 500, 715, 0.85], ['h', 230, 940, 0.85], ['v', 1020, 260, 0.85], ['h', 290, 985, 0.85], ['h', 290, 905, 0.75], ['v', 860, 422, 0.75], ['v', 1130, 395, 0.9],
  ['v', 795, 540, 0.95], ['v', 990, 680, 0.85], ['v', 990, 790, 0.85], ['v', 990, 900, 0.75], ['h', 1000, 940, 0.85], ['h', 1035, 1028, 0.8], ['v', 1065, 990, 0.7], ['v', 1130, 800, 0.9], ['h', 1245, 855, 0.75], ['h', 1245, 1100, 0.9],
  ['h', 580, 580, 0.85], ['v', 610, 650, 0.85], ['v', 610, 840, 0.85], ['v', 610, 930, 0.75], ['v', 610, 983, 0.75], ['h', 1005, 520, 0.85], ['h', 1230, 488, 0.75], ['h', 1230, 580, 0.9], ['h', 1230, 752, 0.7], ['h', 1230, 660, 0.9],
  ['h', 580, 330, 0.9], ['v', 235, 650, 0.85], ['v', 235, 780, 0.85], ['h', 925, 197, 0.75], ['v', 160, 972, 0.7], ['h', 1010, 197, 0.85], ['h', 1000, 380, 0.85], ['h', 1250, 370, 0.75], ['h', 1250, 140, 0.9], ['h', 1250, 272, 0.9],
];

// ---------- Geometry helpers ----------
const solid = r => r.type !== 'bal' && r.type !== 'void';
function sub(list, a, b) {
  const out = [];
  for (const [s, e] of list) {
    if (b <= s || a >= e) { out.push([s, e]); continue; }
    if (a > s) out.push([s, a]);
    if (b < e) out.push([b, e]);
  }
  return out.filter(([s, e]) => e - s > 0.5);
}
function union(list) {
  const l = list.slice().sort((p, q) => p[0] - q[0]); const out = [];
  for (const it of l) { const last = out[out.length - 1]; if (last && it[0] <= last[1] + 0.5) last[1] = Math.max(last[1], it[1]); else out.push([it[0], it[1]]); }
  return out;
}
function edgesOf(r) {
  return [
    { axis: 'h', c: r.y0, a: r.x0, b: r.x1, out: -1, side: 'top' },
    { axis: 'h', c: r.y1, a: r.x0, b: r.x1, out: 1, side: 'bottom' },
    { axis: 'v', c: r.x0, a: r.y0, b: r.y1, out: -1, side: 'left' },
    { axis: 'v', c: r.x1, a: r.y0, b: r.y1, out: 1, side: 'right' },
  ];
}
const doorIntervals = (axis, c) => DOORS.filter(d => d[0] === axis && d[1] === c).map(d => { const h = d[3] / 2 / PX; return [d[2] - h, d[2] + h]; });

// classify every wall
const interiorLines = new Map(); const exteriorParts = []; const railParts = [];
for (const r of ROOMS) {
  r.sides = {}; r.openSides = new Set();
  for (const e of edgesOf(r)) {
    let remaining = [[e.a, e.b]];
    for (const q of ROOMS) {
      if (q === r || !solid(q)) continue;
      for (const f of edgesOf(q)) {
        if (f.axis !== e.axis || f.c !== e.c || f.out !== -e.out) continue;
        const a = Math.max(e.a, f.a), b = Math.min(e.b, f.b);
        if (b - a <= 0.5) continue;
        remaining = sub(remaining, a, b);
        if (solid(r)) {
          if (r.group && r.group === q.group) r.openSides.add(e.side);
          else { const k = e.axis + e.c; if (!interiorLines.has(k)) interiorLines.set(k, { axis: e.axis, c: e.c, parts: [] }); interiorLines.get(k).parts.push([a, b]); }
        }
      }
    }
    if (r.type === 'void') continue;
    for (const p of remaining) {
      if (solid(r)) exteriorParts.push({ axis: e.axis, c: e.c, s: p[0], t: p[1], room: r, out: e.out });
      else railParts.push({ axis: e.axis, c: e.c, s: p[0], t: p[1] });
    }
  }
}
for (const r of ROOMS) {
  r.doorSides = new Set();
  for (const d of DOORS) {
    if (d[0] === 'h' && d[2] > r.x0 && d[2] < r.x1) { if (d[1] === r.y0) r.doorSides.add('top'); if (d[1] === r.y1) r.doorSides.add('bottom'); }
    if (d[0] === 'v' && d[2] > r.y0 && d[2] < r.y1) { if (d[1] === r.x0) r.doorSides.add('left'); if (d[1] === r.x1) r.doorSides.add('right'); }
  }
}

const FLOOR_BASE = { bed: 0xc49a6c, study: 0xc49a6c, liv: 0xe6dfd3, hall: 0xe6dfd3, kit: 0xd6cdbf, toi: 0xa9bec7, bal: 0x956a46, stair: 0xcfc8bc, lobby: 0xcfc8bc, shaft: 0x8a8580, lift: 0x6b6f75 };

// Unit centres (used for plan view camera and badges)
for (const [u, info] of Object.entries(UNITS)) {
  const rs = ROOMS.filter(r => r.unit === u && solid(r));
  let ax = 0, az = 0, aw = 0;
  for (const r of rs) { const a = (r.x1 - r.x0) * (r.y1 - r.y0); ax += a * (r.x0 + r.x1) / 2; az += a * (r.y0 + r.y1) / 2; aw += a; }
  info.center = [ax / aw, az / aw];
  info.carpet = Math.round(info.area * (1 - FACTS_CARPET_LOADING));
}

// ---------- Project facts (single source for every page) ----------
const FACTS = {
  project: 'Wonder Home V',
  where: 'Sector 101, Noida',
  landmark: 'Opposite Bade Hanuman Ji Temple',
  rate: 6999, // rupees per sq ft of super area
  carpetLoading: FACTS_CARPET_LOADING, // carpet area = super area less 8%
  extras: 'Parking, PLC, power backup and GST extra. Stamp duty and registration as per government rates.',
  possession: 'Possession in 11 months',
  structure: 'UG + 6 floors, five homes on every floor',
  trust: '200+ homes delivered in Noida since 2017.',
  trustHi: '2017 से नोएडा में 200+ घर सौंप चुके हैं।',
  promiseHi: 'सही जगह, सही दाम।',
  phones: [
    { label: 'Call or WhatsApp', text: '+91 70602 00814', tel: '+917060200814', wa: '917060200814' },
    { label: 'Second line', text: '+91 99536 51665', tel: '+919953651665' },
  ],
  developer: 'Infra Kraft Homes Private Limited',
  marketer: 'Legacy Estate Private Limited',
  highlights: [
    { k: 'lift', t: 'High speed lift', d: 'One lift and one staircase serving every floor from the stilt lobby.' },
    { k: 'parking', t: 'Covered parking', d: 'Stilt parking under the building, out of sun and rain. Charged extra.' },
    { k: 'security', t: '24x7 security and CCTV', d: 'Guarded gate and camera coverage of the entrance and stilt.' },
    { k: 'fire', t: 'Fire safety', d: 'Fire safety systems on every floor as per the sanctioned plan.' },
    { k: 'power', t: 'Power backup', d: 'Backup for lift, common areas and homes. Charged extra.' },
  ],
  travel: [
    { group: 'Metro and airport', items: [['Sector 101 metro', 5], ['Sector 76 metro', 5], ['IGI Airport', 40]] },
    { group: 'Hospitals', items: [['Medanta', 5], ['Fortis', 15], ['Max', 18]] },
    { group: 'Schools', items: [['Pathways School', 5], ['Jagran Public School', 8], ['Kothari International', 9], ['The Khaitan School', 12]] },
    { group: 'Shopping', items: [['Aditya Ancora Mall', 5], ['Spectrum Mall', 5], ['DLF Mall of India', 18]] },
  ],
  plan: [
    ['At booking', 'On agreement', 10],
    ['Foundation complete', 'Ground floor slab cast', 15],
    ['3rd floor slab', 'Structure milestone', 15],
    ['5th floor slab', 'Structure milestone', 15],
    ['Terrace complete', 'Full structure done', 15],
    ['Finishing and OC', 'Occupancy certificate received', 20],
    ['At possession', 'When you get the keys', 10],
  ],
  disclaimer: 'Artist impression. Illustrative model built from the architect\'s typical floor plan. Areas are subject to the final sanctioned plan; carpet area shown is super area less 8%. Furniture is indicative.',
};
const unitPrice = code => UNITS[code].area * FACTS.rate;
function rupees(n) { // ₹75.2 lakh / ₹1.17 crore
  if (n >= 1e7) return '₹' + (n / 1e7).toFixed(2).replace(/\.?0+$/, '') + ' crore';
  return '₹' + (n / 1e5).toFixed(1).replace(/\.0$/, '') + ' lakh';
}
const waLink = text => `https://wa.me/${FACTS.phones[0].wa}?text=${encodeURIComponent(text)}`;

// ---------- Scroll keyframes (hero mode) ----------
// One pose per page section. The camera is at a section's pose when that section's top
// reaches the top of the viewport, and blends (smoothstep) to the next pose as you scroll on.
// pos / target in metres (x east, y up, z south toward the road). fitCap limits how far the
// camera pulls back on narrow (portrait) screens. Mood values:
//   sun, hemi, amb: light intensities; street: sodium street light; windows: lit window
//   emissive; sky: background brightness; exposure: tone mapping; fog: [near, far]; fov: degrees.
const BASE_MOOD = { sun: 1.9, hemi: 1.3, amb: 0.25, street: 30, windows: 0.95, sky: 1.0, exposure: 1.05, fog: [90, 260], fov: 45 };
const KEYFRAMES = [
  { id: 'hero',       pos: [30, 16, 46],   target: [0, 11, 0],     fitCap: 1.6,  narrowTargetY: 7, mood: {} },
  { id: 'overview',   pos: [4, 14, 44],    target: [0, 11, 0],     fitCap: 1.6,  narrowTargetY: 8, mood: {} },
  { id: 'residences', pos: [7, 3.5, 24],   target: [2, 15, 0],     fitCap: 1.3,  mood: { sun: 1.4, hemi: 0.9, amb: 0.2, street: 36, windows: 1.8, sky: 0.7, exposure: 1.0, fov: 52 } },
  { id: 'amenities',  pos: [16, 2.4, 14],  target: [-5, 2.2, -2],  fitCap: 1.25, mood: { sun: 1.4, hemi: 1.0, amb: 0.3, street: 45, windows: 1.5, sky: 0.8, exposure: 1.0, fov: 50 } },
  { id: 'location',   pos: [34, 52, 72],   target: [0, 4, -10],    fitCap: 1.5,  mood: { fog: [150, 380] } },
  { id: 'pay',        pos: [-30, 26, 50],  target: [0, 10, 0],     fitCap: 1.5,  narrowTargetY: 6, mood: { windows: 1.2, sky: 0.9 } },
  { id: 'contact',    pos: [2, 1.7, 21],   target: [-6, 1.8, -2],  fitCap: 1.2,  mood: { sun: 0.9, hemi: 0.8, amb: 0.2, street: 60, windows: 1.8, sky: 0.55, exposure: 0.92, fov: 48 } },
];

// ---------- Hotspot pins (world metres) ----------
const PINS = [
  { id: 'balcony', pos: [wx(1055), elev(3) + 1.1, wz(1280)], label: '3 BHK balcony', line: '4 ft balcony on the road side, same on every floor.', section: 'residences', tour: { mode: 'plan', level: 3, unit: 'F1' } },
  { id: 'stilt',   pos: [(wx(40) + wx(455)) / 2, 2.3, wz(580) + 0.15], label: 'Lift and parking', line: 'High speed lift and covered stilt parking.', section: 'amenities', tour: { mode: 'exterior' } },
  { id: 'roof',    pos: [3, elev(LEVELS) + 1.4, 6], label: 'Roof', line: 'UG + 6 floors, five homes on each.', section: 'overview', tour: { mode: 'plan', level: 6 } },
  { id: 'gate',    pos: [0, 1.6, (BOUNDS.y1 - BOUNDS.y0) * PX / 2 + 2.4], label: 'Entrance gate', line: 'Opposite Bade Hanuman Ji Temple. Metro in 5 minutes.', section: 'location', tour: { mode: 'exterior' } },
];

export {
  PX, CX, CY, wx, wz, FH, WH, SLAB, STILT, LEVELS, elev, LEVEL_NAMES, LEVEL_LONG, BOUNDS,
  UNITS, ROOMS, DOORS, FLOOR_BASE, solid, sub, union, edgesOf, doorIntervals,
  interiorLines, exteriorParts, railParts,
  FACTS, unitPrice, rupees, waLink, BASE_MOOD, KEYFRAMES, PINS,
};
