import { describe, expect, it } from 'vitest';
import { sanitizeFolderName, sanitizeTitle, stripTmpTags, uniqueFolderName } from '@/shared/sanitize';

describe('sanitize', () => {
  it('strips tmp rich text tags', () => {
    expect(stripTmpTags('<tmp color="red">Hello</tmp>')).toBe('Hello');
  });

  it('replaces pipe characters in title', () => {
    expect(sanitizeTitle('A|B')).toBe('A／B');
  });

  it('removes invalid folder characters', () => {
    expect(sanitizeFolderName('Break/Through*Myself')).toBe('Break_Through_Myself');
  });

  it('deduplicates folder names', () => {
    const used = new Set<string>();
    const first = uniqueFolderName('Same Title', 'abc123456789', used);
    const second = uniqueFolderName('Same Title', 'def987654321', used);
    expect(first).toBe('Same Title');
    expect(second).toContain('def987');
  });
});
