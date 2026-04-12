import { describe, expect, it } from 'vitest';

import tokenInputSource from '@/components/shared/Input/TokenInput.vue?raw';

describe('TokenInput source', () => {
  it('keeps the swap header row stretched to the full input width', () => {
    expect(tokenInputSource).toContain('& > .s-input__top');
    expect(tokenInputSource).toContain('display: block;');
    expect(tokenInputSource).toContain('width: 100%;');
    expect(tokenInputSource).toContain('.input-line {');
  });

  it('keeps the fiat sublabel prefix flush against the value like live polkaswap', () => {
    expect(tokenInputSource).toContain('&--fiat {');
    expect(tokenInputSource).toContain('& > .s-input__content {');
    expect(tokenInputSource).toContain('gap: 0;');
    expect(tokenInputSource).toContain('.input-prefix {');
  });
});
