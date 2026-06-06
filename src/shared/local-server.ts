export const NATIVE_HOST_NAME = 'com.majdata.download.server';

export interface LocalServerRequest {
  cmd: 'ping' | 'servePath' | 'serveZip' | 'stop' | 'status';
  path?: string;
  zipPath?: string;
  port?: number;
  extractZip?: boolean;
}

export interface LocalServerResponse {
  ok: boolean;
  url?: string;
  root?: string;
  running?: boolean;
  error?: string;
}

export function buildServeZipRequest(zipPath: string, port: number): LocalServerRequest {
  return {
    cmd: 'serveZip',
    zipPath,
    port,
    extractZip: true,
  };
}

export function buildServePathRequest(path: string, port: number): LocalServerRequest {
  return {
    cmd: 'servePath',
    path,
    port,
  };
}
