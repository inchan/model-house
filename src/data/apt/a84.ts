/* ============================================================
 *  84A — 4Bay 판상형 (전용 84.95㎡ · 공급 112.4㎡ · 34평형)
 *  남향으로 침실3 · 침실2 · 거실 · 안방 네 공간이 나란히, 북측에 공용욕실 · 현관 · 알파룸 · 주방 · 드레스룸 · 안방욕실.
 *  주방 뒤 다용도실(북측 발코니), 남측 발코니는 확장 옵션. 침실2·3 사이는 가변형 경량벽.
 *  특정 단지 평면이 아니라 국내 84㎡ 4Bay 판상형의 전형적 구성을 바탕으로 한 일반형.
 *
 *   x: 0   1800 2700 3600      5600   7000       9800  11300  13100
 *  y=-1400                            ┌─ 다용도실 ──┐
 *  y=0  ┌───┬────┬────┬────────┬──────┴──────────┬─────┬──────┐
 *       │욕실1│ 현관 │  알파룸  │      주방·식당      │드레스│안방욕실│
 *  1400 │   ├─ ─ ─┤        │                   │     │      │
 *  2400 ├───┘ 복도 └────────┤                   ├─ ──┴──────┤ 2500
 *  3500 ├──────┬───────────┘      거 실          │   안 방     │
 *       │침실3  │  침실2    │                   │            │
 *  6485 ├──────┼──────────┼───────────────────┼────────────┤ (확장 시 사라지는 벽)
 *  7985 └──────┴──────────┴──── 발코니 ─────────┴────────────┘
 * ============================================================ */
import type { AptType, Pt2 } from './schema';

const R = (x0: number, y0: number, x1: number, y1: number): Pt2[] => [[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
const S = 6485, B = 7985;   // 남측 발코니 경계선, 발코니 바깥선

export const A84: AptType = {
  id: 'a84', bay: 4, form: 'flat', supply: 112.4, sysacUnits: 4,
  tags: ['tag.bay4', 'tag.crossVent', 'tag.alpha', 'tag.walkin'],
  options: ['ext', 'sysac', 'midDoor', 'merge', 'builtin', 'dress'],
  price: {ext: 22_000_000, sysac: 6_400_000, midDoor: 1_600_000, merge: 0, builtin: 4_300_000, dress: 2_400_000},

  walls: [
    // 북측 외벽: 공용욕실 환기창 · 현관문(바깥여닫이) · 알파룸 창 · 주방 쪽창
    {a:[0,0], b:[7000,0], t:250, kind:'e', open:[
      {kind:'window', at:550, w:700, sill:1.5, head:2.1},
      {kind:'entry', at:2250, w:900, side:-1, hinge:'start'},
      {kind:'window', at:4200, w:900, sill:.9},
      {kind:'window', at:5950, w:800, sill:1.05}]},
    // 주방 | 다용도실: 개수대 위 창, 다용도실 문
    {a:[7000,0], b:[9800,0], t:150, kind:'n', open:[
      {kind:'window', at:7300, w:1300, sill:1.05},
      {kind:'door', at:8900, w:800, side:-1, hinge:'end'}]},
    {a:[9800,0], b:[13100,0], t:250, kind:'e', open:[
      {kind:'window', at:10100, w:800, sill:1.2},
      {kind:'window', at:11950, w:700, sill:1.5, head:2.1}]},
    // 다용도실(북측 발코니)
    {a:[7000,-1400], b:[7000,0], t:250, kind:'e'},
    {a:[7000,-1400], b:[9800,-1400], t:250, kind:'e', open:[{kind:'window', at:7300, w:2200, sill:1.0}]},
    {a:[9800,-1400], b:[9800,0], t:250, kind:'e'},
    // 서측 외벽(측벽) — 침실3 측창
    {a:[0,0], b:[0,B], t:250, kind:'e', open:[{kind:'window', at:4300, w:1200, sill:.9}]},
    // 동측: 계단실·옆 세대와 맞닿은 세대간벽
    {a:[13100,0], b:[13100,B], t:250, kind:'b'},
    // 남측 발코니 바깥 창호 (거실은 바닥 가까이 내려오는 큰 창)
    {a:[0,B], b:[13100,B], t:250, kind:'e', open:[
      {kind:'window', at:300, w:2100, sill:.5},
      {kind:'window', at:3000, w:2300, sill:.5},
      {kind:'window', at:5900, w:3600, sill:.15, head:2.25},
      {kind:'window', at:10100, w:2700, sill:.5}]},

    // 북측 칸막이
    {a:[1800,0], b:[1800,2400], t:100, kind:'n'},
    {a:[3600,0], b:[3600,2400], t:100, kind:'n'},
    {a:[0,2400], b:[1800,2400], t:100, kind:'n', open:[{kind:'door', at:700, w:750, side:-1, hinge:'start'}]},
    {a:[3600,2400], b:[5600,2400], t:100, kind:'n', open:[{kind:'door', at:3800, w:800, side:-1, hinge:'start'}]},
    // 현관 중문 (옵션): 3연동 유리 미닫이
    {a:[1800,1400], b:[3600,1400], t:80, kind:'n', when:'midDoor', open:[{kind:'slide', at:1800, w:1800, head:2.2}]},
    // 내력벽: 알파룸|주방, 침실2|거실, 거실|안방
    {a:[5600,0], b:[5600,2400], t:200, kind:'b'},
    {a:[5600,3500], b:[5600,B], t:200, kind:'b'},
    {a:[9800,0], b:[9800,B], t:200, kind:'b', open:[{kind:'door', at:2650, w:900, side:1, hinge:'start'}]},
    // 복도 | 침실3 · 침실2
    {a:[0,3500], b:[5600,3500], t:100, kind:'n', open:[
      {kind:'door', at:1600, w:800, side:1, hinge:'end'},
      {kind:'door', at:2900, w:800, side:1, hinge:'start'}]},
    // 침실2·3 가변형 경량벽 (통합 옵션을 고르면 없앤다)
    {a:[2700,3500], b:[2700,B], t:100, kind:'n', when:'!merge'},
    // 안방 | 드레스룸(문 없는 입구) · 드레스룸 | 안방욕실
    {a:[9800,2500], b:[13100,2500], t:100, kind:'n', open:[{kind:'gap', at:10450, w:800}]},
    {a:[11300,0], b:[11300,2500], t:100, kind:'n', open:[{kind:'door', at:1400, w:750, side:1, hinge:'end'}]},
    // 발코니 비확장: 방과 발코니 사이 벽 + 미닫이 창호
    {a:[0,S], b:[2700,S], t:150, kind:'n', when:'!ext', open:[{kind:'slide', at:400, w:1900}]},
    {a:[2700,S], b:[5600,S], t:150, kind:'n', when:'!ext', open:[{kind:'slide', at:3100, w:2100}]},
    {a:[5600,S], b:[9800,S], t:150, kind:'n', when:'!ext', open:[{kind:'slide', at:5900, w:3600, head:2.2}]},
    {a:[9800,S], b:[13100,S], t:150, kind:'n', when:'!ext', open:[{kind:'slide', at:10200, w:2500}]},
  ],

  rooms: [
    {id:'entry', kind:'entry', poly:R(1800,0,3600,1400), mat:'porcelain', at:[2700,850], level:-.12, view:{eye:[2400,500], look:[2700,3300]}},
    {id:'hall', kind:'hall', poly:[[1800,1400],[3600,1400],[3600,2400],[5600,2400],[5600,3500],[0,3500],[0,2400],[1800,2400]], mat:'gangmaru', at:[1100,2950], view:{eye:[400,2950], look:[5600,2950]}},
    {id:'bath1', kind:'bath', poly:R(0,0,1800,2400), mat:'bathtile', at:[900,1850], view:{eye:[1150,3150], look:[850,500]}},
    {id:'alpha', kind:'alpha', poly:R(3600,0,5600,2400), mat:'gangmaru', at:[4300,1650], view:{eye:[3900,2150], look:[5000,400]}},
    {id:'bed3', kind:'bed', poly:R(0,3500,2700,S), mat:'gangmaru', at:[1500,6100], join:{to:'bed2', when:'merge'}, view:{eye:[2300,7500], look:[500,4000]}},
    {id:'bed2', kind:'bed', poly:R(2700,3500,5600,S), mat:'gangmaru', at:[3500,6100], view:{eye:[3100,7500], look:[5100,4300]}},
    {id:'kitchen', kind:'kitchen', poly:R(5600,0,9800,3000), mat:'gangmaru', at:[9050,1650], view:{eye:[9500,2700], look:[6600,700]}},
    {id:'living', kind:'living', poly:R(5600,3000,9800,S), mat:'gangmaru', at:[7050,3750], view:{eye:[8600,7650], look:[6000,3400]}},
    {id:'master', kind:'master', poly:R(9800,2500,13100,S), mat:'gangmaru', at:[10700,6000], view:{eye:[10300,7500], look:[12600,3400]}},
    {id:'dress', kind:'dress', poly:R(9800,0,11300,2500), mat:'gangmaru', at:[10850,1250], view:{eye:[10850,2300], look:[10150,300]}},
    {id:'bath2', kind:'bath', poly:R(11300,0,13100,2500), mat:'bathtile', at:[12100,2150], view:{eye:[11600,1900], look:[12700,400]}},
    {id:'utility', kind:'utility', poly:R(7000,-1400,9800,0), mat:'bathtile', at:[8500,-350], service:true, view:{eye:[9300,-200], look:[7300,-1200]}},
    {id:'balc3', kind:'balcony', poly:R(0,S,2700,B), mat:'tile600', at:[1350,7300], service:true, join:{to:'bed3', when:'ext'}},
    {id:'balc2', kind:'balcony', poly:R(2700,S,5600,B), mat:'tile600', at:[4150,7300], service:true, join:{to:'bed2', when:'ext'}},
    {id:'balcL', kind:'balcony', poly:R(5600,S,9800,B), mat:'tile600', at:[7700,7300], service:true, join:{to:'living', when:'ext'}},
    {id:'balcM', kind:'balcony', poly:R(9800,S,13100,B), mat:'tile600', at:[11450,7300], service:true, join:{to:'master', when:'ext'}},
  ],

  dims: {x: [0, 2700, 5600, 9800, 13100], y: [-1400, 0, 2400, 3500, S, B]},
  entry: {start: [2700, -1000], look: [2700, 3300], arrow: {x: 2700, y0: -1500, y1: -300}},

  fixtures: [
    // 주방: 하부장 + 상부장, 개수대, 쿡탑(기본 가스 / 옵션 인덕션), 식기세척기 자리
    {type:'counter', key:'counter', cx:7450, cy:425, w:1700, d:600, role:'cabinet'},
    {type:'ksink', key:'sink', cx:7900, cy:425, w:800, d:450},
    {type:'stove', key:'stove', cx:6950, cy:425, w:600, d:450, when:'!builtin'},
    {type:'induction', key:'induction', cx:6950, cy:425, w:600, d:520, when:'builtin'},
    {type:'counter', key:'counter', cx:8600, cy:425, w:600, d:600, role:'cabinet', when:'!builtin'},
    {type:'dishwasher', key:'dishwasher', cx:8600, cy:425, w:600, d:600, when:'builtin'},
    {type:'fridge', key:'kimchiFridge', cx:6050, cy:1325, w:750, d:700, rot:270, when:'builtin'},
    // 현관 키큰 신발장
    {type:'entrytall', key:'entryCabinet', cx:3350, cy:730, w:1200, d:400, rot:90, role:'cabinet'},
    // 공용욕실: 욕조 · 세면대 · 양변기
    {type:'bathtub', key:'bathtub', cx:937, cy:475, w:1500, d:700},
    {type:'vanity', key:'vanity', cx:375, cy:1300, w:800, d:500, rot:270},
    {type:'toilet', key:'toilet', cx:1400, cy:1400, w:400, d:700, rot:90},
    // 안방욕실: 샤워부스 · 세면대 · 양변기
    {type:'shower', key:'shower', cx:12525, cy:575, w:900, d:900},
    {type:'vanity', key:'vanity', cx:11600, cy:650, w:800, d:500, rot:270},
    {type:'toilet', key:'toilet', cx:12625, cy:1650, w:400, d:700, rot:90},
    // 드레스룸 시스템 가구 (옵션)
    {type:'dressshelf', key:'dressShelf', cx:10200, cy:1250, w:2200, d:600, rot:270, when:'dress'},
    // 다용도실 에어컨 실외기
    {type:'acunit', key:'acUnit', cx:9250, cy:-1050, w:800, d:300},
    // 시스템에어컨 천장형 (옵션)
    {type:'ceilingac', key:'ceilingAc', cx:7700, cy:4700, w:840, d:840, when:'sysac'},
    {type:'ceilingac', key:'ceilingAc', cx:11400, cy:4300, w:840, d:840, when:'sysac'},
    {type:'ceilingac', key:'ceilingAc', cx:4150, cy:4900, w:840, d:840, when:'sysac'},
    {type:'ceilingac', key:'ceilingAc', cx:1350, cy:4900, w:840, d:840, when:'sysac'},
  ],

  furniture: [
    // 거실: 아트월 쪽 거실장, 맞은편 4인 소파
    {type:'rug', key:'rug', cx:8000, cy:4900, w:2400, d:1800, rot:90, role:'rug'},
    {type:'tvstand', key:'tvStand', cx:5900, cy:4900, w:2400, d:400, rot:270, role:'wood'},
    {type:'sofa', key:'sofa4', cx:9220, cy:4900, w:2800, d:950, rot:90, role:'sofa'},
    {type:'coffeetable', key:'coffeeTable', cx:8050, cy:4900, w:1200, d:600, rot:90, role:'wood'},
    {type:'floorlamp', key:'floorLamp', cx:6000, cy:6950, w:450, d:450, role:'metal'},
    {type:'plant', key:'plantLarge', cx:9320, cy:7500, w:700, d:700},
    {type:'plant', key:'plant', cx:6050, cy:7550, w:500, d:500},
    // 주방·식당
    {type:'fridge', key:'fridgeSxS', cx:6150, cy:475, w:900, d:700},
    {type:'table', key:'diningTable', cx:7500, cy:2250, w:1600, d:900, role:'wood'},
    {type:'chair', key:'diningChair', cx:7100, cy:1555, w:450, d:480, role:'chair'},
    {type:'chair', key:'diningChair', cx:7900, cy:1555, w:450, d:480, role:'chair'},
    {type:'chair', key:'diningChair', cx:7100, cy:2945, w:450, d:480, rot:180, role:'chair'},
    {type:'chair', key:'diningChair', cx:7900, cy:2945, w:450, d:480, rot:180, role:'chair'},
    // 안방: 옆벽 헤드보드 킹 침대
    {type:'bed', key:'bedK', cx:11975, cy:4300, w:1600, d:2000, rot:90, role:'bed'},
    {type:'nightstand', key:'nightstand', cx:12775, cy:3275, w:450, d:400, rot:90, role:'wood'},
    {type:'nightstand', key:'nightstand', cx:12775, cy:5325, w:450, d:400, rot:90, role:'wood'},
    {type:'dresser', key:'dresser', cx:10125, cy:5600, w:1000, d:450, rot:270, role:'wood'},
    {type:'armchair', key:'readingChair', cx:11600, cy:7300, w:750, d:800, role:'accent'},
    {type:'plant', key:'plant', cx:12700, cy:7550, w:500, d:500},
    // 침실2: 퀸 침대 + 붙박이장
    {type:'bed', key:'bed15', cx:4500, cy:5000, w:1500, d:2000, rot:90, role:'bedAlt'},
    {type:'wardrobe', key:'wardrobe', cx:4600, cy:3850, w:1700, d:600, role:'cabinet'},
    {type:'nightstand', key:'nightstand', cx:5275, cy:5975, w:450, d:400, rot:90, role:'wood'},
    // 침실3: 자녀방
    {type:'bed', key:'bedSS', cx:675, cy:4550, w:1100, d:2000, role:'bedAlt'},
    {type:'desk', key:'desk', cx:2350, cy:5500, w:1200, d:600, rot:90, role:'wood'},
    {type:'chair', key:'chair', cx:1800, cy:5500, w:450, d:480, rot:270, role:'chair'},
    {type:'bookshelf', key:'bookshelf', cx:275, cy:6000, w:800, d:300, rot:270, role:'wood'},
    // 알파룸: 서재
    {type:'desk', key:'desk', cx:4600, cy:425, w:1200, d:600, role:'wood'},
    {type:'officechair', key:'officeChair', cx:4600, cy:1050, w:620, d:620, rot:180},
    {type:'bookshelf', key:'bookshelfLarge', cx:5350, cy:1300, w:1600, d:300, rot:90, role:'wood'},
    // 다용도실: 워시타워
    {type:'washtower', key:'washTower', cx:7500, cy:-900, w:700, d:750},
  ],
};
