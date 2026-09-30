/* ======================= 재질 ======================= */
import * as THREE from 'three';
import type { MatKey } from '../data/materials';

const matCache = new Map<string, THREE.MeshStandardMaterial>();
let envTex: THREE.Texture | null = null, envK = 1, maxAniso = 1;

// 초기화 후 만들어지는 공용 재질 (환경 반사를 받으려면 envTex가 준비된 뒤 생성해야 한다)
export let glassMat: THREE.MeshPhysicalMaterial;
export let wallMat: THREE.MeshStandardMaterial;
export let capMat: THREE.MeshStandardMaterial;
export let frameMat: THREE.MeshStandardMaterial;

export function initMaterials(renderer: THREE.WebGLRenderer, env: THREE.Texture){
  envTex = env; maxAniso = renderer.capabilities.getMaxAnisotropy();
  glassMat = new THREE.MeshPhysicalMaterial({color:0xcfe6ef, roughness:.05, transparent:true, opacity:.28, depthWrite:false, side:THREE.DoubleSide});
  wallMat = mat('#f4f1eb', {roughness:.92}); capMat = mat('#34312d', {roughness:.9}); frameMat = mat('#5d6166', {roughness:.5, metalness:.4});
}

export function mat(color: THREE.ColorRepresentation, o: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial {
  const key = String(color) + JSON.stringify(o);
  let m = matCache.get(key);
  if (!m){
    m = new THREE.MeshStandardMaterial({color, roughness:.7, ...o});
    // 금속 / 광택 표면에만 환경 반사를 건다 (벽 같은 무광 재질에 걸면 전체가 밝아진다)
    if (envTex && (m.metalness > 0 || m.roughness < .4)){ m.envMap = envTex; m.userData.env = m.metalness > .5 ? 1 : .5; m.envMapIntensity = m.userData.env*envK; }
    matCache.set(key, m);
  }
  return m;
}
// 야경일 때 환경 반사를 줄인다
export function setEnvIntensity(k: number){
  envK = k;
  matCache.forEach(m => { if (m.envMap) m.envMapIntensity = m.userData.env*envK; });
}

export function rng(seed: number){
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const rgbK = (hex: string, k: number) => { const n = parseInt(hex.slice(1), 16); const f = (v: number) => Math.max(0, Math.min(255, Math.round(v*k))); return `rgb(${f(n>>16&255)},${f(n>>8&255)},${f(n&255)})`; };
export const darker = (hex: string, k = .8) => '#' + new THREE.Color(hex).multiplyScalar(k).getHexString();
export const lighter = (hex: string, k = .2) => '#' + new THREE.Color(hex).lerp(new THREE.Color('#ffffff'), k).getHexString();

// 바닥 텍스처: 실제 크기로 반복 (UV 단위 = m). wood = 마루 널판 무늬
interface TexSpec { sx: number; sy: number; base: string; grout?: string; rough: number; wood?: boolean; veins?: boolean }
const TEX: Record<MatKey, TexSpec> = {
  gangmaru:  {sx:1.2, sy:.19, base:'#d6b58a', rough:.5, wood:true},
  ganghwa:   {sx:1.2, sy:.19, base:'#c7bca9', rough:.45, wood:true},
  wonmok:    {sx:1.8, sy:.36, base:'#9a6f4b', rough:.5, wood:true},
  porcelain: {sx:1.2, sy:.6, base:'#ebe8e2', grout:'#d2ccc1', rough:.18},
  tile600:   {sx:.6, sy:.6, base:'#dfe3e0', grout:'#bfc6c1', rough:.35},
  bathtile:  {sx:.3, sy:.3, base:'#d3d8d4', grout:'#aab2ac', rough:.8},
  jangpan:   {sx:1.2, sy:.19, base:'#dcc49c', rough:.6, wood:true},
  marble:    {sx:1.2, sy:1.2, base:'#f2efe9', grout:'#d9d2c4', rough:.18, veins:true},
};
const floorMats: Partial<Record<MatKey, THREE.MeshStandardMaterial>> = {};
export function floorMat(kind: MatKey){
  const cached = floorMats[kind]; if (cached) return cached;
  const s = TEX[kind] ?? TEX.tile600, R = rng(kind.length*977 + kind.charCodeAt(0)*13), cv = document.createElement('canvas');
  cv.width = s.wood ? 1024 : 512; cv.height = s.wood ? 205 : 512;
  const g = cv.getContext('2d')!, W = cv.width, Hh = cv.height;
  g.fillStyle = s.base; g.fillRect(0, 0, W, Hh);
  if (s.wood){
    const rowH = Hh/2, joints = [[W*2/3], [W/3]];
    for (let r = 0; r < 2; r++){
      let x0 = 0;
      [...joints[r], W].forEach(x1 => {
        g.fillStyle = rgbK(s.base, .9 + R()*.2); g.fillRect(x0, r*rowH, x1-x0, rowH);
        g.strokeStyle = rgbK(s.base, .8); g.globalAlpha = .35; g.lineWidth = 1.2;
        for (let k = 0; k < 7; k++){ const y = r*rowH + 6 + R()*(rowH-12); g.beginPath(); g.moveTo(x0, y);
          for (let x = x0; x <= x1; x += 40) g.lineTo(x, y + Math.sin(x*.02 + k)*2.5); g.stroke(); }
        g.globalAlpha = 1; g.fillStyle = rgbK(s.base, .62); g.fillRect(x1-1.5, r*rowH, 3, rowH); x0 = x1;
      });
      g.fillStyle = rgbK(s.base, .62); g.fillRect(0, r*rowH, W, 2.5);
    }
  } else if (s.veins){
    g.strokeStyle = 'rgba(160,150,135,.35)';
    for (let k = 0; k < 6; k++){ g.lineWidth = 1 + R()*3; g.beginPath(); g.moveTo(R()*W, 0); g.bezierCurveTo(R()*W, R()*Hh, R()*W, R()*Hh, R()*W, Hh); g.stroke(); }
  } else {
    for (let k = 0; k < 1500; k++){ g.fillStyle = `rgba(0,0,0,${R()*.04})`; g.fillRect(R()*W, R()*Hh, 2, 2); }
  }
  if (s.grout){ g.fillStyle = s.grout; g.fillRect(0, 0, W, 3); g.fillRect(0, 0, 3, Hh); }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1/s.sx, 1/s.sy);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso;
  return floorMats[kind] = new THREE.MeshStandardMaterial({map:t, roughness:s.rough});
}

// 자주 쓰는 재질
export const metal = () => mat('#cfd2d4', {metalness:.9, roughness:.25});
export const chrome = () => mat('#eef0f2', {metalness:1, roughness:.08});
export const hwMat = () => mat('#b9b3a8', {metalness:.85, roughness:.3});
export const blackMetal = () => mat('#2b2b2d', {metalness:.6, roughness:.4});
export const mirror = () => mat('#dfeaee', {metalness:.55, roughness:.06});
export const ceramic = (o: THREE.MeshStandardMaterialParameters = {}) => mat('#fbfbf9', {roughness:.12, ...o});
export const fabric = (c: string) => mat(c, {roughness:.96});
export const woodM = (c: string) => mat(c, {roughness:.55});
export const screenMat = (glow = '#1a2636') => mat('#0b0e13', {roughness:.1, metalness:.3, emissive:glow, emissiveIntensity:.35});
export const glowMat = (c = '#fff4dc', e = '#ffdca0', k = .5) => mat(c, {emissive:e, emissiveIntensity:k, roughness:.9, side:THREE.DoubleSide});
