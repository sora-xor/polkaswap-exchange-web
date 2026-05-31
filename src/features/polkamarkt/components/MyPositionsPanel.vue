<template>
  <section class="my-markets">
    <header>
      <h2>{{ t('polkamarkt.my.title') }}</h2>
      <p>{{ isLoggedIn ? t('polkamarkt.my.subtitle') : t('polkamarkt.my.connect') }}</p>
    </header>

    <s-button v-if="!isLoggedIn" type="secondary" @click="$emit('connect')">
      {{ t('connectWalletText') }}
    </s-button>

    <template v-else>
      <div v-if="loading" class="my-markets__empty">{{ t('polkamarkt.my.loading') }}</div>
      <div v-else-if="!positions.length && !createdMarkets.length" class="my-markets__empty">
        {{ t('polkamarkt.my.empty') }}
      </div>

      <div v-if="createdMarkets.length" class="my-markets__section">
        <h3>{{ t('polkamarkt.my.createdMarkets') }}</h3>
        <button
          v-for="market in createdMarkets"
          :key="market.id"
          type="button"
          class="my-row"
          @click="$emit('select', market)"
        >
          <strong>{{ market.title }}</strong>
          <span>{{ market.status || t('polkamarkt.status.active') }}</span>
          <span>{{ t('polkamarkt.metrics.volume') }} {{ formatUsd(market.volume) }}</span>
        </button>
      </div>

      <div v-if="positions.length" class="my-markets__section">
        <h3>{{ t('polkamarkt.my.positions') }}</h3>
        <button
          v-for="position in positions"
          :key="position.id"
          type="button"
          class="my-row"
          @click="$emit('open-position', position)"
        >
          <strong>{{ position.marketTitle || t('polkamarkt.my.market', { id: position.marketId ?? '-' }) }}</strong>
          <span>{{ formatShares(position) }}</span>
          <span>{{ formatClaims(position) }}</span>
        </button>
      </div>

      <div v-if="trades.length" class="my-markets__section">
        <h3>{{ t('polkamarkt.my.recentTrades') }}</h3>
        <div v-for="trade in trades.slice(0, 5)" :key="trade.id" class="my-row my-row--static">
          <strong>{{ trade.marketTitle || t('polkamarkt.my.market', { id: trade.marketId ?? '-' }) }}</strong>
          <span>{{ trade.side || t('polkamarkt.notIndexed') }}</span>
          <span>{{ trade.timestamp ? new Date(trade.timestamp).toLocaleString() : t('polkamarkt.notIndexed') }}</span>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { useTranslation } from '@/composables/useTranslation';

import type { AccountPosition, AccountTrade, PolkamarktMarket } from '../types';

const props = withDefaults(
  defineProps<{
    markets: PolkamarktMarket[];
    positions: AccountPosition[];
    trades: AccountTrade[];
    account?: string;
    isLoggedIn?: boolean;
    loading?: boolean;
  }>(),
  {
    account: '',
    isLoggedIn: false,
    loading: false,
  }
);

defineEmits<{
  (event: 'connect'): void;
  (event: 'select', market: PolkamarktMarket): void;
  (event: 'open-position', position: AccountPosition): void;
}>();

const { t } = useTranslation();

const createdMarkets = computed(() => {
  const account = props.account.toLowerCase();
  if (!account) return [];
  return props.markets.filter((market) => market.creator?.toLowerCase() === account);
});

const formatUsd = (value?: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value ?? 0);

function formatShares(position: AccountPosition): string {
  const yes = position.yesShares ?? 0;
  const no = position.noShares ?? 0;
  const lp = position.lpShares ?? 0;
  return t('polkamarkt.my.sharesSummary', {
    yes: yes.toLocaleString(),
    no: no.toLocaleString(),
    lp: lp.toLocaleString(),
  });
}

function formatClaims(position: AccountPosition): string {
  const trader = position.claimablePayoutUsd ?? 0;
  const lp = position.lpClaimablePayoutUsd ?? 0;
  return t('polkamarkt.my.claimsSummary', { trader: formatUsd(trader), lp: formatUsd(lp) });
}
</script>

<style lang="scss" scoped>
.my-markets {
  display: grid;
  gap: $inner-spacing-medium;
  border: 1px solid var(--s-color-base-border-secondary);
  border-radius: var(--s-border-radius-small);
  background: var(--s-color-utility-surface);
  padding: $inner-spacing-medium;

  header {
    h2 {
      margin: 0;
      font-size: var(--s-heading5-font-size);
    }

    p {
      margin: $inner-spacing-tiny 0 0;
      color: var(--s-color-base-content-secondary);
      font-size: var(--s-font-size-small);
    }
  }

  &__section {
    display: grid;
    gap: $inner-spacing-small;

    h3 {
      margin: 0;
      font-size: var(--s-heading6-font-size);
    }
  }

  &__empty {
    color: var(--s-color-base-content-secondary);
  }
}

.my-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: $inner-spacing-mini;
  align-items: center;
  border: 1px solid var(--s-color-base-border-secondary);
  border-radius: var(--s-border-radius-mini);
  background: var(--s-color-utility-body);
  color: var(--s-color-base-content-primary);
  padding: $inner-spacing-small;
  text-align: left;
  cursor: pointer;

  @include tablet(true) {
    grid-template-columns: 1fr;
  }

  strong {
    overflow-wrap: anywhere;
  }

  span {
    color: var(--s-color-base-content-secondary);
    font-size: var(--s-font-size-small);
  }

  &--static {
    cursor: default;
  }
}
</style>
