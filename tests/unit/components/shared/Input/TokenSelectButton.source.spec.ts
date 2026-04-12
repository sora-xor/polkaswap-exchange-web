import { describe, expect, it } from 'vitest';

import tokenSelectButtonSource from '@/components/shared/Input/TokenSelectButton.vue?raw';

describe('TokenSelectButton source', () => {
  it('keeps the choose-token button metrics aligned with production', () => {
    expect(tokenSelectButtonSource).toContain('button.el-button.neumorphic#{$baseClass} {');
    expect(tokenSelectButtonSource).toContain('font-size: 12px;');
    expect(tokenSelectButtonSource).toContain('height: 32px;');
    expect(tokenSelectButtonSource).toContain('border-radius: var(--s-border-radius-mini);');
    expect(tokenSelectButtonSource).toContain('> span {');
    expect(tokenSelectButtonSource).not.toContain('token-select-button__content');
    expect(tokenSelectButtonSource).toContain('&--token {');
  });
});
