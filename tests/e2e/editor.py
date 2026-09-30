"""평면 편집기 e2e: 빈 도면 → 벽 그리기(클릭·숫자 입력) → 문·창 → 선택·삭제·실행 취소 → 방 종류 → 3D → 분양 타입 복사 → 새로고침 유지."""
import json, sys

from playwright.sync_api import sync_playwright
from common import URL, OUT, IN3D, IN2D, launch

results = []
def check(name, ok, detail=''):
    results.append((name, bool(ok))); print(('PASS' if ok else 'FAIL'), name, str(detail)[:160])

with sync_playwright() as p:
    b = launch(p)
    pg = b.new_page(viewport={'width': 1440, 'height': 900})
    errors = []
    pg.on('pageerror', lambda e: (errors.append(str(e)), print('  !! pageerror', e)))
    pg.on('dialog', lambda d: d.accept())
    st = lambda: pg.evaluate("JSON.parse(localStorage.getItem('wmh:state-v3'))")
    def scr(x, y):
        return pg.evaluate(f"(() => {{ const s = document.querySelector('#plan'); const p = s.createSVGPoint(); p.x = {x}; p.y = {y}; const q = p.matrixTransform(s.getScreenCTM()); return [q.x, q.y]; }})()")
    def click_mm(x, y):
        sx, sy = scr(x, y); pg.mouse.move(sx, sy); pg.mouse.down(); pg.mouse.up(); pg.wait_for_timeout(120)
    rooms = lambda: pg.locator('#sidePanel .edroom').count()

    pg.goto(URL); pg.wait_for_selector('#landing .tcard')
    check('landing has custom card', pg.locator('#landCustomNew').count() == 1)
    pg.locator('#landCustomNew').click(); pg.wait_for_function(IN2D); pg.wait_for_timeout(500)
    check('editor opened on blank plan', pg.evaluate("document.body.classList.contains('editing')") and st()['type'] == 'custom')
    check('type switcher shows 내 평면', '내 평면' in pg.inner_text('#typeSeg'))
    check('blank plan has 1 room', rooms() == 1, rooms())
    pg.screenshot(path=str(OUT / '01-blank.png'))

    # 벽 도구로 가운데를 가르는 벽
    pg.locator('[data-edtool="wall"]').click()
    click_mm(4000, 0); click_mm(4000, 8400); pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    check('partition splits into 2 rooms', rooms() == 2, rooms())
    # 숫자 입력으로 정확한 길이
    click_mm(4000, 4200)
    sx, sy = scr(6000, 4200); pg.mouse.move(sx, sy); pg.wait_for_timeout(100)
    pg.keyboard.type('6800'); pg.keyboard.press('Enter'); pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    s = st(); walls = s['custom']['walls']
    typed = [w for w in walls if w['a'] == [4000, 4200] or w['b'] == [4000, 4200]]
    check('typed length wall is exact (6800mm)', any(abs(w['a'][0] - w['b'][0]) == 6800 for w in typed), json.dumps(typed)[:120])
    check('now 3 rooms', rooms() == 3, rooms())

    # 문 · 창
    pg.locator('[data-edtool="door"]').click(); click_mm(4000, 2000)
    pg.locator('[data-edtool="window"]').click(); click_mm(10800, 2000)
    s = st(); opens = sum(len(w.get('open', [])) for w in s['custom']['walls'])
    check('door and window placed', opens >= 5, opens)   # 기본 현관문 + 창 2 + 새 문 + 새 창
    pg.screenshot(path=str(OUT / '02-drawn.png'))

    # 선택 · 삭제 · 실행 취소
    pg.locator('[data-edtool="select"]').click()
    click_mm(7400, 4200); pg.wait_for_timeout(200)
    check('wall selected shows card', '선택한 벽' in pg.inner_text('#sidePanel'))
    pg.keyboard.press('Delete'); pg.wait_for_timeout(300)
    check('delete wall merges rooms', rooms() == 2, rooms())
    pg.keyboard.press('Meta+z'); pg.wait_for_timeout(300)
    check('undo restores wall', rooms() == 3, rooms())

    # 방 종류
    pg.locator('#sidePanel .edroom').first.click(); pg.wait_for_timeout(200)
    pg.select_option('#edRk', 'master'); pg.wait_for_timeout(300)
    check('room kind set to 안방', '안방' in pg.inner_text('#sidePanel .edrooms'))
    pg.screenshot(path=str(OUT / '03-room-kind.png'))

    # 편집 끝 → 3D
    pg.locator('#edDone').click(); pg.wait_for_timeout(200)
    check('editing finished', not pg.evaluate("document.body.classList.contains('editing')"))
    pg.locator('#viewSeg [data-view="3d"]').click(); pg.wait_for_function(IN3D, timeout=30000); pg.wait_for_timeout(600)
    check('custom plan renders in 3D', pg.evaluate('window.__wmh3d.stats().calls') > 10)
    pg.screenshot(path=str(OUT / '04-custom-3d.png'))

    # 분양 타입 복사해 편집
    pg.locator('#typeSeg [data-type="a84"]').click(); pg.wait_for_timeout(1500)
    pg.locator('#viewSeg [data-view="2d"]').click(); pg.wait_for_function(IN2D, timeout=20000)
    pg.locator('#edPlan').click(); pg.wait_for_timeout(800)
    s = st()
    check('84A copied into custom', s['type'] == 'custom' and s['custom'].get('base') == 'a84' and len(s['custom']['walls']) == 20, f"type={s['type']} base={s['custom'].get('base')} walls={len(s['custom']['walls'])}")
    check('copied plan rooms detected (open LDK merges → 9)', rooms() == 9, rooms())
    names = pg.inner_text('#sidePanel .edrooms')
    check('merged open space named 거실, not 현관', '거실' in names and '현관' not in names, names.replace('\n', ' ')[:120])
    check('copied furniture kept', len(s['furniture']) > 20)
    pg.screenshot(path=str(OUT / '05-copy-84A.png'))
    # 벽 끝점 끌기(길이 조절) 뒤 방 다시 찾기
    pg.locator('[data-edtool="select"]').click()
    before = len(st()['custom']['walls'])
    pg.locator('#edDone').click()

    pg.reload(); pg.wait_for_function(IN3D, timeout=30000); pg.wait_for_timeout(300)
    s = st()
    check('custom persists after reload', s['type'] == 'custom' and len(s['custom']['walls']) == before)
    check('no page errors', not errors, ' | '.join(errors)[:300])
    b.close()

failed = [r for r in results if not r[1]]
print(f'\n{len(results) - len(failed)}/{len(results)} passed')
sys.exit(1 if failed else 0)
