import { describe, it, expect } from 'vitest';

import { maskPlaceholders, restorePlaceholders, shouldSkipTranslation } from '@/../scripts/lang/mt-utils';

describe('mt-utils placeholder masking', () => {
  it('masks and restores curly placeholders and i18n links', () => {
    const src = 'Send {amount} to {Sora}. See @:bridge.title or @:(swap.minReceivedTooltip).';
    const { masked, table } = maskPlaceholders(src);
    expect(masked).not.toContain('{amount}');
    expect(masked).not.toContain('@:bridge.title');
    const restored = restorePlaceholders(masked, table);
    expect(restored).toBe(src);
  });

  it('shouldSkipTranslation skips tokens-only strings and protected terms', () => {
    expect(shouldSkipTranslation('')).toBe(true);
    expect(shouldSkipTranslation('   ')).toBe(true);
    expect(shouldSkipTranslation('{token}')).toBe(true);
    expect(shouldSkipTranslation('@:path.to.key')).toBe(true);
    expect(shouldSkipTranslation('MAX')).toBe(true);
    expect(shouldSkipTranslation('SORA')).toBe(true);
    expect(shouldSkipTranslation('Proceed')).toBe(false);
  });
});
