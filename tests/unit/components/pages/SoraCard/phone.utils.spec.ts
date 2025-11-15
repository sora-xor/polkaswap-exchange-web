import { describe, expect, it } from 'vitest';

import { buildSmsPayload } from '@/components/pages/SoraCard/phone.utils';

describe('buildSmsPayload', () => {
  it('strips a leading zero and prefixes the dial code', () => {
    const result = buildSmsPayload('+44', '01234');

    expect(result).toEqual({
      normalizedNumber: '1234',
      target: '+441234',
    });
  });

  it('handles missing dial codes', () => {
    const result = buildSmsPayload(undefined, '5555');

    expect(result).toEqual({
      normalizedNumber: '5555',
      target: '5555',
    });
  });
});
