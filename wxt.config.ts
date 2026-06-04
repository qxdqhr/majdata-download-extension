import { defineConfig } from 'wxt';
import { resolve } from 'node:path';

export default defineConfig({
  srcDir: 'src',
  outDir: 'dist',
  alias: {
    '@': resolve(__dirname, 'src'),
  },
  manifest: {
    name: 'Majdata Download Queue',
    description: '为 majdata.net 添加下载队列，支持批量导出下载链接',
    permissions: ['storage'],
    host_permissions: ['https://majdata.net/*', 'https://www.majdata.net/*'],
    action: {
      default_title: 'Majdata 下载列表',
    },
  },
});
