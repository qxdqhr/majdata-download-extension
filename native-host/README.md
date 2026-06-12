# 本地 HTTP 服务（Native Messaging Host）

Chrome 扩展无法直接执行本机命令，需安装此 **Native Messaging Host**，由扩展在 Popup「本地分享」中手动启动服务。

## 推荐安装方式（普通用户）

1. 安装扩展后打开 Popup → **本地分享**
2. 展开「首次使用：安装本机助手」
3. 点击 **下载安装脚本**
4. **macOS**：在「下载」文件夹双击 `majdata-native-host-install.command`（会自动打开终端）
5. **Linux**：在终端运行提示中的 `bash "…/majdata-native-host-install.sh"`
6. 完全退出并重新打开 Chrome，回到 Popup 打开「本地分享」开关

助手会安装到 `~/.majdata-download-extension/native-host/`，**只需 Node.js，无需 npm install**。

## 开发者安装（从源码）

```bash
cd native-host
chmod +x install.sh
./install.sh YOUR_EXTENSION_ID
```

## 功能

1. 监听扩展发来的 Native Message
2. 可选：将歌单 ZIP 解压到同名目录
3. 在目标目录启动内置静态 HTTP 服务（默认 `http://127.0.0.1:8080`）

## 手动测试

```bash
node ~/.majdata-download-extension/native-host/src/host.mjs
```

## 消息协议

| cmd | 说明 |
|-----|------|
| `ping` | 检测 host 是否可用 |
| `serveZip` | 解压 ZIP 并启动 HTTP 服务 |
| `servePath` | 直接对目录启动 HTTP 服务 |
| `stop` | 停止当前 HTTP 服务 |
| `status` | 查询运行状态 |
