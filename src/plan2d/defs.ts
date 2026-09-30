/* ======================= 바닥재 2D 무늬 ======================= */
import { $ } from '../core/dom';

// 마루: 널판 폭 180mm, 길이 1200 / 600mm로 엇갈려 깔기
const plank = (id: string, base: string, line: string) => `<pattern id="m-${id}" patternUnits="userSpaceOnUse" width="1800" height="360">
    <rect width="1800" height="360" fill="${base}"/>
    <path d="M0 0H1800M0 180H1800M1200 0V180M600 180V360" stroke="${line}" stroke-width="10"/>
    <path d="M100 70Q500 60 900 85T1700 75M200 260Q700 250 1100 275T1750 262" stroke="${line}" stroke-width="5" fill="none" opacity=".45"/></pattern>`;
const tile = (id: string, w: number, h: number, base: string, line: string) => `<pattern id="m-${id}" patternUnits="userSpaceOnUse" width="${w}" height="${h}">
    <rect width="${w}" height="${h}" fill="${base}"/><path d="M0 0H${w}M0 0V${h}" stroke="${line}" stroke-width="10"/></pattern>`;

export function buildDefs(){
  $('#defs').innerHTML =
    plank('gangmaru', '#dcc09a', '#bf9d70') + plank('ganghwa', '#cfc5b5', '#ada292') + plank('wonmok', '#a57c56', '#80593a') +
    plank('jangpan', '#e6d2ac', '#cfb98f') +
    tile('porcelain', 1200, 600, '#ece9e3', '#d6d0c5') + tile('tile600', 600, 600, '#e2e6e3', '#c4cbc6') + tile('bathtile', 300, 300, '#d6dbd7', '#b3bab4') +
    `<pattern id="m-marble" patternUnits="userSpaceOnUse" width="1200" height="1200">
      <rect width="1200" height="1200" fill="#f3f0ea"/><path d="M0 0H1200M0 0V1200" stroke="#dcd5c8" stroke-width="10"/>
      <path d="M-50 300C250 260 380 520 700 470S1100 640 1260 600M200 1200C300 950 520 980 640 820" stroke="#d6cfc2" stroke-width="12" fill="none"/></pattern>
    <pattern id="grid" patternUnits="userSpaceOnUse" width="1000" height="1000">
      <path d="M500 0V1000M0 500H1000" stroke="#e5dfd3" stroke-width="8"/><path d="M0 0V1000M0 0H1000" stroke="#d8d0c1" stroke-width="14"/></pattern>`;
}
