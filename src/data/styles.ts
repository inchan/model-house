/* ======================= 인테리어 스타일 패키지 · 벽지 =======================
 * 모델하우스의 "인테리어 스타일 선택"처럼 바닥재·벽지·가구 색을 한 번에 바꾼다 */
import type { MatKey } from './materials';
import type { ColorRole, RoomKind } from './apt/schema';

export type StyleId = 'natural' | 'modern' | 'hotel';
export type WallpaperId = 'white' | 'ivory' | 'greige' | 'lightgray' | 'sage' | 'dustyblue';

export const WALLPAPERS: Record<WallpaperId, string> = {
  white: '#f6f5f1', ivory: '#f1eadc', greige: '#dcd2c4', lightgray: '#e2e3e0', sage: '#d6ddcd', dustyblue: '#d3dbe3',
};
export const WALLPAPER_IDS = Object.keys(WALLPAPERS) as WallpaperId[];
export const isWallpaperId = (v: unknown): v is WallpaperId => typeof v === 'string' && v in WALLPAPERS;

export interface StyleDef {
  wall: WallpaperId;
  floors: Partial<Record<RoomKind, MatKey>>;     // 공간 종류별 바닥재 (없으면 분양 기본 사양)
  colors: Record<ColorRole, string>;             // 가구·붙박이 색
  swatch: [string, string, string];              // 선택 카드에 보여 줄 대표 색
}

export const STYLES: Record<StyleId, StyleDef> = {
  // 내추럴 우드: 밝은 오크 강마루, 아이보리 벽, 베이지·세이지 패브릭
  natural: {
    wall: 'ivory',
    floors: {living: 'gangmaru', kitchen: 'gangmaru', hall: 'gangmaru', master: 'gangmaru', bed: 'gangmaru', alpha: 'gangmaru', dress: 'gangmaru', entry: 'porcelain'},
    colors: {sofa: '#cbbfa9', bed: '#e7dfd1', bedAlt: '#d5dfcf', wood: '#c69c6d', woodDark: '#8d6b4a', rug: '#dccdb6', accent: '#7f9a7a', chair: '#b08a62', cabinet: '#eee7da', metal: '#3d3a34'},
    swatch: ['#d6b58a', '#f1eadc', '#7f9a7a'],
  },
  // 모던 화이트: 포세린 타일 거실, 밝은 회색 강화마루, 흰 벽, 무채색 가구
  modern: {
    wall: 'white',
    floors: {living: 'porcelain', kitchen: 'porcelain', hall: 'porcelain', master: 'ganghwa', bed: 'ganghwa', alpha: 'ganghwa', dress: 'ganghwa', entry: 'porcelain'},
    colors: {sofa: '#a4a8ac', bed: '#eef0f2', bedAlt: '#dde2e8', wood: '#ebe8e2', woodDark: '#3a3b3d', rug: '#d3d5d6', accent: '#2f3a45', chair: '#2f3032', cabinet: '#f5f5f3', metal: '#1f2022'},
    swatch: ['#ebe8e2', '#f6f5f1', '#2f3a45'],
  },
  // 호텔 그레이지: 월넛 원목마루, 그레이지 벽, 짙은 가죽·딥그린 포인트, 황동
  hotel: {
    wall: 'greige',
    floors: {living: 'wonmok', kitchen: 'wonmok', hall: 'wonmok', master: 'wonmok', bed: 'wonmok', alpha: 'wonmok', dress: 'wonmok', entry: 'marble'},
    colors: {sofa: '#5d5249', bed: '#f3f0ea', bedAlt: '#cfc6ba', wood: '#6f4d35', woodDark: '#3b2a20', rug: '#8e8174', accent: '#2c4a41', chair: '#4a3b30', cabinet: '#403c38', metal: '#b69c6a'},
    swatch: ['#9a6f4b', '#dcd2c4', '#2c4a41'],
  },
};
export const STYLE_IDS = Object.keys(STYLES) as StyleId[];
export const isStyleId = (v: unknown): v is StyleId => typeof v === 'string' && v in STYLES;
