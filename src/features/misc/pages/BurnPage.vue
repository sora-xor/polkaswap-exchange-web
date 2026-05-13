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
import { FPNumber, Operation, type HistoryItem } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { u8aToHex } from '@polkadot/util';
import { decodeAddress } from '@polkadot/util-crypto';
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
import { fetchData as fetchBurnData, isExcludedXorBurnAddress, type XorBurn } from '@/indexer/queries/burnXor';
import { api as walletApi } from '@/lib/soraneo-wallet/src/api';
import { useSettingsStore } from '@/stores/settings';
import { waitForSoraNetworkFromEnv } from '@/utils';
import { parseSoraNexusXorBurnRemark } from '@/utils/soraNexusAccount';

import type { Asset } from '@sora-substrate/sdk/build/assets/types';
import WalletComponentInfoLine from '@/lib/soraneo-wallet/src/components/InfoLine.vue';
import WalletComponentExternalLink from '@/lib/soraneo-wallet/src/components/shared/ExternalLink.vue';
import BurnDialog from '@/components/pages/Burn/BurnDialog.vue';
import GenericPageHeader from '@/components/shared/GenericPageHeader.vue';

dayjs.extend(durationPlugin);

type CampaignKey = 'solswap';

type RewardTier = {
  blockRange: string;
  reward: string;
};

type Campaign = {
  id: CampaignKey;
  title: string;
  description: string;
  rewardTiers: RewardTier[];
  disabledText?: string;
  link: string;
  receivedAsset: Asset;
  rate: string;
  max: number;
  min: number;
  requiresNexusRecipient: boolean;
  from: number;
  fromTimestamp: number;
  to: number;
  toTimestamp: number;
};

type ClaimRow = {
  id: string;
  blockHeight: Nullable<number>;
  burned: string;
  ssReserved: string;
  nexusReserved: string;
  txHash: string;
};

type BurnForStats = XorBurn & {
  displayBlockHeight?: Nullable<number>;
};

type BurnReservationAmounts = {
  reserved: FPNumber;
  nexus: FPNumber;
};

type BurnStatsByAddress = Record<string, { address: string; burned: FPNumber; reserved: FPNumber; nexus: FPNumber }>;

type LocalBurnHistoryItem = HistoryItem & {
  amount?: string;
  assetAddress?: string;
  blockHeight?: number;
  blockId?: string;
  comment?: string;
  from?: string;
  id?: string;
  txId?: string;
  type?: Operation;
};

type ChainApiHeaderShape = {
  isConnected?: boolean;
  rpc?: {
    chain?: {
      getHeader?: (blockHash?: string) => Promise<{ number?: { toString?: () => string } }>;
    };
  };
};

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
const SOLSWAP_LEGACY_START_BLOCK = 25_043_003;
const SOLSWAP_NEXUS_START_BLOCK = 25_867_650;
const SOLSWAP_CURRENT_RATE = '0.02';
const SOLSWAP_LEGACY_RATE = '0.01';
const SOLSWAP_CURRENT_SS_PER_XOR = '50';
const SOLSWAP_LEGACY_SS_PER_XOR = '100';
const POST_BURN_REFRESH_DELAYS_MS = [15_000, 45_000];
const MIN_NORMALIZABLE_ADDRESS_LENGTH = 32;

const blockNumber = computed(() => settingsStore.blockNumber);
const soraNetwork = computed(() => settingsStore.soraNetwork as Nullable<SoraNetwork>);

const campaignsObj = reactive<Record<CampaignKey, Campaign>>({
  solswap: {
    id: 'solswap',
    title: 'Burn XOR for SOLSWAP + SORA Nexus XOR',
    description:
      'Burn XOR to reserve SS. Reward rates depend on the burn block, with SORA Nexus XOR distribution starting at block 25,867,650.',
    rewardTiers: [
      {
        blockRange: 'From block 25,867,650',
        reward: '1 SORA Nexus XOR and 50 SS tokens per 1 XOR burned',
      },
      {
        blockRange: 'Blocks 25,043,003-25,867,649',
        reward: '0 SORA Nexus XOR and 100 SS tokens per 1 XOR burned',
      },
    ],
    link: 'https://t.me/solswap_io',
    receivedAsset: { symbol: 'SS', address: '', name: 'SOLSWAP', decimals: 18 } as Asset,
    rate: SOLSWAP_CURRENT_RATE,
    max: 100_000_000,
    min: 1,
    requiresNexusRecipient: true,
    from: SOLSWAP_LEGACY_START_BLOCK,
    fromTimestamp: 1717693074001,
    to: 60_000_000,
    toTimestamp: 1893456000000,
  },
});

const campaignOrder: CampaignKey[] = ['solswap'];
const campaigns = computed(() => campaignOrder.map((key) => campaignsObj[key]));

const createDefaultBurned = () => ({
  solswap: new FPNumber(0),
});

const totalXorBurned = reactive<Record<CampaignKey, FPNumber>>(createDefaultBurned());
const accountXorBurned = reactive<Record<CampaignKey, FPNumber>>(createDefaultBurned());
const totalReserved = reactive<Record<CampaignKey, FPNumber>>(createDefaultBurned());
const accountReserved = reactive<Record<CampaignKey, FPNumber>>(createDefaultBurned());
const totalNexusReserved = reactive<Record<CampaignKey, FPNumber>>(createDefaultBurned());
const accountNexusReserved = reactive<Record<CampaignKey, FPNumber>>(createDefaultBurned());
const accountClaimRows = reactive<Record<CampaignKey, ClaimRow[]>>({
  solswap: [],
});

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
const decimalDelimiter = FPNumber.DELIMITERS_CONFIG.decimal;
const escapedDecimalDelimiter = decimalDelimiter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const decimalOnlyZerosRegExp = new RegExp(`${escapedDecimalDelimiter}0+$`);
const trailingZerosRegExp = new RegExp(`(${escapedDecimalDelimiter}\\d*?[1-9])0+$`);
const danglingDecimalRegExp = new RegExp(`${escapedDecimalDelimiter}$`);

const minBlock = computed(() => Math.min(...campaignOrder.map((key) => campaignsObj[key].from)));
const maxBlock = computed(() => Math.max(...campaignOrder.map((key) => campaignsObj[key].to)));

function trimTrailingZeros(value: string): string {
  return value
    .replace(decimalOnlyZerosRegExp, '')
    .replace(trailingZerosRegExp, '$1')
    .replace(danglingDecimalRegExp, '');
}

function formatAmount(value: FPNumber, precision?: number): string {
  const formatted = precision === undefined ? value.toLocaleString() : value.toLocaleString(precision);
  return trimTrailingZeros(formatted);
}

function getFormattedXor(rate: string): string {
  return formatAmount(getFPNumber(rate));
}

function getFormattedXorFiat(rate: string): Nullable<string> {
  return getFiatAmountByString(rate, xor);
}

function getFormattedTotalXorBurned(id: CampaignKey): string {
  return totalXorBurned[id] ? formatAmount(totalXorBurned[id]) : zeroString;
}

function getFormattedTotalReserved(id: CampaignKey): string {
  return totalReserved[id] ? formatAmount(totalReserved[id], 3) : zeroString;
}

function getFormattedTotalNexusReserved(id: CampaignKey): string {
  return totalNexusReserved[id] ? formatAmount(totalNexusReserved[id], 3) : zeroString;
}

function getFormattedAccountXorBurned(id: CampaignKey): string {
  return accountXorBurned[id] ? formatAmount(accountXorBurned[id]) : zeroString;
}

function getFormattedAccountReserved(id: CampaignKey): string {
  return accountReserved[id] ? formatAmount(accountReserved[id], 3) : zeroString;
}

const copyTxHashTooltip = computed(() => copyTooltip(t('burnPage.soraNetworkTxHashLabel')));

function handleCopyTxHash(txHash: string, event: MouseEvent): void {
  void handleCopyAddress(txHash, event);
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

  const accountTotals = createDefaultBurned();
  const overallTotals = createDefaultBurned();
  const accountReservedTotals = createDefaultBurned();
  const overallReservedTotals = createDefaultBurned();
  const accountNexusReservedTotals = createDefaultBurned();
  const overallNexusReservedTotals = createDefaultBurned();
  const nextAccountClaimRows: Record<CampaignKey, ClaimRow[]> = {
    solswap: [],
  };

  for (const campaign of campaigns.value) {
    const campaignGlobalBurns = globalBurns.filter(
      ({ blockHeight }) => blockHeight >= campaign.from && blockHeight <= campaign.to
    );
    const campaignAccountBurns = accountBurns.filter(
      ({ blockHeight }) => blockHeight >= campaign.from && blockHeight <= campaign.to
    );
    const overallStats = aggregateBurnStatsByAddress(campaign, campaignGlobalBurns);
    const accountStats = aggregateBurnStatsByAddress(campaign, campaignAccountBurns);

    Object.values(overallStats).forEach((totals) => {
      overallTotals[campaign.id] = overallTotals[campaign.id].add(totals.burned);
      overallReservedTotals[campaign.id] = overallReservedTotals[campaign.id].add(totals.reserved);
      overallNexusReservedTotals[campaign.id] = overallNexusReservedTotals[campaign.id].add(totals.nexus);
    });

    Object.values(accountStats).forEach((totals) => {
      if (address && isSameSoraAddress(totals.address, address)) {
        accountTotals[campaign.id] = accountTotals[campaign.id].add(totals.burned);
        accountReservedTotals[campaign.id] = accountReservedTotals[campaign.id].add(totals.reserved);
        accountNexusReservedTotals[campaign.id] = accountNexusReservedTotals[campaign.id].add(totals.nexus);
      }
    });

    if (address) {
      campaignAccountBurns.forEach((burn) => {
        const { address: burnAddress, amount, blockHeight, txHash } = burn;
        const reservationAmounts = getReservationAmountsForBurn(campaign, burn);

        if (!txHash || !reservationAmounts || !isSameSoraAddress(burnAddress, address)) return;

        nextAccountClaimRows[campaign.id].push(
          createClaimRow(
            blockHeight,
            amount,
            reservationAmounts.reserved,
            reservationAmounts.nexus,
            txHash,
            'displayBlockHeight' in burn ? burn.displayBlockHeight : blockHeight
          )
        );
      });
    }
  }

  for (const key of campaignOrder) {
    accountXorBurned[key] = accountTotals[key];
    accountReserved[key] = accountReservedTotals[key];
    accountNexusReserved[key] = accountNexusReservedTotals[key];
    accountClaimRows[key] = nextAccountClaimRows[key].sort(
      (a, b) => (b.blockHeight ?? Number.MAX_SAFE_INTEGER) - (a.blockHeight ?? Number.MAX_SAFE_INTEGER)
    );

    if (hasGlobalBurns) {
      totalXorBurned[key] = overallTotals[key];
      totalReserved[key] = overallReservedTotals[key];
      totalNexusReserved[key] = overallNexusReservedTotals[key];
    }
  }
}

/**
 * Formats one qualifying burn into the claim row users need for Minamoto claims.
 */
function createClaimRow(
  blockHeight: number,
  burned: FPNumber,
  ssReserved: FPNumber,
  nexusReserved: FPNumber,
  txHash: string,
  displayBlockHeight: Nullable<number> = blockHeight
): ClaimRow {
  return {
    id: `${txHash}:${blockHeight}`,
    blockHeight: displayBlockHeight,
    burned: formatAmount(burned, 3),
    ssReserved: formatAmount(ssReserved, 3),
    nexusReserved: formatAmount(nexusReserved, 3),
    txHash,
  };
}

function isLocalXorBurn(item: LocalBurnHistoryItem): boolean {
  return item.type === Operation.Burn && item.assetAddress === XOR.address && !!item.amount && !!getLocalTxHash(item);
}

function getLocalTxHash(item: LocalBurnHistoryItem): string {
  return item.txId || item.id || '';
}

function getLocalHistoryList(): LocalBurnHistoryItem[] {
  try {
    return walletApi.historyList as LocalBurnHistoryItem[];
  } catch {
    return [];
  }
}

function getChainApi() {
  try {
    return walletApi.connection?.api ?? null;
  } catch {
    return null;
  }
}

function normalizeSoraAddress(address: string): string {
  if (address.length < MIN_NORMALIZABLE_ADDRESS_LENGTH) return address;

  try {
    const decoded = decodeAddress(address);
    return decoded.length === 32 ? u8aToHex(decoded) : address;
  } catch {
    return address;
  }
}

function isSameSoraAddress(left: string, right: string): boolean {
  return left === right || normalizeSoraAddress(left) === normalizeSoraAddress(right);
}

async function getCurrentChainBlockHeight(): Promise<Nullable<number>> {
  try {
    const chainApi = getChainApi() as Nullable<ChainApiHeaderShape>;

    if (!chainApi || chainApi.isConnected === false || typeof chainApi.rpc?.chain?.getHeader !== 'function') {
      return null;
    }

    const header = await chainApi.rpc.chain.getHeader();
    const rawBlockHeight = header?.number?.toString?.();
    const chainBlockHeight = rawBlockHeight ? Number(rawBlockHeight) : Number.NaN;

    return Number.isFinite(chainBlockHeight) ? chainBlockHeight : null;
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
    return Math.min(maxBlock.value, blockNumber.value);
  }

  const chainBlockHeight = await getCurrentChainBlockHeight();

  if (chainBlockHeight !== null && chainBlockHeight >= minBlock.value) {
    return Math.min(maxBlock.value, chainBlockHeight);
  }

  return maxBlock.value;
}

async function getBlockHeightFromBlockId(blockId?: string): Promise<Nullable<number>> {
  if (!blockId) return null;

  try {
    const header = await getChainApi()?.rpc.chain.getHeader(blockId);
    const rawBlockHeight = header?.number?.toString?.();
    const blockHeight = rawBlockHeight ? Number(rawBlockHeight) : Number.NaN;

    return Number.isFinite(blockHeight) ? blockHeight : null;
  } catch {
    return null;
  }
}

/**
 * Reads optimistic wallet history so a freshly submitted burn appears before
 * the public indexer or historical RPC scan catches up.
 */
async function getLocalXorBurns(address: Nullable<string>, fallbackBlockHeight: number): Promise<BurnForStats[]> {
  if (!address) return [];
  if (isExcludedXorBurnAddress(address)) return [];

  const localHistory = getLocalHistoryList().filter(isLocalXorBurn);
  const rows = await Promise.all(
    localHistory.map(async (item): Promise<Nullable<BurnForStats>> => {
      const exactBlockHeight = item.blockHeight ?? (await getBlockHeightFromBlockId(item.blockId));
      const blockHeight = exactBlockHeight ?? fallbackBlockHeight;
      const nexusRemark = item.comment ? parseSoraNexusXorBurnRemark(item.comment) : null;

      return {
        address,
        amount: new FPNumber(item.amount as string),
        blockHeight,
        displayBlockHeight: exactBlockHeight,
        nexusRecipient: nexusRemark?.recipient,
        txHash: getLocalTxHash(item),
      };
    })
  );

  return rows.filter((item): item is BurnForStats => !!item);
}

function dedupeBurnEntries(items: BurnForStats[]): BurnForStats[] {
  const seen = new Map<string, BurnForStats>();
  const result: BurnForStats[] = [];

  for (const item of items) {
    const key = item.txHash ? `tx:${item.txHash}` : `${item.address}:${item.blockHeight}:${item.amount.toString()}`;
    const existing = seen.get(key);

    if (existing) {
      existing.nexusRecipient ??= item.nexusRecipient;
      continue;
    }

    seen.set(key, item);
    result.push(item);
  }

  return result;
}

/**
 * Returns campaign reservation amounts for one qualifying XOR burn.
 */
function getReservationAmountsForBurn(campaign: Campaign, burn: BurnForStats): Nullable<BurnReservationAmounts> {
  const { amount, blockHeight } = burn;

  if (!amount.gte(getMinimumBurnedForBlock(campaign, blockHeight))) return null;

  return {
    reserved: getReservedAmount(campaign, blockHeight, amount),
    nexus: getNexusReservedAmount(campaign, burn),
  };
}

/**
 * Aggregates qualifying campaign burns by burner address.
 */
function aggregateBurnStatsByAddress(campaign: Campaign, burns: BurnForStats[]): BurnStatsByAddress {
  return burns.reduce<BurnStatsByAddress>((acc, burn) => {
    const { address: burnAddress, amount } = burn;
    const reservationAmounts = getReservationAmountsForBurn(campaign, burn);

    if (!reservationAmounts) return acc;

    const burnAddressKey = normalizeSoraAddress(burnAddress);
    const current = acc[burnAddressKey] ?? {
      address: burnAddress,
      burned: new FPNumber(0),
      reserved: new FPNumber(0),
      nexus: new FPNumber(0),
    };

    current.burned = current.burned.add(amount);
    current.reserved = current.reserved.add(reservationAmounts.reserved);
    current.nexus = current.nexus.add(reservationAmounts.nexus);
    acc[burnAddressKey] = current;

    return acc;
  }, {});
}

/**
 * Returns the minimum XOR burn accepted by the SOLSWAP UI for the reward tier active at a block.
 */
function getSolswapMinimumBurned(blockHeight: number, minReservedSs: number): FPNumber {
  const rate = blockHeight >= SOLSWAP_NEXUS_START_BLOCK ? SOLSWAP_CURRENT_RATE : SOLSWAP_LEGACY_RATE;
  return new FPNumber(rate).mul(minReservedSs);
}

/**
 * Returns the SS reservation multiplier for a historical SOLSWAP XOR burn block.
 */
function getSolswapSsPerXor(blockHeight: number): FPNumber {
  const ssPerXor = blockHeight >= SOLSWAP_NEXUS_START_BLOCK ? SOLSWAP_CURRENT_SS_PER_XOR : SOLSWAP_LEGACY_SS_PER_XOR;
  return new FPNumber(ssPerXor);
}

/**
 * Returns the minimum XOR amount that qualifies a burn for the campaign total calculations.
 */
function getMinimumBurnedForBlock(campaign: Campaign, blockHeight: number): FPNumber {
  if (campaign.id === 'solswap') {
    return getSolswapMinimumBurned(blockHeight, campaign.min);
  }

  return new FPNumber(campaign.rate).mul(campaign.min);
}

/**
 * Converts a historical XOR burn into reserved campaign tokens according to the block's reward tier.
 */
function getReservedAmount(campaign: Campaign, blockHeight: number, amount: FPNumber): FPNumber {
  if (campaign.id === 'solswap') {
    return amount.mul(getSolswapSsPerXor(blockHeight));
  }

  return amount.div(campaign.rate);
}

/**
 * Converts a historical XOR burn into reserved SORA Nexus XOR for the active tier.
 */
function getNexusReservedAmount(campaign: Campaign, burn: BurnForStats): FPNumber {
  if (campaign.id !== 'solswap' || burn.blockHeight < SOLSWAP_NEXUS_START_BLOCK || !burn.nexusRecipient) {
    return new FPNumber(0);
  }

  return burn.amount;
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
