#!/usr/bin/env node
import { readdir, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(projectRoot, 'dist');

async function main() {
  await rm(join(distDir, 'chrome-mv3-dev'), { recursive: true, force: true });

  let entries = [];
  try {
    entries = await readdir(distDir);
  } catch {
    return;
  }

  for (const name of entries) {
    if (name.includes('-dev.zip')) {
      await rm(join(distDir, name), { force: true });
    }
  }

  console.log('[majdata] 已清理 dev 产物，仅保留 dist/chrome-mv3/ 与生产 zip');
}

main().catch((error) => {
  console.error('[majdata] 清理失败:', error instanceof Error ? error.message : error);
  process.exit(1);
});
