import { MAJDATA_ORIGIN } from './constants';

const MAICHART_ID_RE = /\/maichart\/([^/?#]+)/i;
const DOWNLOAD_PATH_MARK = '480-320';
const RESERVED_ELEMENT_IDS = new Set(['root', 'app', 'main']);

export function extractSongIdFromMaichartUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(MAICHART_ID_RE);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]).trim() || null;
  } catch {
    return match[1].trim() || null;
  }
}

export function extractSongIdFromHref(href: string): string | null {
  if (!href) return null;

  const maichartId = extractSongIdFromMaichartUrl(href);
  if (maichartId) return maichartId;

  try {
    const url = new URL(href, MAJDATA_ORIGIN);
    const id = url.searchParams.get('id');
    if (id?.trim()) return id.trim();

    const pathMatch = url.pathname.match(/\/song\/([^/?#]+)/i);
    if (pathMatch?.[1]) {
      return decodeURIComponent(pathMatch[1]).trim() || null;
    }
  } catch {
    return null;
  }

  return null;
}

export function extractSongIdFromLocation(location: Location): string | null {
  const normalizedPath = location.pathname.replace(/\/+$/, '') || '/';
  const isSongPage = normalizedPath === '/song' || normalizedPath.endsWith('/song');

  if (isSongPage) {
    const fromQuery = new URLSearchParams(location.search).get('id');
    if (fromQuery?.trim()) return fromQuery.trim();
  }

  return null;
}

function collectUrlCandidates(value: string | null | undefined, bucket: string[]): void {
  if (value?.trim()) bucket.push(value.trim());
}

function collectImageUrls(img: HTMLImageElement): string[] {
  const urls: string[] = [];
  collectUrlCandidates(img.getAttribute('src'), urls);
  collectUrlCandidates(img.src, urls);
  collectUrlCandidates(img.currentSrc, urls);
  collectUrlCandidates(img.getAttribute('data-src'), urls);
  collectUrlCandidates(img.getAttribute('data-original'), urls);

  const srcset = img.getAttribute('srcset');
  if (srcset) {
    for (const part of srcset.split(',')) {
      collectUrlCandidates(part.trim().split(/\s+/)[0], urls);
    }
  }

  return urls;
}

function hasDownloadMarker(root: Element): boolean {
  return !!root.querySelector(`path[d*="${DOWNLOAD_PATH_MARK}"]`);
}

function hasMaichartMarker(root: Element): boolean {
  if (root.querySelector('img[src*="maichart/"], img[src*="/api3/api/"]')) return true;
  if (root.querySelector('[style*="maichart"]')) return true;
  return !!root.querySelector('a[href*="song?id="], a[href*="/song?id="]');
}

function isMajdataSongCardRoot(el: Element): boolean {
  const id = el.id?.trim();
  if (!id || RESERVED_ELEMENT_IDS.has(id)) return false;
  return hasDownloadMarker(el) && hasMaichartMarker(el);
}

function collectSongIdsFromLinks(root: Element): string[] {
  const ids: string[] = [];
  for (const anchor of root.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    const href = anchor.getAttribute('href') ?? anchor.href;
    if (!href.includes('song')) continue;
    const id = extractSongIdFromHref(href);
    if (id) ids.push(id);
  }
  return ids;
}

function pickMostCommonId(ids: string[]): string | null {
  if (ids.length === 0) return null;
  const counts = new Map<string, number>();
  for (const id of ids) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [id, count] of counts) {
    if (count > bestCount) {
      best = id;
      bestCount = count;
    }
  }
  return best;
}

export function extractSongIdFromElement(root: Element): string | null {
  if (isMajdataSongCardRoot(root)) {
    return root.id.trim();
  }

  const h1 = root.querySelector('h1[id]');
  if (h1?.id?.trim()) return h1.id.trim();

  for (const titled of root.querySelectorAll<HTMLElement>('div[id].truncate, div[id][class*="font-bold"]')) {
    const id = titled.id?.trim();
    if (id && !RESERVED_ELEMENT_IDS.has(id)) return id;
  }

  for (const img of root.querySelectorAll<HTMLImageElement>('img')) {
    for (const url of collectImageUrls(img)) {
      const id = extractSongIdFromMaichartUrl(url);
      if (id) return id;
    }
  }

  const linkIds = collectSongIdsFromLinks(root);
  const linkId = pickMostCommonId(linkIds);
  if (linkId) return linkId;

  for (const source of root.querySelectorAll<HTMLSourceElement>('source[srcset], source[src]')) {
    const src = source.getAttribute('src');
    if (src) {
      const id = extractSongIdFromMaichartUrl(src);
      if (id) return id;
    }
    const srcset = source.getAttribute('srcset');
    if (srcset) {
      for (const part of srcset.split(',')) {
        const id = extractSongIdFromMaichartUrl(part.trim().split(/\s+/)[0] ?? '');
        if (id) return id;
      }
    }
  }

  for (const el of root.querySelectorAll<HTMLElement>('[style*="maichart"]')) {
    const id = extractSongIdFromMaichartUrl(el.getAttribute('style') ?? '');
    if (id) return id;
  }

  return null;
}

/** Walk up from click target; prefer Majdata SongCard root div#songId. */
export function extractSongIdFromListCard(start: Element): string | null {
  let node: Element | null = start;
  const body = start.ownerDocument?.body;

  while (node && node !== body) {
    if (isMajdataSongCardRoot(node)) {
      return node.id.trim();
    }

    const fromSubtree = extractSongIdFromElement(node);
    if (fromSubtree) return fromSubtree;

    node = node.parentElement;
  }

  return null;
}

export function findSongContainer(start: Element): Element | null {
  let node: Element | null = start;
  const body = start.ownerDocument?.body;

  while (node && node !== body) {
    if (isMajdataSongCardRoot(node)) return node;
    if (extractSongIdFromElement(node)) return node;
    node = node.parentElement;
  }

  return null;
}
