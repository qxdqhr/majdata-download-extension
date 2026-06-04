import { describe, expect, it } from 'vitest';
import { formatBatchZipFilename } from '@/shared/batch-job';

describe('batch-job', () => {
  it('formats zip filename with prefix and timestamp', () => {
    const date = new Date('2026-06-04T09:30:00');
    expect(formatBatchZipFilename('majdata-playlist', date)).toBe(
      'majdata-playlist-20260604-093000.zip',
    );
  });
});
