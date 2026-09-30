/* ============================================================
 *  59A — 3Bay 판상형 (전용 59.85㎡ · 공급 80.9㎡ · 24평형)
 *  남향으로 침실2 · 거실 · 안방 세 공간이 나란히, 북측에 침실3 · 주방 · 현관 · 공용욕실 · 안방욕실.
 *  주방은 거실 바로 뒤에 붙은 LDK 일체형, 주방 뒤 다용도실(북측 발코니), 남측 발코니는 확장 옵션.
 *  현관 → 복도 → 안방·욕실, 거실 서쪽 통로로 침실2·3에 들어가는 소형 평면의 전형적 동선.
 *  특정 단지 평면이 아니라 국내 59㎡ 3Bay 판상형의 일반적인 구성을 바탕으로 한 일반형.
 *
 *   x: 0      2700 3400      6100   7500      9500
 *  y=-1300          ┌─ 다용도실 ─┐
 *  y=0  ┌──────┬────┴──────────┬──────┬────────┐
 *       │ 침실3 │    주방·식당     │ 현관  │ 공용욕실 │
 *  1100 │      │               ├─ ─ ─ ┤        │
 *  2000 │      │               │      ├────────┤
 *  2600 ├── ───┘  (LDK 열림)     ┤ 복도  │ 안방욕실 │
 *  3500 ├── ───┬──────────────┴── ───┴──── ───┤
 *       │ 침실2 │      거 실      │     안 방     │
 *  6300 ├──────┼───────────────┼──────────────┤ (확장 시 사라지는 벽)
 *  7700 └──────┴──── 발코니 ─────┴──────────────┘
 * ============================================================ */
import type { AptType, Pt2 } from './schema';

const R = (x0: number, y0: number, x1: number, y1: number): Pt2[] => [[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
const S = 6300, B = 7700;   // 남측 발코니 경계선, 발코니 바깥선

export const A59: AptType = {
  id: 'a59', bay: 3, form: 'flat', supply: 80.9, sysacUnits: 3,
  tags: ['tag.bay3', 'tag.crossVent', 'tag.compact'],
  options: ['ext', 'sysac', 'midDoor', 'builtin'],
  price: {ext: 13_000_000, sysac: 4_800_000, midDoor: 1_400_000, builtin: 3_900_000},

  walls: [
    // 북측 외벽: 침실3 창
    {a:[0,0], b:[3400,0], t:250, kind:'e', open:[{kind:'window', at:600, w:1400, sill:.9}]},
    // 주방 | 다용도실: 개수대 위 창, 다용도실 문
    {a:[3400,0], b:[6100,0], t:150, kind:'n', open:[
      {kind:'window', at:3600, w:1400, sill:1.05},
      {kind:'door', at:5250, w:750, side:-1, hinge:'end'}]},
    // 북측 외벽: 현관문(바깥여닫이) · 공용욕실 환기창
    {a:[6100,0], b:[9500,0], t:250, kind:'e', open:[
      {kind:'entry', at:6250, w:900, side:-1, hinge:'start'},
      {kind:'window', at:8300, w:600, sill:1.5, head:2.1}]},
    // 다용도실(북측 발코니)
    {a:[3400,-1300], b:[3400,0], t:250, kind:'e'},
    {a:[3400,-1300], b:[6100,-1300], t:250, kind:'e', open:[{kind:'window', at:3700, w:2100, sill:1.0}]},
    {a:[6100,-1300], b:[6100,0], t:250, kind:'e'},
    // 서측 외벽(측벽), 동측 세대간벽
    {a:[0,0], b:[0,B], t:250, kind:'e'},
    {a:[9500,0], b:[9500,B], t:250, kind:'b'},
    // 남측 발코니 바깥 창호 (거실은 바닥 가까이 내려오는 큰 창)
    {a:[0,B], b:[9500,B], t:250, kind:'e', open:[
      {kind:'window', at:250, w:2200, sill:.5},
      {kind:'window', at:2950, w:2900, sill:.15, head:2.25},
      {kind:'window', at:6350, w:2900, sill:.5}]},

    // 내력벽: 침실3|주방, 침실2|거실, 주방|현관·복도, 거실|안방
    {a:[2700,0], b:[2700,2600], t:200, kind:'b'},
    {a:[2700,3500], b:[2700,B], t:200, kind:'b'},
    {a:[6100,0], b:[6100,2600], t:200, kind:'b'},
    {a:[6100,3500], b:[6100,B], t:200, kind:'b'},
    // 거실 서쪽 통로 | 침실3 · 침실2
    {a:[0,2600], b:[2700,2600], t:100, kind:'n', open:[{kind:'door', at:1700, w:800, side:-1, hinge:'end'}]},
    {a:[0,3500], b:[2700,3500], t:100, kind:'n', open:[{kind:'door', at:1700, w:800, side:1, hinge:'end'}]},
    // 현관 중문 (옵션): 3연동 유리 미닫이
    {a:[6100,1100], b:[7500,1100], t:80, kind:'n', when:'midDoor', open:[{kind:'slide', at:6100, w:1400, head:2.2}]},
    // 현관·복도 | 욕실, 공용욕실 | 안방욕실
    {a:[7500,0], b:[7500,3500], t:100, kind:'n', open:[{kind:'door', at:1150, w:750, side:1, hinge:'start'}]},
    {a:[7500,2000], b:[9500,2000], t:100, kind:'n'},
    // 복도·안방욕실 | 안방: 안방 문, 안방욕실 문
    {a:[6100,3500], b:[9500,3500], t:100, kind:'n', open:[
      {kind:'door', at:6250, w:800, side:1, hinge:'start'},
      {kind:'door', at:8550, w:700, side:-1, hinge:'start'}]},
    // 발코니 비확장: 방과 발코니 사이 벽 + 미닫이 창호
    {a:[0,S], b:[2700,S], t:150, kind:'n', when:'!ext', open:[{kind:'slide', at:350, w:2000}]},
    {a:[2700,S], b:[6100,S], t:150, kind:'n', when:'!ext', open:[{kind:'slide', at:3000, w:2800, head:2.2}]},
    {a:[6100,S], b:[9500,S], t:150, kind:'n', when:'!ext', open:[{kind:'slide', at:6450, w:2700}]},
  ],

  rooms: [
    {id:'bed3', kind:'bed', poly:R(0,0,2700,2600), mat:'gangmaru', at:[1500,1700], view:{eye:[2200,2300], look:[500,500]}},
    {id:'kitchen', kind:'kitchen', poly:R(2700,0,6100,2600), mat:'gangmaru', at:[5000,1700], view:{eye:[5950,3150], look:[3000,700]}},
    {id:'entry', kind:'entry', poly:R(6100,0,7500,1100), mat:'porcelain', at:[6700,700], level:-.12, view:{eye:[6700,400], look:[6600,3400]}},
    {id:'hall', kind:'hall', poly:R(6100,1100,7500,3500), mat:'gangmaru', at:[6800,2300], view:{eye:[7000,1400], look:[4000,3100]}},
    {id:'bath1', kind:'bath', poly:R(7500,0,9500,2000), mat:'bathtile', at:[8200,1300], view:{eye:[7900,1700], look:[9000,500]}},
    {id:'bath2', kind:'bath', poly:R(7500,2000,9500,3500), mat:'bathtile', at:[8500,3100], view:{eye:[8900,3300], look:[7900,2300]}},
    {id:'bed2', kind:'bed', poly:R(0,3500,2700,S), mat:'gangmaru', at:[1500,6050], view:{eye:[2250,6550], look:[500,4200]}},
    {id:'living', kind:'living', poly:[[0,2600],[6100,2600],[6100,S],[2700,S],[2700,3500],[0,3500]], mat:'gangmaru', at:[5200,3700], view:{eye:[4900,7400], look:[3000,2900]}},
    {id:'master', kind:'master', poly:R(6100,3500,9500,S), mat:'gangmaru', at:[8000,6000], view:{eye:[7950,7250], look:[9000,4000]}},
    {id:'utility', kind:'utility', poly:R(3400,-1300,6100,0), mat:'bathtile', at:[5000,-500], service:true, view:{eye:[5800,-300], look:[3700,-1000]}},
    {id:'balc2', kind:'balcony', poly:R(0,S,2700,B), mat:'tile600', at:[1350,7000], service:true, join:{to:'bed2', when:'ext'}},
    {id:'balcL', kind:'balcony', poly:R(2700,S,6100,B), mat:'tile600', at:[4400,7000], service:true, join:{to:'living', when:'ext'}},
    {id:'balcM', kind:'balcony', poly:R(6100,S,9500,B), mat:'tile600', at:[7800,7000], service:true, join:{to:'master', when:'ext'}},
  ],

  dims: {x: [0, 2700, 6100, 9500], y: [-1300, 0, 2600, 3500, S, B]},
  entry: {start: [6700, -1000], look: [6600, 3400], arrow: {x: 6700, y0: -1500, y1: -300}},

  fixtures: [
    // 주방: 하부장 + 상부장, 개수대, 쿡탑(기본 가스 / 옵션 인덕션), 식기세척기 자리, 김치냉장고
    {type:'counter', key:'counter', cx:3700, cy:425, w:1800, d:600, role:'cabinet'},
    {type:'ksink', key:'sink', cx:4000, cy:425, w:800, d:450},
    {type:'stove', key:'stove', cx:3150, cy:425, w:600, d:450, when:'!builtin'},
    {type:'induction', key:'induction', cx:3150, cy:425, w:600, d:520, when:'builtin'},
    {type:'counter', key:'counter', cx:4900, cy:425, w:600, d:600, role:'cabinet', when:'!builtin'},
    {type:'dishwasher', key:'dishwasher', cx:4900, cy:425, w:600, d:600, when:'builtin'},
    {type:'fridge', key:'kimchiFridge', cx:5650, cy:2150, w:750, d:700, rot:90, when:'builtin'},
    // 현관 키큰 신발장
    {type:'entrytall', key:'entryCabinet', cx:7275, cy:600, w:900, d:350, rot:90, role:'cabinet'},
    // 공용욕실: 욕조 · 세면대 · 양변기
    {type:'bathtub', key:'bathtub', cx:8460, cy:475, w:1500, d:700},
    {type:'vanity', key:'vanity', cx:9125, cy:1150, w:600, d:500, rot:90},
    {type:'toilet', key:'toilet', cx:9025, cy:1700, w:400, d:700, rot:90},
    // 안방욕실: 샤워부스 · 양변기 · 세면대
    {type:'shower', key:'shower', cx:7950, cy:2450, w:800, d:800},
    {type:'toilet', key:'toilet', cx:9025, cy:2400, w:400, d:700, rot:90},
    {type:'vanity', key:'vanity', cx:7800, cy:3150, w:600, d:500, rot:270},
    // 다용도실 에어컨 실외기
    {type:'acunit', key:'acUnit', cx:5550, cy:-1000, w:800, d:300},
    // 시스템에어컨 천장형 (옵션, 3대)
    {type:'ceilingac', key:'ceilingAc', cx:4400, cy:4700, w:840, d:840, when:'sysac'},
    {type:'ceilingac', key:'ceilingAc', cx:8000, cy:4900, w:840, d:840, when:'sysac'},
    {type:'ceilingac', key:'ceilingAc', cx:1350, cy:5000, w:840, d:840, when:'sysac'},
  ],

  furniture: [
    // 거실: 서쪽 아트월 거실장, 맞은편 3인 소파
    {type:'rug', key:'rug', cx:4250, cy:4900, w:2200, d:1600, rot:90, role:'rug'},
    {type:'tvstand', key:'tvStand', cx:3000, cy:4900, w:2000, d:400, rot:270, role:'wood'},
    {type:'sofa', key:'sofa3', cx:5550, cy:4900, w:2400, d:900, rot:90, role:'sofa'},
    {type:'coffeetable', key:'coffeeTable', cx:4300, cy:4900, w:1100, d:550, rot:90, role:'wood'},
    {type:'plant', key:'plant', cx:3100, cy:7200, w:500, d:500},
    {type:'plant', key:'plantLarge', cx:5600, cy:7200, w:700, d:700},
    // 주방·식당: 냉장고장, 4인 식탁
    {type:'fridge', key:'fridgeSxS', cx:5650, cy:1250, w:900, d:700, rot:90},
    {type:'table', key:'diningTable', cx:4000, cy:2750, w:1400, d:800, role:'wood'},
    {type:'chair', key:'diningChair', cx:3650, cy:2100, w:450, d:480, role:'chair'},
    {type:'chair', key:'diningChair', cx:4350, cy:2100, w:450, d:480, role:'chair'},
    {type:'chair', key:'diningChair', cx:3650, cy:3400, w:450, d:480, rot:180, role:'chair'},
    {type:'chair', key:'diningChair', cx:4350, cy:3400, w:450, d:480, rot:180, role:'chair'},
    // 안방: 옆벽 헤드보드 퀸 침대 + 붙박이장
    {type:'bed', key:'bed15', cx:8375, cy:4900, w:1500, d:2000, rot:90, role:'bed'},
    {type:'nightstand', key:'nightstand', cx:9175, cy:5875, w:450, d:400, rot:90, role:'wood'},
    {type:'wardrobe', key:'wardrobe', cx:6475, cy:5300, w:1800, d:550, rot:270, role:'cabinet'},
    {type:'armchair', key:'readingChair', cx:7100, cy:7000, w:750, d:800, role:'accent'},
    // 침실2: 슈퍼싱글 + 옷장, 확장 공간에 책상
    {type:'bed', key:'bedSS', cx:1125, cy:5250, w:1100, d:2000, rot:270, role:'bedAlt'},
    {type:'wardrobe', key:'wardrobeS', cx:800, cy:3825, w:1200, d:550, role:'cabinet'},
    {type:'desk', key:'desk', cx:1400, cy:7250, w:1200, d:600, rot:180, role:'wood'},
    {type:'chair', key:'chair', cx:1400, cy:6700, w:450, d:480, role:'chair'},
    // 침실3: 자녀방
    {type:'bed', key:'bedSS', cx:675, cy:1125, w:1100, d:2000, role:'bedAlt'},
    {type:'desk', key:'desk', cx:2300, cy:800, w:1200, d:600, rot:90, role:'wood'},
    {type:'chair', key:'chair', cx:1750, cy:800, w:450, d:480, rot:270, role:'chair'},
    // 다용도실: 워시타워
    {type:'washtower', key:'washTower', cx:3900, cy:-800, w:700, d:750},
  ],
};
