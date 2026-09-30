/* ============================================================
 *  아파트 타입 정의 스키마
 *  - 모든 좌표는 mm, 벽 "중심선" 기준 (한국 전용면적 산정 기준과 같다)
 *  - 원점 = 왼쪽 위, x는 동쪽(→), y는 남쪽(↓). 남향 발코니가 아래쪽
 *  - 벽은 수평 또는 수직 선분만 쓴다 (한국 아파트 평면은 거의 직교)
 * ============================================================ */
import type { MatKey } from '../materials';
import type { FurnType } from '../library';

export type Pt2 = [number, number];
export type Rect = [number, number, number, number];
export type TypeId = 'a59' | 'a84' | 'b84';
// b = 내력벽·세대간벽(콘크리트) · e = 외벽 · n = 비내력 경량벽 · low = 낮은 벽
export type WallKind = 'b' | 'e' | 'n' | 'low';

export type OptionId = 'ext' | 'sysac' | 'midDoor' | 'merge' | 'builtin' | 'dress';
// 옵션 조건: 'ext' = 발코니 확장을 선택했을 때만, '!ext' = 선택하지 않았을 때만
export type Cond = OptionId | `!${OptionId}`;

export type RoomKind = 'living' | 'kitchen' | 'master' | 'bed' | 'bath' | 'entry' | 'hall' | 'dress' | 'alpha' | 'utility' | 'balcony';

export interface OpeningSpec {
  // door 여닫이문 · entry 현관문 · window 창 · slide 미닫이(유리)문 · gap 문 없는 개구부
  kind: 'door' | 'entry' | 'window' | 'slide' | 'gap';
  at: number;          // 벽 방향 절대 좌표(수평 벽이면 x, 수직 벽이면 y)의 시작점
  w: number;           // 폭
  side?: 1 | -1;       // 문이 열리는 쪽: 수평 벽은 +1 = 남쪽(+y), 수직 벽은 +1 = 동쪽(+x)
  hinge?: 'start' | 'end';   // 경첩 위치: 개구부의 작은 좌표 쪽 / 큰 좌표 쪽
  sill?: number;       // 창대 높이(m)
  head?: number;       // 창·문 윗높이(m)
  when?: Cond;
}

export interface WallSpec { a: Pt2; b: Pt2; t: number; kind: WallKind; open?: OpeningSpec[]; when?: Cond }

export interface RoomSpec {
  id: string;                          // 이름 사전 키 room.<id>
  kind: RoomKind;
  poly: Pt2[];                         // 중심선 다각형 (시계 방향 권장)
  mat: MatKey;                         // 기본 바닥재 (기본 사양)
  at: Pt2;                             // 이름 표시 위치
  service?: boolean;                   // 서비스 면적(발코니·다용도실) — 전용면적에서 제외
  join?: {to: string; when: Cond};     // 조건이 맞으면 이 공간을 다른 방에 합친다 (발코니 확장, 침실 통합)
  level?: number;                      // 바닥 높이(m), 현관은 한 단 낮다
  view?: {eye: Pt2; look: Pt2};        // 방 시점 (눈높이 카메라)
}

// 붙박이 설비·가구 (사용자가 옮기지 않는 것): 주방 가구, 욕실 도기, 신발장, 옵션 품목
export interface FixtureSpec { type: FurnType; key: string; cx: number; cy: number; w: number; d: number; rot?: number; when?: Cond; role?: ColorRole }

// 스타일에 따라 색이 바뀌는 역할
export type ColorRole = 'sofa' | 'bed' | 'bedAlt' | 'wood' | 'woodDark' | 'rug' | 'accent' | 'chair' | 'cabinet' | 'metal';

// 기본 연출 가구 (사용자가 옮기고 지울 수 있음)
export interface FurnSpec { type: FurnType; key: string; cx: number; cy: number; w: number; d: number; rot?: number; role?: ColorRole }

export interface AptType {
  id: TypeId;
  bay: 3 | 4;
  form: 'flat' | 'tower';
  supply: number;                      // 공급면적(㎡, 참고값) — 전용 + 주거공용
  rooms: RoomSpec[];
  walls: WallSpec[];
  dims: {x: number[]; y: number[]};    // 치수선 기준 좌표 (위쪽·왼쪽 치수 체인)
  entry: {start: Pt2; look: Pt2; arrow: {x: number; y0: number; y1: number}};
  fixtures: FixtureSpec[];
  furniture: FurnSpec[];
  options: OptionId[];                 // 이 타입에서 고를 수 있는 옵션
  price: Partial<Record<OptionId, number>>;   // 옵션 추가금(원, 참고 예시)
  sysacUnits?: number;                 // 시스템에어컨 대수
  tags: string[];                      // 특징 태그 사전 키 (tag.*)
}
