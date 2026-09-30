// 도면(mm) → 3D 세계(m). 평면 중심을 세계 원점에 둔다. 층고 2.8 m
export const OX = 6000, OY = 5300, H = 2.8, FOV = 45;
export const wx = (x: number) => (x - OX) / 1000;
export const wz = (y: number) => (y - OY) / 1000;
export const M = (v: number) => v / 1000;
export type Vec3 = [number, number, number];
