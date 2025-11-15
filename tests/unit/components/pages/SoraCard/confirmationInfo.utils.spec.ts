import { describe, expect, it } from 'vitest';

import { sanitizeRejectReasons } from '@/components/pages/SoraCard/confirmationInfo.utils';

describe('sanitizeRejectReasons', () => {
  it('removes unsafe markup and empty entries', () => {
    const reasons = ['<script>alert(1)</script>', '  ', 'Valid reason'];

    const sanitized = sanitizeRejectReasons(reasons);

    expect(sanitized).toEqual(['&lt;script&gt;alert(1)&lt;/script&gt;', 'Valid reason']);
  });
});
