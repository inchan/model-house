/* ============================================================
 *  3D 모델하우스 (three.js) — 2D와 같은 상태를 쓰고, 전환할 때 연결 애니메이션을 보여 준다
 *  2D → 3D: 3D 카메라를 현재 2D 화면과 똑같이 보이는 수직 시점에 맞춘 뒤 교차 페이드하고,
 *           카메라가 기울어지며 벽이 바닥에서 솟아오르고 이어서 가구가 선다
 *  3D → 2D: 반대로 — 가구가 눕고, 벽이 내려가고, 카메라가 수직 시점으로 돌아온 뒤 평면도로 페이드
 *
 *  성능: 필요할 때만 그린다(카메라·애니메이션·문·걸어보기가 움직일 때). 그림자는 장면이 바뀔 때만 갱신하고,
 *        가구는 바뀐 것만 다시 만들며, 가구 하나는 재질별로 합친 메시 몇 개로 그린다
 * ============================================================ */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { $, $$, esc, COARSE, TAP } from '../core/dom';
import { state, ui, view, getF, snap, commit, select, roleColor } from '../core/state';
import { plan, aptType, roomMat, roomArea, visibleRooms, wallColor } from '../core/plan';
import { roomName, fmtArea } from '../core/names';
import { aabb } from '../core/geometry';
import { inPoly, type WinG } from '../data/apt/builder';
import type { FixtureSpec, Pt2, Rect } from '../data/apt/schema';
import { snapMove } from '../plan2d/snap';
import { closeDrawers } from '../ui/layout';
import { emitBus } from '../ui/bus';
import { t, tIf, lang } from '../i18n';
import { OX, OY, H, FOV, wx, wz, M, setOrigin } from './units';
import { initMaterials, mat, floorMat, metal, setEnvIntensity, setWallColor, glassMat, wallMat, capMat, frameMat } from './materials';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildFurniture, type FurnLike } from './furniture';
import { disposeGeo, geoCacheSize } from './prims';

type Pose = {t: THREE.Vector3; p: THREE.Vector3};
interface DoorState { pivot: THREE.Group; a0: number; a1: number; cur: number; open: boolean }
interface Hit { door?: DoorState; dist?: number; room?: string; fid?: string }
type Box2 = [number, number, number, number];   // 세계 좌표 x0, z0, x1, z1

const MERGE = !new URLSearchParams(location.search).has('nomerge');   // ?nomerge = 합치기 전 그림 호출 수 비교용
const stage = $('#stage'), host = $('#view3d');
const SW = () => stage.clientWidth, SH = () => stage.clientHeight;
// 캔버스 실제 픽셀 수를 약 420만(2560×1640)으로 묶는다: 레티나·5K 모니터의 큰 창에서 GPU가 칠할 픽셀이 4배로 늘지 않게
const MAX_PIXELS = 4.2e6;
const pixelRatio = () => Math.min(devicePixelRatio, Math.max(1, Math.min(2, Math.sqrt(MAX_PIXELS/Math.max(1, SW()*SH())))));
const opt = {cut: false, furn: true, labels: true, night: false, hour: 11, mode: 'orbit' as 'orbit' | 'walk'};

let inited = false, active = false, raf = 0, dirty = true, shadowDirty = true, renders = 0, why = '';
let anim: {t0: number; dur: number; fn: (t: number) => void; res: () => void} | null = null;
let fly: {t0: number; dur: number; A: Pose; B: Pose; f0: number; f1: number} | null = null;
const ROOM_FOV = 70;   // 실내 사진처럼 넓은 화각
const DAMP = .09;      // 카메라 관성: 60fps 기준 한 프레임에 남은 움직임의 9%를 쓰고 줄인다
let renderer: THREE.WebGLRenderer, labelRenderer: CSS2DRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera;
let ambient: THREE.AmbientLight;
let orbit: OrbitControls, walkCtl: PointerLockControls, hemi: THREE.HemisphereLight, sun: THREE.DirectionalLight, ground: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
let archFloor: THREE.Group, archUp: THREE.Group, fixG: THREE.Group, ceilG: THREE.Group, furnG: THREE.Group, labelG: THREE.Group, lampG: THREE.Group, lightG: THREE.Group;
let wallCol: Box2[] = [], fixCol: Box2[] = [], furnCol: Box2[] = [];
let selKey: string | null = null, selHelper: THREE.BoxHelper | null = null, roomView: string | null = null;
let sigArch = '', sigFix = '', sigLabels = '', sigLamps = '', origin = '', grow = 1, furnGrow = 1, touchWalk = false;
// 투어: 방 시점에 선 채로 고개를 천천히 좌우로 돌린다
let sway: {t0: number; dur: number; eye: THREE.Vector3; dir: THREE.Vector3} | null = null;
const doors: DoorState[] = [], keys: Record<string, boolean> = {};
const furnCache = new Map<string, {sig: string; obj: THREE.Group}>();

// 다음 프레임 예약은 언제나 하나뿐이어야 한다. 루프 안(orbit.update의 'change', 걸어보기 이동)에서 부른
// invalidate가 따로 예약하면 루프 끝의 예약과 겹쳐 프레임마다 루프가 두 배로 불어난다 — 루프 안에서는 표시만 하고 끝에서 한 번 예약
let inLoop = false;
const invalidate = () => { dirty = true; kick(); };
const kick = () => { if (!raf && active && !inLoop) raf = requestAnimationFrame(loop); };

/* ======================= 초기화 ======================= */
function init(){
  if (inited) return;
  // WebGL을 못 쓰면 여기서 예외가 난다 — inited를 먼저 세우지 않아야 다음에 다시 시도할 수 있다
  const r = new THREE.WebGLRenderer({antialias: true});
  renderer = r;
  renderer.setPixelRatio(pixelRatio());
  renderer.setSize(SW(), SH());
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  host.prepend(renderer.domElement);
  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(SW(), SH());
  Object.assign(labelRenderer.domElement.style, {position: 'absolute', inset: '0', pointerEvents: 'none'});
  host.appendChild(labelRenderer.domElement);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(FOV, SW()/SH(), .05, 300);
  orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableDamping = true; orbit.dampingFactor = DAMP;
  setOverviewControls();
  // three r160 OrbitControls는 목표점을 매번 다시 정규화하면서 미세한 오차로 'change'를 끝없이 보낸다.
  // 그래서 실제로 카메라가 움직였을 때만 다시 그리게 한다
  orbit.addEventListener('change', () => { if (camMoved()) invalidate(); });
  orbit.addEventListener('start', () => { fly = null; sway = null; emitBus('tourStop', true); });
  walkCtl = new PointerLockControls(camera, document.body);
  walkCtl.addEventListener('change', invalidate);
  walkCtl.addEventListener('lock', () => { $('#walkOverlay').style.display = 'none'; $('#cross').style.display = 'block'; syncHint3d(); });
  walkCtl.addEventListener('unlock', () => { if (opt.mode === 'walk' && !touchWalk){ $('#walkOverlay').style.display = 'flex'; $('#cross').style.display = 'none'; } });

  hemi = new THREE.HemisphereLight(0xfffaf2, 0xd9ccb6, 1.35);
  ambient = new THREE.AmbientLight(0xfff8f0, .15);
  sun = new THREE.DirectionalLight(0xfff1dd, 2.6);
  sun.castShadow = true; sun.shadow.mapSize.setScalar(COARSE ? 2048 : 3072);   // 태블릿 GPU는 그림자 맵을 작게
  Object.assign(sun.shadow.camera, {left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 60});
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshStandardMaterial({color: 0xf2eee7, roughness: 1}));
  ground.rotation.x = -Math.PI/2; ground.position.y = -.25; ground.receiveShadow = true;
  scene.add(hemi, ambient, sun, sun.target, ground);

  const pm = new THREE.PMREMGenerator(renderer);
  initMaterials(renderer, pm.fromScene(new RoomEnvironment(), .04).texture); pm.dispose();

  archFloor = new THREE.Group(); archUp = new THREE.Group(); fixG = new THREE.Group(); ceilG = new THREE.Group(); furnG = new THREE.Group(); labelG = new THREE.Group(); lampG = new THREE.Group(); lightG = new THREE.Group();
  scene.add(archFloor, archUp, fixG, ceilG, furnG, labelG, lampG, lightG);
  inited = true;
  bindPointer(renderer.domElement);
  new ResizeObserver(() => {
    renderer.setPixelRatio(pixelRatio()); renderer.setSize(SW(), SH()); labelRenderer.setSize(SW(), SH());
    camera.aspect = SW()/SH(); camera.updateProjectionMatrix(); invalidate();
  }).observe(stage);
  bindUI();
}

function bindPointer(cv: HTMLCanvasElement){
  let downAt: [number, number] | null = null, look: {id: number; x: number; y: number} | null = null;
  cv.addEventListener('pointerdown', e => {
    downAt = [e.clientX, e.clientY]; closeDrawers();
    if (touchWalk && !look){ look = {id: e.pointerId, x: e.clientX, y: e.clientY}; cv.setPointerCapture(e.pointerId); }
  });
  cv.addEventListener('pointermove', e => {
    if (!look || e.pointerId !== look.id) return;
    lookBy(e.clientX - look.x, e.clientY - look.y); look.x = e.clientX; look.y = e.clientY; invalidate();
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
    const c = furnCache.get(f.id); if (c) placeObj(c.obj, f);   // 끄는 동안은 모델만 옮기고, 놓을 때 전체 동기화
    shadowDirty = true; invalidate();
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
      if (tap){ const h = pick(e); if (h?.door && h.dist! < 3.5){ h.door.open = !h.door.open; invalidate(); } }   // 걸어보기 중 문을 탭해 열고 닫기
      return;
    }
    if (anim || opt.mode !== 'orbit' || !tap) return;
    const h = pick(e);
    if (h?.door){ h.door.open = !h.door.open; invalidate(); }
    else if (h?.fid) select({kind: 'furn', id: h.fid});
    else if (h?.room) select({kind: 'room', id: h.room});
    else select(null);
  });
}

/* ======================= 건축 (바닥 · 벽 · 창 · 문) ======================= */
function disposeTree(g: THREE.Object3D){ g.traverse(o => { const geo = (o as THREE.Mesh).geometry; if (geo) disposeGeo(geo); }); }
function clearGroup(g: THREE.Object3D){ disposeTree(g); g.clear(); }
const edgeMat = new THREE.LineBasicMaterial({color: 0x6f675b}), skirtMat = new THREE.MeshStandardMaterial({color: '#e9e4da', roughness: .6});
const worldBox = (r: Rect): Box2 => [wx(r[0]), wz(r[1]), wx(r[2]), wz(r[3])];

/* 정적인 건축 요소는 재질별로 모아 한 번에 합친다 (벽·창틀·유리·천장·바닥 → 메시 몇 개) */
class Batch {
  private m = new Map<THREE.Material, THREE.BufferGeometry[]>();
  add(mt: THREE.Material, geo: THREE.BufferGeometry, x = 0, y = 0, z = 0){
    const g = geo.index ? geo.toNonIndexed() : geo; if (g !== geo) geo.dispose();
    Object.keys(g.attributes).forEach(k => { if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); });
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2), 2));
    g.translate(x, y, z);
    const list = this.m.get(mt); if (list) list.push(g); else this.m.set(mt, [g]);
  }
  flush(into: THREE.Object3D, shadow = true, data?: Record<string, unknown>){
    this.m.forEach((geos, mt) => {
      const merged = mergeGeometries(geos, false); geos.forEach(g => g.dispose()); if (!merged) return;
      const mesh = new THREE.Mesh(merged, mt);
      const transparent = (mt as THREE.MeshStandardMaterial).transparent;
      mesh.castShadow = shadow && !transparent; mesh.receiveShadow = true;
      if (data) Object.assign(mesh.userData, data);
      into.add(mesh);
    });
    this.m.clear();
  }
}
let archBatch = new Batch(), edgeGeos: THREE.BufferGeometry[] = [];
const sillMat = new THREE.MeshStandardMaterial({color: '#d8d0c0', roughness: .3}), ceilMat = new THREE.MeshStandardMaterial({color: '#fbfaf7', roughness: 1});

function wallBox([x0, y0, x1, y1]: Rect, yb: number, yt: number){
  if (yt - yb <= .001) return;
  const w = M(x1-x0), d = M(y1-y0), h = yt - yb, cx = wx((x0+x1)/2), cy = (yb+yt)/2, cz = wz((y0+y1)/2);
  archBatch.add(wallMat, new THREE.BoxGeometry(w, h, d), cx, cy, cz);
  // 벽 윗면(단면에서 보이는 짙은 색)
  const cap = new THREE.PlaneGeometry(w, d); cap.rotateX(-Math.PI/2); archBatch.add(capMat, cap, cx, yt + .001, cz);
  // 걸어보기 보조: 벽 모서리선 (걸어보기에서만 보임) + 걸레받이
  const e = new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)); e.translate(cx, cy, cz); edgeGeos.push(e);
  if (yb <= .001){ const skH = Math.min(.08, yt); archBatch.add(skirtMat, new THREE.BoxGeometry(w + .016, skH, d + .016), cx, skH/2, cz); }
}
function shapeOf(poly: Pt2[], flip = false){
  const s = new THREE.Shape();
  poly.forEach(([x, y], i) => { if (i) s.lineTo(wx(x), flip ? wz(y) : -wz(y)); else s.moveTo(wx(x), flip ? wz(y) : -wz(y)); });
  return s;
}
const topH = () => (opt.cut ? 1.2 : H);

function buildArch(){
  clearGroup(archFloor); clearGroup(archUp); doors.length = 0; wallCol = []; edgeGeos = [];
  const p = plan(), top = topH(), floors = new Batch();
  p.rooms.forEach(r => {
    const geo = new THREE.ShapeGeometry(shapeOf(r.poly)); geo.rotateX(-Math.PI/2);
    floors.add(floorMat(roomMat(r.id)), geo, 0, r.level ?? 0, 0);
    // 천장: 법선이 아래를 향해 실내에서 올려다볼 때만 보인다
    if (top >= H){ const cg = new THREE.ShapeGeometry(shapeOf(r.poly, true)); cg.rotateX(Math.PI/2); archBatch.add(ceilMat, cg, 0, H, 0); }
  });
  // 문턱
  [...p.doors, ...p.slides, ...p.gaps].forEach(d => { const [x0, y0, x1, y1] = d.rect; floors.add(sillMat, new THREE.BoxGeometry(M(x1-x0), .012, M(y1-y0)), wx((x0+x1)/2), .006, wz((y0+y1)/2)); });
  floors.flush(archFloor, false, {floor: true});
  p.walls.forEach(w => { wallBox(w.rect, 0, w.kind === 'low' ? Math.min(1, top) : top); wallCol.push(worldBox(w.rect)); });
  // 문·미닫이·개구부 위 인방
  [...p.doors, ...p.slides, ...p.gaps].forEach(d => { if (top > d.head) wallBox(d.rect, d.head, top); });
  p.wins.forEach(w => buildWindow(w, top));
  p.doors.forEach(d => {
    const pivot = new THREE.Group(), L = M(d.len), dh = Math.min(d.head - .05, top);
    pivot.position.set(wx(d.h[0]), 0, wz(d.h[1]));
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(L, dh, .04), mat(d.entry ? '#4a4f4c' : '#f1ece3', {roughness: .5}));
    leaf.position.set(L/2, dh/2, 0); leaf.castShadow = leaf.receiveShadow = true;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(.03, 12, 8), metal()); knob.position.set(L - .07, Math.min(1, dh - .05), 0); knob.scale.z = 2.2;
    pivot.add(leaf, knob);
    const ang = (v: [number, number]) => Math.atan2(-v[1], v[0]);
    const door: DoorState = {pivot, a0: ang(d.c), a1: ang(d.o), cur: 0, open: true};
    if (door.a1 - door.a0 > Math.PI) door.a1 -= Math.PI*2; if (door.a0 - door.a1 > Math.PI) door.a1 += Math.PI*2;
    door.cur = door.a1; pivot.rotation.y = door.cur; leaf.userData.door = knob.userData.door = door;
    doors.push(door); archUp.add(pivot);
  });
  p.slides.forEach(({rect: [x0, y0, x1, y1], v, head}) => {
    const L = M(v ? y1-y0 : x1-x0), ph = Math.min(head, top), pl = L*.55;
    [[-1, -.02], [1, .02]].forEach(([s, off]) => {
      const c = s < 0 ? -L/2 + pl/2 : L/2 - pl/2, x = v ? wx((x0+x1)/2) + off : wx(x0) + L/2 + c, z = v ? wz(y0) + L/2 + c : wz((y0+y1)/2) + off;
      archBatch.add(glassMat, new THREE.BoxGeometry(v ? .02 : pl, ph, v ? pl : .02), x, ph/2, z);
      [ph - .03, .03].forEach(y => archBatch.add(frameMat, new THREE.BoxGeometry(v ? .04 : pl, .05, v ? pl : .04), x, y, z));
      [-1, 1].forEach(e => archBatch.add(frameMat, new THREE.BoxGeometry(.04, ph, .04), v ? x : x + e*pl/2, ph/2, v ? z + e*pl/2 : z));
    });
    wallCol.push(worldBox([x0, y0, x1, y1]));   // 유리문은 걸어서 통과할 수 없다
  });
  archBatch.flush(archUp);
  const edges = mergeGeometries(edgeGeos, false); edgeGeos.forEach(g => g.dispose()); edgeGeos = [];
  if (edges){ const ln = new THREE.LineSegments(edges, edgeMat); ln.userData.walkOnly = true; ln.visible = opt.mode === 'walk'; archUp.add(ln); }
  buildLamps(); applyLight(); applyGrow();
}

function buildWindow(w: WinG, top: number){
  const {rect: r, sill, head} = w;
  wallBox(r, 0, Math.min(sill, top)); if (top > head) wallBox(r, head, top);
  wallCol.push(worldBox(r));
  const gTop = Math.min(head, top); if (gTop <= sill) return;
  const [x0, y0, x1, y1] = r, hz = w.horiz, L = M(hz ? x1-x0 : y1-y0), gh = gTop - sill, cx = wx((x0+x1)/2), cz = wz((y0+y1)/2);
  archBatch.add(glassMat, new THREE.BoxGeometry(hz ? L : .01, gh, hz ? .01 : L), cx, sill + gh/2, cz);
  const n = Math.max(1, Math.round(L/.9));
  for (let k = 0; k <= n; k++){ const tt = -L/2 + k*L/n; archBatch.add(frameMat, new THREE.BoxGeometry(hz ? .04 : .06, gh, hz ? .06 : .04), cx + (hz ? tt : 0), sill + gh/2, cz + (hz ? 0 : tt)); }
  [sill + .02, gTop - .02].forEach(y => archBatch.add(frameMat, new THREE.BoxGeometry(hz ? L : .06, .04, hz ? .06 : L), cx, y, cz));
}

// 천장 조명: 원판은 항상, 점광원은 야경일 때만 둔다 (낮에는 광원 수를 줄여 셰이더를 가볍게)
const lampMat = new THREE.MeshStandardMaterial({color: '#fff', emissive: '#fff2d6', emissiveIntensity: .3});   // 원판은 모두 같은 재질
function buildLamps(){
  clearGroup(lampG); lightG.clear();
  lampMat.emissiveIntensity = opt.night ? 2 : .3;
  visibleRooms().filter(r => !r.service).forEach(r => {
    // 아래를 향한 원판: 실내에서 올려다볼 때만 보이고 위에서 내려다보면 보이지 않는다
    const disc = new THREE.CircleGeometry(.2, 32); disc.rotateX(Math.PI/2);
    const lamp = new THREE.Mesh(disc, lampMat);
    lamp.position.set(wx(r.at[0]), H - .004, wz(r.at[1])); lamp.visible = topH() >= H; lampG.add(lamp);
    if (opt.night){ const pl = new THREE.PointLight(0xffd9a8, grow > .99 ? 6 : 0, 7, 1.6); pl.position.set(wx(r.at[0]), H - .25, wz(r.at[1])); lightG.add(pl); }
  });
  sigLamps = JSON.stringify([state.type, state.opts, opt.night, opt.cut]);
}

/* ======================= 붙박이 설비 · 가구 ======================= */
// 주방 하부장 뒤쪽 벽에 창이 있으면 그 구간의 상부장을 비운다 (로컬 x, m)
function upperGaps(f: FixtureSpec, wins: WinG[]): [number, number][] {
  const rot = (((f.rot ?? 0) % 360) + 360) % 360; if (rot % 90) return [];
  const q = rot/90, bx = [0, 1, 0, -1][q], by = [-1, 0, 1, 0][q], ax = [1, 0, -1, 0][q], ay = [0, 1, 0, -1][q];
  const bxEdge = f.cx + bx*f.d/2, byEdge = f.cy + by*f.d/2, out: [number, number][] = [];
  for (const w of wins){
    if (w.sill > 1.9) continue;
    const [x0, y0, x1, y1] = w.rect, cx = (x0 + x1)/2, cy = (y0 + y1)/2;
    const behind = (cx - bxEdge)*bx + (cy - byEdge)*by;            // 등판에서 창까지 거리(뒤쪽이 +)
    if (behind < -80 || behind > 450) continue;
    const us = [[x0, y0], [x1, y1]].map(([x, y]) => ((x - f.cx)*ax + (y - f.cy)*ay)/1000);
    const u0 = Math.min(...us), u1 = Math.max(...us);
    if (u1 > -f.w/2000 && u0 < f.w/2000) out.push([u0, u1]);
  }
  return out;
}
const hashId = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
function placeObj(g: THREE.Object3D, f: {cx: number; cy: number; rot: number}){ g.position.set(wx(f.cx), 0, wz(f.cy)); g.rotation.y = -f.rot*Math.PI/180; }
const colOf = (f: {cx: number; cy: number; w: number; d: number; rot: number}): Box2 => { const {hw, hh} = aabb(f); return [wx(f.cx - hw), wz(f.cy - hh), wx(f.cx + hw), wz(f.cy + hh)]; };
const NO_COLLIDE = new Set(['rug', 'ceilingac']);

function buildFixtures(){
  clearGroup(fixG); clearGroup(ceilG); fixCol = [];
  const p = plan();
  p.fixtures.forEach(f => {
    const like: FurnLike = {type: f.type, w: f.w, d: f.d, cx: f.cx, cy: f.cy, rot: f.rot ?? 0, color: roleColor(state.style, f.role, f.type)};
    // 천장에 붙는 설비는 따로 모아 실내에서 올려다볼 때만 보이게 한다
    (f.type === 'ceilingac' ? ceilG : fixG).add(buildFurniture(like, {upperGaps: f.type === 'counter' ? upperGaps(f, p.wins) : undefined}, MERGE));
    if (!NO_COLLIDE.has(f.type)) fixCol.push(colOf(like));
  });
  applyGrow();
}

// 가구는 바뀐 것만 다시 만든다 (위치·회전만 바뀌면 옮기기만)
function syncFurniture(){
  const seen = new Set<string>();
  furnCol = [];
  for (const f of state.furniture){
    seen.add(f.id);
    const sig = `${f.type}|${f.w}|${f.d}|${f.color}`, c = furnCache.get(f.id);
    if (c && c.sig === sig) placeObj(c.obj, f);
    else {
      if (c){ furnG.remove(c.obj); disposeTree(c.obj); }
      const obj = buildFurniture({...f, cx: f.cx, cy: f.cy}, {}, MERGE, hashId(f.id));
      obj.userData.fid = f.id; furnG.add(obj); furnCache.set(f.id, {sig, obj});
    }
    if (!NO_COLLIDE.has(f.type)) furnCol.push(colOf(f));
  }
  for (const [id, c] of furnCache) if (!seen.has(id)){ furnG.remove(c.obj); disposeTree(c.obj); furnCache.delete(id); }
  furnG.visible = opt.furn; selKey = null; applyGrow();
}
function resetFurniture(){ for (const c of furnCache.values()){ furnG.remove(c.obj); disposeTree(c.obj); } furnCache.clear(); }

function buildLabels(){
  labelG.children.slice().forEach(o => { (o as CSS2DObject).element.remove(); labelG.remove(o); });
  visibleRooms().filter(r => r.kind !== 'hall').forEach(r => {
    const el = document.createElement('div'); el.className = 'rlabel';
    el.innerHTML = `${esc(roomName(r.id))}<small>${fmtArea(roomArea(r.id), 1)}</small>`;
    const o = new CSS2DObject(el); o.position.set(wx(r.at[0]), topH() + .15, wz(r.at[1])); o.visible = labelG.visible; labelG.add(o);
  });
}

// 바뀐 부분만 다시 만든다
function sync(force = false){
  if (!inited || (!active && !force)) return;
  const p = plan(), org = `${(p.box[0]+p.box[2])/2},${(p.box[1]+p.box[3])/2}`;
  if (org !== origin){ origin = org; setOrigin((p.box[0]+p.box[2])/2, (p.box[1]+p.box[3])/2); resetFurniture(); force = true; }
  let changed = false;
  const a = JSON.stringify([state.type, state.opts, state.rooms, opt.cut]);
  if (force || a !== sigArch){ sigArch = a; buildArch(); changed = true; }
  const fx = JSON.stringify([state.type, state.opts, state.style]);
  if (force || fx !== sigFix){ sigFix = fx; buildFixtures(); changed = true; }
  syncFurniture();
  const l = JSON.stringify([state.type, state.opts, state.rooms, opt.cut, lang]);
  if (force || l !== sigLabels){ sigLabels = l; buildLabels(); }
  if (JSON.stringify([state.type, state.opts, opt.night, opt.cut]) !== sigLamps){ buildLamps(); applyLight(); }
  setWallColor(wallColor());
  if (changed) selKey = null;
  shadowDirty = true; invalidate();
}

// CSS2DRenderer는 부모의 visible을 물려받지 않아서 라벨마다 설정한다
function showLabels(v: boolean){ labelG.visible = v; labelG.children.forEach(o => o.visible = v); invalidate(); }
function applyGrow(){
  if (!inited) return;
  archUp.scale.y = Math.max(grow, .001);
  furnG.scale.y = fixG.scale.y = Math.max(furnGrow, .001);
  ceilG.visible = grow > .99;
  // 점광원은 개수를 바꾸지 않고(셰이더 재컴파일 방지) 밝기만 조절한다
  lightG.children.forEach(o => { (o as THREE.PointLight).intensity = grow > .99 ? 6 : 0; });
  shadowDirty = true;
}

/* ======================= 일조 / 야경 ======================= */
function applyLight(){
  const tt = (opt.hour - 6) / 13, az = Math.PI * (.15 + tt*.7), el = Math.sin(Math.PI*tt) * 1.05 + .15, warm = 1 - Math.sin(Math.PI*tt);
  sun.position.set(Math.cos(az)*18, Math.sin(el)*20 + 3, -Math.sin(az)*10 + 8); sun.target.position.set(0, 0, 0);
  sun.color.setHSL(.09, .5 + warm*.4, .92 - warm*.12);
  sun.intensity = opt.night ? .05 : 1.4 + Math.sin(Math.PI*tt)*1.6;
  hemi.intensity = opt.night ? .14 : 1.35;
  scene.background = new THREE.Color(opt.night ? 0x1c2130 : 0xf5f1e8);
  ground.material.color.set(opt.night ? 0x2a2e38 : 0xefe9dd);
  renderer.toneMappingExposure = opt.night ? 1.25 : 1.12;
  setEnvIntensity(opt.night ? .15 : 1);
  const h = Math.floor(opt.hour), m = Math.round((opt.hour - h)*60);
  $('#sunT').textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  shadowDirty = true; invalidate();
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
// 전체 보기: 평면을 감싸는 구가 화면(가로·세로 중 좁은 쪽)에 들어오는 거리
function fitDist(){
  const b = plan().box, r = Math.hypot(M(b[2] - b[0]), M(b[3] - b[1]))/2 + .6;
  const vf = FOV/2*Math.PI/180, hf = Math.atan(Math.tan(vf)*SW()/Math.max(1, SH()));
  return r / Math.sin(Math.min(vf, hf)) * .92;
}
const isoWhole = () => { const d = fitDist(), dir = new THREE.Vector3(.28, .86, .6).normalize(); return pose(new THREE.Vector3(0, -.4, .2), new THREE.Vector3(0, -.4, .2).addScaledVector(dir, d)); };
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
// 드래그 뒤 남은 관성(회전·이동)을 버린다. 비행·전환 동안 멈춰 있던 관성이 도착한 뒤 이어져 카메라가 저절로 돌지 않게
function stopInertia(){
  const p = camera.position.clone(), q = camera.quaternion.clone(), tg = orbit.target.clone();
  orbit.enableDamping = false; orbit.update(); orbit.enableDamping = true;   // 감쇠를 끄고 한 번 갱신하면 남은 관성이 0이 된다
  camera.position.copy(p); camera.quaternion.copy(q); orbit.target.copy(tg);
}
const animate = (dur: number, fn: (t: number) => void) => new Promise<void>(res => { stopInertia(); anim = {t0: performance.now(), dur, fn, res}; kick(); });
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
function flyTo(B: Pose, dur = 900, fov = FOV){ stopInertia(); fly = {t0: performance.now(), dur, A: curPose(), B, f0: camera.fov, f1: fov}; kick(); }
function setFov(f: number){ if (Math.abs(camera.fov - f) > .01){ camera.fov = f; camera.updateProjectionMatrix(); } }

function setOverviewControls(){
  orbit.minDistance = 1.5; orbit.maxDistance = 60; orbit.minPolarAngle = 0; orbit.maxPolarAngle = Math.PI*.495;
  orbit.enablePan = true; orbit.enableZoom = true; orbit.rotateSpeed = 1;
}
// 방 시점: 눈높이에서 제자리 둘러보기 (목표점을 눈앞 가까이에 두어 회전 = 고개 돌리기)
function setRoomControls(){
  orbit.minDistance = .05; orbit.maxDistance = .8; orbit.minPolarAngle = Math.PI*.22; orbit.maxPolarAngle = Math.PI*.78;
  orbit.enablePan = false; orbit.enableZoom = false; orbit.rotateSpeed = -.45;
}
function flyToRoomView(id: string){
  const spec = aptType().rooms.find(r => r.id === id); if (!spec) return;
  const parts = plan().rooms.filter(r => r.target === id), inside = (p: Pt2) => parts.some(r => inPoly(p, r.poly));
  let eye: Pt2 = spec.view?.eye ?? spec.at, look: Pt2 = spec.view?.look ?? [spec.at[0], spec.at[1] - 2000];
  // 시점이 확장하지 않은 발코니나 세대 밖이면 바라보는 쪽으로 당겨 방 안에 둔다
  // (복도처럼 다른 실내 공간에서 문 너머로 들여다보는 시점은 그대로 둔다)
  const indoor = (q: Pt2) => plan().rooms.some(r => !r.service && inPoly(q, r.poly)) || inside(q);
  for (let k = 0; k < 20 && !indoor(eye); k++) eye = [eye[0] + (look[0] - eye[0])*.08, eye[1] + (look[1] - eye[1])*.08];
  // 사용자가 가구를 옮겨 시점을 가리면 바라보는 쪽으로 조금씩 비켜 선다
  const nearFurn = (p: Pt2) => [...fixCol, ...furnCol].some(([x0, z0, x1, z1]) => { const x = wx(p[0]), z = wz(p[1]); return x > x0 - .3 && x < x1 + .3 && z > z0 - .3 && z < z1 + .3; });
  for (let k = 0; k < 12 && nearFurn(eye); k++){ const nx: Pt2 = [eye[0] + (look[0] - eye[0])*.07, eye[1] + (look[1] - eye[1])*.07]; if (!inside(nx)) break; eye = nx; }
  const lv = spec.level ?? 0, e = new THREE.Vector3(wx(eye[0]), 1.5 + lv, wz(eye[1]));
  const dir = new THREE.Vector3(wx(look[0]) - e.x, 1.15 + lv - e.y, wz(look[1]) - e.z).normalize();
  const tg = e.clone().addScaledVector(dir, .12);
  if (opt.mode === 'walk') setMode('orbit', false);
  if (opt.cut){ opt.cut = false; syncToggles(); sync(); }
  roomView = id; setRoomControls(); showLabels(false); stage.classList.add('roomview'); syncHint3d();
  flyTo(pose(tg, e), 1100, ROOM_FOV);
  emitBus('roomView', id);
}
function flyOverview(){
  roomView = null; setOverviewControls(); stage.classList.remove('roomview'); showLabels(opt.labels); syncHint3d();
  if (opt.mode === 'walk') setMode('orbit', false);
  flyTo(isoWhole()); emitBus('roomView', null);
}

/* ======================= 3D 들어가기 / 나가기 ======================= */
async function enter(){
  init(); active = true;
  renderer.setSize(SW(), SH()); labelRenderer.setSize(SW(), SH()); camera.aspect = SW()/SH(); camera.updateProjectionMatrix();
  sync(true); setFov(FOV);
  opt.mode = 'orbit'; roomView = null; setOverviewControls(); stage.classList.remove('roomview'); syncModeUI(); orbit.enabled = false; showLabels(false);
  const A = planPose(), B = isoFrom(A);
  grow = 0; furnGrow = 0; applyGrow(); setPose(A);
  stage.classList.add('animating');
  renderNow();
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
  emitBus('roomView', null);
}
function isoFrom(P: Pose){
  const W = isoWhole(), d = THREE.MathUtils.clamp(P.p.y*1.08, 5, 40), dir = W.p.clone().sub(W.t).normalize();
  return pose(P.t.clone(), P.t.clone().addScaledVector(dir, d));
}
async function exit(){
  if (opt.mode === 'walk') setMode('orbit', false);
  fly = null; roomView = null; setOverviewControls(); stage.classList.remove('roomview');
  orbit.enabled = false; showLabels(false); stage.classList.add('animating');
  const A = curPose(), B = planPose(), f0 = camera.fov;
  await animate(1300, x => {
    setFov(f0 + (FOV - f0)*ease(clamp01(x/.5)));
    camTween(A, B, ease(clamp01((x - .1)/.9)));
    furnGrow = 1 - ease(clamp01(x/.45));
    grow = 1 - ease(clamp01((x - .2)/.6));
    applyGrow();
  });
  stage.classList.remove('is3d');                    // 이 순간 3D는 수직 시점으로 평평해져 2D와 겹친 상태 — 이어서 페이드 아웃
  await wait(450);
  active = false; cancelAnimationFrame(raf); raf = 0; lastT = 0; sinceDraw = 99;
  stage.classList.remove('animating');
  grow = furnGrow = 1; applyGrow();
}

/* ======================= 선택 / 집기 ======================= */
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
function pick(e?: {clientX: number; clientY: number}): Hit | null {
  if (!e) ptr.set(0, 0);
  else { const r = renderer.domElement.getBoundingClientRect(); ptr.set((e.clientX - r.left)/r.width*2 - 1, -(e.clientY - r.top)/r.height*2 + 1); }
  ray.setFromCamera(ptr, camera);
  const hits = ray.intersectObjects([...(opt.furn ? [furnG] : []), archUp, archFloor, fixG], true);
  for (const h of hits){
    let o: THREE.Object3D | null = h.object;
    if ((o as THREE.Mesh).material === glassMat || !o.visible) continue;
    if (o.userData.door) return {door: o.userData.door as DoorState, dist: h.distance};
    if (o.userData.floor){
      const x = h.point.x*1000 + OX, y = h.point.z*1000 + OY, r = plan().rooms.find(r => inPoly([x, y], r.poly));
      return r ? {room: r.target} : null;
    }
    while (o && !o.userData.fid && o !== scene) o = o.parent;
    if (o?.userData.fid) return {fid: o.userData.fid as string};
    return null;                                     // 벽·붙박이 설비에 가려짐
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
  // 시선이 벽에 먼저 닿으면 벽 뒤 안 보이는 곳이 아니라 닿은 지점에 놓는다
  const wall = ray.intersectObjects([archUp], true).find(h => (h.object as THREE.Mesh).material !== glassMat && h.object.visible && h.object.type === 'Mesh');
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
    const g = key ? furnCache.get(key)?.obj : undefined;
    if (g){ selHelper = new THREE.BoxHelper(g, 0x1f5a44); scene.add(selHelper); }
  }
  selHelper?.update();
}

/* ======================= 걸어보기 ======================= */
// 터치 걸어보기: 왼쪽 아래 가상 조이스틱으로 이동, 화면을 끌어 방향 전환 (iPad는 마우스 포인터 잠금을 지원하지 않음)
function syncHint3d(){
  $('#hint3d').textContent = opt.mode === 'walk' ? (touchWalk ? t('v3d.hintTouchWalk') : t('v3d.hintWalk'))
    : roomView ? t('v3d.hintRoom') : tIf(COARSE, 'v3d.hintOrbitTouch', 'v3d.hintOrbit');
}
const joy = {x: 0, y: 0, id: null as number | null}, eul = new THREE.Euler(0, 0, 0, 'YXZ');
function lookBy(dx: number, dy: number){
  eul.setFromQuaternion(camera.quaternion);
  eul.y += dx * .005; eul.x = THREE.MathUtils.clamp(eul.x + dy * .005, -1.35, 1.35);
  camera.quaternion.setFromEuler(eul);
}
function startTouchWalk(){
  touchWalk = true;
  $('#walkOverlay').style.display = 'none'; $('#joy').style.display = 'block';
  syncHint3d(); kick();
}
function stopTouchWalk(){
  touchWalk = false; joy.x = joy.y = 0; joy.id = null; $('#joy i').style.transform = '';
  $('#joy').style.display = 'none';
}
function bindJoystick(){
  const el = $('#joy'), knob = $('#joy i'), R = 50;
  const upd = (e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width/2), dy = e.clientY - (r.top + r.height/2);
    const L = Math.hypot(dx, dy); if (L > R){ dx *= R/L; dy *= R/L; }
    joy.x = dx/R; joy.y = dy/R; knob.style.transform = `translate(${dx}px,${dy}px)`; kick();
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
function syncModeUI(){
  $('#walkExit').style.display = opt.mode === 'walk' ? 'inline-flex' : 'none';
  syncHint3d();
}
function setMode(m: 'orbit' | 'walk', notify = true){
  if (anim) return;
  opt.mode = m;
  if (m === 'walk'){
    select(null);
    roomView = null; stage.classList.remove('roomview');
    if (opt.cut){ opt.cut = false; syncToggles(); sync(); }
    orbit.enabled = false; fly = null;
    const {start, look} = aptType().entry, lv = floorLevel(start[0], start[1]);
    camera.position.set(wx(start[0]), 1.55 + lv, wz(start[1])); camera.lookAt(wx(look[0]), 1.4, wz(look[1]));   // 현관 밖
    setFov(ROOM_FOV);
    $('#walkOverlay').style.display = 'flex';
    emitBus('roomView', null);
  } else {
    walkCtl.unlock(); stopTouchWalk(); orbit.enabled = true;
    $('#walkOverlay').style.display = 'none'; $('#cross').style.display = 'none';
    setOverviewControls(); roomView = null; stage.classList.remove('roomview');
    orbit.target.set(0, 0, 0); flyTo(isoWhole());
  }
  showLabels(opt.labels && m === 'orbit');
  archUp.traverse(o => { if (o.userData.walkOnly) o.visible = m === 'walk'; });
  syncModeUI(); invalidate();
  if (notify) emitBus('mode3d', m);
}
// 바닥 높이: 현관처럼 한 단 낮은 공간을 지나면 눈높이가 따라 내려간다
function floorLevel(xmm: number, ymm: number){
  const r = plan().rooms.find(r => inPoly([xmm, ymm], r.poly));
  return r?.level ?? 0;
}
function blocked(x: number, z: number, r = .2){
  for (const list of [wallCol, fixCol, furnCol]) for (const [x0, z0, x1, z1] of list) if (x > x0 - r && x < x1 + r && z > z0 - r && z < z1 + r) return true;
  for (const d of doors){
    const a = d.pivot.rotation.y, px = d.pivot.position.x, pz = d.pivot.position.z, ex = px + Math.cos(a)*.85, ez = pz - Math.sin(a)*.85;
    const k = clamp01(((x-px)*(ex-px) + (z-pz)*(ez-pz)) / ((ex-px)**2 + (ez-pz)**2));
    if (Math.hypot(x - (px + k*(ex-px)), z - (pz + k*(ez-pz))) < r*.8) return true;
  }
  return false;
}
function stepWalk(dt: number){
  const p = camera.position;
  // 바닥 높이 따라가기
  const ty = 1.55 + floorLevel(p.x*1000 + OX, p.z*1000 + OY);
  if (Math.abs(ty - p.y) > .002){ p.y += (ty - p.y)*Math.min(1, dt*8); invalidate(); }
  if (!walkCtl.isLocked && !touchWalk) return;
  const sp = (keys.ShiftLeft || keys.ShiftRight ? 2.4 : 1.3) * dt, fwd = new THREE.Vector3();
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
  if (!blocked(p.x + mv.x, p.z)) p.x += mv.x;
  if (!blocked(p.x, p.z + mv.z)) p.z += mv.z;
  invalidate();
}
addEventListener('keydown', e => {
  if (!active || (e.target as Element).matches?.('input,select,textarea')) return;
  keys[e.code] = true;
  if (opt.mode === 'walk'){
    kick();
    if (e.code === 'KeyE'){ const h = pick(); if (h?.door && h.dist! < 2.5){ h.door.open = !h.door.open; invalidate(); } }
  }
});
addEventListener('keyup', e => { keys[e.code] = false; });

/* ======================= 3D 도구 ======================= */
function syncToggles(){ $$('#tools3d [data-t]').forEach(b => b.classList.toggle('on', !!opt[b.dataset.t as 'night' | 'cut' | 'furn' | 'labels'])); }
function syncWalkTexts(){
  const lines = COARSE ? [t('v3d.wo1Touch'), t('v3d.wo2Touch'), t('v3d.wo3Touch')] : [t('v3d.wo1'), t('v3d.wo2'), t('v3d.wo3')];
  lines.forEach((h, i) => { $('#wo' + (i + 1)).innerHTML = h; });   // 사전의 고정 문구(<kbd> 포함)만 넣는다
  syncHint3d();
}
function bindUI(){
  // 터치 기기는 조이스틱, 데스크톱은 마우스 잠금 — 잠금이 실패해도 조이스틱으로 넘어간다
  $('#walkOverlay').onclick = () => { if (COARSE) startTouchWalk(); else lockPointer(); };
  document.addEventListener('pointerlockerror', () => { if (active && opt.mode === 'walk') startTouchWalk(); });
  $('#walkExit').onclick = () => setMode('orbit');
  bindJoystick();
  syncWalkTexts();
  $$('#tools3d [data-t]').forEach(b => b.onclick = () => {
    const k = b.dataset.t as 'night' | 'cut' | 'furn' | 'labels'; opt[k] = !opt[k]; syncToggles();
    if (k === 'furn'){ furnG.visible = opt.furn; if (!opt.furn && ui.sel?.kind === 'furn') select(null); shadowDirty = true; }
    if (k === 'labels') showLabels(opt.labels && opt.mode === 'orbit' && !anim && !roomView);
    if (k === 'night'){ buildLamps(); applyLight(); }
    if (k === 'cut'){ if (opt.cut && roomView) flyOverview(); sync(); }
    invalidate();
  });
  $<HTMLInputElement>('#sun').oninput = e => { opt.hour = +(e.target as HTMLInputElement).value; applyLight(); };
  syncToggles();
}

/* ======================= 메인 루프 (필요할 때만) ======================= */
const clock = new THREE.Clock();
let lastCam = '';
// 마지막으로 그린 뒤 카메라가 눈에 띄게 움직였는가 (0.05mm, 아주 작은 회전은 무시)
const camPos = new THREE.Vector3(Infinity, 0, 0), camQuat = new THREE.Quaternion();
function camMoved(){ return camPos.distanceToSquared(camera.position) > 2.5e-9 || 1 - Math.abs(camQuat.dot(camera.quaternion)) > 1e-10; }
function renderNow(){
  updateSel();
  const inside = grow > .99 && camera.position.y < H && topH() >= H;
  lampG.visible = ceilG.visible = inside;
  // 실내 시점에서는 모델하우스처럼 밝게 (광원 수는 그대로, 세기만)
  ambient.intensity = opt.night ? .05 : inside ? .75 : .15;
  if (shadowDirty){ renderer.shadowMap.needsUpdate = true; shadowDirty = false; }
  renderer.render(scene, camera); labelRenderer.render(scene, camera); renders++;
  camPos.copy(camera.position); camQuat.copy(camera.quaternion);
  // 미니맵 카메라 표시 (도면 mm 좌표)
  const d = new THREE.Vector3(); camera.getWorldDirection(d);
  const key = `${camera.position.x.toFixed(2)},${camera.position.z.toFixed(2)},${d.x.toFixed(2)},${d.z.toFixed(2)}`;
  if (key !== lastCam){ lastCam = key; emitBus('camera', {x: camera.position.x*1000 + OX, y: camera.position.z*1000 + OY, dx: d.x, dy: d.z}); }
}
// 고주사율 모니터(120·144·165Hz)에서는 화면 갱신 몇 번에 한 번만 그려 초당 60번 안팎으로 맞춘다.
// 일정한 간격으로 건너뛰어야(165Hz → 3번마다 55fps, 144Hz → 2번마다 72fps) 움직임이 고르게 보인다
let vsync = 1000/60, lastT = 0, sinceDraw = 99;
function loop(t: number){
  raf = 0;
  if (!active) return;
  if (!lastT) clock.getDelta();                                 // 쉬다가 다시 시작: 쉰 시간을 움직임에 넣지 않는다
  else vsync += (Math.min(t - lastT, 50) - vsync)*.1;           // 이어서 도는 동안 잰 화면 갱신 주기
  lastT = t;
  if (++sinceDraw < Math.max(1, Math.floor(1000/60/vsync + .35))){ raf = requestAnimationFrame(loop); return; }
  sinceDraw = 0;
  inLoop = true;
  let again = false;
  try { again = step(); }
  finally { inLoop = false; }
  if (again && active && !raf) raf = requestAnimationFrame(loop);
  else if (!again){ lastT = 0; sinceDraw = 99; }
}
// 한 프레임: 움직이는 것을 진행하고 필요하면 그린다. 다음 프레임도 필요하면 true
function step(): boolean {
  const raw = clock.getDelta(), dt = Math.min(raw, .05), now = performance.now();
  let busy = false; why = '';
  if (anim){ const x = clamp01((now - anim.t0)/anim.dur); anim.fn(x); busy = true; why = 'anim'; if (x >= 1){ const r = anim.res; anim = null; r(); } }
  else if (fly){ const x = clamp01((now - fly.t0)/fly.dur), e = ease(x); setFov(fly.f0 + (fly.f1 - fly.f0)*e); camTween(fly.A, fly.B, e); busy = true; why = 'fly'; if (x >= 1) fly = null; }
  else if (sway){
    const x = clamp01((now - sway.t0)/sway.dur), yaw = Math.sin(x*Math.PI*2)*.42*Math.sin(x*Math.PI);
    const d = sway.dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    orbit.target.copy(sway.eye).addScaledVector(d, .12); camera.position.copy(sway.eye); camera.lookAt(orbit.target);
    busy = true; why = 'sway'; if (x >= 1) sway = null;
  }
  else if (opt.mode === 'orbit'){
    // 관성은 시간 기준으로 줄인다: 프레임이 느린 컴퓨터에서도 60fps와 같은 시간(약 1.5초) 안에 멈춰 그리기를 끝낸다
    orbit.dampingFactor = 1 - (1 - DAMP)**(Math.min(raw, .25)*60); orbit.update(); orbit.dampingFactor = DAMP;
    if (camMoved()){ busy = true; why = 'orbit'; }
  }
  // 걸어보기: 제자리에 서 있으면 그리지 않는다. 움직이면 stepWalk가, 둘러보면 마우스·터치 입력이 invalidate
  else { stepWalk(dt); if (dirty){ busy = true; why = 'walk'; } }
  for (const d of doors){
    const tg = d.open ? d.a1 : d.a0, diff = tg - d.cur;
    if (Math.abs(diff) > .0015){ d.cur += diff*Math.min(1, dt*6); d.pivot.rotation.y = d.cur; busy = true; shadowDirty = true; why += ' door'; }
  }
  if (!busy && dirty) why = 'dirty';
  if (busy || dirty){ dirty = false; renderNow(); }
  return busy || dirty;
}

function shot(){
  renderNow();
  const a = document.createElement('a');
  a.download = `${t('file.base')}-${state.type}-3D.png`; a.href = renderer.domElement.toDataURL('image/png'); a.click();
}
function relang(){ if (!inited) return; syncWalkTexts(); buildLabels(); invalidate(); }

export function createView3D(){
  const api = {
    enter, exit, relang, shot, groundAt,
    sync: () => sync(),
    flyToRoomView: (id: string) => { if (active && !anim) flyToRoomView(id); },
    flyOverview: () => { if (active && !anim) flyOverview(); },
    lookAround: (ms: number) => { if (!active || anim || !roomView) return; const dir = new THREE.Vector3().subVectors(orbit.target, camera.position).normalize(); sway = {t0: performance.now(), dur: ms, eye: camera.position.clone(), dir}; kick(); },
    stopLook: () => { sway = null; },
    setMode: (m: 'orbit' | 'walk') => { if (active) setMode(m, false); },
    walking: () => active && opt.mode === 'walk',
    // 성능 측정용: 그림 호출 수·삼각형 수·지금까지 그린 횟수
    stats: () => ({calls: renderer?.info.render.calls ?? 0, triangles: renderer?.info.render.triangles ?? 0, geometries: renderer?.info.memory.geometries ?? 0, textures: renderer?.info.memory.textures ?? 0, programs: renderer?.info.programs?.length ?? 0, shapes: geoCacheSize(), renders, merged: MERGE, why}),
  };
  (window as unknown as {__wmh3d: typeof api}).__wmh3d = api;
  return api;
}
export type View3D = ReturnType<typeof createView3D>;
