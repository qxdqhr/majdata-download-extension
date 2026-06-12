import { describe, expect, it } from 'vitest';
import {
  fileContentToDownloadDataUrl,
  inferDownloadMimeType,
  textToDownloadDataUrl,
} from '@/shared/download-data-url';

describe('download-data-url', () => {
  it('builds base64 data url for service worker downloads', () => {
    const url = textToDownloadDataUrl('#!/bin/bash\necho hi');
    expect(url.startsWith('data:text/plain;charset=utf-8;base64,')).toBe(true);
    const base64 = url.split(',')[1] ?? '';
    expect(atob(base64)).toBe('#!/bin/bash\necho hi');
  });

  it('uses octet-stream for shell installers to preserve extension', () => {
    expect(inferDownloadMimeType('majdata-native-host-install.command')).toBe('application/octet-stream');
    const url = fileContentToDownloadDataUrl('majdata-native-host-install.command', '#!/bin/bash');
    expect(url.startsWith('data:application/octet-stream;base64,')).toBe(true);
  });
});
