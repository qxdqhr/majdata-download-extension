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
