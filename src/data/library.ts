// 가구 종류(2D 기호와 3D 모델의 형태) — 목록 밖의 값은 불러오기 때 걸러낸다
export const FURN_TYPES = [
  'bed', 'crib', 'nightstand', 'wardrobe', 'dresser', 'desk', 'chair', 'bookshelf', 'baycushion',
  'sofa', 'cornersofa', 'armchair', 'beanbag', 'coffeetable', 'sidetable', 'tvstand', 'rug', 'shoecab', 'floorlamp', 'plant',
  'table', 'roundtable', 'island', 'barstool', 'counter', 'stove', 'ksink', 'fridge', 'cabinet',
  'toilet', 'vanity', 'shower', 'bathtub', 'washer', 'waterheater',
  'tv', 'aircon', 'acwall', 'dishwasher', 'ovencol', 'dryer', 'purifier',
  'officechair', 'piano', 'treadmill',
  // 한국 아파트 붙박이·가전
  'induction', 'dressshelf', 'ceilingac', 'washtower', 'entrytall', 'acunit', 'massagechair',
] as const;
export type FurnType = typeof FURN_TYPES[number];
export const isFurnType = (v: unknown): v is FurnType => typeof v === 'string' && (FURN_TYPES as readonly string[]).includes(v);

// 가구 목록 항목: key = 이름 사전 키(furn.*), 크기 mm
export interface LibItem { key: string; type: FurnType; w: number; d: number; color: string }
export interface LibCat { cat: string; items: LibItem[] }

const I = (key: string, type: FurnType, w: number, d: number, color: string): LibItem => ({key, type, w, d, color});

export const LIB: LibCat[] = [
  {cat:'living', items:[
    I('sofa4','sofa',2800,950,'#cbbfa9'), I('sofa3','sofa',2300,900,'#b7c4b0'), I('sofaCorner','cornersofa',2800,1700,'#c3c8cc'),
    I('armchair','armchair',850,850,'#d6b99a'), I('massageChair','massagechair',800,1400,'#6b625a'), I('coffeeTable','coffeetable',1200,600,'#c69c6d'),
    I('sideTable','sidetable',500,500,'#d9c3a3'), I('tvStand','tvstand',2400,400,'#c69c6d'), I('rug','rug',2400,1700,'#dccdb6'),
    I('floorLamp','floorlamp',450,450,'#3d3a34'), I('plant','plant',500,500,'#a9c39b'), I('plantLarge','plant',700,700,'#9dbb8c')]},
  {cat:'bedroom', items:[
    I('bedK','bed',1600,2000,'#e7dfd1'), I('bed15','bed',1500,2000,'#d5dfcf'), I('bedSS','bed',1100,2000,'#e8d5b5'),
    I('crib','crib',1250,700,'#efe3d0'), I('nightstand','nightstand',450,400,'#c69c6d'), I('wardrobe','wardrobe',2000,600,'#eee7da'),
    I('wardrobeS','wardrobe',1200,550,'#eee7da'), I('dresser','dresser',1000,450,'#c69c6d')]},
  {cat:'kitchen', items:[
    I('diningTable','table',1600,900,'#c69c6d'), I('diningTable6','table',1800,900,'#8d6b4a'), I('roundTable','roundtable',1000,1000,'#e2cfb4'),
    I('diningChair','chair',450,480,'#b08a62'), I('island','island',1800,900,'#e9e5de'), I('barStool','barstool',420,420,'#6b5d4c'),
    I('fridgeSxS','fridge',900,700,'#c9ced3'), I('fridge','fridge',700,700,'#dfe4e8'), I('kimchiFridge','fridge',750,700,'#e6e2da'),
    I('sideboard','cabinet',1600,400,'#eee7da')]},
  {cat:'study', items:[
    I('desk','desk',1200,600,'#c69c6d'), I('deskLong','desk',1600,700,'#8d6b4a'), I('chair','chair',450,480,'#b08a62'),
    I('officeChair','officechair',620,620,'#4a4f55'), I('bookshelf','bookshelf',800,300,'#c69c6d'), I('bookshelfLarge','bookshelf',1600,350,'#c69c6d'),
    I('piano','piano',1500,600,'#1f1d1b'), I('treadmill','treadmill',800,1800,'#3a3a3c'), I('readingChair','armchair',750,800,'#7f9a7a')]},
  {cat:'appliance', items:[
    I('tv65','tv',1450,80,'#1d1d1f'), I('tv55','tv',1230,80,'#1d1d1f'), I('acStand','aircon',500,380,'#f6f7f8'),
    I('acWall','acwall',900,250,'#f6f7f8'), I('purifier','purifier',400,300,'#f4f4f2'), I('washTower','washtower',700,750,'#e6e8ea'),
    I('washer','washer',600,600,'#e6ebee'), I('dryer','dryer',600,600,'#e6ebee'), I('dishwasher','dishwasher',600,600,'#c9ced3')]},
  {cat:'storage', items:[
    I('shoeCabinet','shoecab',1000,350,'#eee7da'), I('storage','cabinet',1000,400,'#eee7da'), I('ovenTower','ovencol',600,600,'#eee7da'),
    I('laundrySink','vanity',600,500,'#eef1f3')]},
];

// 기본 배치에만 쓰는 이름 (목록에는 없음)
// 붙박이 설비·옵션 품목과 예전 배치에 쓰던 이름 (목록에는 없지만 이름 사전에 있음)
const EXTRA_KEYS = ['showerArea', 'teaTable', 'loungeChair', 'counter', 'stove', 'sink', 'toilet', 'vanity', 'vanityDouble', 'shower', 'bathtub',
  'entryCabinet', 'induction', 'dressShelf', 'ceilingAc', 'acUnit', 'bed18', 'bayCushion', 'waterHeater', 'acUnit'];

export const FURN_KEYS = new Set([...LIB.flatMap(c => c.items.map(i => i.key)), ...EXTRA_KEYS]);

// 목록에 없는 붙박이 설비의 기본 색
const FIXTURE_COLORS: Partial<Record<FurnType, string>> = {
  counter: '#eee7da', ksink: '#e1e6ea', stove: '#dcdcdc', toilet: '#ffffff', shower: '#e4edf2', bathtub: '#eef3f6', vanity: '#eef1f3',
  induction: '#1b1c1e', dressshelf: '#eee7da', ceilingac: '#f4f4f2', entrytall: '#eee7da', acunit: '#e9eaeb', waterheater: '#f4f4f2', baycushion: '#e7dccd',
};
export function typeColor(t: FurnType): string {
  const fx = FIXTURE_COLORS[t]; if (fx) return fx;
  for (const c of LIB) for (const i of c.items) if (i.type === t) return i.color;
  return '#eeeeee';
}
// 이름 키가 없는 가구에 붙일 기본 이름 키
export function defaultKeyOf(t: FurnType): string {
  for (const c of LIB) for (const i of c.items) if (i.type === t) return i.key;
  return 'storage';
}
