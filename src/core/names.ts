// 화면에 표시할 이름: 사용자가 바꾼 이름이 있으면 그대로, 없으면 현재 언어의 기본 이름
import { state, type Furniture } from './state';
import { aptType } from './plan';
import { lang, t, tKey } from '../i18n';
import type { AptType, TypeId } from '../data/apt/schema';

export function baseRoomName(id: string): string {
  if (id.startsWith('balc')) return t('room.balcony');
  const named = tKey('room.' + id, '');
  if (named) return named;
  // 편집기로 그린 방: 종류 이름 + 같은 종류가 여럿이면 번호 (위→아래, 왼쪽→오른쪽 순)
  const rooms = aptType().rooms, me = rooms.find(r => r.id === id);
  if (!me) return id;
  const same = rooms.filter(r => r.kind === me.kind).sort((a, b) => a.at[1] - b.at[1] || a.at[0] - b.at[0]);
  const base = tKey('kind.' + me.kind, me.kind);
  return same.length > 1 ? `${base} ${same.indexOf(me) + 1}` : base;
}
export const roomName = (id: string) => state.rooms[id]?.name ?? baseRoomName(id);
export const libName = (key: string) => tKey('furn.' + key, key);
export const furnName = (f: Pick<Furniture, 'key' | 'name'>) => f.name ?? (f.key ? libName(f.key) : '');
export const matName = (k: string) => tKey('mat.' + k, k);
export const catName = (k: string) => tKey('cat.' + k, k);
export const styleName = (k: string) => tKey('style.' + k, k);
export const wallName = (k: string) => tKey('wall.' + k, k);
export const optName = (k: string) => tKey('opt.' + k, k);

// 타입 표기: 84A, "4Bay 판상형", 34평형
export const typeCode = (id: TypeId) => (id === 'custom' ? t('type.custom') : id.slice(1) + id[0].toUpperCase());
export const typeForm = (a: AptType) => (a.id === 'custom' ? t('type.customForm') : `${t('type.bay', {n: a.bay})} ${t(a.form === 'tower' ? 'type.tower' : 'type.flat')}`);
export const pyeong = (supply: number) => Math.round(supply / 3.3058);

// 면적 표기: 한국어 12.34㎡ / 영어 12.34 m²
export const fmtArea = (v: number, d = 2) => (lang === 'ko' ? `${v.toFixed(d)}㎡` : `${v.toFixed(d)} m²`);

// 이름 입력란 값 → 저장할 이름. 기본 이름과 같거나 비어 있으면 사용자 이름을 지운다(기본 이름을 따라가게)
export function customName(input: string, defaultName: string): string | undefined {
  const v = input.trim().slice(0, 60);
  return !v || v === defaultName ? undefined : v;
}
