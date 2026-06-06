# 本地 HTTP 服务（Native Messaging Host）

Chrome 扩展无法直接执行 `http-server` 等本机命令，需安装此 **Native Messaging Host**，由扩展在批量下载完成后发送消息启动服务。

## 功能

1. 监听扩展发来的 Native Message
2. 可选：将歌单 ZIP 解压到同名目录
3. 在目标目录启动 `http-server`（默认 `http://127.0.0.1:8080`）

## 安装（Linux）

1. 在 `chrome://extensions` 复制扩展 ID
2. 执行：

```bash
cd native-host
chmod +x install-linux.sh
./install-linux.sh YOUR_EXTENSION_ID
```

3. 在扩展 **设置 → 批量下载** 中勾选「下载完成后启动本地 HTTP 服务」

## 手动测试

```bash
cd native-host
npm install
node ./src/host.mjs
```

## 消息协议

| cmd | 说明 |
|-----|------|
| `ping` | 检测 host 是否可用 |
| `serveZip` | 解压 ZIP 并启动 http-server |
| `servePath` | 直接对目录启动 http-server |
| `stop` | 停止当前 http-server |
| `status` | 查询运行状态 |

请求示例：

```json
{ "cmd": "serveZip", "zipPath": "/home/user/Downloads/majdata-playlist-20260606-120000.zip", "port": 8080 }
```

响应示例：

```json
{ "ok": true, "url": "http://127.0.0.1:8080", "root": "/home/user/Downloads/majdata-playlist-20260606-120000", "running": true }
```
