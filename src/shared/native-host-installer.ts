export type InstallPlatform = 'macos' | 'linux' | 'unknown';

export type ChromeOs = 'mac' | 'linux' | 'win' | 'openbsd' | 'android' | 'cros' | 'fuchsia' | 'unknown';

export function chromeOsToInstallPlatform(os: ChromeOs): InstallPlatform {
  if (os === 'mac') return 'macos';
  if (os === 'linux' || os === 'cros') return 'linux';
  return 'unknown';
}

export function installPlatformLabel(platform: InstallPlatform): string {
  if (platform === 'macos') return 'macOS';
  if (platform === 'linux') return 'Linux';
  return '当前系统';
}

export function installScriptFilename(platform: InstallPlatform): string {
  if (platform === 'macos') return 'majdata-native-host-install.command';
  return 'majdata-native-host-install.sh';
}

function encodeBase64(text: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(text, 'utf8').toString('base64');
  }
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function buildNativeHostInstallScript(options: {
  extensionId: string;
  hostMjs: string;
  platform: InstallPlatform;
}): string {
  const { extensionId, hostMjs, platform } = options;
  const hostB64 = encodeBase64(hostMjs);
  const pauseOnComplete = platform === 'macos';

  return `#!/usr/bin/env bash
set -euo pipefail

EXTENSION_ID="${extensionId}"
INSTALL_DIR="\${HOME}/.majdata-download-extension/native-host"
HOST_PATH="\${INSTALL_DIR}/src/host.mjs"
MANIFEST_NAME="com.majdata.download.server.json"

base64_decode() {
  if [[ "\$(uname -s)" == "Darwin" ]]; then
    base64 -D
  else
    base64 -d
  fi
}

echo "=== Majdata 本地分享助手 · 一次性安装 ==="
echo "安装位置: \${INSTALL_DIR}"
echo "扩展 ID: \${EXTENSION_ID}"
echo

if ! command -v node >/dev/null 2>&1; then
  echo "未找到 Node.js，请先安装: https://nodejs.org/" >&2
  exit 1
fi

mkdir -p "\${INSTALL_DIR}/src"

echo "正在写入 Native Host 文件…"
base64_decode <<'__HOST_B64__' > "\${HOST_PATH}"
${hostB64}
__HOST_B64__

chmod +x "\${HOST_PATH}"

TARGET_DIRS=()
OS="\$(uname -s)"

if [[ "\${OS}" == "Darwin" ]]; then
  CHROME_BASE="\${HOME}/Library/Application Support"
  for name in "Google/Chrome" "Chromium" "Microsoft Edge"; do
    dir="\${CHROME_BASE}/\${name}/NativeMessagingHosts"
    if [[ -d "\${CHROME_BASE}/\${name}" ]] || [[ "\${name}" == "Google/Chrome" ]]; then
      TARGET_DIRS+=("\${dir}")
    fi
  done
elif [[ "\${OS}" == "Linux" ]]; then
  CONFIG="\${HOME}/.config"
  for name in google-chrome chromium microsoft-edge; do
    dir="\${CONFIG}/\${name}/NativeMessagingHosts"
    if [[ -d "\${CONFIG}/\${name}" ]] || [[ "\${name}" == "google-chrome" ]]; then
      TARGET_DIRS+=("\${dir}")
    fi
  done
else
  echo "当前系统 (\${OS}) 暂不支持自动注册 Native Host。" >&2
  exit 1
fi

if [[ \${#TARGET_DIRS[@]} -eq 0 ]]; then
  echo "未找到 Chrome/Chromium/Edge 配置目录，请先安装并打开过一次浏览器。" >&2
  exit 1
fi

for dir in "\${TARGET_DIRS[@]}"; do
  mkdir -p "\${dir}"
  cat > "\${dir}/\${MANIFEST_NAME}" <<EOF
{
  "name": "com.majdata.download.server",
  "description": "Majdata Download Queue local http-server host",
  "path": "\${HOST_PATH}",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://\${EXTENSION_ID}/"
  ]
}
EOF
  echo "已注册: \${dir}/\${MANIFEST_NAME}"
done

echo
echo "✓ 安装完成！请完全退出并重新打开 Chrome，然后在扩展 Popup 打开「本地分享」开关。"
echo "Native host: \${HOST_PATH}"
${pauseOnComplete ? `
read -r -p "按回车键关闭此窗口…" _
` : ''}`;
}

export function buildRunInstallCommand(savedPath: string): string {
  const quoted = `"${savedPath.replace(/"/g, '\\"')}"`;
  if (savedPath.endsWith('.command')) {
    return `open ${quoted}`;
  }
  return `bash ${quoted}`;
}

export function resolveInstallDownload(
  savedPath: string,
  platform: InstallPlatform,
): { savedPath: string; runCommand: string; renameHint?: string } {
  if (platform === 'macos' && savedPath.endsWith('.txt')) {
    const commandPath = savedPath.replace(/\.txt$/i, '.command');
    const savedQuoted = `"${savedPath.replace(/"/g, '\\"')}"`;
    const commandQuoted = `"${commandPath.replace(/"/g, '\\"')}"`;
    return {
      savedPath,
      runCommand: `mv ${savedQuoted} ${commandQuoted} && chmod +x ${commandQuoted} && open ${commandQuoted}`,
      renameHint: 'Chrome 可能把脚本保存成了 .txt，请运行下方命令重命名为 .command 并打开',
    };
  }

  return {
    savedPath,
    runCommand: buildRunInstallCommand(savedPath),
  };
}

export function buildInstallSetupHints(platform: InstallPlatform): {
  title: string;
  steps: string[];
  downloadButtonLabel: string;
} {
  if (platform === 'macos') {
    return {
      title: '首次使用：安装本机助手（一次性）',
      steps: [
        '点击下方按钮，会在「下载」文件夹保存 .command 安装脚本',
        '在 Finder 中双击该文件（会自动打开「终端」并执行安装）',
        '安装完成后完全退出 Chrome 再打开，回到此处打开「本地分享」开关',
      ],
      downloadButtonLabel: '下载安装脚本',
    };
  }
  if (platform === 'linux') {
    return {
      title: '首次使用：安装本机助手（一次性）',
      steps: [
        '点击下方按钮，会在「下载」文件夹保存 .sh 安装脚本',
        '打开终端，运行下方命令（或把脚本拖进终端后回车）',
        '安装完成后完全退出 Chrome 再打开，回到此处打开「本地分享」开关',
      ],
      downloadButtonLabel: '下载安装脚本',
    };
  }
  return {
    title: '首次使用：安装本机助手（一次性）',
    steps: [
      '本功能目前支持 macOS 与 Linux',
      '下载安装脚本后按终端提示完成安装',
    ],
    downloadButtonLabel: '下载安装脚本',
  };
}
