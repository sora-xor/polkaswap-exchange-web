<template>
  <div class="burn-container s-flex-column">
    <s-row class="burn-row" :gutter="16" justify="center">
      <s-col
        v-for="{ id, title, description, rewardTiers, link, receivedAsset, rate, disabledText } in campaigns"
        :key="id"
        class="burn-column s-flex"
        :xs="12"
        :sm="12"
        :md="12"
        :lg="6"
        :xl="6"
      >
        <s-form
          v-loading="isBurnFormLoading"
          class="container container--burn el-form--actions"
          :class="{ disabled: ended[id] }"
          :show-message="false"
        >
          <img v-if="id === 'solswap'" class="campaign-logo" :src="solswapMarkUrl" alt="SOLSWAP logo" />
          <generic-page-header class="page-header--burn" :title="title"></generic-page-header>
          <p class="description centered p4">
            {{ description }}
          </p>
          <div v-if="rewardTiers?.length" class="reward-tiers s-flex-column">
            <div v-for="{ blockRange, reward } in rewardTiers" :key="blockRange" class="reward-tier s-flex-column">
              <span class="reward-tier__range">{{ blockRange }}</span>
              <span class="reward-tier__reward">{{ reward }}</span>
            </div>
          </div>
          <external-link class="p4 link" title="Read more" :href="link"></external-link>
          <info-line
            :label="`1\u00A0${receivedAsset.symbol}`"
            :value="getFormattedXor(rate)"
            :asset-symbol="xor.symbol"
            :fiat-value="getFormattedXorFiat(rate)"
          ></info-line>
          <info-line v-if="id === 'solswap'" label="1 XOR burned" value="1" asset-symbol="SORA Nexus XOR"></info-line>
          <info-line
            :label="`Your reserved ${receivedAsset.symbol} tokens`"
            :value="getFormattedAccountReserved(id)"
            :asset-symbol="receivedAsset.symbol"
            value-can-be-hidden
          ></info-line>
          <info-line
            label="Your burned XOR tokens"
            :value="getFormattedAccountXorBurned(id)"
            :asset-symbol="xor.symbol"
            value-can-be-hidden
          ></info-line>
          <div v-if="isLoggedIn && accountClaimRows[id]?.length" class="claim-details s-flex-column">
            <div class="claim-details__header s-flex-column">
              <span class="claim-details__title">{{ t('burnPage.minamotoClaimTitle') }}</span>
              <span class="claim-details__description">
                {{ t('burnPage.minamotoClaimDescription') }}
              </span>
            </div>
            <div v-for="claim in accountClaimRows[id]" :key="claim.id" class="claim-row s-flex-column">
              <div class="claim-row__summary s-flex">
                <span class="claim-row__block">
                  <template v-if="claim.blockHeight">Block {{ claim.blockHeight }}</template>
                  <template v-else>{{ t('transactionSubmittedText') }}</template>
                </span>
                <span class="claim-row__burned">{{ claim.burned }} XOR burned</span>
              </div>
              <div class="claim-row__amounts">
                <div class="claim-row__amount s-flex-column">
                  <span>{{ t('burnPage.ssTokensLabel') }}</span>
                  <strong>{{ claim.ssReserved }}</strong>
                </div>
                <div class="claim-row__amount s-flex-column">
                  <span>{{ t('burnPage.soraNexusXorLabel') }}</span>
                  <strong>{{ claim.nexusReserved }}</strong>
                </div>
              </div>
              <div class="claim-row__hash s-flex">
                <div class="claim-row__hash-text s-flex-column">
                  <span>{{ t('burnPage.soraNetworkTxHashLabel') }}</span>
                  <code>{{ claim.txHash }}</code>
                </div>
                <s-button
                  class="claim-row__copy"
                  type="action"
                  alternative
                  icon="basic-copy-24"
                  :tooltip="copyTxHashTooltip"
                  :aria-label="t('burnPage.copySoraNetworkTxHash')"
                  @click="handleCopyTxHash(claim.txHash, $event)"
                ></s-button>
              </div>
            </div>
          </div>
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
                {{ getFormattedTotalReserved(id) }}
              </span>
            </div>
            <div v-if="id === 'solswap'" class="info-card-item s-flex-column">
              <span class="info-card-title">TOTAL SORA NEXUS XOR RESERVED</span>
              <span class="info-card-value">
                {{ getFormattedTotalNexusReserved(id) }}
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
      :requires-nexus-recipient="selectedRequiresNexusRecipient"
      @confirm="handleBurnConfirm"
    ></burn-dialog>
  </div>
</template>

<script lang="ts" setup>
import type { FPNumber } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import dayjs from 'dayjs/esm';
import durationPlugin from 'dayjs/plugin/duration';
import { computed, onBeforeUnmount, onMounted, reactive, ref, toRef, watch } from 'vue';

import solswapMarkUrl from '@/assets/img/solswap-mark.svg?url';
import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useInternalConnect } from '@/composables/useInternalConnect';
import { useLoading } from '@/composables/useLoading';
import { useTranslation } from '@/composables/useTranslation';
import { useCopyAddress } from '@/composables/useCopyAddress';
import { SoraNetwork } from '@/consts';
import { fetchData as fetchBurnData, isExcludedXorBurnAddress } from '@/indexer/queries/burnXor';
import { api as walletApi } from '@/lib/soraneo-wallet/src/api';
import { useSettingsStore } from '@/stores/settings';
import { waitForSoraNetworkFromEnv } from '@/utils';
import {
  calculateBurnCampaignStatistics,
  calculateBurnCountdowns,
  createBurnCampaigns,
  createDefaultBurned,
  createDefaultClaimRows,
  dedupeBurnEntries,
  formatBurnAmount,
  SOLSWAP_LEGACY_START_BLOCK,
  type BurnForStats,
  type CampaignKey,
  type ClaimRow,
} from '@/features/misc/lib/burnCampaigns';
import {
  createLocalXorBurns,
  getBlockHeightFromBlockId as getChainBlockHeightFromBlockId,
  getCurrentChainBlockHeight,
  resolveCurrentEndBlock,
  type ChainApiHeaderShape,
  type LocalBurnHistoryItem,
} from '@/features/misc/lib/burnLocalHistory';

import type { Asset } from '@sora-substrate/sdk/build/assets/types';
import WalletComponentInfoLine from '@/lib/soraneo-wallet/src/components/InfoLine.vue';
import WalletComponentExternalLink from '@/lib/soraneo-wallet/src/components/shared/ExternalLink.vue';
import BurnDialog from '@/features/misc/components/burn/BurnDialog.vue';
import GenericPageHeader from '@/components/shared/GenericPageHeader.vue';

dayjs.extend(durationPlugin);

defineOptions({
  name: 'BurnPage',
  components: {
    GenericPageHeader,
    InfoLine: WalletComponentInfoLine,
    ExternalLink: WalletComponentExternalLink,
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
const { handleCopyAddress, copyTooltip } = useCopyAddress();
const { isLoggedIn, connectSoraWallet, soraAddress } = useInternalConnect();
const settingsStore = useSettingsStore();

const xor = XOR;
const zeroString = '0';
const blockDuration = 6_000; // 6 seconds
const POST_BURN_REFRESH_DELAYS_MS = [15_000, 45_000];

const blockNumber = computed(() => settingsStore.blockNumber);
const soraNetwork = computed(() => settingsStore.soraNetwork as Nullable<SoraNetwork>);

const campaignsObj = reactive(createBurnCampaigns());

const campaignOrder: CampaignKey[] = ['solswap'];
const campaigns = computed(() => campaignOrder.map((key) => campaignsObj[key]));

const totalXorBurned = reactive<Record<CampaignKey, FPNumber>>(createDefaultBurned());
const accountXorBurned = reactive<Record<CampaignKey, FPNumber>>(createDefaultBurned());
const totalReserved = reactive<Record<CampaignKey, FPNumber>>(createDefaultBurned());
const accountReserved = reactive<Record<CampaignKey, FPNumber>>(createDefaultBurned());
const totalNexusReserved = reactive<Record<CampaignKey, FPNumber>>(createDefaultBurned());
const accountNexusReserved = reactive<Record<CampaignKey, FPNumber>>(createDefaultBurned());
const accountClaimRows = reactive<Record<CampaignKey, ClaimRow[]>>(createDefaultClaimRows());

const timeLeftFormatted = reactive<Record<CampaignKey, string>>({
  solswap: '30D',
});

const ended = reactive<Record<CampaignKey, boolean>>({
  solswap: false,
});

const isBurnFormLoading = computed(() => parentLoadingRef.value || loading.value);
const burnDialogVisible = ref(false);
const selectedReceivedAsset = ref<Asset>(campaignsObj.solswap.receivedAsset);
const selectedRate = ref<string>(campaignsObj.solswap.rate);
const selectedMax = ref<number>(campaignsObj.solswap.max);
const selectedMin = ref<number>(campaignsObj.solswap.min);
const selectedRequiresNexusRecipient = ref<boolean>(campaignsObj.solswap.requiresNexusRecipient);

const intervalId = ref<Nullable<number>>(null);
const refreshTimeoutIds = ref<number[]>([]);

const minBlock = computed(() => Math.min(...campaignOrder.map((key) => campaignsObj[key].from)));
const maxBlock = computed(() => Math.max(...campaignOrder.map((key) => campaignsObj[key].to)));

function getFormattedXor(rate: string): string {
  return formatBurnAmount(getFPNumber(rate));
}

function getFormattedXorFiat(rate: string): Nullable<string> {
  return getFiatAmountByString(rate, xor);
}

function getFormattedTotalXorBurned(id: CampaignKey): string {
  return totalXorBurned[id] ? formatBurnAmount(totalXorBurned[id]) : zeroString;
}

function getFormattedTotalReserved(id: CampaignKey): string {
  return totalReserved[id] ? formatBurnAmount(totalReserved[id], 3) : zeroString;
}

function getFormattedTotalNexusReserved(id: CampaignKey): string {
  return totalNexusReserved[id] ? formatBurnAmount(totalNexusReserved[id], 3) : zeroString;
}

function getFormattedAccountXorBurned(id: CampaignKey): string {
  return accountXorBurned[id] ? formatBurnAmount(accountXorBurned[id]) : zeroString;
}

function getFormattedAccountReserved(id: CampaignKey): string {
  return accountReserved[id] ? formatBurnAmount(accountReserved[id], 3) : zeroString;
}

const copyTxHashTooltip = computed(() => copyTooltip(t('burnPage.soraNetworkTxHashLabel')));

function handleCopyTxHash(txHash: string, event: MouseEvent): void {
  void handleCopyAddress(txHash, event);
}

function calcCountdown(): void {
  const nextCountdowns = calculateBurnCountdowns(campaigns.value, blockNumber.value, blockDuration, (msLeft) => {
    return dayjs.duration(msLeft).format('D[D] HH[H] mm[M]');
  });

  for (const key of campaignOrder) {
    timeLeftFormatted[key] = nextCountdowns.timeLeftFormatted[key];
    ended[key] = nextCountdowns.ended[key];
  }
}

async function fetchStatistics(): Promise<void> {
  const currentEndBlock = await getCurrentEndBlock();

  const address = soraAddress.value;
  const [indexedBurnsResult, accountIndexedBurnsResult] = await Promise.allSettled([
    fetchBurnData(minBlock.value, currentEndBlock),
    address ? fetchBurnData(minBlock.value, currentEndBlock, address) : Promise.resolve([]),
  ]);
  const indexedBurns = indexedBurnsResult.status === 'fulfilled' ? indexedBurnsResult.value : [];
  const accountIndexedBurns = accountIndexedBurnsResult.status === 'fulfilled' ? accountIndexedBurnsResult.value : [];
  const localBurns = await getLocalXorBurns(address, currentEndBlock);
  const hasGlobalBurns = indexedBurnsResult.status === 'fulfilled';
  const globalBurns = dedupeBurnEntries(indexedBurns);
  const accountBurns = dedupeBurnEntries([...indexedBurns, ...accountIndexedBurns, ...localBurns]);
  const statistics = calculateBurnCampaignStatistics({
    campaigns: campaigns.value,
    accountAddress: address,
    globalBurns,
    accountBurns,
  });

  for (const key of campaignOrder) {
    accountXorBurned[key] = statistics.accountTotals[key];
    accountReserved[key] = statistics.accountReservedTotals[key];
    accountNexusReserved[key] = statistics.accountNexusReservedTotals[key];
    accountClaimRows[key] = statistics.accountClaimRows[key];

    if (hasGlobalBurns) {
      totalXorBurned[key] = statistics.overallTotals[key];
      totalReserved[key] = statistics.overallReservedTotals[key];
      totalNexusReserved[key] = statistics.overallNexusReservedTotals[key];
    }
  }
}

function getLocalHistoryList(): LocalBurnHistoryItem[] {
  try {
    return walletApi.historyList as LocalBurnHistoryItem[];
  } catch {
    return [];
  }
}

function getChainApi(): Nullable<ChainApiHeaderShape> {
  try {
    return (walletApi.connection?.api ?? null) as Nullable<ChainApiHeaderShape>;
  } catch {
    return null;
  }
}

/**
 * Resolves the upper campaign block for burn statistics without blocking the
 * indexed totals on a live chain header. When the wallet connection is still
 * booting, the campaign cap lets the Polkaswap indexer return available burns
 * immediately from static IPFS builds.
 */
async function getCurrentEndBlock(): Promise<number> {
  if (blockNumber.value >= minBlock.value) {
    return resolveCurrentEndBlock({
      blockNumber: blockNumber.value,
      minBlock: minBlock.value,
      maxBlock: maxBlock.value,
    });
  }

  const chainBlockHeight = await getCurrentChainBlockHeight(getChainApi());

  return resolveCurrentEndBlock({
    blockNumber: blockNumber.value,
    minBlock: minBlock.value,
    maxBlock: maxBlock.value,
    chainBlockHeight,
  });
}

async function getBlockHeightFromBlockId(blockId?: string): Promise<Nullable<number>> {
  return getChainBlockHeightFromBlockId(getChainApi(), blockId);
}

/**
 * Reads optimistic wallet history so a freshly submitted burn appears before
 * the public indexer or historical RPC scan catches up.
 */
async function getLocalXorBurns(address: Nullable<string>, fallbackBlockHeight: number): Promise<BurnForStats[]> {
  return createLocalXorBurns({
    address,
    fallbackBlockHeight,
    localHistory: getLocalHistoryList(),
    resolveBlockHeightByBlockId: getBlockHeightFromBlockId,
    isExcludedAddress: isExcludedXorBurnAddress,
  });
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
  selectedRequiresNexusRecipient.value = campaign.requiresNexusRecipient;
  burnDialogVisible.value = true;
}

function handleBurnConfirm(done?: boolean): void {
  if (done) {
    loading.value = true;
    void fetchDataAndCalcCountdown();

    for (const delayMs of POST_BURN_REFRESH_DELAYS_MS) {
      const timeoutId = window.setTimeout(() => {
        void fetchDataAndCalcCountdown();
      }, delayMs);
      refreshTimeoutIds.value.push(timeoutId);
    }
  }
}

watch([blockNumber, soraAddress], ([nextBlockNumber, nextAddress], [previousBlockNumber, previousAddress]) => {
  const blockNumberBecameReady = nextBlockNumber >= minBlock.value && previousBlockNumber < minBlock.value;
  const accountChanged = nextAddress !== previousAddress;

  if (blockNumberBecameReady || accountChanged) {
    void fetchDataAndCalcCountdown();
  }
});

defineExpose({
  campaigns,
  handleBurnClick,
  burnDialogVisible,
  selectedReceivedAsset,
  selectedRate,
  selectedMax,
  selectedMin,
  selectedRequiresNexusRecipient,
  handleBurnConfirm,
  loading,
  isBurnFormLoading,
  timeLeftFormatted,
  ended,
  totalXorBurned,
  accountXorBurned,
  totalReserved,
  accountReserved,
  totalNexusReserved,
  accountNexusReserved,
  accountClaimRows,
});

onMounted(async () => {
  await withApi(async () => {
    const network = soraNetwork.value ?? (await waitForSoraNetworkFromEnv());

    if (network !== SoraNetwork.Prod) {
      campaignsObj.solswap.from = 0;
      campaignsObj.solswap.to = 10_000;
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

  for (const timeoutId of refreshTimeoutIds.value) {
    clearTimeout(timeoutId);
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

.burn-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
}

.page-header--burn {
  justify-content: center;
}

.campaign-logo {
  display: block;
  width: 64px;
  height: 64px;
  margin: 0 auto $inner-spacing-mini;
}

.description {
  margin-bottom: $inner-spacing-mini;
  font-size: var(--s-font-size-extra-small);
  &.centered {
    text-align: center;
  }
}
.reward-tiers {
  gap: $inner-spacing-tiny;
  margin-bottom: $inner-spacing-mini;
  width: 100%;
}
.reward-tier {
  border-top: 1px solid var(--s-color-base-border-secondary);
  padding-top: $inner-spacing-tiny;

  &__range {
    color: var(--s-color-base-content-secondary);
    font-size: var(--s-font-size-extra-small);
    font-weight: 700;
    text-transform: uppercase;
  }

  &__reward {
    font-size: var(--s-font-size-extra-small);
    font-weight: 700;
    line-height: 1.4;
  }
}
.claim-details {
  gap: $inner-spacing-mini;
  width: 100%;
  margin-top: $inner-spacing-mini;
  padding-top: $inner-spacing-mini;
  border-top: 1px solid var(--s-color-base-border-secondary);

  &__title {
    font-size: var(--s-font-size-extra-small);
    font-weight: 800;
    text-transform: uppercase;
  }

  &__description {
    color: var(--s-color-base-content-secondary);
    font-size: var(--s-font-size-extra-small);
    line-height: 1.4;
  }
}
.claim-row {
  gap: $inner-spacing-tiny;
  padding: $inner-spacing-mini;
  border-radius: calc(var(--s-border-radius-mini) / 2);
  background: var(--s-color-base-background);
  box-shadow: var(--s-shadow-element);

  &__summary,
  &__hash {
    align-items: center;
    justify-content: space-between;
    gap: $inner-spacing-mini;
  }

  &__block,
  &__hash-text span {
    color: var(--s-color-base-content-secondary);
    font-size: var(--s-font-size-extra-small);
    font-weight: 700;
    text-transform: uppercase;
  }

  &__burned {
    font-size: var(--s-font-size-extra-small);
    font-weight: 800;
  }

  &__amounts {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: $inner-spacing-tiny;
  }

  &__amount {
    min-width: 0;
    padding: $inner-spacing-tiny;
    border-radius: calc(var(--s-border-radius-mini) / 2);
    background: var(--s-color-base-border-primary);

    span {
      color: var(--s-color-base-content-secondary);
      font-size: var(--s-font-size-extra-small);
      font-weight: 700;
    }

    strong {
      font-size: 14px;
      line-height: 1.35;
      word-break: break-word;
    }
  }

  &__hash-text {
    min-width: 0;
    flex: 1;

    code {
      font-family: var(--s-font-family-mono, monospace);
      font-size: var(--s-font-size-extra-small);
      line-height: 1.35;
      word-break: break-all;
    }
  }

  &__copy {
    flex: 0 0 auto;
  }
}
.info-card {
  &-container {
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: $inner-spacing-mini;
    width: 100%;
    margin-top: $inner-spacing-mini;
  }
  &-item {
    flex: 1;
    min-width: 160px;
    box-shadow: var(--s-shadow-dialog);
    background-color: var(--s-color-base-border-primary);
    padding: $inner-spacing-medium;
    margin-top: var(--s-basic-spacing);
    border-radius: calc(var(--s-border-radius-mini) / 2);
    & + & {
      margin-left: 0;
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
@media (max-width: 480px) {
  .claim-row {
    &__summary,
    &__hash {
      align-items: flex-start;
      flex-direction: column;
    }

    &__amounts {
      grid-template-columns: 1fr;
    }
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
