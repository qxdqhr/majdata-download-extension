import { describe, expect, it } from 'vitest';
import { buildAssetUrls, buildPageUrl } from '@/shared/urls';
import { extractSongIdFromHref } from '@/shared/maichart-id';

describe('urls', () => {
  it('builds asset urls from song id', () => {
    const assets = buildAssetUrls('https://majdata.net', 'song-1');
    expect(assets.track).toBe('https://majdata.net/api3/api/maichart/song-1/track');
    expect(assets.image).toContain('fullImage=true');
  });

  it('builds page url', () => {
    expect(buildPageUrl('https://majdata.net', 'abc')).toBe('https://majdata.net/song?id=abc');
  });

  it('extracts song id from href', () => {
    expect(extractSongIdFromHref('/song?id=hello')).toBe('hello');
  });
});
