import { describe, expect, it } from 'vitest';

import tokenSelectButtonSource from '@/components/shared/Input/TokenSelectButton.vue?raw';

describe('TokenSelectButton source', () => {
  it('keeps the selected token button rounded like production', () => {
    expect(tokenSelectButtonSource).toContain('button.el-button.neumorphic#{$baseClass} {');
    expect(tokenSelectButtonSource).toContain('border-radius: var(--s-border-radius-mini);');
    expect(tokenSelectButtonSource).toContain('&--token {');
  });
});
