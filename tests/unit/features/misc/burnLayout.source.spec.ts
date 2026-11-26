import { describe, expect, it } from 'vitest';

import commonStyles from '@/styles/common.scss?raw';
import burnPageSource from '@/features/misc/pages/BurnPage.vue?raw';
import campaignSource from '@/features/misc/components/burn/TonswapBurnCampaign.vue?raw';
import curveSource from '@/features/misc/components/burn/TonswapRewardCurve.vue?raw';
import onboardingSource from '@/features/misc/components/burn/TonswapOnboarding.vue?raw';
import statusSource from '@/features/misc/components/burn/TonswapBurnStatus.vue?raw';
import activitySource from '@/features/misc/components/burn/PublicBurnActivity.vue?raw';

/** Sass blocks only: a plain-CSS style block never reaches the Sass compiler, so its minmax() is real CSS. */
function sassBlocks(source: string): string[] {
  return [...source.matchAll(/<style([^>]*)>([\s\S]*?)<\/style>/g)]
    .filter(([, attrs]) => /lang="scss"/.test(attrs))
    .map(([, , css]) => css);
}

/** The first rule that opens with `head {`, up to its matching closing brace (nested rules included). */
function ruleBody(source: string, head: string): string {
  const start = source.indexOf(`${head} {`);
  if (start < 0) return '';
  let depth = 0;
  for (let i = source.indexOf('{', start); i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  return '';
}

/** A figure sized by its own line: the line width less the unit's room, divided by the figure's width in em. */
const FIT_FONT = /font-size: clamp\(14px, calc\(\(100cqi - [^/]+\) \/ var\(--fit-em, 1\)\), [^;]+\);/;

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
    // The content is the one named card container; the estimate line also measures itself to fit its number.
    expect((campaignSource.match(/container-name: tonswap;/g) ?? []).length).toBe(1);
    expect((campaignSource.match(/container-type: inline-size;/g) ?? []).length).toBe(2);
    expect(ruleBody(campaignSource, '&__out')).toContain('container-type: inline-size;');
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

  it('keeps the exact total whole: its line wraps as a unit and the wallet break-all default is lifted', () => {
    expect(campaignSource).toMatch(/&__notes \{[\s\S]*?:deep\(\.info-line\) \{[\s\S]*?flex-wrap: wrap;/);
    expect(campaignSource).toMatch(
      /&__notes \{[\s\S]*?:deep\(\.info-line-content\) \{\s*max-width: 100%;\s*overflow-wrap: anywhere;\s*word-break: normal;/
    );
  });

  it('lets long translated button labels wrap instead of cutting them on one line', () => {
    // The main action grows with its label; it used to be a fixed 50px.
    expect(campaignSource).toMatch(/:deep\(\.action-button\.el-button\) \{\s*height: auto;\s*min-height: 50px;/);
    const wrapped = /\.s-button__text \{\s*overflow: visible;\s*white-space: normal;/g;
    expect(campaignSource.match(wrapped)?.length).toBe(2);
    expect(statusSource.match(wrapped)?.length).toBe(1);
  });

  it('fits the card estimate, up to the 8-digit campaign maximum, on one line beside its unit', () => {
    expect(campaignSource).toContain(`:style="{ '--fit-em': figureEm(previewOutput) }"`);
    const line = ruleBody(campaignSource, '&__out');
    expect(line).toContain('--fit-max: 30px;');
    expect(line).not.toContain('flex-wrap');
    const value = ruleBody(line, 'strong');
    expect(value).toMatch(FIT_FONT);
    expect(value).toContain('white-space: nowrap;');
    expect(value).not.toContain('overflow-wrap');
    expect(ruleBody(line, '.tonswap-burn__unit')).toContain('flex: none;');
    // A phone card caps the estimate at 26px through the same formula instead of a fixed size.
    const phone = ruleBody(campaignSource, '@container tonswap (max-width: 479px)');
    expect(phone).toMatch(/\.tonswap-burn__out \{\s*--fit-max: 26px;/);
    expect(phone).not.toMatch(/\.tonswap-burn__out strong/);
  });

  it('fits the review dialog estimate beside a smaller mark on a phone-width dialog', () => {
    expect(campaignSource).toContain(`<div :style="{ '--fit-em': figureEm(dialogEstimate) }">`);
    const estimate = ruleBody(campaignSource, '.tonswap-dialog__estimate');
    expect(estimate).toContain('container: tonswap-estimate / inline-size;');
    const value = ruleBody(estimate, 'strong');
    // A short estimate keeps the dialog's original responsive size as the upper bound.
    expect(value).toMatch(
      /font-size: clamp\(14px, calc\(\(100cqi - var\(--fit-mark\) - 46px\) \/ var\(--fit-em, 1\)\), clamp\(24px, 6vw, 32px\)\);/
    );
    // The width in em is measured for tabular figures, so the dialog must use them too.
    expect(value).toContain('font-variant-numeric: tabular-nums;');
    expect(value).toContain('white-space: nowrap;');
    expect(campaignSource).toMatch(
      /@container tonswap-estimate \(max-width: 359px\) \{\s*\.tonswap-dialog__estimate \.tonswap-dialog__fire,\s*\.tonswap-dialog__estimate strong \{\s*--fit-mark: 48px;/
    );
  });

  it('keeps each history amount whole beside its unit and stacks the two amounts on a narrow record', () => {
    const amounts = ruleBody(campaignSource, 'dl.tonswap-burn__record-amounts');
    expect(amounts).toMatch(/display: flex;\s*flex-wrap: wrap;/);
    expect(amounts).toMatch(/> div \{\s*flex: 1 1 auto;\s*min-width: 0;/);
    const value = ruleBody(amounts, 'dd');
    expect(value).toContain('display: flex;');
    expect(value).not.toContain('flex-wrap');
    expect(amounts).toMatch(/\.tonswap-burn__record-number \{\s*white-space: nowrap;/);
  });

  it('fits the banner headline beside its unit at every card width and gives the banner buttons a white focus ring', () => {
    expect(statusSource).toContain(':style="rewardFit"');
    expect(statusSource).toContain(':style="amountFit"');
    // "XOR" needs more room beside the burned amount than "TS" beside a reservation (the 30px default).
    expect(statusSource).toContain("'--fit-unit': '44px'");
    expect(ruleBody(statusSource, '&__text')).toContain('container-type: inline-size;');
    const figure = ruleBody(statusSource, '&__figure');
    expect(figure).toContain('--fit-max: 30px;');
    expect(figure).not.toContain('flex-wrap');
    expect(ruleBody(statusSource, '&__value')).toMatch(FIT_FONT);
    expect(ruleBody(statusSource, '&__unit')).toContain('flex: none;');
    expect(ruleBody(statusSource, '@container tonswap (max-width: 479px)')).toMatch(
      /\.burn-status__figure \{\s*--fit-max: 26px;/
    );
    expect(ruleBody(statusSource, '@container tonswap (max-width: 279px)')).toMatch(
      /\.burn-status__figure \{\s*--fit-max: 20px;/
    );
    // No container query sets a fixed headline size that would override the fit.
    expect(statusSource).not.toMatch(/\.burn-status__value \{\s*font-size: \d+px;/);
    expect(statusSource).toMatch(/&:focus-visible \{\s*outline-color: #ffffff !important;/);
  });

  it('scrolls a long exact total inside its own area, which is a named keyboard stop while it scrolls', () => {
    // The card itself does not scroll, so its heading and coverage line stay put.
    const card = ruleBody(activitySource, '.public-burn');
    expect(card.slice(0, card.indexOf('&__head'))).not.toContain('overflow-x');
    expect(ruleBody(activitySource, '&__scroll')).toContain('overflow-x: auto;');
    expect(activitySource).toContain(':tabindex="keyboardStop ? 0 : undefined"');
    // A group, not a second region: the section is already the region named by the same heading.
    expect(activitySource).toContain(`:role="keyboardStop ? 'group' : undefined"`);
    expect(activitySource).not.toContain(`'region'`);
    expect(activitySource).toContain(':aria-labelledby="keyboardStop ? `${prefix}-title` : undefined"');
    expect(activitySource).toContain('const keyboardStop = computed(() => scrollable.value || focused.value);');
    // Table cells still never break a number to make room for a label.
    expect(activitySource).not.toMatch(/overflow-wrap: anywhere/);
  });

  it('shows the live pill with the same high-contrast colors as the sidebar pill and stops it for reduced motion', () => {
    expect(campaignSource).toMatch(
      /&__live \{[\s\S]*?background: var\(--s-color-action-text\);[\s\S]*?color: var\(--s-color-base-on-accent\);/
    );
    expect(campaignSource).toMatch(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.tonswap-burn__live::before/);
  });
});
