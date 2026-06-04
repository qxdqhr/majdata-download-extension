const TMP_TAG_RE = /<\/?tmp[^>]*>/gi;

export function stripTmpTags(text: string): string {
  return text.replace(TMP_TAG_RE, '');
}

export function sanitizeTitle(text: string): string {
  const withoutTags = stripTmpTags(text)
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return withoutTags.replace(/\|/g, '／');
}

export function sanitizeDisplayText(text: string): string {
  return stripTmpTags(text).replace(/<[^>]+>/g, '').trim();
}

const INVALID_FOLDER_CHARS = /[/\\:*?"<>|]/g;

export function sanitizeFolderName(title: string): string {
  let name = sanitizeTitle(title).replace(INVALID_FOLDER_CHARS, '_').replace(/\s+/g, ' ').trim();
  if (name.length > 80) {
    name = name.slice(0, 80).trim();
  }
  return name || 'untitled';
}

export function uniqueFolderName(title: string, songId: string, usedNames: Set<string>): string {
  const base = sanitizeFolderName(title);
  let candidate = base;
  let counter = 2;

  while (usedNames.has(candidate.toLowerCase())) {
    candidate = counter === 2 ? `${base}_${songId.slice(0, 6)}` : `${base}_${counter}`;
    counter += 1;
  }

  usedNames.add(candidate.toLowerCase());
  return candidate;
}
