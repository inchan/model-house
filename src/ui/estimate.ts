/* ======================= 하단 추가금 바 · 견적 요약 ======================= */
import { $, esc } from '../core/dom';
import { state } from '../core/state';
import { plan, aptType, estimate } from '../core/plan';
import { roomName, matName, optName, styleName, wallName, fmtArea, typeCode, typeForm, pyeong } from '../core/names';
import { planThumb } from '../plan2d/thumb';
import { t, fmtKRW, lang } from '../i18n';
import { icon } from './icons';
import { toggleSheet } from './layout';
import { exportPNG } from './io';

export function renderEstimateBar(){
  const a = aptType(), p = plan(), est = estimate();
  const chips = [...est.options.map(o => optName(o.id)), ...(est.finishes.length ? [t('est.finishes', {n: est.finishes.length})] : [])];
  $('#estimateBar').innerHTML = `
    <div class="who"><b>${typeCode(a.id)} · ${styleName(state.style)}</b><span>${typeForm(a)} · ${t('spec.exclusive', {a: fmtArea(p.exclusive)})}</span></div>
    <div class="chips">${chips.length ? chips.map(c => `<span>${esc(c)}</span>`).join('') : `<span>${t('est.none')}</span>`}</div>
    <div class="total"><small>${t('est.total')}</small><b>${fmtKRW(est.total)}</b></div>
    <button class="btn ghost" id="sideToggle">${icon('options')}${t('est.customize')}</button>
    <button class="btn primary" id="summaryBtn">${icon('receipt')}<span>${t('est.summary')}</span></button>`;
  $('#summaryBtn').onclick = openSummary;
  $('#sideToggle').onclick = () => toggleSheet();
}

const signed = (v: number) => (v > 0 ? '+' : v < 0 ? '−' : '') + fmtKRW(Math.abs(v));

export function openSummary(){
  const a = aptType(), p = plan(), est = estimate(), dlg = $('#summary');
  const date = new Date().toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', {year: 'numeric', month: 'long', day: 'numeric'});
  const optRows = est.options.length
    ? `<table>${est.options.map(o => `<tr><td>${optName(o.id)}</td><td class="r">${o.price ? fmtKRW(o.price) : t('opt.free')}</td></tr>`).join('')}</table>`
    : `<p class="note">${t('sum.noOptions')}</p>`;
  const finRows = est.finishes.length
    ? `<table>${est.finishes.map(f => `<tr><td>${esc(roomName(f.room))}<br><small class="muted">${matName(f.base)} → ${matName(f.mat)} · ${fmtArea(f.area, 1)}</small></td><td class="r">${signed(f.diff)}</td></tr>`).join('')}</table>`
    : `<p class="note">${t('sum.noFinishes')}</p>`;
  dlg.innerHTML = `<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="sumTitle">
    <header><div><h2 id="sumTitle">${t('sum.title')}</h2><p>${typeCode(a.id)} · ${typeForm(a)} · ${date}</p></div>
      <button class="btn icon" id="sumClose" title="${t('sum.close')}">${icon('close')}</button></header>
    <div class="content">
      <div class="thumb">${planThumb(p, {labels: id => esc(roomName(id)), showFurniture: state.furniture})}</div>
      <div>
        <h3>${t('sum.area')}</h3>
        <dl class="kv">
          <dt>${t('sum.exclusive')}</dt><dd>${fmtArea(p.exclusive)}</dd>
          <dt>${t('sum.supply')}</dt><dd>${fmtArea(a.supply, 1)} (${t('spec.pyeong', {p: pyeong(a.supply)})})</dd>
          <dt>${t('sum.service')}</dt><dd>${fmtArea(p.service)}</dd>
          <dt>${t('sum.usable')}</dt><dd><b>${fmtArea(p.usable)}</b></dd>
        </dl>
        <h3 style="margin-top:18px">${t('sum.style')}</h3>
        <dl class="kv"><dt>${t('style.header')}</dt><dd>${styleName(state.style)}</dd><dt>${t('wall.header')}</dt><dd>${wallName(state.wall)}</dd></dl>
      </div>
      <div><h3>${t('sum.options')}</h3>${optRows}</div>
      <div><h3>${t('sum.finishes')}</h3>${finRows}</div>
      <div class="full">
        <div class="grand"><span>${t('sum.total')}</span><b>${fmtKRW(est.total)}</b></div>
        <p class="note" style="margin-top:10px">${t('sum.note')}</p>
      </div>
    </div>
    <footer>
      <button class="btn ghost" id="sumImage">${icon('image')}${t('tb.exportPng')}</button>
      <button class="btn ghost" id="sumPrint">${icon('print')}${t('sum.print')}</button>
      <button class="btn primary" id="sumOk">${t('sum.close')}</button>
    </footer></div>`;
  dlg.hidden = false;
  const close = () => { dlg.hidden = true; };
  $('#sumClose').onclick = close; $('#sumOk').onclick = close;
  $('#sumPrint').onclick = () => window.print();
  $('#sumImage').onclick = () => { close(); exportPNG(); };
  dlg.onclick = e => { if (e.target === dlg) close(); };
  $<HTMLButtonElement>('#sumOk').focus();
}
export const summaryOpen = () => !$('#summary').hidden;
export const closeSummary = () => { $('#summary').hidden = true; };
