/* ======================= 모델하우스 투어 =======================
 * 현관에서 시작해 방마다 정해 둔 시점으로 이동하고, 그 자리에서 천천히 둘러보며 설명을 보여 준다.
 * 설명은 데이터에서 만든다: 방 이름·면적·바닥재, 그 방에서 보이는 유상옵션 */
import { $, esc } from '../core/dom';
import { state } from '../core/state';
import { plan, aptType, roomArea, roomMat, visibleRooms } from '../core/plan';
import { inPoly } from '../data/apt/builder';
import { roomName, matName, optName, fmtArea } from '../core/names';
import type { OptionId } from '../data/apt/schema';
import { t } from '../i18n';
import { icon } from './icons';
import { get3D, is3D, setView } from './mode';
import { onBus } from './bus';
import { goRoom } from './stage';

const TOUR_ORDER = ['entry', 'living', 'kitchen', 'pantry', 'master', 'dress', 'bath2', 'bed2', 'bed3', 'alpha', 'bath1', 'utility'];
const KIND_ORDER = ['entry', 'living', 'kitchen', 'master', 'dress', 'bed', 'alpha', 'bath', 'utility'];
const DWELL = 4200, FLY = 1300;
let run = 0, playing = false;

export const touring = () => playing;

function stops(): string[] {
  const vis = visibleRooms().filter(r => r.kind !== 'hall' && (!r.service || r.kind === 'utility'));
  const known = TOUR_ORDER.filter(id => vis.some(r => r.id === id));
  const rest = vis.filter(r => !TOUR_ORDER.includes(r.id)).sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind)).map(r => r.id);
  return [...known, ...rest];
}

// 그 방에서 눈에 띄는 선택 사항
function highlights(id: string): string[] {
  const p = plan(), a = aptType(), out: string[] = [], has = (o: OptionId) => a.options.includes(o) && !!state.opts[o];
  const parts = p.rooms.filter(r => r.target === id);
  if (has('ext') && parts.some(r => r.kind === 'balcony')) out.push(optName('ext'));
  if (has('sysac') && p.fixtures.some(f => f.type === 'ceilingac' && parts.some(r => inPoly([f.cx, f.cy], r.poly)))) out.push(optName('sysac'));
  if (has('builtin') && p.fixtures.some(f => (f.type === 'induction' || f.type === 'dishwasher') && parts.some(r => inPoly([f.cx, f.cy], r.poly)))) out.push(optName('builtin'));
  if (has('dress') && p.fixtures.some(f => f.type === 'dressshelf' && parts.some(r => inPoly([f.cx, f.cy], r.poly)))) out.push(optName('dress'));
  if (has('midDoor') && parts.some(r => r.kind === 'entry')) out.push(optName('midDoor'));
  if (has('merge') && p.rooms.some(r => r.target === id && r.id !== id && r.kind === 'bed')) out.push(optName('merge'));
  return out;
}

function caption(id: string, i: number, n: number){
  const hl = highlights(id);
  $('#tourCard').innerHTML = `<div class="tc-top"><span class="tc-step">${t('tour.step', {i: i + 1, n})}</span>
      <div class="tc-dots">${Array.from({length: n}, (_, k) => `<i class="${k === i ? 'on' : k < i ? 'done' : ''}"></i>`).join('')}</div></div>
    <b>${esc(roomName(id))}</b>
    <p>${fmtArea(roomArea(id), 1)} · ${t('tour.floor', {mat: matName(roomMat(id))})}</p>
    ${hl.length ? `<div class="tc-tags">${hl.map(h => `<span>${esc(h)}</span>`).join('')}</div>` : ''}
    <div class="tc-acts"><button class="btn icon" id="tourPrev" title="${t('tour.prev')}">${icon('arrowLeft')}</button>
      <button class="btn" id="tourStop">${icon('close')}${t('tour.stop')}</button>
      <button class="btn icon" id="tourNext" title="${t('tour.next')}">${icon('arrowRight')}</button></div>`;
  $('#tourCard').hidden = false;
  $('#tourStop').onclick = stopTour;
  $('#tourPrev').onclick = () => jump(i - 1);
  $('#tourNext').onclick = () => jump(i + 1);
}

const sleep = (ms: number, token: number) => new Promise<boolean>(res => setTimeout(() => res(token === run), ms));
let cur = 0;
function jump(i: number){ const list = stops(); if (i < 0 || i >= list.length) return; play(i); }

async function play(from = 0){
  const token = ++run, list = stops();
  playing = true; document.body.classList.add('touring'); syncBtn();
  for (let i = from; i < list.length; i++){
    cur = i;
    caption(list[i], i, list.length);
    goRoom(list[i]);
    if (!await sleep(FLY, token)) return;
    get3D()?.lookAround(DWELL);
    if (!await sleep(DWELL + 200, token)) return;
  }
  if (token === run){ stopTour(); goRoom(null); }
}

export async function startTour(){
  if (!is3D()) await setView('3d');
  if (!get3D()) return;
  play(0);
}
export function stopTour(){
  run++; playing = false; get3D()?.stopLook();
  document.body.classList.remove('touring');
  $('#tourCard').hidden = true; syncBtn();
}
export const toggleTour = () => (playing ? stopTour() : startTour());
function syncBtn(){ const b = document.getElementById('tourBtn'); if (b){ b.classList.toggle('on', playing); b.innerHTML = `${icon(playing ? 'close' : 'eye')}${t(playing ? 'tour.stop' : 'tour.start')}`; } }
export const currentStop = () => cur;
// 사용자가 화면을 직접 돌리면 투어를 멈춘다
onBus('tourStop', () => { if (playing) stopTour(); });
