// wonderhome-tour.js
// Full 3D tour UI (floor picker, residences panel, plan view, walk mode) mounted on top of a
// scene from createScene(). Used in place by index.html ("Explore in 3D") and on its own by
// tour.html. The camera is never reset: OrbitControls start from wherever the camera already is.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { PX, CX, CY, wx, wz, elev, LEVELS, LEVEL_NAMES, LEVEL_LONG, UNITS, ROOMS, FLOOR_BASE, solid, FACTS, unitPrice, rupees, waLink } from './wonderhome-data.js';
import { buildInterior, exteriorPose, easeInOut } from './wonderhome-scene.js';

const CSS = `
.wt{position:fixed;inset:0;z-index:40;pointer-events:none;font-family:"Anek Latin","Anek Devanagari",system-ui,sans-serif;color:#fff;
  --wt-glass:rgba(14,23,56,.86);--wt-hi:rgba(53,85,168,.38);--wt-line:rgba(227,235,248,.18);--wt-soft:#E3EBF8;--wt-mute:#AFBEDF;
  padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);opacity:0;transition:opacity .45s ease}
.wt.on{opacity:1}
.wt>*{pointer-events:auto}
.wt [hidden]{display:none!important}
.wt .wt-labels{position:absolute;inset:0;pointer-events:none}
.wt button,.wt a{font:inherit;color:inherit}
.wt button{cursor:pointer;touch-action:manipulation}
.wt button:focus-visible,.wt a:focus-visible{outline:2px solid #FFC53D;outline-offset:2px}
.wt .num{font-variant-numeric:tabular-nums}
.wt-brand{position:absolute;left:16px;top:calc(env(safe-area-inset-top,0px) + 16px);display:grid;gap:4px;max-width:calc(100% - 32px);padding:12px 16px;border-radius:10px;background:var(--wt-glass);border:1px solid var(--wt-line);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
.wt-brand h2{margin:0;font-size:26px;line-height:30px;font-weight:700;letter-spacing:-.015em}
.wt-brand .where{font-size:15px;line-height:20px;font-weight:600;color:var(--wt-soft)}
.wt-back{justify-self:start;margin-top:6px;border:1px solid var(--wt-line);background:transparent;border-radius:8px;min-height:36px;padding:0 12px;font-size:14px;font-weight:600;text-decoration:none;display:inline-flex;align-items:center}
.wt-back:hover{background:var(--wt-hi)}
.wt-levels{position:absolute;left:16px;top:50%;transform:translateY(-50%);display:grid;gap:4px;padding:6px;border-radius:14px;background:var(--wt-glass);border:1px solid var(--wt-line);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
.wt-levels .cap{font-size:13px;line-height:18px;font-weight:600;color:var(--wt-mute);text-align:center;padding:2px 0 4px}
.wt-levels button{min-width:48px;height:40px;border-radius:8px;border:1px solid transparent;background:transparent;font-size:15px;font-weight:600;color:var(--wt-soft)}
.wt-levels button:hover{border-color:var(--wt-line)}
.wt-levels button[aria-pressed="true"]{background:#fff;color:#1B2F6E}
.wt-panel{position:absolute;right:16px;top:calc(env(safe-area-inset-top,0px) + 16px);bottom:calc(env(safe-area-inset-bottom,0px) + 16px);width:340px;display:flex;flex-direction:column;border-radius:16px;background:var(--wt-glass);border:1px solid var(--wt-line);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);overflow:hidden}
.wt-grab{display:none}
.wt-body{flex:1 1 auto;min-height:0;overflow:auto;overscroll-behavior:contain;padding:16px;display:grid;gap:14px;align-content:start}
.wt-price{display:grid;gap:4px;background:#FFC53D;color:#111728;border-radius:10px;padding:12px 14px}
.wt-price .l{margin:0;font-size:14px;line-height:18px;font-weight:600}
.wt-price .a{margin:0;font-size:34px;line-height:38px;font-weight:800;letter-spacing:-.02em;color:#1B2F6E;white-space:nowrap}
.wt-price .x{margin:0;font-size:13px;line-height:18px}
.wt-price .p{margin:4px 0 0;font-size:18px;font-weight:800;color:#1B2F6E}
.wt-panel h3{margin:0;font-size:22px;line-height:28px;font-weight:600}
.wt-hint{margin:4px 0 0;font-size:15px;color:var(--wt-soft);line-height:22px}
.wt-units{display:grid;gap:6px}
.wt-unit{display:grid;grid-template-columns:40px 1fr auto;align-items:center;gap:12px;min-height:56px;padding:8px 10px;border-radius:10px;border:1px solid var(--wt-line);background:transparent;text-align:left}
.wt-unit:hover{background:var(--wt-hi)}
.wt-unit[aria-pressed="true"]{border-color:var(--wt-soft);background:var(--wt-hi)}
.wt-unit .sw{width:40px;height:40px;border-radius:8px;display:grid;place-items:center;font-size:15px;font-weight:700;color:#1B2F6E}
.wt-unit .t{font-weight:600;font-size:16px;line-height:20px}
.wt-unit .ar{font-size:14px;color:var(--wt-soft);white-space:nowrap}
.wt-detail{display:grid;gap:10px}
.wt-detail .head{display:flex;align-items:baseline;justify-content:space-between;gap:8px}
.wt-detail .big{font-size:32px;line-height:34px;font-weight:700}
.wt-detail .area{font-size:14px;font-weight:600;color:var(--wt-soft);text-align:right}
.wt-rooms{list-style:none;margin:0;padding:0;display:grid}
.wt-rooms li{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid var(--wt-line);font-size:15px;line-height:20px}
.wt-rooms li span:last-child{color:var(--wt-soft);white-space:nowrap}
.wt-cta{border:0;border-radius:10px;min-height:48px;padding:0 14px;background:#fff;color:#1B2F6E;font-weight:700;font-size:16px;text-decoration:none;display:inline-flex;align-items:center;justify-content:center}
.wt-ghost{border:1px solid var(--wt-line);background:transparent;border-radius:10px;min-height:44px;padding:0 12px;font-size:15px;font-weight:600;color:var(--wt-soft)}
.wt-note{font-size:13px;color:var(--wt-mute);line-height:19px;margin:0}
.wt-trust{font-size:15px;line-height:20px;font-weight:600;color:var(--wt-soft);margin:0}
.wt-dock{flex:none;padding:8px 12px;border-top:1px solid var(--wt-line)}
.wt-modes{display:flex;gap:4px;padding:4px;border-radius:999px;background:rgba(227,235,248,.08)}
.wt-modes button{flex:1;border:0;background:transparent;min-height:44px;padding:0 12px;border-radius:999px;font-size:15px;font-weight:600;color:var(--wt-soft);white-space:nowrap}
.wt-modes button[aria-pressed="true"]{background:#fff;color:#1B2F6E}
.wt-hud{position:absolute;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 16px);padding:8px 16px;border-radius:999px;background:var(--wt-glass);border:1px solid var(--wt-line);font-size:15px;white-space:nowrap}
.wt-hud span{color:var(--wt-soft);margin-left:8px;font-size:14px}
.wt-walkhelp{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 24px);font-size:14px;color:var(--wt-soft);background:var(--wt-glass);border:1px solid var(--wt-line);padding:8px 14px;border-radius:999px;white-space:nowrap}
.wt-walkhelp kbd{font-family:inherit;font-size:13px;font-weight:600;padding:1px 6px;border:1px solid var(--wt-line);border-radius:4px}
.wt-joy{position:absolute;width:112px;height:112px;border-radius:50%;border:1.5px solid rgba(227,235,248,.45);background:rgba(14,23,56,.35);pointer-events:none}
.wt-joy i{position:absolute;left:50%;top:50%;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:rgba(227,235,248,.9)}
.wt-walktip{display:none}
.wt-lbl{font:600 12px/1.25 "Anek Latin",system-ui,sans-serif;color:#111728;background:rgba(255,255,255,.94);padding:4px 7px;border-radius:5px;text-align:center;white-space:nowrap}
.wt-lbl small{display:block;font-size:11px;font-weight:500;color:#586178}
.wt-badge{font:700 16px/1 "Anek Latin",system-ui,sans-serif;color:#1B2F6E;padding:8px 12px;border-radius:999px;white-space:nowrap;pointer-events:auto;cursor:pointer;border:1.5px solid rgba(255,255,255,.85);min-height:32px;display:inline-flex;align-items:center}
.wt-badge small{font-size:12px;font-weight:600;margin-left:6px;opacity:.8}
@media (max-width:760px){
  .wt-brand{left:12px;right:12px;top:calc(env(safe-area-inset-top,0px) + 10px);max-width:none;padding:10px 12px;grid-template-columns:1fr auto;align-items:center;gap:2px 12px}
  .wt-brand h2{font-size:20px;line-height:24px}
  .wt-brand .where{grid-column:1;font-size:14px}
  .wt-back{grid-column:2;grid-row:1/3;margin:0}
  .wt-levels{left:12px;right:12px;top:calc(env(safe-area-inset-top,0px) + 86px);transform:none;display:flex;padding:4px;overflow-x:auto;scrollbar-width:none}
  .wt-levels .cap{display:none}
  .wt-levels button{flex:1 0 44px;min-width:44px}
  .wt-hud{top:calc(env(safe-area-inset-top,0px) + 140px);max-width:calc(100% - 24px);overflow:hidden;text-overflow:ellipsis}
  .wt-walkhelp{display:none}
  .wt-walktip{display:block;position:absolute;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 186px);font-size:14px;color:var(--wt-soft);background:var(--wt-glass);border:1px solid var(--wt-line);padding:6px 12px;border-radius:999px;white-space:nowrap}
  .wt-panel{left:0;right:0;top:auto;bottom:0;width:auto;border-radius:18px 18px 0 0;border-width:1px 0 0;max-height:calc(100% - env(safe-area-inset-top,0px) - 100px);transition:height .32s cubic-bezier(.2,.8,.2,1);height:var(--sheet-h,auto);padding-bottom:env(safe-area-inset-bottom,0px)}
  .wt-panel.dragging{transition:none}
  .wt-grab{display:flex;justify-content:center;align-items:center;flex:none;height:28px;border:0;background:transparent;width:100%}
  .wt-grab::before{content:"";width:40px;height:5px;border-radius:3px;background:rgba(227,235,248,.45)}
  .wt-body{padding:0 12px 12px;gap:12px}
  .wt-price .a{font-size:28px;line-height:32px}
  .wt-hint{display:none}
  .wt-units{grid-auto-flow:column;grid-auto-columns:minmax(156px,1fr);overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;margin:0 -12px;padding:0 12px}
  .wt-unit{scroll-snap-align:start;grid-template-columns:40px 1fr;grid-template-rows:auto auto;gap:0 10px}
  .wt-unit .sw{grid-row:1/3}
  .wt-unit .ar{grid-column:2;font-size:13px}
  .wt-panel[data-sheet="peek"] .wt-body > :not(.wt-price){display:none}
}
@media (prefers-reduced-motion: reduce){.wt,.wt *{transition:none!important}}
`;

const tintCss = n => '#' + n.toString(16).padStart(6, '0');
const fmt = n => n.toLocaleString('en-IN');

export async function mountTour(ctx, { host = document.body, initial = {}, onExit = null, backHref = null } = {}) {
  const { renderer, scene, camera } = ctx;
  const { hemi, amb } = ctx.lights;
  const ac = new AbortController(); const sig = { signal: ac.signal };

  if (!document.getElementById('wt-style')) { const st = document.createElement('style'); st.id = 'wt-style'; st.textContent = CSS; document.head.appendChild(st); }

  // ----- interior, built once -----
  if (!ctx.groups.interior) {
    const built = buildInterior(scene);
    if (!renderer.shadowMap.enabled) built.interior.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
    ctx.groups.interior = built.interior; ctx.interiorData = built;
    // labels and unit badges
    const roomLabels = [], badges = {};
    for (const r of ROOMS) {
      if (!r.unit || r.type === 'void' || r.type === 'hall') continue;
      const el = document.createElement('div'); el.className = 'wt-lbl';
      el.innerHTML = `${r.name}${r.dims ? `<small>${r.dims}</small>` : ''}`;
      const o = new CSS2DObject(el); o.position.set(wx((r.x0 + r.x1) / 2), 1.2, wz((r.y0 + r.y1) / 2)); o.userData.unit = r.unit; o.visible = false;
      built.interior.add(o); roomLabels.push(o);
    }
    for (const [u, info] of Object.entries(UNITS)) {
      const el = document.createElement('div'); el.className = 'wt-badge'; el.style.background = tintCss(info.tint);
      el.innerHTML = `${u}<small>${info.type}</small>`; el.dataset.unit = u;
      const o = new CSS2DObject(el); o.position.set(wx(info.center[0]), 3.4, wz(info.center[1])); o.visible = false; built.interior.add(o); badges[u] = o;
    }
    ctx.interiorData.roomLabels = roomLabels; ctx.interiorData.badges = badges;
  }
  const { interior, floorMeshes, walkSolids, roomLabels, badges } = ctx.interiorData;
  const { shells, roof } = ctx.groups;

  // ----- DOM -----
  const root = document.createElement('div'); root.className = 'wt'; root.setAttribute('role', 'region'); root.setAttribute('aria-label', '3D tour of Wonder Home V');
  const from = Math.min(...Object.keys(UNITS).map(unitPrice));
  root.innerHTML = `
  <div class="wt-labels"></div>
  <header class="wt-brand">
    <h2>Wonder Home V</h2>
    <span class="where">${FACTS.where}. ${FACTS.landmark}.</span>
    ${onExit ? '<button class="wt-back" data-a="exit" type="button">Back to the page</button>' : backHref ? `<a class="wt-back" href="${backHref}">Back to the page</a>` : ''}
  </header>
  <div class="wt-levels" hidden><div class="cap">Floor</div></div>
  <aside class="wt-panel" data-sheet="half" aria-label="Residences">
    <button class="wt-grab" aria-label="Resize panel" type="button"></button>
    <div class="wt-body">
      <div class="wt-price">
        <p class="l">2 BHK from</p><p class="a num">${rupees(from)}</p>
        <p class="x">At ₹${fmt(FACTS.rate)} per sq ft of super area. ${FACTS.extras}</p>
        <p class="p num">${FACTS.phones[0].text}</p>
      </div>
      <div class="wt-list" style="display:grid;gap:12px">
        <div><h3>Residences</h3><p class="wt-hint">Five homes on every floor, UG to 6th. Pick one to see its rooms, then walk through it.</p></div>
        <div class="wt-units"></div>
      </div>
      <div class="wt-detail" hidden>
        <div class="head"><span class="big"></span><span class="area num"></span></div>
        <div class="dtype" style="font-size:15px;color:var(--wt-soft)"></div>
        <ul class="wt-rooms"></ul>
        <button class="wt-cta" data-a="walk" type="button">Walk through</button>
        <a class="wt-cta wt-ask" target="_blank" rel="noopener" style="background:#FFC53D;color:#111728">Ask about this home on WhatsApp</a>
        <button class="wt-ghost" data-a="back" type="button">All residences</button>
      </div>
      <p class="wt-trust">${FACTS.trust}</p>
      <p class="wt-note">${FACTS.disclaimer}</p>
    </div>
    <div class="wt-dock"><nav class="wt-modes" aria-label="View">
      <button data-m="exterior" aria-pressed="true" type="button">Building</button>
      <button data-m="plan" aria-pressed="false" type="button">Floor plan</button>
      <button data-m="walk" aria-pressed="false" type="button">Walk inside</button>
    </nav></div>
  </aside>
  <div class="wt-hud" hidden></div>
  <div class="wt-walkhelp" hidden>Drag to look. <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or arrows to move. <kbd>Shift</kbd> faster. <kbd>Esc</kbd> to exit.</div>
  <div class="wt-walktip" hidden>Left thumb to move, right thumb to look</div>
  <div class="wt-joy" hidden><i></i></div>`;
  host.appendChild(root);
  const q = s => root.querySelector(s);
  const labelRenderer = new CSS2DRenderer({ element: q('.wt-labels') });
  const levelsEl = q('.wt-levels'), unitsEl = q('.wt-units'), panelEl = q('.wt-panel'), grabEl = q('.wt-grab'), sheetBody = q('.wt-body');

  for (let L = LEVELS - 1; L >= 0; L--) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = LEVEL_NAMES[L]; b.title = LEVEL_LONG[L]; b.dataset.level = L;
    b.setAttribute('aria-label', LEVEL_LONG[L]); b.addEventListener('click', () => setLevel(L)); levelsEl.appendChild(b);
  }
  for (const [u, info] of Object.entries(UNITS)) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'wt-unit'; b.dataset.unit = u; b.setAttribute('aria-pressed', 'false');
    b.innerHTML = `<span class="sw" style="background:${tintCss(info.tint)}">${u}</span><span class="t">${info.type}</span><span class="ar num">${fmt(info.carpet)} sq ft carpet</span>`;
    b.addEventListener('click', () => selectUnit(state.unit === u ? null : u)); unitsEl.appendChild(b);
  }
  for (const [u, o] of Object.entries(badges)) o.element.onclick = ev => { ev.stopPropagation(); selectUnit(u); };
  root.addEventListener('click', e => {
    const a = e.target.closest('[data-a]'); const m = e.target.closest('[data-m]');
    if (m) setMode(m.dataset.m);
    else if (a?.dataset.a === 'walk') setMode('walk');
    else if (a?.dataset.a === 'back') selectUnit(null);
    else if (a?.dataset.a === 'exit') close();
  }, sig);

  // ----- bottom sheet (phones) -----
  const phoneMQ = window.matchMedia('(max-width: 760px)');
  const isPhone = () => phoneMQ.matches;
  let currentSheet = 'half';
  function sheetHeights() {
    const chrome = panelEl.offsetHeight - sheetBody.offsetHeight;
    const price = sheetBody.querySelector('.wt-price').offsetHeight + 12;
    const max = window.innerHeight - 110;
    return { peek: chrome + price, half: Math.min(max, Math.round(window.innerHeight * 0.48)), full: max };
  }
  function setSheet(name) {
    currentSheet = name; panelEl.dataset.sheet = name;
    if (!isPhone()) { panelEl.style.removeProperty('--sheet-h'); return; }
    panelEl.style.setProperty('--sheet-h', 'auto');
    requestAnimationFrame(() => panelEl.style.setProperty('--sheet-h', sheetHeights()[name] + 'px'));
  }
  {
    let drag = null;
    grabEl.addEventListener('pointerdown', e => { if (!isPhone()) return; drag = { y: e.clientY, h: panelEl.offsetHeight, moved: false }; grabEl.setPointerCapture(e.pointerId); panelEl.classList.add('dragging'); }, sig);
    grabEl.addEventListener('pointermove', e => {
      if (!drag) return; const dy = drag.y - e.clientY; if (Math.abs(dy) > 4) drag.moved = true;
      if (drag.moved) { panelEl.dataset.sheet = 'half'; const H = sheetHeights(); panelEl.style.setProperty('--sheet-h', Math.max(H.peek, Math.min(H.full, drag.h + dy)) + 'px'); }
    }, sig);
    const end = () => {
      if (!drag) return; panelEl.classList.remove('dragging');
      const H = sheetHeights(), h = panelEl.offsetHeight;
      if (!drag.moved) setSheet(currentSheet === 'peek' ? 'half' : currentSheet === 'half' ? 'full' : 'peek');
      else { const order = ['peek', 'half', 'full']; setSheet(order.reduce((a, b) => (Math.abs(H[b] - h) < Math.abs(H[a] - h) ? b : a))); }
      drag = null;
    };
    grabEl.addEventListener('pointerup', end, sig); grabEl.addEventListener('pointercancel', end, sig);
    phoneMQ.addEventListener('change', () => setSheet(currentSheet), sig);
    window.addEventListener('resize', () => { if (isPhone()) setSheet(currentSheet); }, sig);
  }

  // ----- controls: start exactly where the camera is -----
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.495; controls.minDistance = 6; controls.maxDistance = 140;
  controls.target.copy(ctx.getPose().target);
  controls.update();
  ctx.controls = controls;

  // ----- state -----
  const state = { mode: 'exterior', level: Number.isInteger(initial.level) ? initial.level : 2, unit: null };
  let lastModeUI = null;
  const tmpColor = new THREE.Color();
  function paintFloors() {
    for (const r of ROOMS) {
      if (!r.floor) continue;
      const base = new THREE.Color(FLOOR_BASE[r.type] ?? 0xdddddd);
      if (state.mode === 'plan' && r.unit) {
        const tint = tmpColor.setHex(state.unit === r.unit ? 0xffc53d : UNITS[r.unit].tint);
        base.lerp(tint, state.unit && state.unit !== r.unit ? 0.15 : 0.6);
        if (state.unit && state.unit !== r.unit) base.multiplyScalar(0.62);
      }
      r.floor.material.color.copy(base);
    }
  }
  const isCoarse = ctx.coarse;
  function refreshUI() {
    root.querySelectorAll('[data-m]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === state.mode)));
    levelsEl.hidden = state.mode === 'exterior';
    for (const b of levelsEl.querySelectorAll('button')) b.setAttribute('aria-pressed', String(+b.dataset.level === state.level));
    for (const b of unitsEl.querySelectorAll('.wt-unit')) b.setAttribute('aria-pressed', String(b.dataset.unit === state.unit));
    q('.wt-detail').hidden = !state.unit; q('.wt-list').style.display = state.unit ? 'none' : 'grid';
    if (state.unit) {
      const u = UNITS[state.unit];
      q('.wt-detail .big').textContent = state.unit;
      q('.wt-detail .area').innerHTML = `${fmt(u.carpet)} sq ft carpet<br>${fmt(u.area)} sq ft super`;
      q('.dtype').textContent = `${u.type}. ${LEVEL_LONG[state.level]}. ${rupees(unitPrice(state.unit))} at ₹${fmt(FACTS.rate)} per sq ft, extras as listed above.`;
      q('.wt-rooms').innerHTML = ROOMS.filter(r => r.unit === state.unit && r.dims && r.type !== 'void').map(r => `<li><span>${r.name}</span><span>${r.dims}</span></li>`).join('');
      q('[data-a="walk"]').textContent = state.mode === 'walk' ? `Restart at ${state.unit} entrance` : `Walk through ${state.unit}`;
      q('.wt-ask').href = waLink(`Hi, I am interested in ${state.unit}, ${u.type}, ${fmt(u.area)} sq ft at Wonder Home V, Sector 101. Please share the cost sheet and a site visit time.`);
    }
    if (state.mode !== lastModeUI) { setSheet(state.mode === 'walk' ? 'peek' : 'half'); lastModeUI = state.mode; }
    q('.wt-walktip').hidden = !(state.mode === 'walk' && isCoarse);
    q('.wt-walkhelp').hidden = state.mode !== 'walk';
    q('.wt-hud').hidden = state.mode !== 'walk';
    const showLabels = state.mode === 'plan';
    for (const o of roomLabels) o.visible = showLabels && o.userData.unit === state.unit;
    for (const o of Object.values(badges)) o.visible = showLabels && !state.unit;
    paintFloors();
  }
  function applyVisibility() {
    const L = state.level;
    interior.visible = state.mode !== 'exterior';
    interior.position.y = elev(L);
    shells.forEach((s, i) => { s.visible = state.mode === 'exterior' || i < L || (state.mode === 'walk' && i > L); });
    roof.visible = state.mode !== 'plan';
  }

  // camera moves
  let fly = null;
  const reduceMotion = ctx.reduce;
  function flyTo(pos, target, dur = 1.1) {
    if (reduceMotion) { camera.position.copy(pos); controls.target.copy(target); fly = null; return; }
    fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos, t1: target, start: performance.now(), dur: dur * 1000 };
  }
  const fit = () => Math.max(1, 0.95 / camera.aspect);
  const narrow = () => camera.aspect < 0.8;
  function planView() {
    const y = elev(state.level), f = fit();
    if (state.unit) {
      const [px, py] = UNITS[state.unit].center;
      const t = new THREE.Vector3(wx(px), y - (narrow() ? 5 : 0), wz(py));
      flyTo(new THREE.Vector3(t.x + 6 * f, y + 15 * f, t.z + 12 * f), t);
    } else flyTo(new THREE.Vector3(14 * f, y + 26 * f, 26 * f), new THREE.Vector3(0, y - (narrow() ? 9 : 0), 1));
  }
  function exteriorView() { const p = exteriorPose(camera.aspect); flyTo(p.pos, p.target); }

  function setMode(m) {
    if (m === 'walk') startWalk(); else endWalk();
    state.mode = m; applyVisibility(); refreshUI();
    if (m === 'plan') planView(); else if (m === 'exterior') exteriorView();
  }
  function setLevel(L) {
    const dy = elev(L) - elev(state.level); state.level = L; applyVisibility(); refreshUI();
    if (state.mode === 'plan') planView();
    if (state.mode === 'walk') walker.pos.y += dy;
  }
  function selectUnit(u) {
    state.unit = u;
    if (u && isPhone() && currentSheet === 'peek') setSheet('half');
    if (state.mode === 'exterior' && u) { state.mode = 'plan'; applyVisibility(); }
    refreshUI();
    if (state.mode === 'plan') planView();
  }

  // ----- walk mode -----
  const walker = { pos: new THREE.Vector3(), yaw: 0, pitch: 0, keys: new Set(), joy: null, look: null };
  function startWalk() {
    const u = state.unit ? UNITS[state.unit] : null;
    const at = u ? u.entry : [515, 540], fr = u ? u.from : [470, 540];
    walker.pos.set(wx(at[0]), elev(state.level) + 1.6, wz(at[1]));
    walker.yaw = Math.atan2(-(wx(at[0]) - wx(fr[0])), -(wz(at[1]) - wz(fr[1])));
    walker.pitch = -0.05; controls.enabled = false; fly = null;
    camera.fov = 70; camera.updateProjectionMatrix();
  }
  function endWalk() {
    if (state.mode !== 'walk') return;
    controls.enabled = true; camera.fov = 45; camera.updateProjectionMatrix();
    const y = elev(state.level);
    camera.position.set(walker.pos.x + 8, y + 18, walker.pos.z + 14); controls.target.set(walker.pos.x, y, walker.pos.z);
  }
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && state.mode !== 'walk' && onExit) { close(); return; }
    if (state.mode !== 'walk') return;
    if (e.key === 'Escape') { setMode('plan'); return; }
    const k = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(k)) { walker.keys.add(k); e.preventDefault(); }
  }, sig);
  window.addEventListener('keyup', e => walker.keys.delete(e.key.toLowerCase()), sig);
  window.addEventListener('blur', () => walker.keys.clear(), sig);

  const joyEl = q('.wt-joy'), canvas = renderer.domElement;
  let downAt = null;
  canvas.addEventListener('pointerdown', e => {
    downAt = [e.clientX, e.clientY];
    if (state.mode !== 'walk') return;
    canvas.setPointerCapture(e.pointerId);
    if (e.pointerType === 'touch' && e.clientX < window.innerWidth * 0.45 && !walker.joy) {
      walker.joy = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dy: 0 };
      joyEl.hidden = false; joyEl.style.left = (e.clientX - 56) + 'px'; joyEl.style.top = (e.clientY - 56) + 'px';
      joyEl.firstElementChild.style.transform = 'translate(0,0)';
    } else walker.look = { id: e.pointerId, x: e.clientX, y: e.clientY };
  }, sig);
  canvas.addEventListener('pointermove', e => {
    if (state.mode !== 'walk') return;
    if (walker.joy && e.pointerId === walker.joy.id) {
      let dx = e.clientX - walker.joy.x, dy = e.clientY - walker.joy.y; const m = Math.hypot(dx, dy);
      if (m > 44) { dx *= 44 / m; dy *= 44 / m; }
      walker.joy.dx = dx / 44; walker.joy.dy = dy / 44;
      joyEl.firstElementChild.style.transform = `translate(${dx}px,${dy}px)`;
    } else if (walker.look && e.pointerId === walker.look.id) {
      const s = e.pointerType === 'touch' ? 0.006 : 0.0045;
      walker.yaw -= (e.clientX - walker.look.x) * s; walker.pitch -= (e.clientY - walker.look.y) * s;
      walker.pitch = Math.max(-1.2, Math.min(1.2, walker.pitch));
      walker.look.x = e.clientX; walker.look.y = e.clientY;
    }
  }, sig);
  const endPointer = e => {
    if (walker.joy && e.pointerId === walker.joy.id) { walker.joy = null; joyEl.hidden = true; }
    if (walker.look && e.pointerId === walker.look.id) walker.look = null;
  };
  canvas.addEventListener('pointerup', e => {
    endPointer(e);
    if (state.mode === 'plan' && downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) < 6) pick(e);
    downAt = null;
  }, sig);
  canvas.addEventListener('pointercancel', endPointer, sig);

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(floorMeshes, false)[0];
    selectUnit(hit && hit.object.userData.room.unit ? hit.object.userData.room.unit : null);
  }
  function blocked(x, z) {
    const rad = 0.24;
    for (const [x0, x1, z0, z1] of walkSolids) {
      if (x < x0 - rad || x > x1 + rad || z < z0 - rad || z > z1 + rad) continue;
      const nx = Math.max(x0, Math.min(x, x1)), nz = Math.max(z0, Math.min(z, z1));
      if ((x - nx) ** 2 + (z - nz) ** 2 < rad * rad) return true;
    }
    return false;
  }
  function roomAt(x, z) {
    const px = x / PX + CX, py = z / PX + CY;
    return ROOMS.find(r => r.type !== 'void' && px >= r.x0 && px <= r.x1 && py >= r.y0 && py <= r.y1);
  }
  let lastHud = '';
  function stepWalk(dt) {
    const k = walker.keys;
    let f = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0);
    let s = (k.has('d') ? 1 : 0) - (k.has('a') ? 1 : 0);
    if (k.has('arrowleft')) walker.yaw += 1.8 * dt;
    if (k.has('arrowright')) walker.yaw -= 1.8 * dt;
    if (walker.joy) { f = -walker.joy.dy; s = walker.joy.dx; }
    const speed = (k.has('shift') ? 3.0 : 1.5) * dt;
    if (f || s) {
      const sin = Math.sin(walker.yaw), cos = Math.cos(walker.yaw);
      const dx = (-sin * f + cos * s) * speed, dz = (-cos * f - sin * s) * speed;
      if (!blocked(walker.pos.x + dx, walker.pos.z)) walker.pos.x += dx;
      if (!blocked(walker.pos.x, walker.pos.z + dz)) walker.pos.z += dz;
    }
    camera.position.copy(walker.pos);
    camera.rotation.set(walker.pitch, walker.yaw, 0, 'YXZ');
    const r = roomAt(walker.pos.x, walker.pos.z);
    const txt = r ? (r.unit ? `<b>${r.unit} ${r.name}</b>${r.dims ? `<span>${r.dims}</span>` : ''}` : `<b>${r.name}</b>`) : '<b>Outside</b>';
    const html = `${txt}<span>${LEVEL_LONG[state.level]}</span>`;
    if (html !== lastHud) { q('.wt-hud').innerHTML = html; lastHud = html; }
  }

  // ----- mood: ease from whatever the page had to the tour's base light -----
  const m0 = ctx.currentMood ? ctx.currentMood() : ctx.BASE_MOOD, m1 = ctx.BASE_MOOD, moodStart = performance.now();
  let moodDone = false;
  function moodStep(now) {
    if (moodDone) return;
    const t = reduceMotion ? 1 : Math.min(1, (now - moodStart) / 900), e = easeInOut(t), m = {};
    for (const k of Object.keys(m1)) m[k] = Array.isArray(m1[k]) ? [m0[k][0] + (m1[k][0] - m0[k][0]) * e, m0[k][1] + (m1[k][1] - m0[k][1]) * e] : m0[k] + (m1[k] - m0[k]) * e;
    if (state.mode === 'walk') m.fov = camera.fov;
    ctx.applyMood(m);
    if (t >= 1) moodDone = true;
  }

  // ----- frame -----
  const onResize = (w, h) => { labelRenderer.setSize(w, h); };
  ctx.onResize = onResize; onResize(renderer.domElement.clientWidth, renderer.domElement.clientHeight);
  let lastW = window.innerWidth;
  window.addEventListener('resize', () => { const w = window.innerWidth; if (Math.abs(w - lastW) > 40) { lastW = w; if (state.mode === 'exterior') exteriorView(); else if (state.mode === 'plan') planView(); } }, sig);
  ctx.frame = (dt, now) => {
    moodStep(now);
    if (state.mode === 'walk') stepWalk(dt);
    else {
      if (fly) {
        const t = Math.min(1, (now - fly.start) / fly.dur), e = easeInOut(t);
        camera.position.lerpVectors(fly.p0, fly.p1, e); controls.target.lerpVectors(fly.t0, fly.t1, e);
        if (t >= 1) fly = null;
      }
      controls.update();
    }
    hemi.intensity = state.mode === 'walk' ? 1.6 : (moodDone ? 1.25 : hemi.intensity);
    amb.intensity = state.mode === 'walk' ? 0.55 : (moodDone ? 0.25 : amb.intensity);
    return true;
  };
  ctx.afterRender = () => labelRenderer.render(scene, camera);

  applyVisibility(); refreshUI(); setSheet('half');
  if (initial.unit && UNITS[initial.unit]) { state.unit = initial.unit; }
  setMode(initial.mode === 'plan' || initial.mode === 'walk' ? initial.mode : 'exterior');
  requestAnimationFrame(() => root.classList.add('on'));
  ctx.dirty = true;

  // ----- close: fly back to the page's scroll pose, then hand the camera back -----
  let closed = false;
  function close() {
    if (closed) return; closed = true;
    endWalk(); state.mode = 'exterior';
    ac.abort(); controls.dispose(); ctx.controls = null; ctx.afterRender = null; ctx.onResize = null;
    root.classList.remove('on');
    setTimeout(() => root.remove(), reduceMotion ? 0 : 450);
    interior.visible = false; shells.forEach(s => { s.visible = true; }); roof.visible = true;
    for (const o of roomLabels) o.visible = false; for (const o of Object.values(badges)) o.visible = false;
    camera.fov = 45; camera.updateProjectionMatrix();
    if (ctx.heroPose) {
      const p0 = camera.position.clone(), t0 = controls.target.clone(), start = performance.now();
      const look = new THREE.Vector3();
      ctx.frame = (dt, now) => {
        const goal = ctx.heroPose(); const t = reduceMotion ? 1 : Math.min(1, (now - start) / 1000), e = easeInOut(t);
        camera.position.lerpVectors(p0, goal.pos, e); look.lerpVectors(t0, goal.target, e); camera.lookAt(look);
        if (t >= 1) ctx.frame = null; return true;
      };
    } else ctx.frame = null;
    if (onExit) onExit();
  }
  return { close, setMode, setLevel, selectUnit, state };
}
