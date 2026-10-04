// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const viewPath = path.resolve(__dirname, '../../../src/features/rewards/pages/RewardsPage.vue');
const stylesPath = path.resolve(__dirname, '../../../src/features/rewards/styles/rewards.scss');
const amountTablePath = path.resolve(__dirname, '../../../src/features/rewards/components/rewards/AmountTable.vue');
const marketPath = path.resolve(__dirname, '../../../src/features/rewards/components/rewards/RewardsMarket.vue');

describe('Rewards source', () => {
  it('keeps the public rewards hint on the live inline text treatment', async () => {
    const source = await readFile(viewPath, 'utf8');
    const hintRule = source.match(/\.rewards-hint \{[^}]*\}/)?.[0] ?? '';

    // The hint is plain text under the claim list: no boxed surface, shadow or border of its own.
    expect(hintRule).toContain('font-size: var(--s-font-size-extra-small);');
    expect(hintRule).not.toMatch(/background|box-shadow|border/);
    expect(source).not.toContain('background: var(--s-color-utility-surface);');
    expect(source).not.toContain('box-shadow: var(--s-shadow-dialog);');
    expect(source).not.toContain(":global([design-system-theme='dark']) .rewards-hint");
  });

  it('keeps the dashboard layout direction-aware for right-to-left languages', async () => {
    const styles = await readFile(stylesPath, 'utf8');
    const amountTable = await readFile(amountTablePath, 'utf8');

    // The corner ticks sit at logical corners, so their strokes must be logical sides too.
    expect(styles).toContain('border-block-start-width: 1px;');
    expect(styles).toContain('border-inline-start-width: 1px;');
    expect(styles).toContain('border-block-end-width: 1px;');
    expect(styles).toContain('border-inline-end-width: 1px;');
    expect(styles).not.toContain('border-width: 1px 0 0 1px;');
    expect(styles).not.toContain('border-width: 0 1px 1px 0;');
    // Numbers read left to right in every language: shares and signed price changes keep their sign in front.
    const market = await readFile(marketPath, 'utf8');

    expect(market).toMatch(/&__value \{\s+direction: ltr;\s+unicode-bidi: isolate;/);
    // A physical auto margin pushes the amount away from the edge and glues it to the fiat value in RTL.
    expect(amountTable).toContain('margin-inline-end: auto;');
    expect(amountTable).not.toContain('margin-right: auto;');
  });
});
