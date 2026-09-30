// e2e 실행: 빌드 → 미리보기 서버 → 파이썬 Playwright 테스트(app, editor) → 서버 종료
// 필요: python3 + `pip install playwright` (+ `playwright install chromium` 또는 CHROMIUM_PATH)
import { spawn, spawnSync } from 'node:child_process';

const PORT = process.env.E2E_PORT ?? '4173';
const run = (cmd, args, opts = {}) => spawnSync(cmd, args, {stdio: 'inherit', ...opts}).status ?? 1;

if (!process.argv.includes('--no-build') && run('npx', ['vite', 'build'])) process.exit(1);
const server = spawn('npx', ['vite', 'preview', '--port', PORT, '--strictPort'], {stdio: 'ignore'});
const url = `http://localhost:${PORT}/`;
for (let i = 0; i < 50; i++){
  try { const r = await fetch(url); if (r.ok) break; } catch { /* 아직 안 뜸 */ }
  await new Promise(r => setTimeout(r, 200));
}
let code = 0;
for (const suite of ['app.py', 'editor.py']){
  console.log(`\n▶ ${suite}`);
  code ||= run(process.env.E2E_PYTHON ?? 'python3', [suite], {cwd: new URL('../tests/e2e/', import.meta.url), env: {...process.env, E2E_URL: url}});
}
server.kill();
process.exit(code);
