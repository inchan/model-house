import { $ } from '../core/dom';

let timer = 0;
export function toast(msg: string, ms = 1800){
  const el = $('#toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(timer); timer = window.setTimeout(() => el.classList.remove('show'), ms);
}
