/* ============================================================
 *  84B — 타워형 (전용 84.80㎡ · 공급 113.2㎡ · 34평형)
 *  남동쪽 모서리 거실이 남·동 두 면으로 트인 2면 개방 조망형. 거실과 침실 영역을 복도로 분리해 사생활을 지킨다.
 *  북서 모서리 침실3(북·서 창), 서측 침실2, 남서쪽 안방은 전실을 지나 들어가며 드레스룸·안방욕실을 품는다.
 *  주방은 북측, 팬트리와 다용도실을 붙였고, 남측·동측 발코니는 확장 옵션(확장 시 ㄱ자 코너 거실).
 *  특정 단지 평면이 아니라 국내 84㎡ 타워형의 일반적인 구성을 바탕으로 한 일반형.
 *
 *   x: 0     2500 3200 3900 4800 5000 6300          9300  10600    12000
 *  y=-1300                              ┌─ 다용도실 ─┐
 *  y=0  ┌─────────┬────────┬──────┬────┴───────────┬──────┐
 *       │  침실3   │ 공용욕실 │ 현관  │    주방·식당     │ 팬트리 │
 *  1500 │ (북·서창) │        ├─ ─ ─ ┤                ├──────┤ 1600
 *  2400 │         ├────────┘      │                │      │
 *  2800 ├─── ─────┘   복  도        │ (열림)          │      │
 *  3500 │                          ├────────────────┴──────┼──────┐
 *  3800 ├─── ──┬──────┬─── ─┬──────┤                       │ 동측  │
 *       │ 침실2 │드레스 │ 전실 │안방욕실 │       거  실           │ 발코니 │
 *  5500 │ (서창) ├── ───┘     └── ───┤    (남·동 2면 개방)       │      │
 *       │      │      안  방        │                       │      │
 *  8000 ├──────┼───────────────────┼───────────────────────┤      │ (확장 시 사라지는 벽)
 *  9400        └───── 발코니 ────────┴────── 발코니 ───────────┴──────┘
 * ============================================================ */
import type { AptType, Pt2 } from './schema';

const R = (x0: number, y0: number, x1: number, y1: number): Pt2[] => [[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
const S = 8000, B = 9400, E = 10600, EB = 12000;   // 남측 발코니 경계선·바깥선, 동측 발코니 경계선·바깥선

export const B84: AptType = {
  id: 'b84', bay: 3, form: 'tower', supply: 113.2, sysacUnits: 4,
  tags: ['tag.tower', 'tag.view2', 'tag.pantry', 'tag.walkin'],
  options: ['ext', 'sysac', 'midDoor', 'builtin', 'dress'],
  price: {ext: 20_000_000, sysac: 6_400_000, midDoor: 1_600_000, builtin: 4_300_000, dress: 2_400_000},

  walls: [
    // 북측 외벽: 침실3 창 · 공용욕실 환기창 · 현관문(바깥여닫이)
    {a:[0,0], b:[6300,0], t:250, kind:'e', open:[
      {kind:'window', at:700, w:1800, sill:.9},
      {kind:'window', at:3700, w:600, sill:1.5, head:2.1},
      {kind:'entry', at:5200, w:900, side:-1, hinge:'start'}]},
    // 주방 | 다용도실: 개수대 위 창, 다용도실 문
    {a:[6300,0], b:[9300,0], t:150, kind:'n', open:[
      {kind:'window', at:6600, w:1200, sill:1.05},
      {kind:'door', at:8400, w:800, side:-1, hinge:'end'}]},
    {a:[9300,0], b:[E,0], t:250, kind:'e'},
    // 다용도실(북측 발코니)
    {a:[6300,-1300], b:[6300,0], t:250, kind:'e'},
    {a:[6300,-1300], b:[9300,-1300], t:250, kind:'e', open:[{kind:'window', at:6600, w:2400, sill:1.0}]},
    {a:[9300,-1300], b:[9300,0], t:250, kind:'e'},
    // 서측 외벽: 침실3 · 침실2 창
    {a:[0,0], b:[0,S], t:250, kind:'e', open:[
      {kind:'window', at:700, w:1400, sill:.9},
      {kind:'window', at:4800, w:1000, sill:.9}]},
    // 동측 외벽(주방·팬트리), 주방 쪽창
    {a:[E,0], b:[E,3500], t:250, kind:'e', open:[{kind:'window', at:1800, w:700, sill:1.05}]},
    // 침실2 남측 외벽
    {a:[0,S], b:[2500,S], t:250, kind:'e', open:[{kind:'window', at:400, w:1700, sill:.9}]},
    // 남측·동측 발코니 바깥 창호 — 모서리를 감싸는 큰 창
    {a:[2500,S], b:[2500,B], t:250, kind:'e'},
    {a:[2500,B], b:[EB,B], t:250, kind:'e', open:[
      {kind:'window', at:2900, w:3000, sill:.5},
      {kind:'window', at:6700, w:5000, sill:.15, head:2.25}]},
    {a:[EB,3500], b:[EB,B], t:250, kind:'e', open:[{kind:'window', at:3900, w:5200, sill:.15, head:2.25}]},
    {a:[E,3500], b:[EB,3500], t:250, kind:'e'},

    // 북측 칸막이: 침실3 | 공용욕실, 공용욕실 | 복도, 공용욕실 | 현관·복도
    {a:[3200,0], b:[3200,2800], t:100, kind:'n'},
    {a:[3200,2400], b:[5000,2400], t:100, kind:'n', open:[{kind:'door', at:3900, w:750, side:-1, hinge:'start'}]},
    {a:[5000,0], b:[5000,2400], t:100, kind:'n'},
    // 현관 중문 (옵션): 3연동 유리 미닫이
    {a:[5000,1500], b:[6300,1500], t:80, kind:'n', when:'midDoor', open:[{kind:'slide', at:5000, w:1300, head:2.2}]},
    // 내력벽: 현관 | 주방
    {a:[6300,0], b:[6300,1500], t:200, kind:'b'},
    // 복도 | 침실3
    {a:[0,2800], b:[3200,2800], t:100, kind:'n', open:[{kind:'door', at:2200, w:800, side:-1, hinge:'end'}]},
    // 복도 | 침실2 · 안방 전실 · 드레스룸 · 안방욕실
    {a:[0,3800], b:[6300,3800], t:100, kind:'n', open:[
      {kind:'door', at:1400, w:800, side:1, hinge:'start'},
      {kind:'door', at:3950, w:800, side:1, hinge:'start'}]},
    // 내력벽: 침실2 | 안방 영역
    {a:[2500,3800], b:[2500,S], t:200, kind:'b'},
    // 안방 전실 양옆: 드레스룸, 안방욕실
    {a:[3900,3800], b:[3900,5500], t:100, kind:'n'},
    {a:[4800,3800], b:[4800,5500], t:100, kind:'n'},
    {a:[2500,5500], b:[3900,5500], t:100, kind:'n', open:[{kind:'gap', at:2650, w:800}]},
    {a:[4800,5500], b:[6300,5500], t:100, kind:'n', open:[{kind:'door', at:5450, w:700, side:-1, hinge:'end'}]},
    // 내력벽: 안방 영역 | 거실 (+ 발코니 칸막이)
    {a:[6300,3800], b:[6300,B], t:200, kind:'b'},
    // 주방 | 팬트리
    {a:[9300,0], b:[9300,1600], t:100, kind:'n'},
    {a:[9300,1600], b:[E,1600], t:100, kind:'n', open:[{kind:'door', at:9500, w:700, side:-1, hinge:'start'}]},
    // 발코니 비확장: 방과 발코니 사이 벽 + 미닫이 창호 (거실은 남·동 두 면)
    {a:[2500,S], b:[6300,S], t:150, kind:'n', when:'!ext', open:[{kind:'slide', at:2900, w:3000}]},
    {a:[6300,S], b:[E,S], t:150, kind:'n', when:'!ext', open:[{kind:'slide', at:6700, w:3500, head:2.2}]},
    {a:[E,3500], b:[E,S], t:150, kind:'n', when:'!ext', open:[{kind:'slide', at:3900, w:3700, head:2.2}]},
  ],

  rooms: [
    {id:'bed3', kind:'bed', poly:R(0,0,3200,2800), mat:'gangmaru', at:[2000,1900], view:{eye:[2800,2500], look:[500,400]}},
    {id:'bath1', kind:'bath', poly:R(3200,0,5000,2400), mat:'bathtile', at:[4100,1300], view:{eye:[4350,3300], look:[4100,500]}},
    {id:'entry', kind:'entry', poly:R(5000,0,6300,1500), mat:'porcelain', at:[5750,900], level:-.12, view:{eye:[5850,350], look:[5650,3600]}},
    {id:'hall', kind:'hall', poly:[[5000,1500],[6300,1500],[6300,3800],[0,3800],[0,2800],[3200,2800],[3200,2400],[5000,2400]], mat:'gangmaru', at:[1300,3300], view:{eye:[300,3300], look:[6300,3300]}},
    {id:'kitchen', kind:'kitchen', poly:[[6300,0],[9300,0],[9300,1600],[E,1600],[E,3500],[6300,3500]], mat:'gangmaru', at:[7200,1300], view:{eye:[9300,3450], look:[7000,400]}},
    {id:'pantry', kind:'alpha', poly:R(9300,0,E,1600), mat:'gangmaru', at:[9950,1200], view:{eye:[9900,1450], look:[9800,300]}},
    {id:'living', kind:'living', poly:R(6300,3500,E,S), mat:'gangmaru', at:[7300,4100], view:{eye:[10300,9100], look:[6800,3900]}},
    {id:'bed2', kind:'bed', poly:R(0,3800,2500,S), mat:'gangmaru', at:[1200,4300], view:{eye:[2150,8200], look:[400,4300]}},
    {id:'dress', kind:'dress', poly:R(2500,3800,3900,5500), mat:'gangmaru', at:[3200,5000], view:{eye:[3050,5350], look:[3100,3950]}},
    {id:'bath2', kind:'bath', poly:R(4800,3800,6300,5500), mat:'bathtile', at:[5700,5100], view:{eye:[5800,5300], look:[5200,4000]}},
    {id:'master', kind:'master', poly:[[2500,5500],[3900,5500],[3900,3800],[4800,3800],[4800,5500],[6300,5500],[6300,S],[2500,S]], mat:'gangmaru', at:[3700,7500], view:{eye:[5200,9050], look:[3000,5800]}},
    {id:'utility', kind:'utility', poly:R(6300,-1300,9300,0), mat:'bathtile', at:[8000,-300], service:true, view:{eye:[8900,-300], look:[6600,-1000]}},
    {id:'balcM', kind:'balcony', poly:R(2500,S,6300,B), mat:'tile600', at:[4400,8700], service:true, join:{to:'master', when:'ext'}},
    {id:'balcL', kind:'balcony', poly:R(6300,S,E,B), mat:'tile600', at:[8400,8700], service:true, join:{to:'living', when:'ext'}},
    {id:'balcE', kind:'balcony', poly:R(E,3500,EB,B), mat:'tile600', at:[11300,6000], service:true, join:{to:'living', when:'ext'}},
  ],

  dims: {x: [0, 2500, 5000, 6300, E, EB], y: [-1300, 0, 2800, 3800, S, B]},
  entry: {start: [5650, -1000], look: [5650, 3600], arrow: {x: 5650, y0: -1500, y1: -300}},

  fixtures: [
    // 주방: 하부장 + 상부장, 쿡탑(기본 가스 / 옵션 인덕션), 개수대, 식기세척기 자리, 팬트리 안 김치냉장고
    {type:'counter', key:'counter', cx:7100, cy:425, w:1400, d:600, role:'cabinet'},
    {type:'stove', key:'stove', cx:6700, cy:425, w:600, d:450, when:'!builtin'},
    {type:'induction', key:'induction', cx:6700, cy:425, w:600, d:520, when:'builtin'},
    {type:'ksink', key:'sink', cx:7400, cy:425, w:800, d:450},
    {type:'counter', key:'counter', cx:8100, cy:425, w:600, d:600, role:'cabinet', when:'!builtin'},
    {type:'dishwasher', key:'dishwasher', cx:8100, cy:425, w:600, d:600, when:'builtin'},
    {type:'fridge', key:'kimchiFridge', cx:9800, cy:475, w:750, d:700, when:'builtin'},
    // 현관 키큰 신발장
    {type:'entrytall', key:'entryCabinet', cx:5225, cy:800, w:1200, d:350, rot:270, role:'cabinet'},
    // 공용욕실: 욕조 · 세면대 · 양변기
    {type:'bathtub', key:'bathtub', cx:4100, cy:475, w:1500, d:700},
    {type:'vanity', key:'vanity', cx:3500, cy:1700, w:800, d:500, rot:270},
    {type:'toilet', key:'toilet', cx:4600, cy:1200, w:400, d:700, rot:90},
    // 안방욕실: 샤워부스 · 양변기 · 세면대
    {type:'shower', key:'shower', cx:5250, cy:4250, w:800, d:800},
    {type:'toilet', key:'toilet', cx:5950, cy:4200, w:400, d:700},
    {type:'vanity', key:'vanity', cx:5100, cy:5150, w:600, d:500, rot:270},
    // 드레스룸 시스템 가구 (옵션)
    {type:'dressshelf', key:'dressShelf', cx:3225, cy:4150, w:1150, d:600, when:'dress'},
    // 다용도실 에어컨 실외기
    {type:'acunit', key:'acUnit', cx:7700, cy:-1000, w:800, d:300},
    // 시스템에어컨 천장형 (옵션, 4대)
    {type:'ceilingac', key:'ceilingAc', cx:8300, cy:5800, w:840, d:840, when:'sysac'},
    {type:'ceilingac', key:'ceilingAc', cx:4400, cy:6900, w:840, d:840, when:'sysac'},
    {type:'ceilingac', key:'ceilingAc', cx:1250, cy:5600, w:840, d:840, when:'sysac'},
    {type:'ceilingac', key:'ceilingAc', cx:1700, cy:1400, w:840, d:840, when:'sysac'},
  ],

  furniture: [
    // 거실: 서쪽 아트월 거실장, 창 쪽으로 4인 소파, 모서리 조망 공간
    {type:'rug', key:'rug', cx:8300, cy:5800, w:2400, d:1800, rot:90, role:'rug'},
    {type:'tvstand', key:'tvStand', cx:6600, cy:5800, w:2400, d:400, rot:270, role:'wood'},
    {type:'sofa', key:'sofa4', cx:9700, cy:5800, w:2800, d:950, rot:90, role:'sofa'},
    {type:'coffeetable', key:'coffeeTable', cx:8300, cy:5800, w:1200, d:600, rot:90, role:'wood'},
    {type:'floorlamp', key:'floorLamp', cx:10150, cy:7500, w:450, d:450, role:'metal'},
    {type:'plant', key:'plantLarge', cx:11300, cy:8700, w:700, d:700},
    {type:'plant', key:'plant', cx:11300, cy:4200, w:500, d:500},
    // 주방·식당: 냉장고, 4인 식탁
    {type:'fridge', key:'fridgeSxS', cx:10125, cy:3050, w:900, d:700, rot:90},
    {type:'table', key:'diningTable', cx:8000, cy:2450, w:1600, d:900, role:'wood'},
    {type:'chair', key:'diningChair', cx:7600, cy:1745, w:450, d:480, role:'chair'},
    {type:'chair', key:'diningChair', cx:8400, cy:1745, w:450, d:480, role:'chair'},
    {type:'chair', key:'diningChair', cx:7600, cy:3145, w:450, d:480, rot:180, role:'chair'},
    {type:'chair', key:'diningChair', cx:8400, cy:3145, w:450, d:480, rot:180, role:'chair'},
    // 안방: 옆벽 헤드보드 킹 침대, 화장대, 확장 공간 라운지 체어
    {type:'bed', key:'bedK', cx:5200, cy:6900, w:1600, d:2000, rot:90, role:'bed'},
    {type:'dresser', key:'dresser', cx:2825, cy:6700, w:1000, d:450, rot:270, role:'wood'},
    {type:'armchair', key:'readingChair', cx:3400, cy:8700, w:750, d:800, role:'accent'},
    {type:'plant', key:'plant', cx:5900, cy:8800, w:500, d:500},
    // 침실2: 슈퍼싱글 + 옷장 + 창가 책상
    {type:'bed', key:'bedSS', cx:1125, cy:6850, w:1100, d:2000, rot:270, role:'bedAlt'},
    {type:'wardrobe', key:'wardrobeS', cx:2125, cy:5400, w:1300, d:550, rot:90, role:'cabinet'},
    {type:'desk', key:'desk', cx:425, cy:5300, w:1200, d:600, rot:270, role:'wood'},
    {type:'chair', key:'chair', cx:965, cy:5300, w:450, d:480, rot:90, role:'chair'},
    // 침실3: 자녀방 (북·서 모서리)
    {type:'bed', key:'bedSS', cx:2150, cy:675, w:1100, d:2000, rot:90, role:'bedAlt'},
    {type:'desk', key:'desk', cx:425, cy:2000, w:1200, d:600, rot:270, role:'wood'},
    {type:'chair', key:'chair', cx:965, cy:2000, w:450, d:480, rot:90, role:'chair'},
    {type:'bookshelf', key:'bookshelf', cx:1650, cy:2600, w:800, d:300, rot:180, role:'wood'},
    // 다용도실: 워시타워
    {type:'washtower', key:'washTower', cx:6800, cy:-800, w:700, d:750},
  ],
};
