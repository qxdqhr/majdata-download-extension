import { DOWNLOAD_LABELS, DOWNLOAD_SVG_PATH } from '@/shared/constants';

function normalizePath(path: string): string {
  return path.replace(/\s+/g, ' ').trim();
}

export function isDownloadSvg(element: Element): boolean {
  if (element.tagName.toLowerCase() === 'path') {
    const d = element.getAttribute('d');
    if (!d) return false;
    const normalized = normalizePath(d);
    const expected = normalizePath(DOWNLOAD_SVG_PATH);
    return normalized === expected || normalized.startsWith('M480-320');
  }

  if (element.tagName.toLowerCase() === 'svg') {
    const path = element.querySelector('path');
    return path ? isDownloadSvg(path) : false;
  }

  return false;
}

function hasDownloadLabel(element: Element): boolean {
  const text = element.textContent?.trim() ?? '';
  if (DOWNLOAD_LABELS.some((label) => text === label || text.includes(label))) {
    return true;
  }

  const title = element.getAttribute('title');
  if (title && DOWNLOAD_LABELS.some((label) => title === label || title.includes(label))) {
    return true;
  }

  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel && DOWNLOAD_LABELS.some((label) => ariaLabel.includes(label))) {
    return true;
  }

  return false;
}

function isClickableDownloadRoot(element: Element): boolean {
  const tag = element.tagName.toLowerCase();
  if (tag === 'button' || tag === 'a') return true;
  if (element.getAttribute('role') === 'button') return true;
  if (element.classList.contains('cursor-pointer')) return true;
  return false;
}

export function findDownloadButton(target: Element | null): HTMLElement | null {
  if (!target || !(target instanceof Element)) return null;

  let node: Element | null = target;
  const body = target.ownerDocument?.body;

  while (node && node !== body) {
    if (isDownloadSvg(node)) {
      const clickable =
        node.closest('button') ??
        node.closest('[role="button"]') ??
        node.closest('.cursor-pointer') ??
        node.parentElement;
      if (clickable instanceof HTMLElement) return clickable;
    }

    if (isClickableDownloadRoot(node) && hasDownloadLabel(node)) {
      return node as HTMLElement;
    }

    if (isClickableDownloadRoot(node) && node.querySelector('svg path')) {
      const path = node.querySelector('path');
      if (path && isDownloadSvg(path)) {
        return node as HTMLElement;
      }
    }

    node = node.parentElement;
  }

  return null;
}
