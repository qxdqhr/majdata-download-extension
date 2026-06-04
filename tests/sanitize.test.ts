import { describe, expect, it } from 'vitest';
import { sanitizeTitle, stripTmpTags } from '@/shared/sanitize';

describe('sanitize', () => {
  it('strips tmp rich text tags', () => {
    expect(stripTmpTags('<tmp color="red">Hello</tmp>')).toBe('Hello');
  });

  it('replaces pipe characters in title', () => {
    expect(sanitizeTitle('A|B')).toBe('A／B');
  });
});
