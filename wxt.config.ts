import { defineConfig } from 'wxt';
import { resolve } from 'node:path';

export default defineConfig({
  srcDir: 'src',
  outDir: 'dist',
  alias: {
    '@': resolve(__dirname, 'src'),
  },
  // 手动加载 dist/chrome-mv3/；dev 时本地用 chrome-mv3-dev（含 localhost 引用，不可分发）
  webExt: {
    disabled: true,
  },
  zip: {
    artifactTemplate: 'majdata-download-extension-{{version}}-{{browser}}.zip',
  },
  vite: () => ({
    optimizeDeps: {
      // Vite 8 默认扫描项目内全部 HTML，会把 dist/ 产物误当作入口
      noDiscovery: true,
      entries: [],
    },
  }),
  manifest: {
    name: 'Majdata Download Queue',
    description: '为 majdata.net 添加下载队列，支持批量导出下载链接',
    permissions: ['storage', 'windows', 'downloads', 'cookies', 'nativeMessaging', 'notifications'],
    host_permissions: ['https://majdata.net/*', 'https://www.majdata.net/*'],
    action: {
      default_title: 'Majdata 下载列表',
    },
  },
});
