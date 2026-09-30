// 툴바 아이콘 (Lucide, ISC 라이선스). 쓰는 아이콘만 가져와 번들에 포함한다
import {
  createElement, PanelLeft, PanelRight, Undo2, Redo2, ZoomIn, ZoomOut, Scan, Maximize, Minimize, Trash, Eraser,
  RotateCcw, RotateCw, Copy, Check, Languages, ChevronDown, MousePointer2, Ruler, Hammer, SlidersHorizontal,
} from 'lucide';

const ICONS = {
  panelLeft: PanelLeft, panelRight: PanelRight, undo: Undo2, redo: Redo2, zoomIn: ZoomIn, zoomOut: ZoomOut, fit: Scan,
  fullscreen: Maximize, exitFullscreen: Minimize, trash: Trash, eraser: Eraser, rotL: RotateCcw, rotR: RotateCw, copy: Copy,
  check: Check, lang: Languages, chevron: ChevronDown, select: MousePointer2, measure: Ruler, demolish: Hammer, props: SlidersHorizontal,
};
export type IconName = keyof typeof ICONS;

export const icon = (name: IconName) => createElement(ICONS[name], {'aria-hidden': 'true', 'stroke-width': 1.8}).outerHTML;

// data-icon="이름"이 달린 요소 맨 앞에 아이콘을 넣는다
export function mountIcons(root: ParentNode = document){
  root.querySelectorAll<HTMLElement>('[data-icon]').forEach(el => {
    el.querySelector(':scope > svg')?.remove();
    el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon as IconName));
  });
}
