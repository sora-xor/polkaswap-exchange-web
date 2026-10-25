import { describe, expect, it } from 'vitest';

import lossWarningDialogSource from '@/features/swap/components/LossWarningDialog.vue?raw';

describe('LossWarningDialog source', () => {
  it('keeps the warning icon inside the modal content instead of clipping it into the header', () => {
    expect(lossWarningDialogSource).toContain('custom-class="loss-warning-dialog"');
    expect(lossWarningDialogSource).toContain(':deep(.dialog-card.loss-warning-dialog) {');
    expect(lossWarningDialogSource).toContain('overflow: hidden;');
    expect(lossWarningDialogSource).toContain(':deep(.dialog-card.loss-warning-dialog .dialog-card__header) {');
    expect(lossWarningDialogSource).toContain('position: absolute;');
    expect(lossWarningDialogSource).toContain('border-bottom: 0;');
    expect(lossWarningDialogSource).toContain('pointer-events: none;');
    expect(lossWarningDialogSource).toContain(':deep(.dialog-card.loss-warning-dialog .dialog-card__title) {');
    expect(lossWarningDialogSource).toContain('display: none;');
    expect(lossWarningDialogSource).toContain(':deep(.dialog-card.loss-warning-dialog .dialog-card__actions) {');
    expect(lossWarningDialogSource).toContain('pointer-events: auto;');
    expect(lossWarningDialogSource).toContain(':deep(.dialog-card.loss-warning-dialog .dialog-card__content) {');
    expect(lossWarningDialogSource).toContain('z-index: 1;');
    expect(lossWarningDialogSource).toContain(
      'padding: $inner-spacing-large clamp(#{$basic-spacing-medium}, 7vw, #{$inner-spacing-large}) $inner-spacing-large;'
    );
    expect(lossWarningDialogSource).toContain('max-height: none;');
    expect(lossWarningDialogSource).toContain(
      ':deep(.dialog-card.loss-warning-dialog .simple-notification.modal-content) {'
    );
    expect(lossWarningDialogSource).toContain('margin-top: 0;');
    expect(lossWarningDialogSource).not.toContain('calc(var(--s-size-big) * -1)');
    expect(lossWarningDialogSource).not.toContain('padding-top: calc(var(--s-size-big)');
  });
});
