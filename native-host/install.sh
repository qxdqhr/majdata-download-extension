#!/usr/bin/env bash
# 将 Native Host 安装到 ~/.majdata-download-extension/native-host（与仓库目录无关）
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "用法: $0 <chrome-extension-id>"
  exit 1
fi

EXTENSION_ID="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="${HOME}/.majdata-download-extension/native-host"
HOST_PATH="${INSTALL_DIR}/src/host.mjs"
MANIFEST_NAME="com.majdata.download.server.json"

if [[ ! -f "${SCRIPT_DIR}/src/host.mjs" ]]; then
  echo "找不到 ${SCRIPT_DIR}/src/host.mjs" >&2
  echo "若你只有扩展 ZIP、没有源码，请在扩展 Popup「本地分享」里点击「下载安装脚本」。" >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "未找到 Node.js，请先安装: https://nodejs.org/" >&2
  exit 1
fi

echo "=== Majdata 本地分享助手 · 一次性安装 ==="
echo "安装位置: ${INSTALL_DIR}"
echo

mkdir -p "${INSTALL_DIR}/src"
cp "${SCRIPT_DIR}/src/host.mjs" "${HOST_PATH}"
chmod +x "${HOST_PATH}"

TARGET_DIRS=()
OS="$(uname -s)"

if [[ "${OS}" == "Darwin" ]]; then
  CHROME_BASE="${HOME}/Library/Application Support"
  for name in "Google/Chrome" "Chromium" "Microsoft Edge"; do
    dir="${CHROME_BASE}/${name}/NativeMessagingHosts"
    if [[ -d "${CHROME_BASE}/${name}" ]] || [[ "${name}" == "Google/Chrome" ]]; then
      TARGET_DIRS+=("${dir}")
    fi
  done
elif [[ "${OS}" == "Linux" ]]; then
  CONFIG="${HOME}/.config"
  for name in google-chrome chromium microsoft-edge; do
    dir="${CONFIG}/${name}/NativeMessagingHosts"
    if [[ -d "${CONFIG}/${name}" ]] || [[ "${name}" == "google-chrome" ]]; then
      TARGET_DIRS+=("${dir}")
    fi
  done
else
  echo "当前系统 (${OS}) 暂不支持自动注册，请手动写入 Native Messaging manifest。" >&2
  exit 1
fi

if [[ ${#TARGET_DIRS[@]} -eq 0 ]]; then
  echo "未找到 Chrome/Chromium/Edge 配置目录" >&2
  exit 1
fi

for dir in "${TARGET_DIRS[@]}"; do
  mkdir -p "${dir}"
  cat > "${dir}/${MANIFEST_NAME}" <<EOF
{
  "name": "com.majdata.download.server",
  "description": "Majdata Download Queue local http-server host",
  "path": "${HOST_PATH}",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://${EXTENSION_ID}/"
  ]
}
EOF
  echo "已注册: ${dir}/${MANIFEST_NAME}"
done

echo
echo "安装完成。请回到扩展 Popup，在「本地分享」里打开开关即可。"
echo "Native host: ${HOST_PATH}"
