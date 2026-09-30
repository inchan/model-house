/* ============================================================
 *  벽 중심선 그래프에서 방(닫힌 영역) 찾기
 *  1) 수평·수직 벽 선분을 서로 만나는 점에서 모두 쪼갠다
 *  2) 한쪽 끝만 이어진 벽(막히지 않은 벽)은 반복해서 지운다
 *  3) 반쪽 간선(half-edge)을 따라 "도착점에서 가장 오른쪽으로 꺾기"로 면을 돈다
 *  4) 넓이가 양수인 면 = 방, 가장 큰 음수 면 = 바깥 경계
 *  좌표계는 y가 아래로 커지는 화면 좌표(mm)
 * ============================================================ */
import type { Pt2 } from './schema';

type Seg = [Pt2, Pt2];
const key = (p: Pt2) => `${Math.round(p[0])},${Math.round(p[1])}`;

export function findFaces(segs: Seg[], minArea = 0.3): Pt2[][] {
  const hs = segs.filter(([a, b]) => a[1] === b[1] && a[0] !== b[0]).map(([a, b]) => (a[0] < b[0] ? [a, b] : [b, a]) as Seg);
  const vs = segs.filter(([a, b]) => a[0] === b[0] && a[1] !== b[1]).map(([a, b]) => (a[1] < b[1] ? [a, b] : [b, a]) as Seg);
  // 1) 교차점 · 끝점에서 쪼개기 (같은 축의 겹치는 선분도 끝점에서 쪼갠다)
  const cuts = new Map<Seg, number[]>();
  const addCut = (s: Seg, v: number) => { const l = cuts.get(s) ?? []; l.push(v); cuts.set(s, l); };
  for (const h of hs){
    const y = h[0][1];
    for (const v of vs){
      const x = v[0][0];
      if (x >= h[0][0] && x <= h[1][0] && y >= v[0][1] && y <= v[1][1]){ addCut(h, x); addCut(v, y); }
    }
    for (const o of hs) if (o !== h && o[0][1] === y) for (const x of [o[0][0], o[1][0]]) if (x > h[0][0] && x < h[1][0]) addCut(h, x);
  }
  for (const v of vs){
    const x = v[0][0];
    for (const o of vs) if (o !== v && o[0][0] === x) for (const y of [o[0][1], o[1][1]]) if (y > v[0][1] && y < v[1][1]) addCut(v, y);
  }
  const edges = new Map<string, [Pt2, Pt2]>();
  const addEdge = (a: Pt2, b: Pt2) => { if (key(a) === key(b)) return; const k = [key(a), key(b)].sort().join('|'); if (!edges.has(k)) edges.set(k, [a, b]); };
  for (const h of hs){ const xs = [...new Set([h[0][0], h[1][0], ...(cuts.get(h) ?? [])])].sort((a, b) => a - b); for (let i = 1; i < xs.length; i++) addEdge([xs[i-1], h[0][1]], [xs[i], h[0][1]]); }
  for (const v of vs){ const ys = [...new Set([v[0][1], v[1][1], ...(cuts.get(v) ?? [])])].sort((a, b) => a - b); for (let i = 1; i < ys.length; i++) addEdge([v[0][0], ys[i-1]], [v[0][0], ys[i]]); }

  // 2) 막다른 벽 지우기
  const adj = new Map<string, {p: Pt2; nb: Map<string, Pt2>}>();
  const node = (p: Pt2) => { const k = key(p); let n = adj.get(k); if (!n){ n = {p, nb: new Map()}; adj.set(k, n); } return n; };
  edges.forEach(([a, b]) => { node(a).nb.set(key(b), b); node(b).nb.set(key(a), a); });
  let pruned = true;
  while (pruned){
    pruned = false;
    for (const [k, n] of adj) if (n.nb.size < 2){
      n.nb.forEach((_, nk) => adj.get(nk)?.nb.delete(k));
      adj.delete(k); pruned = true;
    }
  }

  // 3) 면 돌기: u→v 다음 간선은 v에서 (v→u 방향 기준) 시계 방향으로 가장 가까운 간선
  const ang = (a: Pt2, b: Pt2) => Math.atan2(b[1] - a[1], b[0] - a[0]);
  const used = new Set<string>(), faces: Pt2[][] = [];
  for (const [ku, nu] of adj) for (const [kv] of nu.nb){
    if (used.has(ku + '>' + kv)) continue;
    const poly: Pt2[] = []; let a = ku, b = kv, guard = 0;
    while (!used.has(a + '>' + b) && guard++ < 10000){
      used.add(a + '>' + b); poly.push(adj.get(a)!.p);
      const nb = adj.get(b)!, back = ang(nb.p, adj.get(a)!.p);
      let best: string | null = null, bestTurn = Infinity;
      nb.nb.forEach((p, kk) => {
        if (kk === a && nb.nb.size > 1) return;
        let turn = back - ang(nb.p, p); while (turn <= 1e-9) turn += Math.PI*2;   // 되돌아온 방향에서 시계 방향으로 잰 각
        if (turn < bestTurn){ bestTurn = turn; best = kk; }
      });
      if (!best) break;
      a = b; b = best;
    }
    const area = signedArea(poly);
    if (area > minArea*1e6) faces.push(simplify(poly));
  }
  return faces;
}

// y가 아래로 커지는 좌표에서 방 내부를 오른쪽에 두고 돈 면은 넓이가 양수가 된다
export function signedArea(poly: Pt2[]){
  let s = 0;
  for (let i = 0; i < poly.length; i++){ const p = poly[i], q = poly[(i + 1) % poly.length]; s += p[0]*q[1] - q[0]*p[1]; }
  return s/2;
}
// 일직선 위의 중간 점 제거
function simplify(poly: Pt2[]): Pt2[] {
  const out: Pt2[] = [];
  for (let i = 0; i < poly.length; i++){
    const p = poly[(i - 1 + poly.length) % poly.length], c = poly[i], n = poly[(i + 1) % poly.length];
    if ((p[0] === c[0] && c[0] === n[0]) || (p[1] === c[1] && c[1] === n[1])) continue;
    out.push(c);
  }
  return out;
}

// 다각형 안쪽의 적당한 이름 위치: 가장 큰 사각형 조각의 가운데 (직교 다각형용)
export function labelPoint(poly: Pt2[]): Pt2 {
  const xs = [...new Set(poly.map(p => p[0]))].sort((a, b) => a - b), ys = [...new Set(poly.map(p => p[1]))].sort((a, b) => a - b);
  let best: Pt2 = poly[0], bestA = -1;
  for (let i = 1; i < xs.length; i++) for (let j = 1; j < ys.length; j++){
    const c: Pt2 = [(xs[i-1] + xs[i])/2, (ys[j-1] + ys[j])/2];
    if (!inside(c, poly)) continue;
    const a = (xs[i] - xs[i-1])*(ys[j] - ys[j-1]);
    if (a > bestA){ bestA = a; best = c; }
  }
  return best;
}
function inside(p: Pt2, poly: Pt2[]){
  let r = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++){
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi)*(p[1] - yi)/(yj - yi) + xi) r = !r;
  }
  return r;
}
