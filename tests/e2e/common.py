"""e2e 공통 설정: 주소·브라우저 위치는 환경 변수로 바꿀 수 있다.
  E2E_URL        기본 http://localhost:4173/ (npm run test:e2e 가 띄우는 미리보기 서버)
  CHROMIUM_PATH  크로미움 실행 파일. 없으면 Playwright 캐시에서 찾고, 그래도 없으면 Playwright 기본 브라우저
"""
import glob, os
from pathlib import Path

URL = os.environ.get('E2E_URL', 'http://localhost:4173/')
OUT = Path(__file__).parent / 'shots'
OUT.mkdir(exist_ok=True)
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']   # 헤드리스에서 WebGL

def chromium_path():
    if os.environ.get('CHROMIUM_PATH'): return os.environ['CHROMIUM_PATH']
    for base in ['~/Library/Caches/ms-playwright', '~/.cache/ms-playwright']:
        hits = sorted(glob.glob(os.path.expanduser(base + '/chromium_headless_shell-*/chrome-headless-shell-*/chrome-headless-shell')))
        if hits: return hits[-1]
    return None

def launch(p):
    exe = chromium_path()
    return p.chromium.launch(**({'executable_path': exe} if exe else {}), args=ARGS)

IN3D = "document.body.classList.contains('m3d') && !document.body.classList.contains('busy') && !document.querySelector('#stage').classList.contains('animating')"
IN2D = "!document.body.classList.contains('m3d') && !document.body.classList.contains('busy')"
