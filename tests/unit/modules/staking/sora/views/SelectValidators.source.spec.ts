import { describe, expect, it } from 'vitest';

import selectValidatorsSource from '@/features/staking/pages/SoraSelectValidatorsPage.vue?raw';

describe('staking sora SelectValidators source', () => {
  it('keeps the validator selector responsive on wide screens', () => {
    expect(selectValidatorsSource).toContain('class="container container--validator-select"');
    expect(selectValidatorsSource).toContain('show-selection-controls');
    expect(selectValidatorsSource).toMatch(/width:\s*min\(100%,\s*760px\);/);
    expect(selectValidatorsSource).toContain('--validators-list-height: 380px;');
    expect(selectValidatorsSource).not.toContain('max-height: 573px');
    expect(selectValidatorsSource).not.toMatch(/width:\s*min\(760px,\s*100%\);/);
    expect(selectValidatorsSource).toMatch(
      /@include desktop\s*\{[^}]*width:\s*min\(100%,\s*1040px\);[^}]*--validators-list-height:\s*clamp\(380px,\s*calc\(100dvh - 380px\),\s*560px\);/s
    );
    expect(selectValidatorsSource).toMatch(
      /@include large-desktop\s*\{[^}]*width:\s*min\(100%,\s*1120px\);[^}]*--validators-list-height:\s*clamp\(420px,\s*calc\(100dvh - 380px\),\s*620px\);/s
    );
  });
});
