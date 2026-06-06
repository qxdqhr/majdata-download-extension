#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "用法: $0 <chrome-extension-id>"
  echo "示例: $0 abcdefghijklmnopqrstuvwxyz123456"
  exit 1
fi

EXTENSION_ID="$1"
HOST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOST_PATH="${HOST_DIR}/src/host.mjs"
MANIFEST_NAME="com.majdata.download.server.json"

if [[ ! -f "${HOST_PATH}" ]]; then
  echo "找不到 native host: ${HOST_PATH}" >&2
  exit 1
fi

echo "安装 native-host 依赖…"
(cd "${HOST_DIR}" && npm install --omit=dev)

TARGET_DIRS=()
if [[ -d "${HOME}/.config/google-chrome/NativeMessagingHosts" ]]; then
  TARGET_DIRS+=("${HOME}/.config/google-chrome/NativeMessagingHosts")
fi
if [[ -d "${HOME}/.config/chromium/NativeMessagingHosts" ]]; then
  TARGET_DIRS+=("${HOME}/.config/chromium/NativeMessagingHosts")
fi
if [[ -d "${HOME}/.config/microsoft-edge/NativeMessagingHosts" ]]; then
  TARGET_DIRS+=("${HOME}/.config/microsoft-edge/NativeMessagingHosts")
fi

if [[ ${#TARGET_DIRS[@]} -eq 0 ]]; then
  echo "未找到 Chrome/Chromium/Edge NativeMessagingHosts 目录" >&2
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
  echo "已写入 ${dir}/${MANIFEST_NAME}"
done

echo
echo "安装完成。请在扩展设置中开启「下载完成后启动本地 HTTP 服务」。"
echo "Native host: ${HOST_PATH}"
