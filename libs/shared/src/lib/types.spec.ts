import { describe, expect, it } from 'vitest';
import { validateResourceName } from './types';

describe('validateResourceName', () => {
  it('accepts valid names', () => {
    expect(validateResourceName('events-order', 'topic name')).toBeNull();
    expect(validateResourceName('my_topic.v1', 'topic name')).toBeNull();
  });

  it('rejects empty names', () => {
    expect(validateResourceName('', 'topic name')).toBe('topic name is required.');
  });

  it('rejects invalid characters', () => {
    expect(validateResourceName('1invalid', 'topic name')).toMatch(/Invalid/);
  });
});
