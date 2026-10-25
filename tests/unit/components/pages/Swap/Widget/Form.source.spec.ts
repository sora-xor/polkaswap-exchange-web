import { describe, expect, it } from 'vitest';

import formSource from '@/features/swap/components/widgets/Form.vue?raw';

describe('SwapForm source', () => {
  it('keeps Noir CTA depth and accessible enabled-action colors', () => {
    expect(formSource).toContain("import('@/features/swap/components/Confirm.vue')");
    expect(formSource).toContain("import('@/shared/ui/StatusActionBadge.vue')");
    expect(formSource).toContain("import('@/features/swap/components/TransactionDetails.vue')");
    expect(formSource).toContain("import('@/features/swap/components/LossWarningDialog.vue')");
    expect(formSource).toContain("import('@/features/swap/components/settings/Settings.vue')");
    expect(formSource).toContain(
      'button.el-button.neumorphic.action-button.s-primary:not(:disabled):not(.is-disabled)'
    );
    expect(formSource).toContain('border-color: #ede4e7 !important;');
    expect(formSource).toContain('background-color: var(--s-color-action-fill-hover) !important;');
    expect(formSource).toContain('border-color: #f2eaed !important;');
    expect(formSource).toContain('0 0 6.42111px rgba(247, 84, 163, 0.16) !important;');
    expect(formSource.replace(/\s+/g, ' ')).toContain(
      "[design-system-theme='dark'] .swap-form button.el-button.neumorphic.action-button.s-primary:not(:disabled):not(.is-disabled)"
    );
    expect(formSource).toContain('border-color: #693d81 !important;');
    expect(formSource).toContain('1px 1px 5px #391057');
    expect(formSource).toContain('-1px -1px 5px #9b6fa5 !important;');
    expect(formSource).toContain('background-color: #f754a3 !important;');
    expect(formSource).toContain('border-color: #592d71 !important;');
    expect(formSource).toContain('color: var(--s-color-on-action) !important;');
  });

  it('bundles the token selector with the swap form to avoid delayed first-open loading', () => {
    expect(formSource).toContain("import SelectToken from '@/components/shared/SelectAsset/SelectToken.vue';");
    expect(formSource).not.toContain(
      "const SelectToken = createAsyncComponent(() => import('@/components/shared/SelectAsset/SelectToken.vue'))"
    );
  });

  it('names icon-only action buttons for assistive technology', () => {
    expect(formSource).toContain(':aria-label="t(\'headerMenu.settings\')"');
    expect(formSource).toContain(':aria-label="t(\'ux.swap.reverseTokens\')"');
  });
});
