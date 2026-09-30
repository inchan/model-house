/* 전체 화면: 표준 API + Safari(iPad)의 webkit 접두어 버전 */
import { $ } from '../core/dom';
import { t } from '../i18n';
import { icon } from './icons';
import { toast } from './toast';

type WebkitDoc = Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => Promise<void> };
type WebkitEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
const doc = document as WebkitDoc;
const fsEl = () => doc.fullscreenElement || doc.webkitFullscreenElement;

export function toggleFullscreen(){
  const de = document.documentElement as WebkitEl;
  if (fsEl()){ (doc.exitFullscreen || doc.webkitExitFullscreen)?.call(doc); return; }
  const req = de.requestFullscreen || de.webkitRequestFullscreen;
  if (!req) return toast(t('toast.noFullscreen'), 3500);
  Promise.resolve(req.call(de)).catch(() => toast(t('toast.fullscreenFail')));
}

export function syncFullscreen(){
  const on = !!fsEl(), b = $('#fullscreen'), label = on ? t('tb.exitFullscreen') : t('tb.fullscreen');
  b.innerHTML = icon(on ? 'exitFullscreen' : 'fullscreen') + `<span>${label}</span>`;
  b.title = label + ' (Shift+F)';
}

export function bindFullscreen(){
  $('#fullscreen').onclick = toggleFullscreen;
  ['fullscreenchange', 'webkitfullscreenchange'].forEach(ev => document.addEventListener(ev, syncFullscreen));
  // 홈 화면에서 앱처럼 열었다면 이미 전체 화면이므로 버튼을 숨긴다
  if ((navigator as Navigator & {standalone?: boolean}).standalone || matchMedia('(display-mode: standalone)').matches) $('#fullscreen').hidden = true;
}
