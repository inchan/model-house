/* 화면 요소끼리 주고받는 알림 (3D 엔진 → 미니맵·툴바). 모듈 사이 순환 참조를 피하려고 따로 둔다 */
export interface BusEvents {
  camera: {x: number; y: number; dx: number; dy: number};   // 카메라 위치·시선 방향 (도면 mm 기준)
  roomView: string | null;                                   // 방 시점으로 들어갔을 때 방 id, 전체 보기면 null
  mode3d: 'orbit' | 'walk';                                  // 3D 쪽에서 모드가 바뀜 (걸어보기 끝내기 버튼 등)
}
type Fn<K extends keyof BusEvents> = (v: BusEvents[K]) => void;
const subs: {[K in keyof BusEvents]: Fn<K>[]} = {camera: [], roomView: [], mode3d: []};
export const onBus = <K extends keyof BusEvents>(k: K, fn: Fn<K>) => { subs[k].push(fn); };
export const emitBus = <K extends keyof BusEvents>(k: K, v: BusEvents[K]) => { subs[k].forEach(fn => fn(v)); };
