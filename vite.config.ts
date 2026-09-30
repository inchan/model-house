import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// npm run build        → dist/ (3D 엔진은 처음 3D로 전환할 때 별도 청크로 로드)
// npm run build:single → dist-single/index.html 한 파일 (더블클릭으로 열기용)
//   단일 파일은 폰트까지 base64로 들어가면 너무 커지므로 Pretendard 대신 시스템 한글 폰트를 쓴다
export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  return {
    base: './',
    plugins: single ? [viteSingleFile()] : [],
    resolve: {
      alias: single
        ? [{ find: 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css', replacement: '/src/styles/font-system.css' }]
        : [],
    },
    build: {
      outDir: single ? 'dist-single' : 'dist',
      target: 'es2022',
      chunkSizeWarningLimit: 1200,
    },
  };
});
