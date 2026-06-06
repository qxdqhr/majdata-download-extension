import { describe, expect, it } from 'vitest';
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
