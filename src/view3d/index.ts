/* ============================================================
 *  3D 장면 (three.js) — 2D와 같은 state / ui를 쓰고, 전환할 때 연결 애니메이션을 보여 준다
 *  2D → 3D: 3D 카메라를 현재 2D 화면과 똑같이 보이는 수직 시점에 맞춘 뒤 교차 페이드하고,
 *           카메라가 기울어지며 벽이 바닥에서 솟아오르고 이어서 가구가 선다
 *  3D → 2D: 반대로 — 가구가 눕고, 벽이 내려가고, 카메라가 수직 시점으로 돌아온 뒤 평면도로 페이드
 * ============================================================ */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { $, $$, esc, COARSE, TAP } from '../core/dom';
import { state, ui, view, getF, snap, commit, select } from '../core/state';
import { area } from '../core/geometry';
import { roomName, fmtArea } from '../core/names';
import { ROOMS, WALLS, WINS, DOORS, SLIDES, BAY_OPENINGS, ENTRY, winSill, type Rect } from '../data/plan';
import { snapMove } from '../plan2d/snap';
import { closeDrawers } from '../ui/layout';
import { t, tIf } from '../i18n';
import { OX, OY, H, FOV, wx, wz, M } from './units';
import { initMaterials, mat, floorMat, metal, setEnvIntensity, glassMat, wallMat, capMat, frameMat } from './materials';
import { box } from './prims';
import { buildFurniture } from './furniture';

type Pose = {t: THREE.Vector3; p: THREE.Vector3};
interface DoorState { pivot: THREE.Group; a0: number; a1: number; cur: number; open: boolean }
interface Hit { door?: DoorState; dist?: number; room?: string; fid?: string }

const stage = $('#stage'), host = $('#view3d');
const SW = () => stage.clientWidth, SH = () => stage.clientHeight;
const opt = {cut: 2.8, furn: true, labels: true, night: false, hour: 10, mode: 'orbit' as 'orbit' | 'walk'};

let inited = false, active = false, raf = 0;
let anim: {t0: number; dur: number; fn: (t: number) => void; res: () => void} | null = null;
let fly: {t0: number; dur: number; A: Pose; B: Pose} | null = null;
let renderer: THREE.WebGLRenderer, labelRenderer: CSS2DRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera;
let orbit: OrbitControls, walkCtl: PointerLockControls, hemi: THREE.HemisphereLight, sun: THREE.DirectionalLight, ground: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
let archFloor: THREE.Group, archUp: THREE.Group, furnG: THREE.Group, labelG: THREE.Group, lampG: THREE.Group;
let colliders: [number, number, number, number][] = [], selKey: string | null = null, selHelper: THREE.BoxHelper | null = null;
let sigArch = '', sigFurn = '', sigLabels = '', grow = 1, furnGrow = 1, touchWalk = false;
const doors: DoorState[] = [], keys: Record<string, boolean> = {};

/* ======================= 초기화 ======================= */
function init(){
  if (inited) return;
  // WebGL을 못 쓰면 여기서 예외가 난다 — inited를 먼저 세우지 않아야 다음에 다시 시도할 수 있다
  const r = new THREE.WebGLRenderer({antialias: true, preserveDrawingBuffer: true});
  renderer = r;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(SW(), SH());
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  host.prepend(renderer.domElement);
  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(SW(), SH());
  Object.assign(labelRenderer.domElement.style, {position: 'absolute', inset: '0', pointerEvents: 'none'});
  host.appendChild(labelRenderer.domElement);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(FOV, SW()/SH(), .05, 300);
  orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableDamping = true; orbit.maxPolarAngle = Math.PI*.495; orbit.minDistance = 1.5; orbit.maxDistance = 45;
  walkCtl = new PointerLockControls(camera, document.body);
  walkCtl.addEventListener('lock', () => { $('#walkOverlay').style.display = 'none'; $('#cross').style.display = 'block'; });
  walkCtl.addEventListener('unlock', () => { if (opt.mode === 'walk'){ $('#walkOverlay').style.display = 'flex'; $('#cross').style.display = 'none'; } });

  hemi = new THREE.HemisphereLight(0xfff8ee, 0xb9a88f, 1.1);
  sun = new THREE.DirectionalLight(0xfff1dd, 2.6);
  sun.castShadow = true; sun.shadow.mapSize.setScalar(COARSE ? 2048 : 4096);   // 태블릿 GPU는 그림자 맵을 작게
  Object.assign(sun.shadow.camera, {left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 60});
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshStandardMaterial({color: 0xf2eee7, roughness: 1}));
  ground.rotation.x = -Math.PI/2; ground.position.y = -0.015; ground.receiveShadow = true;
  scene.add(hemi, sun, sun.target, ground);

  const pm = new THREE.PMREMGenerator(renderer);
  initMaterials(renderer, pm.fromScene(new RoomEnvironment(), .04).texture); pm.dispose();

  archFloor = new THREE.Group(); archUp = new THREE.Group(); furnG = new THREE.Group(); labelG = new THREE.Group(); lampG = new THREE.Group();
  scene.add(archFloor, archUp, furnG, labelG, lampG);
  inited = true;

  const cv = renderer.domElement; let downAt: [number, number] | null = null, look: {id: number; x: number; y: number} | null = null;
  cv.addEventListener('pointerdown', e => {
    downAt = [e.clientX, e.clientY]; closeDrawers();
    if (touchWalk && !look){ look = {id: e.pointerId, x: e.clientX, y: e.clientY}; cv.setPointerCapture(e.pointerId); }
  });
  cv.addEventListener('pointermove', e => {
    if (!look || e.pointerId !== look.id) return;
    lookBy(e.clientX - look.x, e.clientY - look.y); look.x = e.clientX; look.y = e.clientY;
  });
  cv.addEventListener('pointercancel', e => { if (look?.id === e.pointerId) look = null; });

  // 선택한 가구를 누른 채 끌기: 바닥을 따라 옮긴다 (2D와 같은 격자·벽 붙이기).
  // 부모 요소에서 캡처 단계로 받아 OrbitControls보다 먼저 꺼야 카메라가 같이 돌지 않는다
  let fdrag: {id: string; pid: number; sx: number; sy: number; ox: number; oy: number; before: string; moved: boolean} | null = null;
  host.addEventListener('pointerdown', e => {
    if (e.target !== cv || !e.isPrimary || anim || opt.mode !== 'orbit' || ui.sel?.kind !== 'furn') return;
    const h = pick(e), f = h?.fid === ui.sel.id ? getF(h.fid) : undefined, g = f && groundAt(e.clientX, e.clientY);
    if (!f || !g) return;
    fdrag = {id: f.id, pid: e.pointerId, sx: e.clientX, sy: e.clientY, ox: g.x - f.cx, oy: g.y - f.cy, before: snap(), moved: false};
    orbit.enabled = false; fly = null; cv.setPointerCapture(e.pointerId);
  }, true);
  cv.addEventListener('pointermove', e => {
    if (!fdrag || e.pointerId !== fdrag.pid) return;
    if (!fdrag.moved && Math.hypot(e.clientX - fdrag.sx, e.clientY - fdrag.sy) < TAP) return;
    const f = getF(fdrag.id), g = groundAt(e.clientX, e.clientY); if (!f || !g) return;
    fdrag.moved = true; cv.style.cursor = 'grabbing';
    [f.cx, f.cy] = snapMove(f, g.x - fdrag.ox, g.y - fdrag.oy);
    furnG.children.find(o => o.userData.fid === f.id)?.position.set(wx(f.cx), 0, wz(f.cy));   // 끄는 동안은 모델만 옮기고, 놓을 때 전체 동기화
  });
  const endF = (e: PointerEvent) => {
    if (!fdrag || e.pointerId !== fdrag.pid) return;
    const d = fdrag; fdrag = null; orbit.enabled = true; cv.style.cursor = '';
    if (d.moved) commit(d.before);
  };
  cv.addEventListener('pointerup', endF); cv.addEventListener('pointercancel', endF);

  cv.addEventListener('pointerup', e => {
    const tap = !!downAt && Math.hypot(e.clientX-downAt[0], e.clientY-downAt[1]) <= TAP;
    if (look?.id === e.pointerId){
      look = null;
      if (tap){ const h = pick(e); if (h?.door && h.dist! < 3.5) h.door.open = !h.door.open; }   // 걸어보기 중 문을 탭해 열고 닫기
      return;
    }
    if (anim || opt.mode !== 'orbit' || !tap) return;
    const h = pick(e);
    if (h?.door) h.door.open = !h.door.open;
    else if (h?.fid) select({kind: 'furn', id: h.fid});
    else if (h?.room) select({kind: 'room', id: h.room});
    else select(null);
  });
  new ResizeObserver(() => {
    renderer.setSize(SW(), SH()); labelRenderer.setSize(SW(), SH());
    camera.aspect = SW()/SH(); camera.updateProjectionMatrix();
  }).observe(stage);
  bindUI();
}

/* ======================= 건축 (벽 · 바닥 · 창 · 문) ======================= */
function clearGroup(g: THREE.Object3D){ g.traverse(o => { if ((o as THREE.Mesh).geometry) (o as THREE.Mesh).geometry.dispose(); }); g.clear(); }
const edgeMat = new THREE.LineBasicMaterial({color: 0x6f675b}), skirtMat = new THREE.MeshStandardMaterial({color: '#8b7f6e', roughness: .6});
function wallBox([x0, y0, x1, y1]: Rect, yb: number, yt: number, m?: THREE.Material | THREE.Material[]){
  if (yt - yb <= .001) return;
  const geo = new THREE.BoxGeometry(M(x1-x0), yt-yb, M(y1-y0));
  const o = new THREE.Mesh(geo, m || [wallMat, wallMat, capMat, wallMat, wallMat, wallMat]);
  o.position.set(wx((x0+x1)/2), (yb+yt)/2, wz((y0+y1)/2)); o.castShadow = o.receiveShadow = true; archUp.add(o);
  // 걸어보기 보조: 벽 모서리선 + 걸레받이로 맞닿은 벽면과 모서리를 한눈에 구분 (걸어보기에서만 보임)
  const ln = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat); ln.position.copy(o.position); ln.userData.walkOnly = true; ln.visible = opt.mode === 'walk'; archUp.add(ln);
  if (yb <= .001){
    const p = geo.parameters, skH = Math.min(.12, yt), sk = new THREE.Mesh(new THREE.BoxGeometry(p.width + .02, skH, p.depth + .02), skirtMat);
    sk.position.set(o.position.x, skH/2, o.position.z); sk.userData.walkOnly = true; sk.visible = opt.mode === 'walk'; archUp.add(sk);
  }
}
function shapeOf(poly: [number, number][], flip = false){
  const s = new THREE.Shape();
  poly.forEach(([x, y], i) => { if (i) s.lineTo(wx(x), flip ? wz(y) : -wz(y)); else s.moveTo(wx(x), flip ? wz(y) : -wz(y)); });
  return s;
}

function buildArch(){
  clearGroup(archFloor); clearGroup(archUp); lampG.clear(); doors.length = 0; colliders = [];
  const top = opt.cut;
  ROOMS.forEach(r => {
    const m = floorMat(state.rooms[r.id].mat), bay = r.counted === false;
    const geo = bay ? new THREE.ExtrudeGeometry(shapeOf(r.poly), {depth: .45, bevelEnabled: false}) : new THREE.ShapeGeometry(shapeOf(r.poly));
    geo.rotateX(-Math.PI/2);
    const fl = new THREE.Mesh(geo, bay ? [m, mat('#e9e4da')] : m);
    fl.receiveShadow = true; fl.userData.room = r.id;
    if (bay){ fl.castShadow = true; archUp.add(fl); } else archFloor.add(fl);
    // 천장: 법선이 아래를 향해 실내에서 올려다볼 때만 보인다
    const cg = new THREE.ShapeGeometry(shapeOf(r.poly, true)); cg.rotateX(Math.PI/2);
    const ceil = new THREE.Mesh(cg, mat('#fbfaf7', {roughness: 1})); ceil.position.y = H; ceil.visible = top >= H; archUp.add(ceil);
    if (r.at){
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .02, 32), new THREE.MeshStandardMaterial({color: '#fff', emissive: '#fff2d6', emissiveIntensity: .3}));
      lamp.position.set(wx(r.at[0]), H - .012, wz(r.at[1])); lamp.visible = top >= H; lampG.add(lamp);
      const pl = new THREE.PointLight(0xffd9a8, 0, 7, 1.6); pl.position.set(wx(r.at[0]), H - .25, wz(r.at[1])); lampG.add(pl);
    }
  });
  [...DOORS, ...SLIDES].forEach(d => { const [x0, y0, x1, y1] = d.rect; const s = box(M(x1-x0), .012, M(y1-y0), mat('#d8d0c0', {roughness: .3}), wx((x0+x1)/2), 0, wz((y0+y1)/2)); s.castShadow = false; archFloor.add(s); });
  WALLS.forEach((w, i) => {
    if (state.demolished.includes('w' + i)) return;
    wallBox([w[0], w[1], w[2], w[3]], 0, w[4] === 'low' ? Math.min(1, top) : top);
    colliders.push([wx(w[0]), wz(w[1]), wx(w[2]), wz(w[3])]);
  });
  // 문틀·돌출창 개구부 위쪽 인방
  const lintels: [Rect, number][] = [...DOORS.map(d => [d.rect, 2.1] as [Rect, number]), ...SLIDES.map(s => [s.rect, s.v ? 2.4 : 2.1] as [Rect, number]), ...BAY_OPENINGS.map(r => [r, 2.4] as [Rect, number])];
  lintels.forEach(([r, h]) => { if (top > h) wallBox(r, h, top); });
  WINS.forEach((r, i) => {
    const sill = winSill(i), head = 2.4;
    wallBox(r, 0, Math.min(sill, top)); if (top > head) wallBox(r, head, top);
    colliders.push([wx(r[0]), wz(r[1]), wx(r[2]), wz(r[3])]);
    const gTop = Math.min(head, top); if (gTop <= sill) return;
    const [x0, y0, x1, y1] = r, hz = (x1-x0) >= (y1-y0), L = M(hz ? x1-x0 : y1-y0), gh = gTop - sill, cx = wx((x0+x1)/2), cz = wz((y0+y1)/2);
    const pane = new THREE.Mesh(new THREE.BoxGeometry(hz ? L : .01, gh, hz ? .01 : L), glassMat); pane.position.set(cx, sill + gh/2, cz); archUp.add(pane);
    const n = Math.max(1, Math.round(L/.9));
    for (let k = 0; k <= n; k++){ const tt = -L/2 + k*L/n, mu = new THREE.Mesh(new THREE.BoxGeometry(hz ? .04 : .06, gh, hz ? .06 : .04), frameMat);
      mu.position.set(cx + (hz ? tt : 0), sill + gh/2, cz + (hz ? 0 : tt)); mu.castShadow = true; archUp.add(mu); }
    [sill + .02, gTop - .02].forEach(y => { const tr = new THREE.Mesh(new THREE.BoxGeometry(hz ? L : .06, .04, hz ? .06 : L), frameMat); tr.position.set(cx, y, cz); archUp.add(tr); });
  });
  DOORS.forEach(d => {
    const pivot = new THREE.Group(), L = M(d.len), dh = Math.min(2.05, top);
    pivot.position.set(wx(d.h[0]), 0, wz(d.h[1]));
    const leaf = box(L, dh, .04, mat(d.entry ? '#6b4f3a' : '#efe6d8', {roughness: .5}), L/2);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(.03, 12, 8), metal()); knob.position.set(L - .07, Math.min(1, dh - .05), 0); knob.scale.z = 2.2;
    pivot.add(leaf, knob);
    const ang = (v: [number, number]) => Math.atan2(-v[1], v[0]);
    const door: DoorState = {pivot, a0: ang(d.c), a1: ang(d.o), cur: 0, open: true};
    if (door.a1 - door.a0 > Math.PI) door.a1 -= Math.PI*2; if (door.a0 - door.a1 > Math.PI) door.a1 += Math.PI*2;
    door.cur = door.a1; pivot.rotation.y = door.cur; leaf.userData.door = knob.userData.door = door;
    doors.push(door); archUp.add(pivot);
  });
  SLIDES.forEach(({rect: [x0, y0, x1, y1], v}) => {
    const L = M(v ? y1-y0 : x1-x0), ph = Math.min(v ? 2.4 : 2.1, top), pl = L*.55;
    [[-1, -.02], [1, .02]].forEach(([s, off]) => {
      const c = s < 0 ? -L/2 + pl/2 : L/2 - pl/2, x = v ? wx((x0+x1)/2) + off : wx(x0) + L/2 + c, z = v ? wz(y0) + L/2 + c : wz((y0+y1)/2) + off;
      const p = new THREE.Mesh(new THREE.BoxGeometry(v ? .02 : pl, ph, v ? pl : .02), glassMat); p.position.set(x, ph/2, z); archUp.add(p);
      [ph - .03, .03].forEach(y => { const fr = new THREE.Mesh(new THREE.BoxGeometry(v ? .04 : pl, .05, v ? pl : .04), frameMat); fr.position.set(x, y, z); archUp.add(fr); });
      [-1, 1].forEach(e => { const fr = new THREE.Mesh(new THREE.BoxGeometry(.04, ph, .04), frameMat); fr.position.set(v ? x : x + e*pl/2, ph/2, v ? z + e*pl/2 : z); archUp.add(fr); });
    });
  });
  applyLight(); applyGrow();
}

function buildFurn(){
  clearGroup(furnG);
  state.furniture.forEach(f => furnG.add(buildFurniture(f)));
  furnG.visible = opt.furn; selKey = null; applyGrow();
}

function buildLabels(){
  labelG.children.slice().forEach(o => { (o as CSS2DObject).element.remove(); labelG.remove(o); });
  ROOMS.filter(r => r.at).forEach(r => {
    const el = document.createElement('div'); el.className = 'rlabel';
    el.innerHTML = `${esc(roomName(r.id))}<small>${fmtArea(area(r.poly), 1)}</small>`;
    const o = new CSS2DObject(el); o.position.set(wx(r.at![0]), opt.cut + .15, wz(r.at![1])); o.visible = labelG.visible; labelG.add(o);
  });
  const counted = ROOMS.filter(r => r.counted !== false);
  $('#roomList').innerHTML = counted.map(r => `<button data-room="${r.id}"><span>${esc(roomName(r.id))}</span><small>${fmtArea(area(r.poly))}</small></button>`).join('')
    + `<button data-room="__all"><span>${t('v3d.wholeHome')}</span><small>${fmtArea(counted.reduce((a, r) => a + area(r.poly), 0))}</small></button>`;
  $$('#roomList button').forEach(b => b.onclick = () => {
    $$('#roomList button').forEach(x => x.classList.toggle('on', x === b));
    if (opt.mode === 'walk') setMode('orbit');
    if (b.dataset.room === '__all') flyTo(isoWhole()); else flyToRoom(b.dataset.room!);
  });
}

// 바뀐 부분만 다시 만든다
function sync(force = false){
  if (!inited || (!active && !force)) return;
  const a = JSON.stringify([state.rooms, state.demolished, opt.cut]), f = JSON.stringify(state.furniture), l = JSON.stringify([state.rooms, opt.cut]);
  if (force || a !== sigArch){ sigArch = a; buildArch(); }
  if (force || f !== sigFurn){ sigFurn = f; buildFurn(); }
  if (force || l !== sigLabels){ sigLabels = l; buildLabels(); }
}

// CSS2DRenderer는 부모의 visible을 물려받지 않아서 라벨마다 설정한다
function showLabels(v: boolean){ labelG.visible = v; labelG.children.forEach(o => o.visible = v); }
function applyGrow(){
  if (!inited) return;
  archUp.scale.y = Math.max(grow, .001);
  furnG.scale.y = Math.max(furnGrow, .001);
  lampG.visible = grow > .99;
}

/* ======================= 일조 / 야경 ======================= */
function applyLight(){
  const tt = (opt.hour - 6) / 12, az = Math.PI * (.15 + tt*.7), el = Math.sin(Math.PI*tt) * 1.05 + .15, warm = 1 - Math.sin(Math.PI*tt);
  sun.position.set(Math.cos(az)*18, Math.sin(el)*20 + 3, -Math.sin(az)*10 + 8); sun.target.position.set(0, 0, 0);
  sun.color.setHSL(.09, .5 + warm*.4, .92 - warm*.12);
  sun.intensity = opt.night ? .05 : 1.4 + Math.sin(Math.PI*tt)*1.6;
  hemi.intensity = opt.night ? .12 : 1.1;
  scene.background = new THREE.Color(opt.night ? 0x1c2130 : 0xf7f4ee);
  ground.material.color.set(opt.night ? 0x2a2e38 : 0xf2eee7);
  lampG.children.forEach(o => {
    if ((o as THREE.PointLight).isPointLight) (o as THREE.PointLight).intensity = opt.night ? 6 : 0;
    else ((o as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = opt.night ? 2 : .3;
  });
  renderer.toneMappingExposure = opt.night ? 1.25 : 1.05;
  setEnvIntensity(opt.night ? .15 : 1);
  const h = Math.floor(opt.hour), m = Math.round((opt.hour - h)*60);
  $('#sunT').textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/* ======================= 카메라 위치 / 애니메이션 ======================= */
const ease = (x: number) => x < .5 ? 4*x*x*x : 1 - (-2*x + 2)**3/2;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const pose = (tg: THREE.Vector3, p: THREE.Vector3): Pose => ({t: tg, p});
// 현재 2D 화면과 똑같이 겹치는 수직 시점: 이 높이의 원근 카메라가 보는 바닥 높이 = 2D 화면 높이
function planPose(){
  const cx = view.x0 + SW()/2/view.s, cy = view.y0 + SH()/2/view.s, visH = SH()/view.s/1000;
  const dist = visH / 2 / Math.tan(FOV/2*Math.PI/180), tg = new THREE.Vector3(wx(cx), 0, wz(cy));
  return pose(tg, new THREE.Vector3(tg.x, dist, tg.z + 1e-4));
}
function isoFrom(P: Pose){
  const d = THREE.MathUtils.clamp(P.p.y, 5, 30), dir = new THREE.Vector3(.3, .82, .49).normalize();
  return pose(P.t.clone(), P.t.clone().addScaledVector(dir, d));
}
const isoWhole = () => pose(new THREE.Vector3(0, 0, 0), new THREE.Vector3(5.5, 15.5, 10));
const topWhole = () => pose(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 19, 1e-4));
const curPose = () => pose(orbit.target.clone(), camera.position.clone());
// 목표점을 중심으로 구면 보간: 카메라가 직선으로 가로지르지 않고 호를 그리며 기울어진다
function camTween(A: Pose, B: Pose, e: number){
  const tg = A.t.clone().lerp(B.t, e);
  const sa = new THREE.Spherical().setFromVector3(A.p.clone().sub(A.t)), sb = new THREE.Spherical().setFromVector3(B.p.clone().sub(B.t));
  let dth = sb.theta - sa.theta; dth = Math.atan2(Math.sin(dth), Math.cos(dth));
  const s = new THREE.Spherical(sa.radius + (sb.radius - sa.radius)*e, sa.phi + (sb.phi - sa.phi)*e, sa.theta + dth*e);
  camera.position.copy(tg).add(new THREE.Vector3().setFromSpherical(s)); camera.lookAt(tg); orbit.target.copy(tg);
}
function setPose(P: Pose){ camera.position.copy(P.p); orbit.target.copy(P.t); camera.lookAt(P.t); }
const animate = (dur: number, fn: (t: number) => void) => new Promise<void>(res => { anim = {t0: performance.now(), dur, fn, res}; });
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
function flyTo(B: Pose, dur = 900){ fly = {t0: performance.now(), dur, A: curPose(), B}; }
function flyToRoom(id: string){
  const r = ROOMS.find(r => r.id === id); if (!r) return;
  const xs = r.poly.map(p => p[0]), ys = r.poly.map(p => p[1]);
  const tg = new THREE.Vector3(wx((Math.min(...xs)+Math.max(...xs))/2), .6, wz((Math.min(...ys)+Math.max(...ys))/2));
  const size = M(Math.max(Math.max(...xs)-Math.min(...xs), Math.max(...ys)-Math.min(...ys)));
  const dir = camera.position.clone().sub(orbit.target).setY(0); if (dir.lengthSq() < .01) dir.set(.6, 0, .8); dir.normalize();
  const dist = size*1.3 + 2.2;
  flyTo(pose(tg, new THREE.Vector3(tg.x + dir.x*dist*.7, dist*1.05, tg.z + dir.z*dist*.7)));
}

/* ======================= 3D 들어가기 / 나가기 ======================= */
async function enter(){
  init(); active = true;
  renderer.setSize(SW(), SH()); labelRenderer.setSize(SW(), SH()); camera.aspect = SW()/SH(); camera.updateProjectionMatrix();
  sync(true);
  opt.mode = 'orbit'; syncModeBtns(); syncHint3d(); orbit.enabled = false; showLabels(false);
  const A = planPose(), B = isoFrom(A);
  grow = 0; furnGrow = 0; applyGrow(); setPose(A);
  stage.classList.add('animating');
  startLoop(); renderer.render(scene, camera);
  stage.classList.add('is3d');                       // 교차 페이드: 이 순간 3D 화면은 2D 평면과 정확히 겹친다
  await wait(420);
  await animate(1700, x => {
    camTween(A, B, ease(clamp01(x/.85)));
    grow = ease(clamp01((x - .1)/.55));
    furnGrow = ease(clamp01((x - .45)/.5));
    applyGrow();
  });
  orbit.enabled = true; showLabels(opt.labels);
  stage.classList.remove('animating');
}
async function exit(){
  if (opt.mode === 'walk'){
    walkCtl.unlock(); stopTouchWalk(); $('#walkOverlay').style.display = 'none'; $('#cross').style.display = 'none';
    const dir = new THREE.Vector3(); camera.getWorldDirection(dir); orbit.target.copy(camera.position).addScaledVector(dir, 3).setY(0);
    opt.mode = 'orbit'; syncModeBtns(); syncHint3d();
    archUp.traverse(o => { if (o.userData.walkOnly) o.visible = false; });
  }
  fly = null; orbit.enabled = false; showLabels(false); stage.classList.add('animating');
  const A = curPose(), B = planPose();
  await animate(1300, x => {
    camTween(A, B, ease(clamp01((x - .1)/.9)));
    furnGrow = 1 - ease(clamp01(x/.45));
    grow = 1 - ease(clamp01((x - .2)/.6));
    applyGrow();
  });
  stage.classList.remove('is3d');                    // 이 순간 3D는 수직 시점으로 평평해져 2D와 겹친 상태 — 이어서 페이드 아웃
  await wait(450);
  active = false; cancelAnimationFrame(raf); raf = 0;
  stage.classList.remove('animating');
  grow = furnGrow = 1; applyGrow();
}

/* ======================= 선택 / 집기 ======================= */
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
function pick(e?: {clientX: number; clientY: number}): Hit | null {
  if (!e) ptr.set(0, 0);
  else { const r = renderer.domElement.getBoundingClientRect(); ptr.set((e.clientX - r.left)/r.width*2 - 1, -(e.clientY - r.top)/r.height*2 + 1); }
  ray.setFromCamera(ptr, camera);
  const hits = ray.intersectObjects([...(opt.furn ? [furnG] : []), archUp, archFloor], true);
  for (const h of hits){
    let o: THREE.Object3D | null = h.object;
    if ((o as THREE.Mesh).material === glassMat) continue;
    if (o.userData.door) return {door: o.userData.door as DoorState, dist: h.distance};
    if (o.userData.room) return {room: o.userData.room as string};
    while (o && !o.userData.fid && o !== scene) o = o.parent;
    if (o?.userData.fid) return {fid: o.userData.fid as string};
    return null;                                     // 벽에 가려짐
  }
  return null;
}
// 화면 점 → 바닥(y = 0) 위 도면 좌표(mm). s = 그 지점에서 mm당 화면 픽셀 (끌어 놓을 때 모양 크기용)
const ground0 = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function groundAt(x: number, y: number): {x: number; y: number; s: number} | null {
  if (!active || anim) return null;
  const r = renderer.domElement.getBoundingClientRect(), hit = new THREE.Vector3();
  ptr.set((x - r.left)/r.width*2 - 1, -(y - r.top)/r.height*2 + 1);
  ray.setFromCamera(ptr, camera);
  if (!ray.ray.intersectPlane(ground0, hit) || hit.distanceTo(camera.position) > 60) return null;
  // 시선이 벽(또는 돌출창 턱)에 먼저 닿으면 벽 뒤 안 보이는 곳이 아니라 닿은 지점에 놓는다
  const wall = ray.intersectObjects([archUp, archFloor], true).find(h => (h.object as THREE.Mesh).material !== glassMat && h.object.visible);
  if (wall && wall.distance < hit.distanceTo(camera.position) - .01) hit.set(wall.point.x, 0, wall.point.z);
  const px = (v: THREE.Vector3) => new THREE.Vector2(v.x*r.width/2, v.y*r.height/2), a = px(hit.clone().project(camera));
  const s = Math.max(a.distanceTo(px(hit.clone().add(new THREE.Vector3(1, 0, 0)).project(camera))),
                     a.distanceTo(px(hit.clone().add(new THREE.Vector3(0, 0, 1)).project(camera)))) / 1000;
  return {x: hit.x*1000 + OX, y: hit.z*1000 + OY, s};
}
function updateSel(){
  const key = ui.sel?.kind === 'furn' ? ui.sel.id : '';
  if (key !== selKey){
    selKey = key;
    if (selHelper){ scene.remove(selHelper); selHelper.geometry.dispose(); selHelper = null; }
    const g = key ? furnG.children.find(g => g.userData.fid === key) : undefined;
    if (g){ selHelper = new THREE.BoxHelper(g, 0xb5653a); scene.add(selHelper); }
  }
  selHelper?.update();
}

/* ======================= 걸어보기 ======================= */
// 터치 걸어보기: 왼쪽 아래 가상 조이스틱으로 이동, 화면을 끌어 방향 전환 (iPad는 마우스 포인터 잠금을 지원하지 않음)
const hintOrbit = () => tIf(COARSE, 'v3d.hintOrbitTouch', 'v3d.hintOrbit');
function syncHint3d(){ $('#hint3d').textContent = opt.mode === 'orbit' ? hintOrbit() : touchWalk ? t('v3d.hintTouchWalk') : t('v3d.hintWalk'); }
const joy = {x: 0, y: 0, id: null as number | null}, eul = new THREE.Euler(0, 0, 0, 'YXZ');
function lookBy(dx: number, dy: number){
  eul.setFromQuaternion(camera.quaternion);
  eul.y += dx * .005; eul.x = THREE.MathUtils.clamp(eul.x + dy * .005, -1.35, 1.35);
  camera.quaternion.setFromEuler(eul);
}
function startTouchWalk(){
  touchWalk = true;
  $('#walkOverlay').style.display = 'none'; $('#joy').style.display = 'block'; $('#walkExit').style.display = 'block';
  syncHint3d();
}
function stopTouchWalk(){
  touchWalk = false; joy.x = joy.y = 0; joy.id = null; $('#joy i').style.transform = '';
  $('#joy').style.display = 'none'; $('#walkExit').style.display = 'none';
}
function bindJoystick(){
  const el = $('#joy'), knob = $('#joy i'), R = 50;
  const upd = (e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width/2), dy = e.clientY - (r.top + r.height/2);
    const L = Math.hypot(dx, dy); if (L > R){ dx *= R/L; dy *= R/L; }
    joy.x = dx/R; joy.y = dy/R; knob.style.transform = `translate(${dx}px,${dy}px)`;
  };
  el.addEventListener('pointerdown', e => { e.preventDefault(); joy.id = e.pointerId; el.setPointerCapture(e.pointerId); upd(e); });
  el.addEventListener('pointermove', e => { if (e.pointerId === joy.id) upd(e); });
  const end = (e: PointerEvent) => { if (e.pointerId !== joy.id) return; joy.id = null; joy.x = joy.y = 0; knob.style.transform = ''; };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
}
// 마우스 잠금 요청: 최신 브라우저는 Promise를 돌려주고 거부될 수 있다(iframe, 헤드리스, 권한 등).
// PointerLockControls.lock()은 그 거부를 처리하지 않으므로 직접 요청하고 실패하면 조이스틱으로 넘어간다
function lockPointer(){
  const fallback = () => { if (active && opt.mode === 'walk' && !walkCtl.isLocked) startTouchWalk(); };
  try { Promise.resolve(document.body.requestPointerLock() as unknown).catch(fallback); } catch { fallback(); }
}
function setMode(m: 'orbit' | 'walk'){
  if (anim) return;
  opt.mode = m; syncModeBtns();
  if (m === 'walk'){
    select(null);
    if (opt.cut < H){ opt.cut = H; syncCutBtns(); sync(); }
    orbit.enabled = false; fly = null;
    const [sx, sy] = ENTRY.walkStart, [lx, ly] = ENTRY.walkLook;
    camera.position.set(wx(sx), 1.6, wz(sy)); camera.lookAt(wx(lx), 1.5, wz(ly));   // 현관 밖
    $('#walkOverlay').style.display = 'flex';
    syncHint3d();
  } else {
    walkCtl.unlock(); stopTouchWalk(); orbit.enabled = true;
    $('#walkOverlay').style.display = 'none'; $('#cross').style.display = 'none';
    syncHint3d();
    orbit.target.set(0, 0, 0); flyTo(isoWhole());
  }
  showLabels(opt.labels && m === 'orbit');
  archUp.traverse(o => { if (o.userData.walkOnly) o.visible = m === 'walk'; });
}
function blocked(x: number, z: number, r = .22){
  for (const [x0, z0, x1, z1] of colliders) if (x > x0 - r && x < x1 + r && z > z0 - r && z < z1 + r) return true;
  for (const d of doors){
    const a = d.pivot.rotation.y, px = d.pivot.position.x, pz = d.pivot.position.z, ex = px + Math.cos(a)*.9, ez = pz - Math.sin(a)*.9;
    const k = clamp01(((x-px)*(ex-px) + (z-pz)*(ez-pz)) / ((ex-px)**2 + (ez-pz)**2));
    if (Math.hypot(x - (px + k*(ex-px)), z - (pz + k*(ez-pz))) < r*.8) return true;
  }
  return false;
}
function stepWalk(dt: number){
  if (!walkCtl.isLocked && !touchWalk) return;
  const sp = (keys.ShiftLeft || keys.ShiftRight ? 2.6 : 1.4) * dt, fwd = new THREE.Vector3();
  camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
  const right = new THREE.Vector3(-fwd.z, 0, fwd.x), mv = new THREE.Vector3();
  if (keys.KeyW || keys.ArrowUp) mv.add(fwd);
  if (keys.KeyS || keys.ArrowDown) mv.sub(fwd);
  if (keys.KeyD || keys.ArrowRight) mv.add(right);
  if (keys.KeyA || keys.ArrowLeft) mv.sub(right);
  if (touchWalk) mv.addScaledVector(fwd, -joy.y).addScaledVector(right, joy.x);
  const mag = Math.min(1, mv.length());        // 조이스틱을 멀리 밀수록 빠르게
  if (mag < .05) return;
  mv.normalize().multiplyScalar(sp * mag);
  const p = camera.position;
  if (!blocked(p.x + mv.x, p.z)) p.x += mv.x;
  if (!blocked(p.x, p.z + mv.z)) p.z += mv.z;
}
addEventListener('keydown', e => {
  if (!active || (e.target as Element).matches?.('input,select,textarea')) return;
  keys[e.code] = true;
  if (opt.mode === 'walk' && e.code === 'KeyE'){ const h = pick(); if (h?.door && h.dist! < 2.5) h.door.open = !h.door.open; }
});
addEventListener('keyup', e => { keys[e.code] = false; });

/* ======================= 툴바 ======================= */
function syncModeBtns(){ $$('#modes3d .btn').forEach(b => b.classList.toggle('on', b.dataset.mode === opt.mode)); }
function syncCutBtns(){ $$('[data-cut]').forEach(b => b.classList.toggle('on', +b.dataset.cut! === opt.cut)); }
function syncWalkTexts(){
  const lines = COARSE ? [t('v3d.wo1Touch'), t('v3d.wo2Touch'), t('v3d.wo3Touch')] : [t('v3d.wo1'), t('v3d.wo2'), t('v3d.wo3')];
  lines.forEach((h, i) => { $('#wo' + (i + 1)).innerHTML = h; });   // 사전의 고정 문구(<kbd> 포함)만 넣는다
  syncHint3d();
}
function bindUI(){
  $$('#modes3d .btn').forEach(b => b.onclick = () => setMode(b.dataset.mode as 'orbit' | 'walk'));
  // 터치 기기는 조이스틱, 데스크톱은 마우스 잠금 — 잠금이 실패해도 조이스틱으로 넘어간다
  $('#walkOverlay').onclick = () => { if (COARSE) startTouchWalk(); else lockPointer(); };
  document.addEventListener('pointerlockerror', () => { if (active && opt.mode === 'walk') startTouchWalk(); });
  $('#walkExit').onclick = () => setMode('orbit');
  bindJoystick();
  syncWalkTexts();
  $('#vIso').onclick = () => { if (opt.mode === 'walk') setMode('orbit'); else flyTo(isoWhole()); };
  $('#vTop').onclick = () => { if (opt.mode === 'walk') setMode('orbit'); flyTo(topWhole()); };
  $$('[data-cut]').forEach(b => b.onclick = () => { if (opt.mode === 'walk') return; opt.cut = +b.dataset.cut!; syncCutBtns(); sync(); });
  $$('#toggles3d .btn').forEach(b => b.onclick = () => {
    const k = b.dataset.t as 'furn' | 'labels' | 'night'; opt[k] = !opt[k]; b.classList.toggle('on', opt[k]);
    if (k === 'furn'){ furnG.visible = opt.furn; if (!opt.furn && ui.sel?.kind === 'furn') select(null); }
    if (k === 'labels') showLabels(opt.labels && opt.mode === 'orbit' && !anim);
    if (k === 'night') applyLight();
  });
  $<HTMLInputElement>('#sun').oninput = e => { opt.hour = +(e.target as HTMLInputElement).value; applyLight(); };
}

/* ======================= 메인 루프 ======================= */
const clock = new THREE.Clock();
function startLoop(){ if (!raf){ clock.getDelta(); raf = requestAnimationFrame(loop); } }
function loop(){
  raf = requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), .05), now = performance.now();
  if (anim){ const x = clamp01((now - anim.t0)/anim.dur); anim.fn(x); if (x >= 1){ const r = anim.res; anim = null; r(); } }
  else if (fly){ const x = clamp01((now - fly.t0)/fly.dur); camTween(fly.A, fly.B, ease(x)); if (x >= 1) fly = null; }
  else if (opt.mode === 'orbit') orbit.update();
  else stepWalk(dt);
  doors.forEach(d => { const tg = d.open ? d.a1 : d.a0; d.cur += (tg - d.cur) * Math.min(1, dt*6); d.pivot.rotation.y = d.cur; });
  updateSel();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

function shot(){
  const a = document.createElement('a');
  a.download = t('file.base') + '-3D.png'; a.href = renderer.domElement.toDataURL('image/png'); a.click();
}
function relang(){ if (!inited) return; syncWalkTexts(); buildLabels(); }

export function createView3D(){
  return {
    enter, exit, relang, shot, groundAt,
    sync: () => sync(),
    flyToRoom: (id: string) => { if (active && !anim) flyToRoom(id); },
    walking: () => active && opt.mode === 'walk',
  };
}
export type View3D = ReturnType<typeof createView3D>;
