import { browser } from 'wxt/browser';
import {
  buildInstallSetupHints,
  buildNativeHostInstallScript,
  chromeOsToInstallPlatform,
  installScriptFilename,
  resolveInstallDownload,
  type InstallPlatform,
} from '@/shared/native-host-installer';
import { waitForDownloadPath } from '@/background/localServer';
import { fileContentToDownloadDataUrl } from '@/shared/download-data-url';

const BUNDLED_HOST_URL = '/native-host/src/host.mjs';

async function loadBundledNativeHostFile(): Promise<string> {
  const hostRes = await fetch(chrome.runtime.getURL(BUNDLED_HOST_URL));

  if (!hostRes.ok) {
    throw new Error('扩展内缺少 Native Host 安装文件，请重新安装或更新扩展');
  }

  return hostRes.text();
}

async function detectInstallPlatform(): Promise<InstallPlatform> {
  if (browser.runtime.getPlatformInfo) {
    const info = await browser.runtime.getPlatformInfo();
    return chromeOsToInstallPlatform(info.os as Parameters<typeof chromeOsToInstallPlatform>[0]);
  }
  return 'unknown';
}

export async function getNativeHostSetupInfo(): Promise<{
  extensionId: string;
  platform: InstallPlatform;
  hints: ReturnType<typeof buildInstallSetupHints>;
}> {
  const extensionId = browser.runtime.id ?? '';
  const platform = await detectInstallPlatform();
  return {
    extensionId,
    platform,
    hints: buildInstallSetupHints(platform),
  };
}

export async function downloadNativeHostInstaller(): Promise<
  | {
      ok: true;
      filename: string;
      savedPath: string;
      runCommand: string;
      platform: InstallPlatform;
      hints: ReturnType<typeof buildInstallSetupHints>;
      renameHint?: string;
    }
  | { ok: false; error: string }
> {
  try {
    const extensionId = browser.runtime.id ?? '';
    if (!extensionId) {
      return { ok: false, error: '无法读取扩展 ID' };
    }

    const platform = await detectInstallPlatform();
    const hostMjs = await loadBundledNativeHostFile();
    const content = buildNativeHostInstallScript({
      extensionId,
      hostMjs,
      platform,
    });
    const filename = installScriptFilename(platform);

    const downloadId = await browser.downloads.download({
      url: fileContentToDownloadDataUrl(filename, content),
      filename,
      saveAs: false,
    });

    const savedPath = await waitForDownloadPath(downloadId, 60_000);
    if (!savedPath) {
      return { ok: false, error: '安装脚本下载未完成，请检查浏览器下载权限' };
    }

    const resolved = resolveInstallDownload(savedPath, platform);

    return {
      ok: true,
      filename,
      savedPath: resolved.savedPath,
      runCommand: resolved.runCommand,
      platform,
      hints: buildInstallSetupHints(platform),
      renameHint: resolved.renameHint,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : '无法生成安装脚本',
    };
  }
}
