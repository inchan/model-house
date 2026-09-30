// 요소가 없으면 바로 드러나도록 예외를 던지는 querySelector
export function $<T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T {
  const el = root.querySelector<T>(sel);
  if (!el) throw new Error(`Element not found: ${sel}`);
  return el;
}
export const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)];

export const esc = (s: unknown) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]!));

export const COARSE = matchMedia('(pointer:coarse)').matches;   // iPad / 휴대폰 등 터치 위주 기기
export const TAP = COARSE ? 9 : 4;                               // 손가락이 이 픽셀 이상 움직여야 끌기로 본다
export const narrow = () => matchMedia('(max-width:1100px)').matches;
export const PX_MM = 25.4 / 96;                                  // 1 CSS px = 0.2646 mm

// localStorage 접근이 막힌 환경(사생활 보호 모드 등)에서도 동작하도록 감싼다
export function storeGet<T>(key: string): T | null {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) as T : null; } catch { return null; }
}
export function storeSet(key: string, value: unknown){
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* 저장 불가 */ }
}

export function download(name: string, blob: Blob){
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
