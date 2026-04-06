import { describe, expect, it } from 'vitest';

import overviewSource from '@/modules/staking/sora/views/Overview.vue?raw';

describe('staking sora Overview source', () => {
  it('uses a dedicated vertical wrapper for the overview info lines', () => {
    expect(overviewSource).toContain('<div class="overview-info">');
    expect(overviewSource).not.toContain('<div class="info">');
    expect(overviewSource).toContain(":integer-only=\"minNominatorBondFormatted === '0'\"");
    expect(overviewSource).toMatch(
      /\.overview-info\s*\{\s*display:\s*flex;\s*flex-direction:\s*column;\s*width:\s*100%;\s*min-width:\s*0;\s*margin-top:\s*25px;\s*\}/s
    );
  });
});
