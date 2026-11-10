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

  it('puts the form and the folded reading in one column beside the campaign numbers on a wide card', () => {
    expect(campaignSource).toMatch(
      /@container tonswap \(min-width: 760px\) \{[\s\S]*?grid-template-areas:\s*'form market'\s*'extras market';/
    );
    expect(campaignSource).toMatch(/\.tonswap-burn__market \{\s*grid-area: market;\s*align-self: stretch;/);
    // The folded sections live inside the grid, after the two panels, so a phone reads form, numbers, reading.
    const layout = campaignSource.slice(campaignSource.indexOf('<div class="tonswap-burn__layout">'));
    expect(layout.indexOf('class="tonswap-burn__preview"')).toBeLessThan(
      layout.indexOf('class="tonswap-burn__market"')
    );
    expect(layout.indexOf('class="tonswap-burn__market"')).toBeLessThan(layout.indexOf('class="tonswap-burn__extras"'));
  });

  it('keeps the mark beside the title only on a phone, so the text below uses the full width', () => {
    expect(campaignSource).toMatch(
      /@container tonswap \(max-width: 479px\) \{[\s\S]*?\.tonswap-burn__intro \{\s*display: contents;/
    );
    expect(burnPageSource).toMatch(
      /@container burn-card \(max-width: 479px\) \{[\s\S]*?\.campaign__intro \{\s*display: contents;/
    );
  });

  it('never covers a card with a loading mask, and stops the loading line for reduced motion', () => {
    expect(burnPageSource).not.toContain('v-loading');
    expect(burnPageSource).toMatch(/&--loading::after \{[\s\S]*?animation: burn-card-loading/);
    expect(burnPageSource).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{\s*\.campaign--loading::after \{[\s\S]*?animation: none;/
    );
  });

  it('draws one focus ring around the amount field and keeps motion optional', () => {
    expect(campaignSource).toMatch(/&:has\(input:focus-visible\) \{\s*outline: 2px solid/);
    // Browsers without :has() still get a ring around the field.
    expect(campaignSource).toMatch(/@supports not selector\(:has\(\*\)\) \{\s*&:focus-within/);
    const beforeMotionQuery = campaignSource.slice(
      campaignSource.indexOf('<style lang="scss" scoped>'),
      campaignSource.indexOf('@media (prefers-reduced-motion: no-preference)')
    );
    expect(beforeMotionQuery).not.toMatch(/animation: tonswap-(?:flare|out|wait)\b/);
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
