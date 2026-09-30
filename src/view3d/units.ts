// 도면(mm) → 3D 세계(m). 평면 중심을 세계 원점에 둔다 (타입마다 다르므로 바꿀 수 있다)
export let OX = 6000, OY = 4000;
export function setOrigin(x: number, y: number){ OX = x; OY = y; }
export const H = 2.4, FOV = 45;             // 천장고 2.4 m (국내 신축 아파트 수준)
export const wx = (x: number) => (x - OX) / 1000;
export const wz = (y: number) => (y - OY) / 1000;
export const M = (v: number) => v / 1000;
export type Vec3 = [number, number, number];
