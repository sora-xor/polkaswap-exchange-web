import { describe, expect, it } from 'vitest';

import buySellSource from '@/components/pages/OrderBook/BuySell.vue?raw';

describe('BuySell source', () => {
  it('renders order-book tab labels from the default STab slot content', () => {
    expect(buySellSource).toContain('<s-tab name="limit">');
    expect(buySellSource).toContain('<s-tab name="market" :disabled="marketOptionDisabled">');
    expect(buySellSource).not.toContain('slot="label"');
    expect(buySellSource).not.toContain('slot="suffix"');
    expect(buySellSource).not.toContain('label="limit"');
    expect(buySellSource).not.toContain('label="market"');
  });

  it('hides order-book balances until the wallet is connected', () => {
    expect(buySellSource).toContain(':balance="isLoggedIn ? getTokenBalance(quoteAsset) : null"');
    expect(buySellSource).toContain(':balance="isLoggedIn ? getTokenBalance(baseAsset) : null"');
  });

  it('styles disabled order-book action buttons with the muted pressed state used on polkaswap.io', () => {
    expect(buySellSource).toContain('background-color: var(--s-color-utility-body) !important;');
    expect(buySellSource).toContain('color: var(--s-color-base-content-tertiary) !important;');
    expect(buySellSource).toContain('box-shadow: var(--s-shadow-element-pressed) !important;');
  });

  it('keeps order-book tab labels uppercase like the live trade widget', () => {
    expect(buySellSource).toContain('.s-tabs.s-rounded .el-tabs__nav-wrap .el-tabs__item {');
    expect(buySellSource).toContain('text-transform: uppercase;');
  });

  it('uses browser history instead of the mirrored router store for swap handoff detection', () => {
    expect(buySellSource).toContain("from '@/shared/navigation/history'");
    expect(buySellSource).not.toContain("from '@/stores/router'");
  });

  it('uses direct shared and local imports instead of the central lazy registry', () => {
    expect(buySellSource).not.toContain('lazyComponent(');
    expect(buySellSource).not.toContain('Components.');
    expect(buySellSource).not.toContain("from '@/router'");
    expect(buySellSource).toContain("import TokenInput from '@/components/shared/Input/TokenInput.vue';");
    expect(buySellSource).toContain("import PairTokenLogo from '@/components/shared/PairTokenLogo.vue';");
    expect(buySellSource).toContain(
      "import PairListPopover from '@/components/pages/OrderBook/Popovers/PairListPopover.vue';"
    );
    expect(buySellSource).toContain("import PlaceConfirm from '@/components/pages/OrderBook/Dialogs/PlaceOrder.vue';");
    expect(buySellSource).toContain(
      "import PlaceTransactionDetails from '@/components/pages/OrderBook/TransactionDetails.vue';"
    );
    expect(buySellSource).toContain("import PriceChange from '@/components/shared/PriceChange.vue';");
    expect(buySellSource).toContain("import Error from '@/components/pages/OrderBook/common/ErrorButton.vue';");
  });
});
