// 바닥재: 단가는 원/㎡, 자재+시공·부가세 포함 참고가 (2023~2025 국내 시공 견적 사례 기준의 대략값).
// 실제 견적은 제품·지역·현장 조건에 따라 크게 달라진다.
export type MatKey = 'gangmaru' | 'ganghwa' | 'wonmok' | 'porcelain' | 'tile600' | 'bathtile' | 'jangpan' | 'marble';

export interface Material { price: number; sw: string }

export const MATS: Record<MatKey, Material> = {
  gangmaru:  {price:36000,  sw:'#d8b88a'},   // 강마루 평당 약 10~14만 원
  ganghwa:   {price:24000,  sw:'#c9bfae'},   // 강화마루
  wonmok:    {price:80000,  sw:'#9b7250'},   // 원목마루
  porcelain: {price:130000, sw:'#ebe8e2'},   // 포세린 타일 600×1200, 평당 약 30~70만 원
  tile600:   {price:75000,  sw:'#dfe3e1'},
  bathtile:  {price:60000,  sw:'#d3d8d4'},
  jangpan:   {price:14000,  sw:'#e3cfa8'},   // 장판(PVC), 평당 약 3~6만 원
  marble:    {price:180000, sw:'#f1eee8'},
};

export const MAT_KEYS = Object.keys(MATS) as MatKey[];
export const isMatKey = (k: unknown): k is MatKey => typeof k === 'string' && k in MATS;
export const WASTE = 1.05;   // 시공 로스 5%
