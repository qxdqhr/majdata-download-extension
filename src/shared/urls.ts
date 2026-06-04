import { MAJDATA_ORIGIN } from './constants';
import {
  extractSongIdFromHref,
  extractSongIdFromLocation,
} from './maichart-id';
import type { AssetUrls } from './types';

export { extractSongIdFromHref, extractSongIdFromLocation };

export function buildPageUrl(origin: string, songId: string): string {
  const url = new URL('/song', origin);
  url.searchParams.set('id', songId);
  return url.toString();
}

export function buildAssetUrls(origin: string, songId: string): AssetUrls {
  const encoded = encodeURIComponent(songId);
  const base = `${origin.replace(/\/$/, '')}/api3/api/maichart/${encoded}`;
  return {
    track: `${base}/track`,
    chart: `${base}/chart`,
    image: `${base}/image?fullImage=true`,
    video: `${base}/video`,
  };
}

export function buildSongContext(
  songId: string,
  title: string,
  origin: string = MAJDATA_ORIGIN,
  artist?: string,
) {
  return {
    songId,
    title,
    artist,
    pageUrl: buildPageUrl(origin, songId),
    assets: buildAssetUrls(origin, songId),
  };
}
