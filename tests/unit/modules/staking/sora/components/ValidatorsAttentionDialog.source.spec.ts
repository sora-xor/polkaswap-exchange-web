import { describe, expect, it } from 'vitest';

import validatorsAttentionDialogSource from '@/modules/staking/sora/components/ValidatorsAttentionDialog.vue?raw';

describe('staking sora ValidatorsAttentionDialog source', () => {
  it('uses paragraph-based production risk-copy markup', () => {
    expect(validatorsAttentionDialogSource).toContain('<p v-for="item in description" :key="item">{{ item }}</p>');
    expect(validatorsAttentionDialogSource).not.toContain('<br />');
    expect(validatorsAttentionDialogSource).not.toMatch(/p\s*\{\s*width:\s*100%;/s);
  });

  it('keeps the warning content clear of the modal close header', () => {
    expect(validatorsAttentionDialogSource).toContain('custom-class="validators-attention-dialog"');
    expect(validatorsAttentionDialogSource).toContain(
      ':global(.dialog-card.validators-attention-dialog .dialog-card__header)'
    );
    expect(validatorsAttentionDialogSource).not.toContain('margin-top: -50px');
  });

  it('keeps modal depth aligned to a top-left light source', () => {
    expect(validatorsAttentionDialogSource).toContain('--validators-attention-shadow-light');
    expect(validatorsAttentionDialogSource).toContain('--validators-attention-shadow-dark');
    expect(validatorsAttentionDialogSource).toContain('-6px -6px 18px var(--validators-attention-shadow-light)');
    expect(validatorsAttentionDialogSource).toContain('14px 18px 44px var(--validators-attention-shadow-dark)');
    expect(validatorsAttentionDialogSource).toContain('button.dialog-card__close.el-button.neumorphic.s-action');
  });
});
