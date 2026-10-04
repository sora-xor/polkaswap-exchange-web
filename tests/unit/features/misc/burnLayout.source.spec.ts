import { describe, expect, it } from 'vitest';

import commonStyles from '@/styles/common.scss?raw';
import burnPageSource from '@/features/misc/pages/BurnPage.vue?raw';
import campaignSource from '@/features/misc/components/burn/TonswapBurnCampaign.vue?raw';
import curveSource from '@/features/misc/components/burn/TonswapRewardCurve.vue?raw';
import onboardingSource from '@/features/misc/components/burn/TonswapOnboarding.vue?raw';

/** Sass blocks only: a plain-CSS style block never reaches the Sass compiler, so its minmax() is real CSS. */
function sassBlocks(source: string): string[] {
  return [...source.matchAll(/<style([^>]*)>([\s\S]*?)<\/style>/g)]
    .filter(([, attrs]) => /lang="scss"/.test(attrs))
    .map(([, , css]) => css);
}

/** What the Sass compiler sees as a function call: comments and escaped `#{'…'}` strings are not calls. */
function sassCalls(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/#\{'[^']*'\}/g, '');
}

describe('burn page layout sources', () => {
  it.each([
    ['BurnPage', burnPageSource],
    ['TonswapBurnCampaign', campaignSource],
    ['TonswapRewardCurve', curveSource],
    ['TonswapOnboarding', onboardingSource],
  ])('%s escapes every CSS grid minmax() so the global Sass minmax() cannot mangle it', (_name, source) => {
    const blocks = sassBlocks(source);
    expect(blocks.length).toBeGreaterThan(0);
    for (const css of blocks) {
      expect(sassCalls(css)).not.toContain('minmax(');
    }
    // The grid templates these files rely on are present and escaped.
    expect(source).toMatch(/grid-template-columns: #\{'/);
  });

  it('lets the Burn page cards use the page width instead of the 464px card cap', () => {
    expect(burnPageSource).toContain('<tonswap-burn-campaign class="container--featured" />');
    expect(burnPageSource).toContain('class="container container--campaign campaign el-form--actions"');
    expect(burnPageSource).not.toContain('container--burn');
    expect(commonStyles).not.toContain('container--burn');
    // The global .container rule sets max-width: 464px, so both cards must lift it themselves.
    expect(burnPageSource).toMatch(/\.campaign \{[\s\S]*?max-width: none;/);
    expect(campaignSource).toMatch(/&\.container--featured \{\s*max-width: none;/);
  });

  it('keeps the embedded Get TS card at its original width by lifting the cap only when asked', () => {
    expect(campaignSource).not.toMatch(/&\.container \{[^}]*max-width: none/);
  });

  it('measures the campaign card by its own width and keeps the dialog outside the measured box', () => {
    expect((campaignSource.match(/container-type: inline-size;/g) ?? []).length).toBe(1);
    expect(campaignSource).toMatch(/&__content \{[\s\S]*?container-name: tonswap;[\s\S]*?container-type: inline-size;/);
    expect(campaignSource).toMatch(/@container tonswap \(min-width: 620px\)/);
    expect(campaignSource).toMatch(/@container tonswap \(min-width: 760px\)/);
    // The wrapper needs an explicit width: size containment would otherwise collapse it inside a centered flex column.
    expect(campaignSource).toMatch(/&__content \{[\s\S]*?align-self: stretch;[\s\S]*?width: 100%;/);
    expect(burnPageSource).toMatch(/\.burn-column \{[\s\S]*?container-type: inline-size;/);
    expect(burnPageSource).toMatch(/@container burn-card \(min-width: 760px\)/);
  });

  it('overrides the shared header weight, which the title mixin sets with !important', () => {
    expect(campaignSource).toContain('font-weight: 600 !important;');
    expect(burnPageSource).toContain('font-weight: 600 !important;');
  });

  it('shows the live pill with the same high-contrast colors as the sidebar pill and stops it for reduced motion', () => {
    expect(campaignSource).toMatch(
      /&__live \{[\s\S]*?background: var\(--s-color-action-text\);[\s\S]*?color: var\(--s-color-base-on-accent\);/
    );
    expect(campaignSource).toMatch(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.tonswap-burn__live::before/);
  });
});
