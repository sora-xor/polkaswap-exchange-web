import { describe, expect, it } from 'vitest';

import validatorsAttentionDialogSource from '@/modules/staking/sora/components/ValidatorsAttentionDialog.vue?raw';

describe('staking sora ValidatorsAttentionDialog source', () => {
  it('uses the production risk-copy markup with explicit line breaks', () => {
    expect(validatorsAttentionDialogSource).toContain('<template v-for="item in description" :key="item">');
    expect(validatorsAttentionDialogSource).toContain('<br />');
    expect(validatorsAttentionDialogSource).not.toMatch(/p\s*\{\s*width:\s*100%;/s);
  });
});
