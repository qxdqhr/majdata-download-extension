/** MV3 Service Worker 无 URL.createObjectURL，downloads API 需用 data URL */
export function textToDownloadDataUrl(text: string, mimeType = 'text/plain;charset=utf-8'): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

/** Chrome 对 text/plain 的 data URL 常会强制保存为 .txt */
export function inferDownloadMimeType(filename: string): string {
  if (/\.(command|sh|bash)$/i.test(filename)) {
    return 'application/octet-stream';
  }
  return 'text/plain;charset=utf-8';
}

export function fileContentToDownloadDataUrl(filename: string, content: string): string {
  return textToDownloadDataUrl(content, inferDownloadMimeType(filename));
}
