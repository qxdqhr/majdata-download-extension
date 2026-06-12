import { describe, expect, it } from 'vitest';
import {
  buildInstallSetupHints,
  buildNativeHostInstallScript,
  buildRunInstallCommand,
  chromeOsToInstallPlatform,
  installScriptFilename,
  resolveInstallDownload,
} from '@/shared/native-host-installer';
import {
  basenameFromPath,
  buildNativeHostInstallCommand,
} from '@/shared/local-server-state';
import { buildServePathRequest, buildServeZipRequest } from '@/shared/local-server';

describe('local-server helpers', () => {
  it('builds serveZip request with extract enabled', () => {
    expect(buildServeZipRequest('/tmp/a.zip', 8080)).toEqual({
      cmd: 'serveZip',
      zipPath: '/tmp/a.zip',
      port: 8080,
      extractZip: true,
    });
  });

  it('builds servePath request', () => {
    expect(buildServePathRequest('/home/user/Downloads', 9000)).toEqual({
      cmd: 'servePath',
      path: '/home/user/Downloads',
      port: 9000,
    });
  });
});

describe('local-server-state helpers', () => {
  it('extracts basename from path', () => {
    expect(basenameFromPath('/home/user/Downloads/majdata-playlist.zip')).toBe('majdata-playlist.zip');
    expect(basenameFromPath('C:\\Users\\qhr\\Downloads\\a.zip')).toBe('a.zip');
  });

  it('points legacy install command to popup download flow', () => {
    expect(buildNativeHostInstallCommand('abc123')).toContain('下载安装脚本');
  });
});

describe('native-host-installer', () => {
  it('maps chrome os to install platform', () => {
    expect(chromeOsToInstallPlatform('mac')).toBe('macos');
    expect(chromeOsToInstallPlatform('linux')).toBe('linux');
    expect(chromeOsToInstallPlatform('win')).toBe('unknown');
  });

  it('uses .command filename on macOS', () => {
    expect(installScriptFilename('macos')).toBe('majdata-native-host-install.command');
    expect(installScriptFilename('linux')).toBe('majdata-native-host-install.sh');
  });

  it('embeds extension id and host files without npm install', () => {
    const script = buildNativeHostInstallScript({
      extensionId: 'abc123',
      hostMjs: 'console.log("host");',
      platform: 'linux',
    });
    expect(script).toContain('EXTENSION_ID="abc123"');
    expect(script).toContain('.majdata-download-extension/native-host');
    expect(script).not.toContain('npm install');
    expect(script).toContain('command -v node');
  });

  it('builds platform-specific run commands', () => {
    expect(buildRunInstallCommand('/Users/a/Downloads/x.command')).toBe(
      'open "/Users/a/Downloads/x.command"',
    );
    expect(buildRunInstallCommand('/home/a/Downloads/x.sh')).toBe(
      'bash "/home/a/Downloads/x.sh"',
    );
  });

  it('fixes mac txt downloads with rename command', () => {
    const resolved = resolveInstallDownload('/Users/a/Downloads/majdata-native-host-install.txt', 'macos');
    expect(resolved.runCommand).toContain('.command');
    expect(resolved.renameHint).toContain('.txt');
  });

  it('provides setup hints per platform', () => {
    expect(buildInstallSetupHints('macos').steps[1]).toContain('双击');
    expect(buildInstallSetupHints('linux').steps[1]).toContain('终端');
  });
});
