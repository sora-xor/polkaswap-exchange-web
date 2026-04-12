// @vitest-environment node
import tokensSource from '@/views/Explore/Tokens.vue?raw';
import { describe, expect, it } from 'vitest';

describe('Explore Tokens source', () => {
  it('formats velocity values without preserving insignificant trailing zeros', () => {
    expect(tokensSource).toContain('const velocityFormatter = new Intl.NumberFormat(undefined, {');
    expect(tokensSource).toContain('maximumFractionDigits: 2');
    expect(tokensSource).toContain('minimumFractionDigits: 0');
    expect(tokensSource).toContain('const formatVelocity = (value: FPNumber): string => velocityFormatter.format(Number(value.toFixed(2)))');
    expect(tokensSource).toContain(':integer-only="!row.velocityFormatted.includes(FPNumber.DELIMITERS_CONFIG.decimal)"');
    expect(tokensSource).not.toContain('velocityFormatted: String(tokenData.velocity.toNumber(2))');
    expect(tokensSource).not.toContain('velocityFormatted: String(zero.toNumber(2))');
  });
});
