import ko from './ko';
import en from './en';

export type Key = keyof typeof ko;
export type Lang = 'ko' | 'en';
type Params = Record<string, string | number>;

const LANG_KEY = 'floorplan-kr:lang';
const dicts: Record<Lang, Record<Key, string>> = { ko, en };

export let lang: Lang = (() => {
  try { return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'ko'; } catch { return 'ko'; }
})();

const fill = (s: string, params?: Params) =>
  params ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m)) : s;

export const t = (key: Key, params?: Params): string => fill(dicts[lang][key] ?? key, params);

// 방·가구·재질처럼 키를 조합해 찾는 이름용. 사전에 없으면 fallback을 그대로 쓴다
export function tKey(key: string, fallback = key): string {
  return (dicts[lang] as Record<string, string>)[key] ?? fallback;
}

// 현재 언어 기준 두 가지 문구 중 하나 (터치 / 데스크톱 분기 등)
export const tIf = (cond: boolean, a: Key, b: Key, params?: Params) => t(cond ? a : b, params);

export function setLang(l: Lang) {
  lang = l;
  try { localStorage.setItem(LANG_KEY, l); } catch { /* 저장 불가(사생활 보호 모드 등)면 이번 세션에만 적용 */ }
}

const locale = () => (lang === 'ko' ? 'ko-KR' : 'en-US');
let krwFmt: Intl.NumberFormat | null = null, krwLang: Lang | null = null;
export function fmtKRW(n: number): string {
  if (krwLang !== lang){ krwFmt = new Intl.NumberFormat(locale(), { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }); krwLang = lang; }
  return krwFmt!.format(Math.round(n));
}

// 정적 문구: 요소에 data-i18n / data-i18n-title 로 키를 달아 두면 언어 전환 때 채운다.
// 요소의 나머지 data-* 값은 자리표시자로 쓴다 (예: data-r="50" → {r})
export function applyStaticLang() {
  document.documentElement.lang = lang;
  document.title = t('app.title');
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n as Key, { ...el.dataset } as Params); });
  document.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle as Key, { ...el.dataset } as Params); });
}
