<template>
  <div class="burn-container s-flex-column">
    <s-row :gutter="16">
      <s-col
        v-for="{ id, title, description, link, receivedAsset, rate, disabledText } in campaigns"
        :key="id"
        class="burn-column s-flex"
        :xs="12"
        :sm="12"
        :md="12"
        :lg="6"
        :xl="6"
      >
        <s-form
          v-loading="parentLoading"
          class="container container--burn el-form--actions"
          :class="{ disabled: ended[id] }"
          :show-message="false"
        >
          <generic-page-header class="page-header--burn" :title="title"></generic-page-header>
          <p class="description centered p4">
            {{ description }}
          </p>
          <external-link class="p4 link" title="Read more" :href="link"></external-link>
          <info-line
            :label="`1 ${receivedAsset.symbol}`"
            :value="getFormattedXor(rate)"
            :asset-symbol="xor.symbol"
            :fiat-value="getFormattedXorFiat(rate)"
            is-formatted
          ></info-line>
          <info-line label="Time left" :value="timeLeftFormatted[id]"></info-line>
          <info-line
            :label="`Your reserved ${receivedAsset.symbol} tokens`"
            :value="getFormattedAccountReserved(id, rate)"
            :asset-symbol="receivedAsset.symbol"
            is-formatted
            value-can-be-hidden
          ></info-line>
          <info-line
            label="Your burned XOR tokens"
            :value="getFormattedAccountXorBurned(id)"
            :asset-symbol="xor.symbol"
            is-formatted
            value-can-be-hidden
          ></info-line>
          <div class="info-card-container s-flex">
            <div class="info-card-item s-flex-column">
              <span class="info-card-title">TOTAL XOR BURNED</span>
              <span class="info-card-value">
                {{ getFormattedTotalXorBurned(id) }}
              </span>
            </div>
            <div class="info-card-item s-flex-column">
              <span class="info-card-title">TOTAL {{ receivedAsset.symbol }} RESERVED</span>
              <span class="info-card-value">
                {{ getFormattedTotalReserved(id, rate) }}
              </span>
            </div>
          </div>
          <s-button
            v-if="!isLoggedIn"
            type="primary"
            class="action-button s-typography-button--large"
            @click="connectSoraWallet"
          >
            {{ t('connectWalletText') }}
          </s-button>
          <s-button
            v-else
            class="action-button s-typography-button--large"
            type="primary"
            :disabled="ended[id]"
            :loading="parentLoading || (!ended[id] && loading)"
            @click="handleBurnClick(id)"
          >
            <template v-if="ended[id]">{{ disabledText ?? 'TIME IS OVER' }}</template>
            <template v-else>BURN MY XOR</template>
          </s-button>
        </s-form>
      </s-col>
    </s-row>
    <s-card class="burn-info" border-radius="small" shadow="always" size="medium" pressed>
      <div class="burn-info__content s-flex-column">
        <div class="burn-info__desc s-flex">
          <p class="description p4">
            The 'Burn XOR' is a community-proposed initiative. It’s not officially endorsed by any centralized authority
            or organization. Participation and interaction with the 'Burn XOR' should be considered with understanding
            of its community-driven nature.
          </p>
          <div class="burn-info__badge">
            <s-icon class="burn-info__icon" name="notifications-alert-triangle-24" size="24"></s-icon>
          </div>
        </div>
      </div>
    </s-card>
    <burn-dialog
      v-model:visible="burnDialogVisible"
      :received-asset="selectedReceivedAsset"
      :burned-asset="xor"
      :rate="selectedRate"
      :max="selectedMax"
      :min="selectedMin"
      @confirm="handleBurnConfirm"
    ></burn-dialog>
  </div>
</template>

<script lang="ts" setup>
import { FPNumber } from '@sora-substrate/sdk';
import { XOR, KEN } from '@sora-substrate/sdk/build/assets/consts';
import { components, WALLET_CONSTS } from '@wallet';
import dayjs from 'dayjs/esm';
import durationPlugin from 'dayjs/plugin/duration';
import { computed, onBeforeUnmount, onMounted, reactive, ref, toRef } from 'vue';

import BurnDialog from '@/components/pages/Burn/BurnDialog.vue';
import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useInternalConnect } from '@/composables/useInternalConnect';
import { useLoading } from '@/composables/useLoading';
import { useTranslation } from '@/composables/useTranslation';
import { Components } from '@/consts';
import { fetchData as fetchBurnData } from '@/indexer/queries/burnXor';
import { lazyComponent } from '@/router';
import store from '@/store';
import { waitForSoraNetworkFromEnv } from '@/utils';

import type { Asset } from '@sora-substrate/sdk/build/assets/types';

dayjs.extend(durationPlugin);

type CampaignKey = 'chameleon' | 'kensetsu';

type Campaign = {
  id: CampaignKey;
  title: string;
  description: string;
  disabledText?: string;
  link: string;
  receivedAsset: Asset;
  rate: number;
  max: number;
  min: number;
  from: number;
  fromTimestamp: number;
  to: number;
  toTimestamp: number;
};

defineOptions({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    InfoLine: components.InfoLine,
    ExternalLink: components.ExternalLink,
    BurnDialog,
  },
});

const props = withDefaults(
  defineProps<{
    parentLoading?: boolean;
  }>(),
  {
    parentLoading: false,
  }
);

const parentLoadingRef = toRef(props, 'parentLoading');

const { loading, withLoading, withApi } = useLoading({ parentLoading: parentLoadingRef });
const { t } = useTranslation();
const { getFPNumber, getFiatAmountByString } = useFormattedAmount();
const { isLoggedIn, connectSoraWallet, soraAddress } = useInternalConnect();

const xor = XOR;
const zeroString = '0';
const blockDuration = 6_000; // 6 seconds

const blockNumber = computed(() => store.state.wallet.settings.blockNumber as number);
const soraNetwork = computed(() => store.state.wallet.settings.soraNetwork as Nullable<WALLET_CONSTS.SoraNetwork>);

const campaignsObj = reactive<Record<CampaignKey, Campaign>>({
  chameleon: {
    id: 'chameleon',
    title: 'Reserve KARMA by burning your XOR',
    description:
      'Burn 100M XOR (permanently remove from your wallet) on SORA for KARMA in a fair launch; KARMA token is a reward token for LPs who provide liquidity to Chameleon liquidity pools. 22 days only (till Jun 6 2024).',
    link: 'https://medium.com/@shibarimoto/earn-karma-with-a-sora-chameleon-01b25c12fd49',
    receivedAsset: { symbol: 'KARMA', address: '', name: 'Chameleon', decimals: 18 } as Asset,
    rate: 100_000_000,
    max: 1_000,
    min: 0.1,
    from: 15_739_737,
    fromTimestamp: 1715791500000,
    to: 16_056_666,
    toTimestamp: 1717693074000,
    disabledText: 'Already distributed',
  },
  kensetsu: {
    id: 'kensetsu',
    title: 'Reserve KEN by burning your XOR',
    description:
      'Burn 1M XOR (permanently remove from your wallet) on SORA for KEN in a fair launch of Kensetsu; KEN incentivizes liquidity and is deflationary token with a status symbol appeal. 30 days only (till Mar 20 2024).',
    link: 'https://medium.com/@shibarimoto/kensetsu-ken-356077ebee78',
    receivedAsset: KEN,
    rate: 1_000_000,
    max: 10_000,
    min: 1,
    from: 14_464_000,
    fromTimestamp: 1708097280000,
    to: 14_939_200,
    toTimestamp: 1710949772883,
    disabledText: 'Already distributed',
  },
});

const campaignOrder: CampaignKey[] = ['chameleon', 'kensetsu'];
const campaigns = computed(() => campaignOrder.map((key) => campaignsObj[key]));

const createDefaultBurned = () => ({
  chameleon: new FPNumber(0),
  kensetsu: new FPNumber(0),
});

const totalXorBurned = reactive<Record<CampaignKey, FPNumber>>(createDefaultBurned());
const accountXorBurned = reactive<Record<CampaignKey, FPNumber>>(createDefaultBurned());

const timeLeftFormatted = reactive<Record<CampaignKey, string>>({
  chameleon: '30D',
  kensetsu: '30D',
});

const ended = reactive<Record<CampaignKey, boolean>>({
  chameleon: false,
  kensetsu: false,
});

const burnDialogVisible = ref(false);
const selectedReceivedAsset = ref<Asset>(campaignsObj.chameleon.receivedAsset);
const selectedRate = ref<number>(campaignsObj.chameleon.rate);
const selectedMax = ref<number>(campaignsObj.chameleon.max);
const selectedMin = ref<number>(campaignsObj.chameleon.min);

const intervalId = ref<Nullable<number>>(null);

const minBlock = computed(() => Math.min(...campaignOrder.map((key) => campaignsObj[key].from)));
const maxBlock = computed(() => Math.max(...campaignOrder.map((key) => campaignsObj[key].to)));

function getFormattedXor(rate: number): string {
  return getFPNumber(rate).toLocaleString();
}

function getFormattedXorFiat(rate: number): Nullable<string> {
  return getFiatAmountByString(`${rate}`, xor);
}

function getFormattedTotalXorBurned(id: CampaignKey): string {
  return totalXorBurned[id]?.toLocaleString() ?? zeroString;
}

function getFormattedTotalReserved(id: CampaignKey, rate: number): string {
  return totalXorBurned[id]?.div(rate).toLocaleString(3) ?? zeroString;
}

function getFormattedAccountXorBurned(id: CampaignKey): string {
  return accountXorBurned[id]?.toLocaleString() ?? zeroString;
}

function getFormattedAccountReserved(id: CampaignKey, rate: number): string {
  return accountXorBurned[id]?.div(rate).toLocaleString(3) ?? zeroString;
}

function calcCountdown(): void {
  const currentBlock = blockNumber.value;

  for (const campaign of campaigns.value) {
    const msLeft = (campaign.to - currentBlock) * blockDuration;

    if (msLeft <= 0) {
      timeLeftFormatted[campaign.id] = '0D 0H 0M';
      ended[campaign.id] = true;
      continue;
    }

    ended[campaign.id] = false;
    const expires = dayjs.duration(msLeft);
    timeLeftFormatted[campaign.id] = expires.format('D[D] HH[H] mm[M]');
  }
}

async function fetchStatistics(): Promise<void> {
  const burns = await fetchBurnData(minBlock.value, maxBlock.value);
  const address = soraAddress.value;

  const accountTotals = createDefaultBurned();
  const overallTotals = createDefaultBurned();

  for (const campaign of campaigns.value) {
    const campaignBurns = burns.filter(({ blockHeight }) => blockHeight >= campaign.from && blockHeight <= campaign.to);

    const accountsBurned = campaignBurns.reduce<Record<string, FPNumber>>((acc, { address: burnAddress, amount }) => {
      const current = acc[burnAddress] ?? new FPNumber(0);
      acc[burnAddress] = current.add(amount);
      return acc;
    }, {});

    const minBurned = new FPNumber(campaign.rate * campaign.min);

    Object.entries(accountsBurned).forEach(([burnAddress, amount]) => {
      if (!amount.gte(minBurned)) return;

      overallTotals[campaign.id] = overallTotals[campaign.id].add(amount);
      if (address && burnAddress === address) {
        accountTotals[campaign.id] = accountTotals[campaign.id].add(amount);
      }
    });
  }

  accountXorBurned.chameleon = accountTotals.chameleon;
  accountXorBurned.kensetsu = accountTotals.kensetsu;
  totalXorBurned.chameleon = overallTotals.chameleon;
  totalXorBurned.kensetsu = overallTotals.kensetsu;
}

async function fetchDataAndCalcCountdown(): Promise<void> {
  await withLoading(async () => {
    calcCountdown();
    await fetchStatistics();
  });
}

function handleBurnClick(id: CampaignKey): void {
  const campaign = campaignsObj[id];

  selectedReceivedAsset.value = campaign.receivedAsset;
  selectedRate.value = campaign.rate;
  selectedMax.value = campaign.max;
  selectedMin.value = campaign.min;
  burnDialogVisible.value = true;
}

function handleBurnConfirm(done?: boolean): void {
  if (done) {
    loading.value = true;
  }
}

defineExpose({
  campaigns,
  handleBurnClick,
  burnDialogVisible,
  selectedReceivedAsset,
  selectedRate,
  selectedMax,
  selectedMin,
  handleBurnConfirm,
  loading,
  timeLeftFormatted,
  ended,
  totalXorBurned,
  accountXorBurned,
});

onMounted(async () => {
  await withApi(async () => {
    const network = soraNetwork.value ?? (await waitForSoraNetworkFromEnv());

    if (network !== WALLET_CONSTS.SoraNetwork.Prod) {
      campaignsObj.chameleon.from = 11_000;
      campaignsObj.chameleon.to = 1_000_000;
      campaignsObj.kensetsu.from = 0;
      campaignsObj.kensetsu.to = 10_000;
    }

    await fetchDataAndCalcCountdown();

    intervalId.value = window.setInterval(() => {
      void fetchDataAndCalcCountdown();
    }, 60_000);
  });
});

onBeforeUnmount(() => {
  if (intervalId.value) {
    clearInterval(intervalId.value);
  }
});
</script>

<style lang="scss" scoped>
.el-form--actions {
  @include buttons;
  @include full-width-button('action-button');
}
.container {
  margin: 0;
  &--burn {
    margin-bottom: $basic-spacing;
    box-shadow: var(--s-shadow-element-pressed);
    &.disabled {
      box-shadow: var(--s-shadow-element);
    }
  }
}
.page-header--burn {
  justify-content: center;
}
.description {
  margin-bottom: $inner-spacing-mini;
  font-size: var(--s-font-size-extra-small);
  &.centered {
    text-align: center;
  }
}
.info-card {
  &-container {
    align-items: center;
    justify-content: space-between;
    width: 100%;
    margin-top: $inner-spacing-mini;
  }
  &-item {
    flex: 1;
    box-shadow: var(--s-shadow-dialog);
    background-color: var(--s-color-base-border-primary);
    padding: $inner-spacing-medium;
    margin-top: var(--s-basic-spacing);
    border-radius: calc(var(--s-border-radius-mini) / 2);
    & + & {
      margin-left: $inner-spacing-mini;
    }
  }
  &-title {
    color: var(--s-color-base-content-secondary);
    font-weight: 800;
    font-size: var(--s-font-size-extra-small);
    margin-bottom: $inner-spacing-mini;
  }
  &-value {
    font-weight: 800;
    font-size: 16px;
  }
}
.burn {
  &-column {
    align-items: center;
    justify-content: center;
  }
  &-container {
    align-items: center;

    .link {
      font-size: var(--s-heading6-font-size);
      margin-bottom: 12px;
      color: var(--s-color-status-info);
      @include focus-outline;
    }
  }
  &-info {
    max-width: $inner-window-width;
    width: 100%;
    flex: 1;
    &__content {
      .link {
        margin-bottom: 0;
      }
    }
    &__desc {
      align-items: flex-start;
      .description {
        flex: 1;
      }
    }
    &__badge {
      border-radius: 50%;
      background-color: var(--s-color-status-info);
      padding: $inner-spacing-mini;
      box-shadow: var(--s-shadow-element-pressed);
      margin-left: $inner-spacing-mini;
    }
    &__icon {
      color: white;
    }
  }
}
</style>
