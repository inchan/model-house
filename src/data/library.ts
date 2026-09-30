// 가구 종류(2D 기호와 3D 모델의 형태) — 목록 밖의 값은 불러오기 때 걸러낸다
export const FURN_TYPES = [
  'bed', 'crib', 'nightstand', 'wardrobe', 'dresser', 'desk', 'chair', 'bookshelf', 'baycushion',
  'sofa', 'cornersofa', 'armchair', 'beanbag', 'coffeetable', 'sidetable', 'tvstand', 'rug', 'shoecab', 'floorlamp', 'plant',
  'table', 'roundtable', 'island', 'barstool', 'counter', 'stove', 'ksink', 'fridge', 'cabinet',
  'toilet', 'vanity', 'shower', 'bathtub', 'washer', 'waterheater',
  'tv', 'aircon', 'acwall', 'dishwasher', 'ovencol', 'dryer', 'purifier',
  'officechair', 'piano', 'treadmill',
] as const;
export type FurnType = typeof FURN_TYPES[number];
export const isFurnType = (v: unknown): v is FurnType => typeof v === 'string' && (FURN_TYPES as readonly string[]).includes(v);

// 가구 목록 항목: key = 이름 사전 키(furn.*), 크기 mm
export interface LibItem { key: string; type: FurnType; w: number; d: number; color: string }
export interface LibCat { cat: string; items: LibItem[] }

const I = (key: string, type: FurnType, w: number, d: number, color: string): LibItem => ({key, type, w, d, color});

export const LIB: LibCat[] = [
  {cat:'bedroom', items:[
    I('bed18','bed',1800,2000,'#c9d6df'), I('bed15','bed',1500,2000,'#d8c7dc'), I('bedSS','bed',1100,2000,'#e8d5b5'),
    I('crib','crib',1250,700,'#efe3d0'), I('nightstand','nightstand',450,400,'#e8dccb'), I('wardrobe','wardrobe',2000,600,'#efe6d8'),
    I('wardrobeS','wardrobe',1200,550,'#efe6d8'), I('dresser','dresser',1000,450,'#efe6d8'), I('desk','desk',1200,600,'#e2cfb4'),
    I('chair','chair',450,480,'#cfc6b8'), I('bookshelf','bookshelf',800,300,'#e2cfb4'), I('bayCushion','baycushion',520,1800,'#e7dccd')]},
  {cat:'living', items:[
    I('sofa3','sofa',2400,900,'#b7c4b0'), I('sofa2','sofa',1700,880,'#c3cbd6'), I('sofaCorner','cornersofa',2800,1700,'#b7c4b0'),
    I('armchair','armchair',850,850,'#d6b99a'), I('beanbag','beanbag',800,800,'#e0b98f'), I('coffeeTable','coffeetable',1300,650,'#e8dccb'),
    I('sideTable','sidetable',500,500,'#d9c3a3'), I('tvStand','tvstand',2400,400,'#e2cfb4'), I('rug','rug',2400,1700,'#d9cbb8'),
    I('shoeCabinet','shoecab',1000,350,'#efe6d8'), I('entryCabinet','shoecab',1400,380,'#e6dccc'), I('floorLamp','floorlamp',450,450,'#3d3a34'),
    I('plant','plant',500,500,'#a9c39b'), I('plantLarge','plant',700,700,'#9dbb8c')]},
  {cat:'kitchen', items:[
    I('diningTable','table',1400,800,'#e2cfb4'), I('diningTable6','table',1800,900,'#d8c2a2'), I('roundTable','roundtable',1000,1000,'#e2cfb4'),
    I('diningChair','chair',450,480,'#cfc6b8'), I('island','island',1800,900,'#e9e5de'), I('barStool','barstool',420,420,'#6b5d4c'),
    I('counter','counter',1600,600,'#e9e5de'), I('stove','stove',750,450,'#dcdcdc'), I('sink','ksink',800,450,'#e1e6ea'),
    I('fridge','fridge',700,700,'#dfe4e8'), I('sideboard','cabinet',1600,400,'#efe6d8')]},
  {cat:'bath', items:[
    I('toilet','toilet',400,700,'#ffffff'), I('vanity','vanity',800,500,'#eef1f3'), I('vanityDouble','vanity',1200,500,'#eef1f3'),
    I('shower','shower',900,900,'#e4edf2'), I('bathtub','bathtub',1600,750,'#eef3f6'), I('washer','washer',600,600,'#e6ebee'),
    I('waterHeater','waterheater',800,450,'#f4f4f2'), I('storage','cabinet',1000,400,'#efe6d8')]},
  {cat:'appliance', items:[
    I('tv65','tv',1450,80,'#1d1d1f'), I('tv55','tv',1230,80,'#1d1d1f'), I('fridgeSxS','fridge',910,700,'#c9ced3'),
    I('acStand','aircon',500,380,'#f6f7f8'), I('acWall','acwall',900,250,'#f6f7f8'), I('dishwasher','dishwasher',600,600,'#c9ced3'),
    I('ovenTower','ovencol',600,600,'#efe6d8'), I('dryer','dryer',600,600,'#e6ebee'), I('purifier','purifier',400,300,'#f4f4f2')]},
  {cat:'study', items:[
    I('deskLong','desk',1600,700,'#d8c2a2'), I('officeChair','officechair',620,620,'#4a4f55'), I('bookshelfLarge','bookshelf',1600,350,'#e2cfb4'),
    I('piano','piano',1500,600,'#1f1d1b'), I('treadmill','treadmill',800,1800,'#3a3a3c'), I('readingChair','armchair',750,800,'#c9a98a')]},
];

// 기본 배치에만 쓰는 이름 (목록에는 없음)
const EXTRA_KEYS = ['showerArea', 'laundrySink', 'teaTable', 'loungeChair'];

export const FURN_KEYS = new Set([...LIB.flatMap(c => c.items.map(i => i.key)), ...EXTRA_KEYS]);

export function typeColor(t: FurnType): string {
  for (const c of LIB) for (const i of c.items) if (i.type === t) return i.color;
  return '#eeeeee';
}
// 이름 키가 없는 가구에 붙일 기본 이름 키
export function defaultKeyOf(t: FurnType): string {
  for (const c of LIB) for (const i of c.items) if (i.type === t) return i.key;
  return 'storage';
}
