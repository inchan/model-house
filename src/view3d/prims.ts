/* ======================= 기본 도형 (y = 바닥면 높이, 단위 m) ======================= */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, hwMat, ceramic, glowMat } from './materials';
import type { Vec3 } from './units';

type MatLike = string | THREE.Material;
const asMat = (m: MatLike) => (typeof m === 'string' ? mat(m) : m);

export const sh = <T extends THREE.Object3D>(o: T) => { o.castShadow = o.receiveShadow = true; return o; };
// 같은 치수의 도형은 한 번만 계산해 나눠 쓴다. 가구는 합칠 때 도형을 복사하므로 원본을 공유해도 안전하다.
// 둥근 상자는 만들기가 비싸서, 스타일을 바꿀 때 붙박이장·가구를 다시 만드는 시간 대부분이 여기서 나온다
const geoCache = new Map<string, THREE.BufferGeometry>();
function cachedGeo(key: string, make: () => THREE.BufferGeometry){
  let g = geoCache.get(key);
  if (!g){ if (geoCache.size > 4000) geoCache.clear(); g = make(); g.userData.shared = true; geoCache.set(key, g); }
  return g;
}
export const geoCacheSize = () => geoCache.size;
// 공유 도형은 쓰는 쪽에서 버리지 않는다 (?nomerge에서는 여러 메시가 같은 도형을 그린다)
export const disposeGeo = (g: THREE.BufferGeometry) => { if (!g.userData.shared) g.dispose(); };
const gk = (kind: string, ...v: number[]) => kind + v.map(x => Math.round(x*1e5)).join(',');
export const mesh = (geo: THREE.BufferGeometry, m: MatLike) => sh(new THREE.Mesh(geo, asMat(m)));
export const rot = <T extends THREE.Object3D>(o: T, x = 0, y = 0, z = 0) => { o.rotation.set(x, y, z); return o; };

export function box(w: number, h: number, d: number, m: MatLike, x = 0, y = 0, z = 0){
  const o = mesh(cachedGeo(gk('b', w, h, d), () => new THREE.BoxGeometry(w, h, d)), m); o.position.set(x, y + h/2, z); return o;
}
export function rbox(w: number, h: number, d: number, m: MatLike, x = 0, y = 0, z = 0, r = .04){
  const rr = Math.min(r, w/2-.001, h/2-.001, d/2-.001);
  const o = mesh(cachedGeo(gk('r', w, h, d, rr), () => new RoundedBoxGeometry(w, h, d, 3, rr)), m); o.position.set(x, y + h/2, z); return o;
}
export function cyl(rt: number, rb: number, h: number, m: MatLike, x = 0, y = 0, z = 0, seg = 28){
  const o = mesh(cachedGeo(gk('c', rt, rb, h, seg), () => new THREE.CylinderGeometry(rt, rb, h, seg)), m); o.position.set(x, y + h/2, z); return o;
}
// 회전체: pts = [[반지름, 높이], …] 아래에서 위로, y = 바닥면
export function lathe(pts: [number, number][], m: MatLike, x = 0, y = 0, z = 0, seg = 40){
  const o = mesh(new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(Math.max(r, 1e-4), h)), seg), m); o.position.set(x, y, z); return o;
}
// 두 점 사이의 원기둥: r0는 a 쪽, r1은 b 쪽 (가늘어지는 의자 다리, 비스듬한 지지대)
export function rod(a: Vec3, b: Vec3, r0: number, m: MatLike, r1 = r0, seg = 12){
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), o = mesh(new THREE.CylinderGeometry(r1, r0, A.distanceTo(B), seg), m);
  o.position.copy(A).add(B).multiplyScalar(.5); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.sub(A).normalize()); return o;
}
// 곡선을 따라가는 관 (수전, 팔걸이, 조명 암)
export const tube = (pts: Vec3[], r: number, m: MatLike, seg = 40) =>
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'centripetal'), seg, r, 10), m);
// 타원체 (쿠션, 잎, 빈백), y = 중심
export function blob(rx: number, ry: number, rz: number, m: MatLike, x = 0, y = 0, z = 0, seg = 24){
  const o = mesh(cachedGeo(gk('s', seg), () => new THREE.SphereGeometry(1, seg, Math.round(seg*.7))), m); o.scale.set(rx, ry, rz); o.position.set(x, y, z); return o;
}
// 수평 고리, y = 중심
export function ring(R: number, r: number, m: MatLike, x = 0, y = 0, z = 0){
  const o = mesh(new THREE.TorusGeometry(R, r, 10, 48), m); o.rotation.x = Math.PI/2; o.position.set(x, y, z); return o;
}
export function rrect(w: number, d: number, r: number){
  const s = new THREE.Shape(), x = -w/2, y = -d/2; r = Math.min(r, w/2 - .001, d/2 - .001);
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
}
// 속이 빈 둥근 테두리 (욕조, 개수대 턱, 의자 등판 틀): 바깥 w×d, 벽 두께 t, 높이 h
export function shell(w: number, d: number, h: number, t: number, r: number, m: MatLike, x = 0, y = 0, z = 0){
  const s = rrect(w, d, r); s.holes.push(rrect(w - 2*t, d - 2*t, Math.max(.004, r - t)));
  const geo = new THREE.ExtrudeGeometry(s, {depth:h, bevelEnabled:false, curveSegments:10}); geo.rotateX(-Math.PI/2);
  const o = mesh(geo, m); o.position.set(x, y, z); return o;
}
// 가늘어지는 다리 네 개: inset = 모서리에서 들어간 거리, r = 다리 아래 반지름(위쪽이 조금 굵음)
export const legs = (g: THREE.Object3D, w: number, d: number, h: number, m: MatLike, inset = .05, r = .02) =>
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a, b]) => g.add(rod([a*(w/2-inset), 0, b*(d/2-inset)], [a*(w/2-inset), h, b*(d/2-inset)], r*.7, m, r)));

// 손잡이: y = 손잡이 중심, z = 문짝 앞면
export function pull(g: THREE.Object3D, len: number, vert: boolean, x: number, y: number, z: number){
  const m = hwMat(), o = new THREE.Group();
  o.add(vert ? box(.01, len, .01, m, 0, -len/2, .028) : box(len, .01, .01, m, 0, -.005, .028));
  [-1, 1].forEach(s => o.add(vert ? box(.008, .008, .028, m, 0, s*(len/2 - .015) - .004, .014) : box(.008, .008, .028, m, s*(len/2 - .015), -.004, .014)));
  o.position.set(x, y, z); g.add(o);
}
export function knob(g: THREE.Object3D, x: number, y: number, z: number){
  const k = cyl(.011, .014, .02, hwMat(), x, y - .01, z + .01, 16); k.rotation.x = Math.PI/2; g.add(k, blob(.014, .014, .008, hwMat(), x, y, z + .022, 12));
}
// 문짝 / 서랍 면: x0..x0+w, y0..y0+h 영역에 nx열 × ny행, 앞면이 +z (z = 몸통 앞면)
// hd: 'bar' 금속 손잡이 | 'knob' 둥근 손잡이 | 'edge' 윗면 손잡이 홈 | 'none'; hy: 문 손잡이 중심 높이 (null = 가운데)
export type Handle = 'bar' | 'knob' | 'edge' | 'none';
export function fronts(g: THREE.Object3D, x0: number, y0: number, w: number, h: number, z: number, nx: number, ny: number, m: MatLike, hd: Handle = 'bar', hy: number | null = null){
  const gap = .005, pw = w/nx, ph = h/ny, fz = z + .018;
  g.add(box(w, h, .002, '#2a2724', x0 + w/2, y0, z + .001));                     // 틈새로 보이는 어두운 면
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++){
    const cx = x0 + pw*(i + .5), yb = y0 + ph*j, drawer = ph < .4 && pw >= ph;
    g.add(rbox(pw - gap, ph - gap, .018, m, cx, yb + gap/2, z + .009, .003));
    if (hd === 'none') continue;
    if (hd === 'edge'){ g.add(box(pw - .05, .01, .006, '#3c3a37', cx, yb + ph - gap - .018, fz)); continue; }
    if (drawer){ if (hd === 'knob') knob(g, cx, yb + ph/2, fz); else pull(g, Math.min(.3, pw*.45), false, cx, yb + ph/2, fz); continue; }
    const len = Math.min(.45, ph*.35), hx = nx === 1 ? cx + pw/2 - .045 : (i % 2 ? cx - pw/2 + .04 : cx + pw/2 - .04);
    const y = Math.min(yb + ph - .05 - len/2, Math.max(yb + .05 + len/2, hy ?? yb + ph/2));
    if (hd === 'knob') knob(g, hx, y, fz); else pull(g, len, true, hx, y, fz);
  }
}
const vasePts = (r: number, h: number): [number, number][] => [[0, 0], [r*.65, 0], [r, h*.32], [r*.92, h*.62], [r*.42, h*.86], [r*.5, h]];
export function vase(g: THREE.Object3D, x: number, y: number, z: number, r: number, h: number, c: string, R: () => number, flowers = true){
  g.add(lathe(vasePts(r, h), mat(c, {roughness:.35, side:THREE.DoubleSide}), x, y, z, 32));
  if (!flowers) return;
  const cols = ['#f3e6d8', '#e8b4a0', '#f6d27a', '#ffffff'];
  for (let k = 0; k < 5; k++){
    const a = k*1.26 + R()*.4, s = .03 + R()*.05, top: Vec3 = [x + Math.cos(a)*s, y + h + .12 + R()*.14, z + Math.sin(a)*s];
    g.add(rod([x, y + h*.6, z], top, .003, '#6f8f4a', .003, 6), blob(.022, .018, .022, cols[k % 4], ...top, 12));
  }
}
export function tableLamp(g: THREE.Object3D, x: number, y: number, z: number, s = 1){
  g.add(lathe([[0, 0], [.06*s, 0], [.075*s, .05*s], [.08*s, .12*s], [.055*s, .2*s], [.018*s, .25*s], [.012*s, .3*s]], ceramic({roughness:.3}), x, y, z, 32));
  g.add(lathe([[.13*s, 0], [.1*s, .18*s]], glowMat('#f6ecd9', '#ffdca0', .35), x, y + .26*s, z, 40), blob(.03*s, .03*s, .03*s, glowMat('#fff', '#ffe2b0', 1), x, y + .31*s, z, 12));
}
export const plate = (g: THREE.Object3D, r: number, x: number, y: number, z: number) =>
  g.add(lathe([[0, 0], [r*.6, 0], [r*.72, .008], [r, .02]], ceramic({side:THREE.DoubleSide}), x, y, z, 32));
