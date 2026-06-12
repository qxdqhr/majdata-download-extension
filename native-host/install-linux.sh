#!/usr/bin/env bash
# 兼容旧命令；实际逻辑见 install.sh
set -euo pipefail
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/install.sh" "$@"
