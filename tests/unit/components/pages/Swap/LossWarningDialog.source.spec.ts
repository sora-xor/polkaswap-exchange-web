import { describe, expect, it } from 'vitest';

import lossWarningDialogSource from '@/features/swap/components/LossWarningDialog.vue?raw';

describe('LossWarningDialog source', () => {
  it('keeps the floating warning icon unclipped like live polkaswap', () => {
    expect(lossWarningDialogSource).toContain('custom-class="loss-warning-dialog"');
    expect(lossWarningDialogSource).toContain(':deep(.dialog-card.loss-warning-dialog) {');
    expect(lossWarningDialogSource).toContain('overflow: visible;');
    expect(lossWarningDialogSource).toContain(':deep(.dialog-card.loss-warning-dialog .dialog-card__header) {');
    expect(lossWarningDialogSource).toContain('position: relative;');
    expect(lossWarningDialogSource).toContain('z-index: 0;');
    expect(lossWarningDialogSource).toContain(':deep(.dialog-card.loss-warning-dialog .dialog-card__content) {');
    expect(lossWarningDialogSource).toContain(':deep(.dialog-card.loss-warning-dialog .dialog-card__content)');
    expect(lossWarningDialogSource).toContain('z-index: 1;');
    expect(lossWarningDialogSource).toContain('padding-top: calc(var(--s-size-big) + #{$basic-spacing});');
    expect(lossWarningDialogSource).toContain('max-height: none;');
    expect(lossWarningDialogSource).toContain(':deep(.dialog-card.loss-warning-dialog .simple-notification.modal-content) {');
  });
});
