<template>
  <div class="burn-container s-flex-column">
    <div class="burn-grid">
      <div class="burn-column burn-column--featured">
        <tonswap-burn-campaign class="container--featured" />
      </div>
      <section v-if="soraNetwork === SoraNetwork.Prod" class="burn-activity" :aria-label="t('burnActivity.title')">
        <public-burn-activity />
        <public-burn-activity campaign-history />
      </section>
      <div
        v-for="{ id, title, description, rewardTiers, link, receivedAsset, rate, disabledText } in campaigns"
        :key="id"
        class="burn-column"
      >
        <s-form
          class="container container--campaign campaign el-form--actions"
          :class="{ disabled: ended[id], 'campaign--loading': isBurnFormLoading }"
          :aria-busy="isBurnFormLoading"
          :show-message="false"
        >
          <header class="campaign__hero">
            <burn-logo-fire v-if="id === 'solswap'" class="campaign-fire" variant="sora" />
            <div class="campaign__intro">
              <generic-page-header class="page-header--burn" :title="title"></generic-page-header>
              <p class="description">
                {{ description }}
              </p>
              <external-link class="p4 link" title="Read more" :href="link"></external-link>
            </div>
          </header>
          <p v-if="burnSent[id]" class="campaign__sent" role="status" data-testid="burn-sent">
            <s-icon name="basic-flame-24" size="20" aria-hidden="true" />
            <span>{{ t('burnPage.sent') }}</span>
          </p>
          <div class="campaign__body">
            <section class="campaign__terms">
              <div v-if="rewardTiers?.length" class="reward-tiers">
                <div v-for="{ blockRange, reward } in rewardTiers" :key="blockRange" class="reward-tier s-flex-column">
                  <span class="reward-tier__range">{{ blockRange }}</span>
                  <span class="reward-tier__reward">{{ reward }}</span>
                </div>
              </div>
              <info-line
                :label="`1\u00A0${receivedAsset.symbol}`"
                :value="getFormattedXor(rate)"
                :asset-symbol="xor.symbol"
                :fiat-value="getFormattedXorFiat(rate)"
              ></info-line>
              <info-line
                v-if="id === 'solswap'"
                label="1 XOR burned"
                value="1"
                asset-symbol="SORA Nexus XOR"
              ></info-line>
            </section>
            <section v-if="statisticsAvailable" class="campaign__account">
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
            </section>
            <p v-else class="campaign__unavailable" role="status" data-testid="burn-statistics-unavailable">
              {{ t('burnActivity.rewardsUnavailable') }}
            </p>
          </div>
          <div v-if="statisticsAvailable" class="info-card-container s-flex">
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
          <!-- The address tool is long and only needed once, so it opens on request while the campaign runs. -->
          <details v-if="id === 'solswap' && !ended.solswap" class="campaign__nexus">
            <summary>{{ t('burnPage.nexusGenerator.title') }}</summary>
            <sora-nexus-account-generator burn-available @use-address="handleUseGeneratedNexusAddress" />
          </details>
          <sora-nexus-account-generator
            v-else-if="id === 'solswap'"
            :burn-available="false"
            @use-address="handleUseGeneratedNexusAddress"
          />
          <s-button v-if="!isLoggedIn" type="primary" class="action-button" @click="connectSoraWallet">
            {{ t('connectWalletText') }}
          </s-button>
          <s-button
            v-else
            class="action-button"
            type="primary"
            :disabled="ended[id]"
            :loading="parentLoading || (!ended[id] && loading)"
            @click="handleBurnClick(id)"
          >
            <template v-if="ended[id]">{{ disabledText ?? 'TIME IS OVER' }}</template>
            <template v-else>BURN MY XOR</template>
          </s-button>
        </s-form>
      </div>
    </div>
    <p class="burn-info">
      <s-icon class="burn-info__icon" name="notifications-alert-triangle-24" size="18" aria-hidden="true"></s-icon>
      <span class="burn-info__text">
        The 'Burn XOR' is a community-proposed initiative. It’s not officially endorsed by any centralized authority or
        organization. Participation and interaction with the 'Burn XOR' should be considered with understanding of its
        community-driven nature.
      </span>
    </p>
    <burn-dialog
      v-model:visible="burnDialogVisible"
      :received-asset="selectedReceivedAsset"
      :burned-asset="xor"
      :rate="selectedRate"
      :max="selectedMax"
      :min="selectedMin"
      :requires-nexus-recipient="selectedRequiresNexusRecipient"
      :initial-nexus-recipient="selectedNexusRecipient"
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

import { requireEntitlements } from '@/indexer/queries/capabilities';
import BurnLogoFire from '@/features/misc/components/burn/BurnLogoFire.vue';
import SoraNexusAccountGenerator from '@/features/misc/components/burn/SoraNexusAccountGenerator.vue';
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
import { normalizeSoraNexusAccountId } from '@/utils/soraNexusAccount';
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
import PublicBurnActivity from '@/features/misc/components/burn/PublicBurnActivity.vue';
import TonswapBurnCampaign from '@/features/misc/components/burn/TonswapBurnCampaign.vue';
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
const { isLoggedIn, isSoraAccountDialogVisible, connectSoraWallet, soraAddress } = useInternalConnect();
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

const statisticsAvailable = ref(false);
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

/** A burn of this campaign was signed during this visit; the card says so until the account changes. */
const burnSent = reactive<Record<CampaignKey, boolean>>({
  solswap: false,
});
const selectedCampaignId = ref<CampaignKey>('solswap');

const isBurnFormLoading = computed(() => parentLoadingRef.value || loading.value);
const burnDialogVisible = ref(false);
const selectedReceivedAsset = ref<Asset>(campaignsObj.solswap.receivedAsset);
const selectedRate = ref<string>(campaignsObj.solswap.rate);
const selectedMax = ref<number>(campaignsObj.solswap.max);
const selectedMin = ref<number>(campaignsObj.solswap.min);
const selectedRequiresNexusRecipient = ref<boolean>(campaignsObj.solswap.requiresNexusRecipient);
const selectedNexusRecipient = ref('');
const pendingGeneratedNexusRecipient = ref('');

const intervalId = ref<Nullable<number>>(null);
const refreshTimeoutIds = ref<number[]>([]);
let statisticsRequestId = 0;
let isUnmounted = false;

const minBlock = computed(() => Math.min(...campaignOrder.map((key) => campaignsObj[key].from)));
const maxBlock = computed(() => Math.max(...campaignOrder.map((key) => campaignsObj[key].to)));

function getFormattedXor(rate: string): string {
  return formatBurnAmount(getFPNumber(rate));
}

function getFormattedXorFiat(rate: string): Nullable<string> {
  return getFiatAmountByString(rate, xor);
}

function getFormattedTotalXorBurned(id: CampaignKey): string {
  if (!statisticsAvailable.value) return '—';
  return totalXorBurned[id] ? formatBurnAmount(totalXorBurned[id]) : zeroString;
}

function getFormattedTotalReserved(id: CampaignKey): string {
  if (!statisticsAvailable.value) return '—';
  return totalReserved[id] ? formatBurnAmount(totalReserved[id], 3) : zeroString;
}

function getFormattedTotalNexusReserved(id: CampaignKey): string {
  if (!statisticsAvailable.value) return '—';
  return totalNexusReserved[id] ? formatBurnAmount(totalNexusReserved[id], 3) : zeroString;
}

function getFormattedAccountXorBurned(id: CampaignKey): string {
  if (!statisticsAvailable.value) return '—';
  return accountXorBurned[id] ? formatBurnAmount(accountXorBurned[id]) : zeroString;
}

function getFormattedAccountReserved(id: CampaignKey): string {
  if (!statisticsAvailable.value) return '—';
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

/**
 * Refreshes burn totals for the account active at request start, accepting
 * results only from the latest request while this page remains mounted.
 */
async function fetchStatistics(): Promise<void> {
  const requestId = ++statisticsRequestId;
  const address = soraAddress.value;
  statisticsAvailable.value = false;
  for (const key of campaignOrder) {
    accountXorBurned[key] = getFPNumber(zeroString);
    accountReserved[key] = getFPNumber(zeroString);
    accountNexusReserved[key] = getFPNumber(zeroString);
    totalXorBurned[key] = getFPNumber(zeroString);
    totalReserved[key] = getFPNumber(zeroString);
    totalNexusReserved[key] = getFPNumber(zeroString);
    accountClaimRows[key] = [];
  }
  let session: Awaited<ReturnType<typeof requireEntitlements>>;
  try {
    session = await requireEntitlements();
  } catch {
    return;
  }
  if (isUnmounted || requestId !== statisticsRequestId || address !== soraAddress.value) return;
  const currentEndBlock = await getCurrentEndBlock();
  let indexedBurns: Awaited<ReturnType<typeof fetchBurnData>>;
  let accountIndexedBurns: Awaited<ReturnType<typeof fetchBurnData>>;
  try {
    [indexedBurns, accountIndexedBurns] = await Promise.all([
      fetchBurnData(minBlock.value, currentEndBlock, undefined, session.indexer),
      address ? fetchBurnData(minBlock.value, currentEndBlock, address, session.indexer) : Promise.resolve([]),
    ]);
  } catch {
    return;
  }
  // Optimistic local history cannot establish recovered ownership.
  const localBurns = session.capabilities.mode === 'legacy' ? await getLocalXorBurns(address, currentEndBlock) : [];
  try {
    await requireEntitlements(session.indexer);
  } catch {
    return;
  }
  if (isUnmounted || requestId !== statisticsRequestId || address !== soraAddress.value) return;
  const globalBurns = dedupeBurnEntries(indexedBurns);
  const accountBurns = dedupeBurnEntries([...indexedBurns, ...accountIndexedBurns, ...localBurns]);
  const statistics = calculateBurnCampaignStatistics({
    campaigns: campaigns.value,
    accountAddress: address,
    globalBurns,
    accountBurns,
  });

  if (isUnmounted || requestId !== statisticsRequestId || address !== soraAddress.value) return;

  for (const key of campaignOrder) {
    accountXorBurned[key] = statistics.accountTotals[key];
    accountReserved[key] = statistics.accountReservedTotals[key];
    accountNexusReserved[key] = statistics.accountNexusReservedTotals[key];
    accountClaimRows[key] = statistics.accountClaimRows[key];

    {
      totalXorBurned[key] = statistics.overallTotals[key];
      totalReserved[key] = statistics.overallReservedTotals[key];
      totalNexusReserved[key] = statistics.overallNexusReservedTotals[key];
    }
  }
  statisticsAvailable.value = true;
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
  if (isUnmounted) return;

  await withLoading(async () => {
    if (isUnmounted) return;

    calcCountdown();
    await fetchStatistics();
  });
}

/** Opens a campaign burn; the normal button starts with an empty Nexus recipient. */
function handleBurnClick(id: CampaignKey, nexusRecipient = ''): void {
  const campaign = campaignsObj[id];

  pendingGeneratedNexusRecipient.value = '';
  selectedCampaignId.value = id;
  selectedReceivedAsset.value = campaign.receivedAsset;
  selectedRate.value = campaign.rate;
  selectedMax.value = campaign.max;
  selectedMin.value = campaign.min;
  selectedRequiresNexusRecipient.value = campaign.requiresNexusRecipient;
  selectedNexusRecipient.value = nexusRecipient;
  burnDialogVisible.value = true;
}

/** Opens the SOLSWAP burn with an address whose recovery words were checked manually. */
function handleUseGeneratedNexusAddress(address: string): void {
  if (ended.solswap) return;
  const recipient = normalizeSoraNexusAccountId(address);
  if (!recipient) return;
  if (!isLoggedIn.value) {
    pendingGeneratedNexusRecipient.value = recipient;
    if (!isSoraAccountDialogVisible.value) {
      void connectSoraWallet().catch(() => {
        pendingGeneratedNexusRecipient.value = '';
      });
    }
    return;
  }
  handleBurnClick('solswap', recipient);
}

/** After a signed burn: tell the user it was sent, then refresh the totals now and twice more as blocks finalize. */
function handleBurnConfirm(done?: boolean): void {
  if (done && !isUnmounted) {
    burnSent[selectedCampaignId.value] = true;
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

  if (accountChanged) {
    for (const key of campaignOrder) burnSent[key] = false;
  }

  if (blockNumberBecameReady || accountChanged) {
    void fetchDataAndCalcCountdown();
  }
});

/** Resumes a generated-address burn after wallet connection, or forgets it if connection is cancelled. */
watch([isLoggedIn, isSoraAccountDialogVisible], ([loggedIn, connectionDialogVisible]) => {
  const recipient = pendingGeneratedNexusRecipient.value;
  if (!recipient || connectionDialogVisible) return;
  pendingGeneratedNexusRecipient.value = '';
  if (loggedIn && !ended.solswap && !isUnmounted) handleBurnClick('solswap', recipient);
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
  burnSent,
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

    if (isUnmounted) return;

    if (network !== SoraNetwork.Prod) {
      campaignsObj.solswap.from = 0;
      campaignsObj.solswap.to = 10_000;
    }

    await fetchDataAndCalcCountdown();

    if (isUnmounted) return;

    intervalId.value = window.setInterval(() => {
      void fetchDataAndCalcCountdown();
    }, 60_000);
  });
});

onBeforeUnmount(() => {
  isUnmounted = true;
  statisticsRequestId += 1;
  pendingGeneratedNexusRecipient.value = '';

  if (intervalId.value) {
    clearInterval(intervalId.value);
    intervalId.value = null;
  }

  for (const timeoutId of refreshTimeoutIds.value) {
    clearTimeout(timeoutId);
  }
  refreshTimeoutIds.value = [];
});
</script>

<style lang="scss" scoped>
$burn-page-width: 1120px;

.el-form--actions {
  @include buttons;
  @include full-width-button('action-button');
}

.burn-container {
  align-items: center;
  width: 100%;
}

.burn-grid {
  display: grid;
  grid-template-columns: #{'minmax(0, 1fr)'};
  gap: 20px;
  width: 100%;
  max-width: $burn-page-width;
  margin: 0 auto 16px;
}

// Public totals sit side by side when there is room and stack on a phone.
.burn-activity {
  display: grid;
  grid-template-columns: #{'repeat(auto-fit, minmax(min(100%, 320px), 1fr))'};
  gap: 16px;
  min-width: 0;
}

.burn-column {
  display: flex;
  min-width: 0;
  container-name: burn-card;
  container-type: inline-size;

  > * {
    flex: 1 1 auto;
    min-width: 0;
  }
}

.campaign {
  position: relative;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 16px;
  width: 100%;
  max-width: none;
  min-width: 0;
  margin: 0;
  padding: 24px;
  overflow: hidden;
  box-shadow: var(--s-shadow-element-pressed);

  &.disabled {
    box-shadow: var(--s-shadow-element);
  }

  // Loading shows as a thin moving line, so the card stays readable while totals are fetched.
  &--loading::after {
    content: '';
    position: absolute;
    top: 0;
    inset-inline-start: 0;
    width: 32%;
    height: 3px;
    border-radius: 3px;
    background: var(--s-color-theme-accent);
    animation: burn-card-loading 1.2s ease-in-out infinite;
  }

  &__sent {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0;
    padding: 12px 14px;
    border-radius: 14px;
    background: var(--s-color-status-success-background, rgba(52, 173, 135, 0.16));
    color: var(--s-color-base-content-primary);
    font-size: 14px;
    font-weight: 600;
    line-height: 1.45;
    text-align: start;
    :deep(.s-icon),
    :deep(i) {
      flex: 0 0 20px;
      color: var(--s-color-theme-accent);
    }
  }

  &__unavailable {
    align-self: start;
    margin: 0;
    padding: 14px 16px;
    border-radius: var(--s-border-radius-mini);
    background: var(--s-color-base-border-primary);
    color: var(--s-color-base-content-secondary);
    font-size: 13px;
    line-height: 1.5;
    text-align: start;
  }

  &__nexus {
    min-width: 0;
    padding: 0 16px;
    border-radius: 16px;
    background: var(--s-color-utility-surface);
    box-shadow: var(--s-shadow-element-pressed);
    text-align: start;
    summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 0;
      border-radius: 10px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      line-height: 1.4;
      list-style: none;
      &::-webkit-details-marker {
        display: none;
      }
      &::after {
        content: '';
        flex: 0 0 8px;
        width: 8px;
        height: 8px;
        margin-inline-end: 4px;
        border: solid var(--s-color-base-content-secondary);
        border-width: 0 2px 2px 0;
        transform: translateY(-2px) rotate(45deg);
        transition: transform 0.2s ease;
      }
    }
    &[open] {
      padding-bottom: 16px;
    }
    &[open] summary::after {
      transform: translateY(2px) rotate(-135deg);
    }
    // The summary already names the tool, so its own card and visible title are not repeated inside.
    :deep(.nexus-generator) {
      margin: 0;
      padding: 0;
      background: none;
      box-shadow: none;
    }
    :deep(.nexus-generator__heading h2) {
      position: absolute;
      width: 1px;
      height: 1px;
      margin: 0;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
  }

  :deep(.action-button.el-button) {
    height: 46px;
    min-height: 46px;
    margin-top: 0;
    font-size: 15px;
    line-height: 20px;
    font-weight: 600;
    text-transform: none;
  }

  :deep(.info-line) {
    min-width: 0;
    padding: 8px 4px;
  }
  :deep(.info-line-label) {
    font-size: 12px;
    line-height: 1.4;
    text-transform: none;
    font-weight: 400;
  }
  :deep(.info-line-value) {
    font-size: 13px;
    font-weight: 600;
  }

  &__hero {
    display: flex;
    align-items: center;
    gap: 16px;
    min-width: 0;
  }

  &__intro {
    flex: 1;
    min-width: 0;
    text-align: start;

    :deep(.page-header) {
      width: auto;
      margin: 0 0 6px;
    }
    // The shared header mixin sets font-weight with !important, so the heading weight needs it too.
    :deep(.page-header-title) {
      font-size: 22px;
      line-height: 1.25;
      font-weight: 600 !important;
      letter-spacing: -0.01em;
      text-transform: none;
    }
  }

  &__body {
    display: grid;
    grid-template-columns: #{'minmax(0, 1fr)'};
    gap: 16px;
    min-width: 0;
  }

  &__terms,
  &__account {
    min-width: 0;
    padding: 20px;
    border-radius: var(--s-border-radius-mini);
    background: var(--s-color-utility-surface);
    box-shadow: var(--s-shadow-element-pressed);
  }
}

.campaign-fire {
  display: block;
  flex: 0 0 88px;
  width: 88px;
  height: 88px;
}

.description {
  max-width: 640px;
  margin: 0 0 6px;
  color: var(--s-color-base-content-secondary);
  font-size: 14px;
  line-height: 1.5;
}

.link {
  display: inline-block;
  font-size: 13px;
  color: var(--s-color-status-info);
  @include focus-outline;
}

.reward-tiers {
  display: grid;
  grid-template-columns: #{'minmax(0, 1fr)'};
  gap: 8px;
  margin-bottom: 12px;
}
.reward-tier {
  gap: 2px;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--s-color-base-border-primary);
  box-shadow: var(--s-shadow-element);

  &__range {
    color: var(--s-color-base-content-secondary);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  &__reward {
    font-size: 13px;
    font-weight: 600;
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
  padding: 16px;
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
    // Keep native CSS minmax separate from the Sass breakpoint helper.
    grid-template-columns: #{'repeat(2, minmax(0, 1fr))'};
    gap: $inner-spacing-tiny;
  }

  &__amount {
    min-width: 0;
    padding: 12px;
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
    flex-wrap: wrap;
    gap: 12px;
    width: 100%;
    margin: 0;
  }
  &-item {
    flex: 1 1 160px;
    min-width: 0;
    padding: 14px 16px;
    border-radius: 12px;
    background-color: var(--s-color-base-border-primary);
    box-shadow: var(--s-shadow-element);
    text-align: start;
  }
  &-title {
    margin-bottom: 6px;
    color: var(--s-color-base-content-secondary);
    font-size: 11px;
    font-weight: 700;
    line-height: 1.35;
    letter-spacing: 0.04em;
  }
  &-value {
    font-size: 22px;
    font-weight: 700;
    line-height: 1.2;
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
    direction: ltr;
    unicode-bidi: isolate;
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

@container burn-card (min-width: 760px) {
  .campaign__body {
    grid-template-columns: #{'repeat(2, minmax(0, 1fr))'};
    align-items: start;
  }
}
@container burn-card (max-width: 479px) {
  .campaign {
    padding: 16px;
  }
  // The mark sits beside the title only, so the text below can use the full width of a phone.
  .campaign__hero {
    display: grid;
    grid-template-columns: #{'auto minmax(0, 1fr)'};
    align-items: center;
    gap: 4px 10px;
  }
  .campaign-fire {
    width: 56px;
    height: 56px;
    margin-inline-start: -4px;
  }
  .campaign__intro {
    display: contents;
    :deep(.page-header) {
      margin: 0;
    }
    :deep(.page-header-title) {
      font-size: 19px;
    }
    .description,
    .link {
      grid-column: 1 / -1;
    }
  }
  .campaign__terms,
  .campaign__account {
    padding: 14px;
  }
}

@keyframes burn-card-loading {
  0% {
    transform: translateX(-110%);
  }
  100% {
    transform: translateX(420%);
  }
}
@media (prefers-reduced-motion: reduce) {
  .campaign--loading::after {
    width: 100%;
    opacity: 0.5;
    animation: none;
  }
}

.burn-info {
  box-sizing: border-box;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  max-width: $burn-page-width;
  margin: 0 auto;
  padding: 0 8px;
  color: var(--s-color-base-content-secondary);
  font-size: 12px;
  line-height: 1.5;
  text-align: start;

  &__icon {
    flex: 0 0 18px;
    margin-top: 1px;
    color: var(--s-color-status-info);
  }
  &__text {
    flex: 1;
    min-width: 0;
  }
}
</style>
