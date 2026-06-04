import { MAJDATA_ORIGIN } from '@/shared/constants';
import {
  extractSongIdFromListCard,
  extractSongIdFromLocation,
  findSongContainer,
} from '@/shared/maichart-id';
import { sanitizeDisplayText, sanitizeTitle } from '@/shared/sanitize';
import type { SongContext } from '@/shared/types';
import { buildSongContext } from '@/shared/urls';

function readTitleFromDetailPage(): string | null {
  const h1 = document.querySelector('h1');
  if (h1?.textContent?.trim()) {
    return sanitizeTitle(sanitizeDisplayText(h1.textContent));
  }
  return null;
}

function readTitleFromContainer(container: Element): string | null {
  const titledDiv = container.querySelector<HTMLElement>('div.truncate[id], div[id].truncate');
  if (titledDiv?.textContent?.trim()) {
    return sanitizeTitle(sanitizeDisplayText(titledDiv.textContent));
  }

  const songLink = container.querySelector<HTMLAnchorElement>('a[href*="song"]');
  if (songLink?.textContent?.trim()) {
    return sanitizeTitle(sanitizeDisplayText(songLink.textContent));
  }

  const heading = container.querySelector('h1, h2, h3, [class*="font-bold"], [class*="font-semibold"]');
  if (heading?.textContent?.trim()) {
    return sanitizeTitle(sanitizeDisplayText(heading.textContent));
  }

  return null;
}

function readArtistFromContainer(container: Element): string | undefined {
  const songLinks = container.querySelectorAll<HTMLAnchorElement>('a[href*="song"]');
  if (songLinks.length >= 2 && songLinks[1].textContent?.trim()) {
    return sanitizeDisplayText(songLinks[1].textContent);
  }

  const artistLike = container.querySelector('.italic, [class*="artist"]');
  if (artistLike?.textContent?.trim()) {
    return sanitizeDisplayText(artistLike.textContent);
  }

  return undefined;
}

export function parseSongContext(button: HTMLElement): SongContext | null {
  const origin = window.location.origin || MAJDATA_ORIGIN;

  const detailSongId =
    extractSongIdFromLocation(window.location) ??
    document.querySelector('h1[id]')?.id ??
    null;

  if (detailSongId) {
    const title = readTitleFromDetailPage() ?? detailSongId;
    return buildSongContext(detailSongId, title, origin);
  }

  const songId = extractSongIdFromListCard(button);
  if (!songId) return null;

  const container = findSongContainer(button) ?? button;
  const title = readTitleFromContainer(container) ?? songId;
  const artist = readArtistFromContainer(container);

  return buildSongContext(songId, title, origin, artist);
}
