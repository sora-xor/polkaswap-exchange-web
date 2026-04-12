import { describe, expect, it } from 'vitest';

import confirmSource from '@/components/pages/Swap/Confirm.vue?raw';

describe('SwapConfirm source', () => {
  it('keeps the swap confirmation dialog aligned with the production modal shell in light and noir modes', () => {
    expect(confirmSource).toContain('custom-class="dialog--confirm-swap"');
    expect(confirmSource).toContain('.transaction-number {');
    expect(confirmSource).toContain('font-weight: 600;');
    expect(confirmSource).toContain('.dialog-card.dialog--confirm-swap {');
    expect(confirmSource).toContain('padding: 24px 24px 8px;');
    expect(confirmSource).toContain('font-size: 24px;');
    expect(confirmSource).toContain('font-weight: 300;');
    expect(confirmSource).toContain('padding: 8px 24px 24px;');
    expect(confirmSource).toContain("rgb(253, 247, 251)");
    expect(confirmSource).toContain("rgb(42, 23, 31)");
    expect(confirmSource).toContain("rgb(89, 45, 113)");
    expect(confirmSource).toContain("rgb(240, 215, 220)");
    expect(confirmSource).toContain("rgb(93, 47, 115)");
  });
});
