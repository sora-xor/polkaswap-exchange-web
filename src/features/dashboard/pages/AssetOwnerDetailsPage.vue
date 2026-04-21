<template>
  <div v-if="asset" class="asset-owner-details-container">
    <s-button
      class="asset-owner-details-back"
      type="action"
      size="small"
      alternative
      :tooltip="t('assets.details')"
      @click="handleBack"
    >
      <s-icon name="arrows-chevron-left-rounded-24" size="24"></s-icon>
    </s-button>
    <s-row class="asset-owner-details-main" :gutter="20">
      <s-col :xs="12" :sm="12" :md="5" :lg="5">
        <s-card class="asset details-card" border-radius="small" shadow="always" size="big" primary>
          <p class="p3">Your asset</p>
          <div class="asset-title s-flex">
            <div class="asset-title__text s-flex-column">
              <h3 class="asset-title__name">{{ asset.name }}</h3>
              <token-address :address="asset.address" :symbol="asset.symbol"></token-address>
            </div>
            <token-logo class="asset-title__icon" size="big" :token="asset"></token-logo>
          </div>
          <s-divider></s-divider>
          <div class="asset-balance s-flex">
            <div class="asset-balance__info">
              <p class="p3">Your balance</p>
              <formatted-amount
                class="asset__value"
                value-can-be-hidden
                :value="formattedBalance"
                :font-size-rate="FontSizeRate.MEDIUM"
                :font-weight-rate="FontWeightRate.MEDIUM"
              ></formatted-amount>
              <formatted-amount
                v-if="fiatBalance"
                is-fiat-value
                value-can-be-hidden
                :value="fiatBalance"
              ></formatted-amount>
            </div>
            <s-button class="s-typography-button--small" size="small" @click="openSendDialog">
              <s-icon name="finance-send-24" size="16"></s-icon>
              Send
            </s-button>
          </div>
        </s-card>
        <s-card class="details-card" border-radius="small" shadow="always" size="big" primary>
          <div class="asset-supply s-flex">
            <div class="asset-supply__info">
              <h4>{{ asset.symbol }} asset supply</h4>
              <formatted-amount
                class="asset__value"
                :value="formattedSupply"
                :font-size-rate="FontSizeRate.MEDIUM"
                :font-weight-rate="FontWeightRate.MEDIUM"
              ></formatted-amount>
              <formatted-amount v-if="fiatSupply" is-fiat-value :value="fiatSupply"></formatted-amount>
            </div>
            <s-button
              class="s-typography-button--small"
              type="primary"
              size="small"
              :disabled="isAddLiquidityDisabled"
              @click="goToAddLiquidity"
            >
              <s-icon name="basic-drop-24" size="16"></s-icon>
              Add liquidity
            </s-button>
          </div>
          <s-divider></s-divider>
          <div class="asset-supply-actions">
            <s-button
              class="s-typography-button--small"
              size="small"
              :disabled="hasFixedSupply"
              @click="openMintDialog"
            >
              <s-icon name="printer-16" size="16"></s-icon>
              Mint more
            </s-button>
            <s-button class="s-typography-button--small" size="small" @click="openBurnDialog">
              <s-icon name="basic-flame-24" size="16"></s-icon>
              Burn
            </s-button>
          </div>
          <p v-if="isAddLiquidityDisabled" class="p3">
            Adding liquidity is not available because the asset is non-divisible.
          </p>
          <p v-if="hasFixedSupply" class="p3">Minting the asset is unavailable because it is not extensible.</p>
        </s-card>
        <stats-supply-chart
          :key="getForceRerenderKey('dashboard-supply-chart')"
          class="details-card"
          :predefined-token="asset"
        ></stats-supply-chart>
      </s-col>
      <s-col :xs="12" :sm="12" :md="7" :lg="7">
        <price-chart-widget
          :key="getForceRerenderKey('dashboard-price-chart')"
          class="details-card"
          :base-asset="asset"
          :is-available="hasFiat"
        ></price-chart-widget>
        <s-row :gutter="20">
          <s-col :xs="6" :sm="6" :md="6" :lg="4">
            <s-card class="details-card" border-radius="small" shadow="always" size="big" primary>
              <p class="p3 asset-stats-card__title">
                HOLDERS
                <s-tooltip slot="suffix" border-radius="mini" content="COMING SOON..." placement="top" tabindex="-1">
                  <s-icon name="info-16" size="14px"></s-icon>
                </s-tooltip>
              </p>
              <div class="asset-stats-card__value">N/A</div>
            </s-card>
          </s-col>
          <s-col :xs="6" :sm="6" :md="6" :lg="4">
            <s-card class="details-card" border-radius="small" shadow="always" size="big" primary>
              <p class="p3 asset-stats-card__title">
                TOTAL TXNS
                <s-tooltip slot="suffix" border-radius="mini" content="COMING SOON..." placement="top" tabindex="-1">
                  <s-icon name="info-16" size="14px"></s-icon>
                </s-tooltip>
              </p>
              <div class="asset-stats-card__value">N/A</div>
            </s-card>
          </s-col>
          <s-col :xs="6" :sm="6" :md="6" :lg="4">
            <s-card class="details-card" border-radius="small" shadow="always" size="big" primary>
              <p class="p3 asset-stats-card__title">
                MINTED
                <s-tooltip slot="suffix" border-radius="mini" content="COMING SOON..." placement="top" tabindex="-1">
                  <s-icon name="info-16" size="14px"></s-icon>
                </s-tooltip>
              </p>
              <div class="asset-stats-card__value">N/A</div>
            </s-card>
          </s-col>
          <s-col :xs="6" :sm="6" :md="6" :lg="4">
            <s-card class="details-card" border-radius="small" shadow="always" size="big" primary>
              <p class="p3 asset-stats-card__title">
                MINT TXNS
                <s-tooltip slot="suffix" border-radius="mini" content="COMING SOON..." placement="top" tabindex="-1">
                  <s-icon name="info-16" size="14px"></s-icon>
                </s-tooltip>
              </p>
              <div class="asset-stats-card__value">N/A</div>
            </s-card>
          </s-col>
          <s-col :xs="6" :sm="6" :md="6" :lg="4">
            <s-card class="details-card" border-radius="small" shadow="always" size="big" primary>
              <p class="p3 asset-stats-card__title">
                BURNED
                <s-tooltip slot="suffix" border-radius="mini" content="COMING SOON..." placement="top" tabindex="-1">
                  <s-icon name="info-16" size="14px"></s-icon>
                </s-tooltip>
              </p>
              <div class="asset-stats-card__value">N/A</div>
            </s-card>
          </s-col>
          <s-col :xs="6" :sm="6" :md="6" :lg="4">
            <s-card class="details-card" border-radius="small" shadow="always" size="big" primary>
              <p class="p3 asset-stats-card__title">
                BURN TXNS
                <s-tooltip slot="suffix" border-radius="mini" content="COMING SOON..." placement="top" tabindex="-1">
                  <s-icon name="info-16" size="14px"></s-icon>
                </s-tooltip>
              </p>
              <div class="asset-stats-card__value">N/A</div>
            </s-card>
          </s-col>
        </s-row>
      </s-col>
    </s-row>
    <mint-dialog v-model:visible="showMintDialog" :asset="asset" :editable-fiat="hasFiat"></mint-dialog>
    <burn-dialog
      v-model:visible="showBurnDialog"
      :asset="asset"
      :balance="balance"
      :editable-fiat="hasFiat"
    ></burn-dialog>
    <send-dialog
      v-model:visible="showSendDialog"
      :asset="asset"
      :balance="balance"
      :editable-fiat="hasFiat"
    ></send-dialog>
  </div>
  <div v-else class="asset-owner-details-container empty"></div>
</template>

<script lang="ts" setup>
import { computed, getCurrentInstance, onBeforeUnmount, onMounted, ref, toRef, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { api } from '@/lib/soraneo-wallet/src/api';
import StatsSupplyChart from '@/components/shared/Widget/SupplyChart.vue';
import { createAsyncComponent } from '@/shared/ui/async';
import { DashboardPageNames } from '@/features/dashboard/consts';
import type { OwnedAsset } from '@/features/dashboard/types';
import { PageNames, ZeroStringValue } from '@/consts';
import { BreakpointClass } from '@/consts/layout';
import { FontSizeRate as WalletFontSizeRate, FontWeightRate as WalletFontWeightRate } from '@/lib/soraneo-wallet/src/consts';
import { useDashboardStore } from '@/stores/dashboard';
import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useInternalConnect } from '@/composables/useInternalConnect';
import { useSubscriptions } from '@/composables/useSubscriptions';
import { useTranslation } from '@/composables/useTranslation';
import { useSettingsStore } from '@/stores/settings';
import { waitUntil } from '@/utils';

import type { CodecString } from '@sora-substrate/sdk';
import type { Subscription } from 'rxjs';
import WalletComponentTokenLogo from '@/lib/soraneo-wallet/src/components/TokenLogo.vue';
import WalletComponentFormattedAmount from '@/lib/soraneo-wallet/src/components/FormattedAmount.vue';
import WalletComponentTokenAddress from '@/lib/soraneo-wallet/src/components/TokenAddress.vue';
import BurnDialog from '@/modules/dashboard/components/BurnDialog.vue';
import MintDialog from '@/modules/dashboard/components/MintDialog.vue';
import SendDialog from '@/modules/dashboard/components/SendTokenDialog.vue';

const FontSizeRate = WalletFontSizeRate;
const FontWeightRate = WalletFontWeightRate;
const PriceChartWidget = createAsyncComponent(() => import('@/components/shared/Widget/PriceChart.vue'));

defineOptions({
  name: 'AssetOwnerDetailsPage',
});

const TokenLogo = WalletComponentTokenLogo;
const FormattedAmount = WalletComponentFormattedAmount;
const TokenAddress = WalletComponentTokenAddress;

const props = withDefaults(
  defineProps<{
    parentLoading?: boolean;
  }>(),
  {
    parentLoading: false,
  }
);

const parentLoading = toRef(props, 'parentLoading');

const route = useRoute();
const router = useRouter();
const { t } = useTranslation();
const { formatCodecNumber, getFiatAmountByCodecString } = useFormattedAmount();
const { isLoggedIn } = useInternalConnect();
const dashboardStore = useDashboardStore();
const settingsStore = useSettingsStore();

const responsiveClass = computed(() => settingsStore.screenBreakpointClass as BreakpointClass);
const assets = computed(() => dashboardStore.ownedAssets as OwnedAsset[]);

const balance = ref<CodecString>(ZeroStringValue);
const supply = ref<CodecString>(ZeroStringValue);
const showSendDialog = ref(false);
const showBurnDialog = ref(false);
const showMintDialog = ref(false);

const balanceSubscription = ref<Nullable<Subscription>>(null);
const supplySubscription = ref<Nullable<Subscription>>(null);

const asset = computed<Nullable<OwnedAsset>>(() => {
  const assetId = route.params.asset as string | undefined;
  if (!assetId) return null;
  return assets.value.find(({ address }) => address === assetId) ?? null;
});

const formattedBalance = computed(() =>
  balance.value ? formatCodecNumber(balance.value, asset.value?.decimals) : '0'
);
const fiatBalance = computed(() =>
  asset.value && balance.value ? getFiatAmountByCodecString(balance.value, asset.value) : ZeroStringValue
);
const hasFiat = computed(() => Boolean(fiatBalance.value));

const formattedSupply = computed(() =>
  supply.value ? formatCodecNumber(supply.value, asset.value?.decimals) : ZeroStringValue
);
const fiatSupply = computed(() =>
  asset.value && supply.value ? getFiatAmountByCodecString(supply.value, asset.value) : ZeroStringValue
);

const isAddLiquidityDisabled = computed(() => !asset.value?.decimals);
const hasFixedSupply = computed(() => !asset.value?.isMintable);

function getForceRerenderKey(name: string): string {
  return `${name}-${responsiveClass.value}`;
}

function handleBack(): void {
  router.back();
}

function openSendDialog(): void {
  showSendDialog.value = true;
}

function openMintDialog(): void {
  showMintDialog.value = true;
}

function openBurnDialog(): void {
  showBurnDialog.value = true;
}

function goToAddLiquidity(): void {
  if (!asset.value) return;
  router.push({ name: PageNames.AddLiquidity, params: { first: XOR.symbol, second: asset.value.address } });
}

function stopAssetSubscriptions(): void {
  balanceSubscription.value?.unsubscribe?.();
  supplySubscription.value?.unsubscribe?.();
  balanceSubscription.value = null;
  supplySubscription.value = null;
}

async function subscribeToCurrentAsset(): Promise<void> {
  stopAssetSubscriptions();

  const target = asset.value;
  if (!target) return;

  balanceSubscription.value = api.assets.getAssetBalanceObservable(target).subscribe((result) => {
    balance.value = result.transferable;
  });

  supplySubscription.value = api.apiRx.query.tokens.totalIssuance(target.address).subscribe((result) => {
    supply.value = result.toString();
  });
}

const {
  withApi,
  updateSubscriptions,
  resetSubscriptions: resetTrackedSubscriptions,
} = useSubscriptions({
  parentLoading,
  loginSource: isLoggedIn,
  trackConnection: false,
  startSubscriptions: [subscribeToCurrentAsset],
  resetSubscriptions: [stopAssetSubscriptions],
});

watch(asset, async (next, previous) => {
  if (next === previous) return;
  if (!next) {
    stopAssetSubscriptions();
    return;
  }

  await updateSubscriptions();
});

onMounted(async () => {
  await withApi(async () => {
    if (!isLoggedIn.value) {
      router.push({ name: DashboardPageNames.AssetOwner });
      return;
    }

    await waitUntil(() => !parentLoading.value);

    if (!asset.value) {
      router.push({ name: DashboardPageNames.AssetOwner });
      return;
    }

    await updateSubscriptions();
  });
});

onBeforeUnmount(() => {
  stopAssetSubscriptions();
  resetTrackedSubscriptions();
});

defineExpose({
  asset,
  formattedBalance,
  fiatBalance,
  formattedSupply,
  fiatSupply,
  hasFiat,
  isAddLiquidityDisabled,
  hasFixedSupply,
  showSendDialog,
  showBurnDialog,
  showMintDialog,
  handleBack,
  openSendDialog,
  openMintDialog,
  openBurnDialog,
  goToAddLiquidity,
  getForceRerenderKey,
});

const instance = getCurrentInstance();
if (instance?.proxy) {
  Object.defineProperties(instance.proxy, {
    asset: { get: () => asset.value },
    formattedBalance: { get: () => formattedBalance.value },
    fiatBalance: { get: () => fiatBalance.value },
    formattedSupply: { get: () => formattedSupply.value },
    fiatSupply: { get: () => fiatSupply.value },
    hasFiat: { get: () => hasFiat.value },
    isAddLiquidityDisabled: { get: () => isAddLiquidityDisabled.value },
    hasFixedSupply: { get: () => hasFixedSupply.value },
    showSendDialog: { get: () => showSendDialog.value },
    showBurnDialog: { get: () => showBurnDialog.value },
    showMintDialog: { get: () => showMintDialog.value },
    handleBack: { value: handleBack },
    openSendDialog: { value: openSendDialog },
    openMintDialog: { value: openMintDialog },
    openBurnDialog: { value: openBurnDialog },
    goToAddLiquidity: { value: goToAddLiquidity },
    getForceRerenderKey: { value: getForceRerenderKey },
  });
}
</script>

<style lang="scss" scoped>
.asset-owner-details {
  &-container {
    display: flex;
    gap: 16px;

    &.empty {
      height: calc(100dvh - #{$header-height} - #{$footer-height});
    }

    .details-card {
      margin-bottom: 24px;
    }
  }
}
.asset-title,
.asset-balance,
.asset-supply {
  align-items: center;
}
.asset-title__text,
.asset-balance__info,
.asset-supply__info {
  flex: 1;
}
.asset__value {
  font-size: 20px;
}
.asset-supply-actions {
  margin-bottom: 8px;
}
</style>
