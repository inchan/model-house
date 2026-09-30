// 아이콘 (Lucide, ISC 라이선스). 쓰는 아이콘만 가져와 번들에 포함한다
import {
  createElement, Undo2, Redo2, ZoomIn, ZoomOut, Scan, Maximize, Minimize, Trash, Eraser, RotateCcw, RotateCw, Copy, Check,
  Languages, ChevronDown, ChevronRight, MousePointer2, Ruler, SlidersHorizontal, Box, Map, Footprints, Ellipsis, X, Sparkles,
  Sofa, Palette, Layers, Sun, Moon, Grid3x3, Receipt, Download, Upload, Image, Printer, Wind, Scissors, ArrowRight, Info,
  RefreshCw, Plus, Minus, House, Cuboid, PaintBucket, Eye, PencilRuler, BrickWall, DoorOpen, AppWindow, Columns2, RectangleHorizontal, Move, Tag, ArrowLeft,
} from 'lucide';

const ICONS = {
  undo: Undo2, redo: Redo2, zoomIn: ZoomIn, zoomOut: ZoomOut, fit: Scan, fullscreen: Maximize, exitFullscreen: Minimize,
  trash: Trash, eraser: Eraser, rotL: RotateCcw, rotR: RotateCw, copy: Copy, check: Check, lang: Languages,
  chevron: ChevronDown, chevronRight: ChevronRight, select: MousePointer2, measure: Ruler, options: SlidersHorizontal,
  view3d: Box, plan2d: Map, walk: Footprints, more: Ellipsis, close: X, style: Sparkles, furniture: Sofa, palette: Palette,
  layers: Layers, sun: Sun, moon: Moon, grid: Grid3x3, receipt: Receipt, download: Download, upload: Upload, image: Image,
  print: Printer, ac: Wind, cut: Scissors, arrowRight: ArrowRight, info: Info, reset: RefreshCw, plus: Plus, minus: Minus,
  home: House, cube: Cuboid, paint: PaintBucket, eye: Eye, edit: PencilRuler, wall: BrickWall, door: DoorOpen, window: AppWindow,
  slide: Columns2, gap: RectangleHorizontal, move: Move, tag: Tag, arrowLeft: ArrowLeft,
};
export type IconName = keyof typeof ICONS;

export const icon = (name: IconName, size?: number) =>
  createElement(ICONS[name], {'aria-hidden': 'true', 'stroke-width': 1.8, ...(size ? {width: size, height: size} : {})}).outerHTML;

// data-icon="이름"이 달린 요소 맨 앞에 아이콘을 넣는다
export function mountIcons(root: ParentNode = document){
  root.querySelectorAll<HTMLElement>('[data-icon]').forEach(el => {
    el.querySelector(':scope > svg')?.remove();
    el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon as IconName));
  });
}
