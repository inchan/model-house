"""우리집 모델하우스 e2e 점검: 첫 화면 → 3D 입장 → 방 시점 → 옵션·스타일 → 타입 전환 → 2D → 가구 → 견적 → 걸어보기 → 영어 → 성능 → 저장/복원 → 가져오기 검증 → WebGL 실패."""
import json, re, sys

from playwright.sync_api import sync_playwright
from common import URL, OUT, IN3D, IN2D, launch

CJK = re.compile(r'[一-鿿]'); HANGUL = re.compile(r'[가-힣]')
results = []
def check(name, ok, detail=''):
    results.append((name, bool(ok))); print(('PASS' if ok else 'FAIL'), name, str(detail)[:160])
def won(s):  # "₩31,400,000" → 31400000
    m = re.search(r'-?₩?[\d,]+', s.replace('−', '-')); return int(re.sub(r'[^\d-]', '', m.group(0))) if m else None

with sync_playwright() as p:
    b = launch(p)
    ctx = b.new_context(viewport={'width': 1440, 'height': 900})
    pg = ctx.new_page()
    errors = []
    pg.on('pageerror', lambda e: (errors.append(str(e)), print('  !! pageerror', e)))
    pg.on('console', lambda m: errors.append('console.error: ' + m.text) if m.type == 'error' and 'Pointer Lock' not in m.text else None)
    pg.goto(URL); pg.wait_for_selector('#landing .tcard'); pg.wait_for_timeout(400)
    pg.screenshot(path=str(OUT / '01-landing.png'))
    land = pg.inner_text('#landing')
    check('landing shows 3 types', pg.locator('#landing .tcard').count() == 3 and '84A' in land and '59A' in land and '84B' in land)
    check('landing Korean, no Chinese', HANGUL.search(land) and not CJK.search(land))
    check('landing shows 전용/공급 areas', '전용' in land and '공급' in land and '평형' in land)

    pg.locator('#landing .tcard[data-type="a84"]').click()
    pg.wait_for_function(IN3D, timeout=25000); pg.wait_for_timeout(600)
    check('landing closed & 3D entered', pg.evaluate("document.querySelector('#landing').hidden"))
    check('stage info 84A', '84A' in pg.inner_text('#stageInfo'), pg.inner_text('#stageInfo'))
    check('room tabs', pg.locator('#roomTabs button').count() >= 8, pg.inner_text('#roomTabs'))
    check('minimap drawn', pg.locator('#minimap .mm-room').count() >= 10)
    pg.screenshot(path=str(OUT / '02-3d-overview-84A.png'))
    body = pg.inner_text('body')
    check('no Chinese anywhere (ko)', not CJK.search(body))

    # 성능: 가만히 있을 때 다시 그리지 않는지
    s1 = pg.evaluate('window.__wmh3d.stats()'); pg.wait_for_timeout(1200); s2 = pg.evaluate('window.__wmh3d.stats()')
    check('on-demand render: idle frames not rendered', s2['renders'] - s1['renders'] <= 1, f"{s1['renders']}→{s2['renders']}")
    print('stats merged', s2)
    # 움직이는 동안에도 화면 갱신 한 번에 한 번만 그린다 — 루프가 겹치면 프레임마다 두 배로 불어난다.
    # 소프트웨어 렌더러에서는 한 장이 느려 초당 횟수로는 드러나지 않으므로, 따로 센 화면 갱신 수와 비교한다
    def rate(fn):
        pg.evaluate("window.__fr = 0; window.__fon = true; (function f(){ if (window.__fon){ window.__fr++; requestAnimationFrame(f); } })()")
        a = pg.evaluate('window.__wmh3d.stats().renders'); fn(); b = pg.evaluate('window.__wmh3d.stats().renders')
        return pg.evaluate('window.__fon = false, window.__fr'), b - a
    cv = pg.locator('#view3d canvas').bounding_box(); mx, my = cv['x'] + cv['width']/2, cv['y'] + cv['height']/2
    def orbit_drag():
        pg.mouse.move(mx, my); pg.mouse.down()
        for i in range(20): pg.mouse.move(mx + i*8, my); pg.wait_for_timeout(30)
        pg.mouse.up(); pg.wait_for_timeout(1500)
    fr, n = rate(orbit_drag)
    check('orbit drag renders at most once per frame', 0 < n <= fr + 2, f'{n} renders / {fr} frames')

    # 방 시점
    for rid, name in [('living', '거실'), ('kitchen', '주방'), ('master', '안방'), ('bath1', '공용욕실')]:
        pg.locator(f'#roomTabs button[data-room="{rid}"]').click(); pg.wait_for_timeout(1500)
        pg.screenshot(path=str(OUT / f'03-room-{rid}.png'))
    check('room view mode active', pg.evaluate("document.querySelector('#stage').classList.contains('roomview')"))
    check('room tab highlighted', pg.locator('#roomTabs button.on').get_attribute('data-room') == 'bath1')
    pg.locator('#roomTabs button[data-room="__all"]').click(); pg.wait_for_timeout(1200)
    check('overview restored', not pg.evaluate("document.querySelector('#stage').classList.contains('roomview')"))
    pg.wait_for_timeout(1500); r1 = pg.evaluate('window.__wmh3d.stats().renders'); pg.wait_for_timeout(1500); r2 = pg.evaluate('window.__wmh3d.stats().renders')
    check('idle after room tour (no endless render)', r2 - r1 <= 1, f'{r1}→{r2}')

    # 모델하우스 투어
    pg.locator('#tourBtn').click(); pg.wait_for_timeout(1500)
    card = pg.inner_text('#tourCard')
    check('tour starts at entrance with caption', not pg.evaluate("document.querySelector('#tourCard').hidden") and '1 /' in card and '현관' in card, card.replace('\n', ' ')[:80])
    pg.screenshot(path=str(OUT / '17-tour-1.png'))
    pg.wait_for_timeout(5600)
    card2 = pg.inner_text('#tourCard')
    check('tour advances to living room', '2 /' in card2 and '거실' in card2 and '발코니 확장' in card2, card2.replace('\n', ' ')[:80])
    pg.screenshot(path=str(OUT / '18-tour-2.png'))
    pg.locator('#tourNext').click(); pg.wait_for_timeout(1500)
    check('tour next button', '3 /' in pg.inner_text('#tourCard'))
    pg.locator('#tourStop').click(); pg.wait_for_timeout(400)
    check('tour stopped', pg.evaluate("document.querySelector('#tourCard').hidden") and not pg.evaluate("document.body.classList.contains('touring')"))
    pg.locator('#roomTabs button[data-room="__all"]').click(); pg.wait_for_timeout(1500)
    r1 = pg.evaluate('window.__wmh3d.stats().renders'); pg.wait_for_timeout(1500); r2 = pg.evaluate('window.__wmh3d.stats().renders')
    check('idle after tour', r2 - r1 <= 1, f'{r1}→{r2}')

    # 옵션
    total0 = won(pg.inner_text('#estimateBar .total b'))
    pg.locator('.side-tabs [data-tab="options"]').click()
    pg.locator('#sidePanel [data-opt="sysac"]').click(); pg.wait_for_timeout(700)
    total1 = won(pg.inner_text('#estimateBar .total b'))
    check('sysac adds 6,400,000', total1 - total0 == 6_400_000, f'{total0}→{total1}')
    pg.screenshot(path=str(OUT / '04-options-sysac.png'))
    walls_ext = pg.locator('#gWalls rect').count()
    pg.locator('#sidePanel [data-opt="ext"]').click(); pg.wait_for_timeout(900)
    total2 = won(pg.inner_text('#estimateBar .total b'))
    check('ext off removes 22,000,000', total1 - total2 == 22_000_000, f'{total1}→{total2}')
    check('ext off adds balcony walls (2D)', pg.locator('#gWalls rect').count() > walls_ext, f"{walls_ext}→{pg.locator('#gWalls rect').count()}")
    pg.screenshot(path=str(OUT / '05-3d-no-ext.png'))
    pg.locator('#sidePanel [data-opt="ext"]').click(); pg.wait_for_timeout(700)
    pg.locator('#sidePanel [data-opt="builtin"]').click(); pg.locator('#sidePanel [data-opt="midDoor"]').click(); pg.locator('#sidePanel [data-opt="merge"]').click(); pg.wait_for_timeout(900)
    check('estimate chips show options', '시스템에어컨' in pg.inner_text('#estimateBar'))
    pg.screenshot(path=str(OUT / '06-options-all.png'))

    # 스타일
    pg.locator('.side-tabs [data-tab="style"]').click()
    pg.locator('#sidePanel [data-style="hotel"]').click(); pg.wait_for_timeout(900)
    st = pg.evaluate("JSON.parse(localStorage.getItem('wmh:state-v3'))")
    check('hotel style applied (walnut floors, greige wall)', st['style'] == 'hotel' and st['rooms']['living']['mat'] == 'wonmok' and st['wall'] == 'greige')
    check('finish upgrade counted', '마감재 변경' in pg.inner_text('#estimateBar'))
    pg.screenshot(path=str(OUT / '07-style-hotel.png'))
    pg.locator('#sidePanel [data-style="modern"]').click(); pg.wait_for_timeout(900)
    pg.locator('#sidePanel [data-wall="sage"]').click(); pg.wait_for_timeout(500)
    pg.screenshot(path=str(OUT / '08-style-modern-sage.png'))

    # 타입 전환
    for tid in ['b84', 'a59']:
        import time; t0 = time.time()
        pg.locator(f'#typeSeg [data-type="{tid}"]').click(timeout=60000); print('  click', tid, round(time.time()-t0, 2), 's'); pg.wait_for_timeout(1800)
        code = tid[1:] + tid[0].upper()
        check(f'type switched to {code}', code in pg.inner_text('#stageInfo'), pg.inner_text('#stageInfo'))
        pg.screenshot(path=str(OUT / f'09-3d-{tid}.png'))
    pg.locator('#typeSeg [data-type="a84"]').click(); pg.wait_for_timeout(1500)
    st = pg.evaluate("JSON.parse(localStorage.getItem('wmh:state-v3'))")
    check('84A layout restored from stash', st['type'] == 'a84' and len(st['furniture']) > 20 and 'a59' in st['stash'] and 'b84' in st['stash'])

    # 2D
    pg.locator('#viewSeg [data-view="2d"]').click(); pg.wait_for_function(IN2D, timeout=20000); pg.wait_for_timeout(500)
    check('2D plan rendered', pg.locator('#gRooms polygon.room').count() >= 10 and pg.locator('#gDims line').count() > 10)
    pg.screenshot(path=str(OUT / '10-2d-84A.png'))
    # 가구 추가
    n0 = len(pg.evaluate("JSON.parse(localStorage.getItem('wmh:state-v3'))")['furniture'])
    pg.locator('.side-tabs [data-tab="furniture"]').click()
    pg.locator('#lib .item').filter(has_text='안마의자').first.click(); pg.wait_for_timeout(400)
    n1 = len(pg.evaluate("JSON.parse(localStorage.getItem('wmh:state-v3'))")['furniture'])
    check('furniture added from library', n1 == n0 + 1, f'{n0}→{n1}')
    check('selection card shown', '선택한 가구' in pg.inner_text('#sidePanel'))
    pg.screenshot(path=str(OUT / '11-2d-furniture-tab.png'))
    pg.keyboard.press('Escape')
    # 방 선택 → 스타일 탭 바닥재
    pg.locator('#roomTabs button[data-room="master"]').click(); pg.wait_for_timeout(400)
    check('2D room focus selects room', '선택한 공간' in pg.inner_text('#sidePanel'))
    pg.locator('#sidePanel .floor-row.open [data-mat="marble"]').first.click(); pg.wait_for_timeout(400)
    st = pg.evaluate("JSON.parse(localStorage.getItem('wmh:state-v3'))")
    check('room flooring changed', st['rooms']['master']['mat'] == 'marble')
    pg.screenshot(path=str(OUT / '12-2d-room-floor.png'))
    pg.locator('#roomTabs button[data-room="__all"]').click(); pg.wait_for_timeout(300)

    # 견적 요약
    pg.locator('#summaryBtn').click(); pg.wait_for_timeout(400)
    dlg = pg.inner_text('#summary')
    check('summary opened with totals', '예상 추가금 합계' in dlg and '유상옵션' in dlg and '전용면적' in dlg)
    check('summary total matches bar', won(dlg.split('예상 추가금 합계')[1]) == won(pg.inner_text('#estimateBar .total b')))
    pg.screenshot(path=str(OUT / '13-summary.png'))
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    check('summary closed by Esc', pg.evaluate("document.querySelector('#summary').hidden"))

    # 걸어보기
    pg.locator('#viewSeg [data-view="walk"]').click(); pg.wait_for_function(IN3D, timeout=25000); pg.wait_for_timeout(800)
    pg.locator('#walkOverlay').click(); pg.wait_for_timeout(600)
    check('walk fallback to joystick', pg.evaluate("getComputedStyle(document.querySelector('#joy')).display") == 'block')
    fr, n = rate(lambda: pg.wait_for_timeout(1000))
    check('walk: standing still renders nothing', n <= 1, f'{n} renders / {fr} frames')
    def hold_w():
        pg.keyboard.down('KeyW'); pg.wait_for_timeout(1200); pg.keyboard.up('KeyW'); pg.wait_for_timeout(200)
    fr, n = rate(hold_w)
    check('walk: moving renders at most once per frame', 0 < n <= fr + 2, f'{n} renders / {fr} frames')
    pg.screenshot(path=str(OUT / '14-walk.png'))
    pg.locator('#walkExit').click(); pg.wait_for_timeout(1200)
    check('walk exited → 3D tour', pg.locator('#viewSeg .btn.on').get_attribute('data-view') == '3d')

    # 영어
    pg.locator('#langBtn').click(); pg.wait_for_timeout(500)
    en = pg.evaluate("(() => { document.querySelector('#toast').textContent = ''; return document.body.innerText; })()")
    check('English UI', 'Our Model House' in en and '3D Tour' in en and 'Estimated extras' in en)
    check('English: no Hangul except language button', set(HANGUL.findall(en)) <= set('한국어'), ''.join(sorted(set(HANGUL.findall(en))))[:40])
    pg.screenshot(path=str(OUT / '15-english.png'))
    pg.locator('#langBtn').click(); pg.wait_for_timeout(300)

    # 저장 후 다시 열기: 첫 화면 없이 바로 3D
    pg.reload(); pg.wait_for_function(IN3D, timeout=25000); pg.wait_for_timeout(300)
    check('returning visit skips landing', pg.evaluate("document.querySelector('#landing').hidden"))
    # 타입 선택 화면 다시 열기
    pg.locator('#homeBtn').click(); pg.wait_for_timeout(300)
    check('home reopens landing with continue', not pg.evaluate("document.querySelector('#landing').hidden") and pg.locator('#landBack').count() == 1)
    pg.locator('#landBack').click(); pg.wait_for_timeout(300)

    # 가져오기 검증
    bad = {'v': 3, 'type': 'b84', 'style': 'nope', 'wall': 'x', 'opts': {'ext': True, 'hack': True},
           'furniture': [{'id': 'x"onmouseover=1', 'type': 'bed', 'cx': 1000, 'cy': 5000, 'w': 1500, 'd': 2000, 'color': '"/><image href=x onerror="window.__p=1"/>'},
                         {'type': 'rocket', 'cx': 1, 'cy': 1, 'w': 1, 'd': 1}],
           'rooms': {'living': {'mat': 'lava', 'name': '<b>x</b>'}}, 'measures': [], 'stash': {'a84': {'furniture': 'no'}}}
    f = OUT / 'bad.json'; f.write_text(json.dumps(bad))
    pg.set_input_files('#fileIn', str(f)); pg.wait_for_timeout(1500)
    st = pg.evaluate("JSON.parse(localStorage.getItem('wmh:state-v3'))")
    check('import sanitized', st['type'] == 'b84' and st['style'] == 'natural' and 'hack' not in st['opts'] and len(st['furniture']) == 1 and st['furniture'][0]['color'].startswith('#'), json.dumps(st['furniture'])[:120])
    check('no injected script ran', pg.evaluate('window.__p === undefined'))
    check('import toast mentions skipped', '1개' in pg.inner_text('#toast'), pg.inner_text('#toast'))

    check('no page errors', not errors, ' | '.join(errors)[:400])
    ctx.close()

    # 병합 전(?nomerge)과 비교
    for q in ['?nomerge', '']:
        c = b.new_context(viewport={'width': 1440, 'height': 900}); pp = c.new_page()
        pp.goto(URL + q); pp.wait_for_selector('#landing .tcard'); pp.locator('#landing .tcard[data-type="a84"]').click()
        pp.wait_for_function(IN3D, timeout=25000); pp.wait_for_timeout(500)
        pp.evaluate("window.__wmh3d.flyOverview()"); pp.wait_for_timeout(1200)
        print('STATS', q or 'merged', pp.evaluate('window.__wmh3d.stats()'))
        c.close()

    # WebGL 불가
    c = b.new_context(viewport={'width': 1280, 'height': 800})
    c.add_init_script("const o = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(t, ...a){ return /webgl/.test(t) ? null : o.call(this, t, ...a); };")
    pp = c.new_page(); pp.goto(URL); pp.wait_for_selector('#landing .tcard'); pp.locator('#landing .tcard[data-type="a84"]').click(); pp.wait_for_timeout(2500)
    check('WebGL failure → message, stays 2D, not busy', '3D 화면을 열지 못했습니다' in pp.inner_text('#toast') and pp.evaluate(IN2D))
    pp.screenshot(path=str(OUT / '16-webgl-fail.png'))
    c.close(); b.close()

failed = [r for r in results if not r[1]]
print(f'\n{len(results) - len(failed)}/{len(results)} passed')
sys.exit(1 if failed else 0)
