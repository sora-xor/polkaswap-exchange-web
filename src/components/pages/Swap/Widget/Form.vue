<template>
  <base-widget class="swap-widget" :title="t('exchange.Swap')" v-bind="$attrs">
    <template #filters>
      <swap-status-action-badge>
        <template #label>{{ t('marketText') }}:</template>
        <template #value>{{ swapMarketAlgorithm }}</template>
        <template #action>
          <s-button class="el-button--settings" type="action" icon="basic-settings-24" @click="openSettingsDialog" />
        </template>
      </swap-status-action-badge>
    </template>

    <div class="swap-form">
      <token-input
        data-test-name="swapFrom"
        is-select-available
        :balance="getTokenBalance(tokenFrom)"
        :is-max-available="isMaxSwapAvailable"
        :title="t('transfers.from')"
        :token="tokenFrom"
        :value="fromValue"
        @input="handleInputFieldFrom"
        @focus="handleFocusField(false)"
        @max="handleMaxValue"
        @select="openSelectTokenDialog(true)"
      />

      <s-button
        class="el-button--switch-tokens"
        data-test-name="switchToken"
        type="action"
        icon="arrows-swap-90-24"
        :disabled="!areTokensSelected"
        @click="handleSwitchTokens"
      />

      <token-input
        data-test-name="swapTo"
        is-select-available
        :balance="getTokenBalance(tokenTo)"
        :title="t('transfers.to')"
        :token="tokenTo"
        :value="toValue"
        @input="handleInputFieldTo"
        @focus="handleFocusField(true)"
        @select="openSelectTokenDialog(false)"
      >
        <template #fiat-amount-append v-if="tokenTo">
          <value-status-wrapper :value="fiatDifference" badge class="price-difference__value">
            <formatted-amount :value="fiatDifferenceFormatted">%</formatted-amount>
          </value-status-wrapper>
        </template>
      </token-input>

      <slippage-tolerance class="slippage-tolerance-settings" />

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
        data-test-name="confirmSwap"
        type="primary"
        :disabled="isConfirmSwapDisabled"
        :loading="loading || quoteLoading || isSelectAssetLoading"
        @click="handleSwapClick"
      >
        <template v-if="!areTokensSelected">
          {{ t('buttons.chooseTokens') }}
        </template>
        <template v-else-if="!isAvailable">
          {{ t('pairIsNotCreated') }}
        </template>
        <template v-else-if="areZeroAmounts">
          {{ t('buttons.enterAmount') }}
        </template>
        <template v-else-if="isInsufficientLiquidity">
          {{ t('swap.insufficientLiquidity') }}
        </template>
        <template v-else-if="isInsufficientBalance">
          {{ t('insufficientBalanceText', { tokenSymbol: tokenFromSymbol }) }}
        </template>
        <template v-else-if="isInsufficientXorForFee">
          {{ t('insufficientBalanceText', { tokenSymbol: KnownSymbols.XOR }) }}
        </template>
        <template v-else>
          <s-icon
            v-if="isErrorFiatDifferenceStatus"
            name="notifications-alert-triangle-24"
            size="18"
            class="action-button-icon"
          />
          {{ t('exchange.Swap') }}
        </template>
      </s-button>

      <swap-transaction-details :disabled="!areTokensSelected || hasZeroAmount" class="swap-details">
        <template #reference>
          <info-line
            :label="t('networkFeeText')"
            :label-tooltip="t('networkFeeTooltipText')"
            :value="networkFeeFormatted"
            :asset-symbol="xorSymbol"
            :fiat-value="getFiatAmountByCodecString(networkFee)"
            is-formatted
            class="swap-details-info-line"
          />
        </template>
      </swap-transaction-details>

      <select-token
        :visible.sync="showSelectTokenDialog"
        :connected="isLoggedIn"
        :asset="isTokenFromSelected ? tokenTo : tokenFrom"
        @select="handleSelectToken"
      />
      <swap-loss-warning-dialog
        :visible.sync="lossWarningVisibility"
        :value="fiatDifferenceFormatted"
        @confirm="handleConfirm"
      />
      <swap-confirm
        :visible.sync="confirmDialogVisible"
        :is-insufficient-balance="isInsufficientBalance"
        @confirm="exchangeTokens"
      />
      <swap-settings :visible.sync="showSettings" />
    </div>
  </base-widget>
</template>

<script setup lang="ts">
import { FPNumber, Operation } from '@sora-substrate/sdk';
import { KnownSymbols, XOR } from '@sora-substrate/sdk/build/assets/consts';
import { api, components } from '@soramitsu/soraneo-wallet-web';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { useConfirmDialog } from '@/composables/useConfirmDialog';
import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useInternalConnect } from '@/composables/useInternalConnect';
import { useSwapAmounts } from '@/composables/useSwapAmounts';
import { useTokenSelect } from '@/composables/useTokenSelect';
import { useTransaction } from '@/composables/useTransaction';
import { useTranslation } from '@/composables/useTranslation';
import { Components, MarketAlgorithms } from '@/consts';
import { lazyComponent } from '@/router';
import store from '@/store';
import { useSwapStore } from '@/stores/swap';
import {
  asZeroValue,
  debouncedInputHandler,
  getAssetBalance,
  getMaxValue,
  hasInsufficientBalance,
  hasInsufficientXorForFee,
  isMaxButtonAvailable,
} from '@/utils';
import { DifferenceStatus, calcFiatDifference, getDifferenceStatus } from '@/utils/swap';

import type { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import type { Distribution } from '@sora-substrate/liquidity-proxy/build/types';
import type { CodecString, NetworkFeesObject } from '@sora-substrate/sdk';
import type { AccountAsset, Asset } from '@sora-substrate/sdk/build/assets/types';
import type { DexId } from '@sora-substrate/sdk/build/dex/consts';
import type { SwapQuoteData } from '@sora-substrate/sdk/build/swap/types';
import type { Subscription } from 'rxjs';

const BaseWidget = lazyComponent(Components.BaseWidget);
const SwapSettings = lazyComponent(Components.SwapSettings);
const SwapConfirm = lazyComponent(Components.SwapConfirm);
const SwapStatusActionBadge = lazyComponent(Components.SwapStatusActionBadge);
const SwapTransactionDetails = lazyComponent(Components.SwapTransactionDetails);
const SwapLossWarningDialog = lazyComponent(Components.SwapLossWarningDialog);
const SlippageTolerance = lazyComponent(Components.SlippageTolerance);
const SelectToken = lazyComponent(Components.SelectToken);
const TokenInput = lazyComponent(Components.TokenInput);
const ValueStatusWrapper = lazyComponent(Components.ValueStatusWrapper);
const FormattedAmount = components.FormattedAmount;
const InfoLine = components.InfoLine;

defineOptions({ name: 'SwapFormWidget' });

const props = withDefaults(
  defineProps<{
    parentLoading?: boolean;
  }>(),
  {
    parentLoading: false,
  }
);

const { t } = useTranslation();
const swapStore = useSwapStore();
const {
  tokenFrom,
  tokenTo,
  fromValue,
  toValue,
  areTokensSelected,
  hasZeroAmount,
  areZeroAmounts,
  isZeroFromAmount,
  isZeroToAmount,
  setTokenFromAddress,
  setTokenToAddress,
  setFromValue,
  setToValue,
} = useSwapAmounts();
const { isLoggedIn, connectSoraWallet } = useInternalConnect();
const { confirmDialogVisible, confirmOrExecute } = useConfirmDialog();
const { isSelectAssetLoading, withSelectAssetLoading } = useTokenSelect();
const { loading, withApi, withNotifications } = useTransaction({
  parentLoading: computed(() => props.parentLoading),
});
const {
  getFPNumber,
  getFPNumberFromCodec,
  formatCodecNumber,
  formatStringValue,
  getFiatAmountByCodecString,
  getFPNumberFiatAmountByFPNumber,
} = useFormattedAmount();

const networkFees = computed(() => store.state.wallet.settings.networkFees as NetworkFeesObject);
const networkFee = computed(() => networkFees.value[Operation.Swap]);
const slippageTolerance = computed(() => store.state.settings.slippageTolerance);
const xor = computed(() => store.getters.assets.xor as AccountAsset);
const liquiditySource = computed(() => swapStore.swapLiquiditySource);
const debugEnabled = computed(() => store.getters.settings.debugEnabled);
const nodeIsConnected = computed(() => store.getters.settings.nodeIsConnected);
const swapMarketAlgorithm = computed(() => swapStore.swapMarketAlgorithm);
const isAvailable = computed(() => swapStore.isAvailable);
const allowLossPopup = computed(() => swapStore.allowLossPopup);
const isExchangeB = computed(() => swapStore.isExchangeB);
const selectedDexId = computed(() => swapStore.selectedDexId);

const showSettings = ref(false);
const showSelectTokenDialog = ref(false);
const lossWarningVisibility = ref(false);
const isTokenFromSelected = ref(false);
const quoteSubscription = ref<Subscription | null>(null);
const quoteLoading = ref(false);

const delimiters = FPNumber.DELIMITERS_CONFIG;
const xorSymbol = ` ${XOR.symbol}`;

const fiatDifference = computed(() => calcFiatDifference(fromFiatAmount.value, toFiatAmount.value).toFixed(2));

const fiatDifferenceFormatted = computed(() => formatStringValue(fiatDifference.value));
const isErrorFiatDifferenceStatus = computed(
  () => getDifferenceStatus(Number(fiatDifference.value) || 0) === DifferenceStatus.Error
);

const networkFeeFormatted = computed(() => formatCodecNumber(networkFee.value));
const tokenFromSymbol = computed(() => tokenFrom.value?.symbol ?? '');
const isXorOutputSwap = computed(() => tokenTo.value?.address === XOR.address);
const preparedForSwap = computed(() => isLoggedIn.value && areTokensSelected.value);
const fromFiatAmount = computed(() => {
  if (!tokenFrom.value || !fromValue.value) return FPNumber.ZERO;
  return getFPNumberFiatAmountByFPNumber(new FPNumber(fromValue.value), tokenFrom.value) ?? FPNumber.ZERO;
});
const toFiatAmount = computed(() => {
  if (!tokenTo.value || !toValue.value) return FPNumber.ZERO;
  return getFPNumberFiatAmountByFPNumber(new FPNumber(toValue.value), tokenTo.value) ?? FPNumber.ZERO;
});

const isMaxSwapAvailable = computed(() => {
  if (!preparedForSwap.value || !tokenFrom.value) return false;

  return isMaxButtonAvailable(tokenFrom.value, fromValue.value, networkFee.value, xor.value, isXorOutputSwap.value);
});

const isInsufficientLiquidity = computed(
  () => isAvailable.value && preparedForSwap.value && !areZeroAmounts.value && hasZeroAmount.value
);
const isInsufficientBalance = computed(() => {
  if (!tokenFrom.value) return false;
  return preparedForSwap.value && hasInsufficientBalance(tokenFrom.value, fromValue.value, networkFee.value);
});
const isInsufficientXorForFee = computed(() => {
  const result = preparedForSwap.value && hasInsufficientXorForFee(xor.value, networkFee.value, isXorOutputSwap.value);
  if (result || !isXorOutputSwap.value) {
    return result;
  }
  const xorBalance = getFPNumberFromCodec(xor.value.balance?.transferable ?? '0', xor.value.decimals);
  const fpNetworkFee = getFPNumberFromCodec(networkFee.value, xor.value.decimals).sub(xorBalance);
  const fpAmount = getFPNumber(toValue.value || '0', xor.value.decimals).sub(
    FPNumber.gt(fpNetworkFee, FPNumber.ZERO) ? fpNetworkFee : FPNumber.ZERO
  );
  return FPNumber.lte(fpAmount, FPNumber.ZERO);
});

const isConfirmSwapDisabled = computed(
  () =>
    !areTokensSelected.value ||
    !swapStore.isAvailable ||
    areZeroAmounts.value ||
    isInsufficientLiquidity.value ||
    isInsufficientBalance.value ||
    isInsufficientXorForFee.value
);

const recountSwapValues = debouncedInputHandler(async () => {
  await runRecountSwapValues();
}, 100);

function getTokenBalance(token: Nullable<AccountAsset>): CodecString {
  return getAssetBalance(token);
}

function resetFieldFrom() {
  setFromValue('');
}

function resetFieldTo() {
  setToValue('');
}

async function handleInputFieldFrom(value: string) {
  if (!areTokensSelected.value || asZeroValue(value)) {
    resetFieldTo();
  }

  if (value === fromValue.value) return;

  setFromValue(value);
  recountSwapValues();
}

async function handleInputFieldTo(value: string) {
  if (!areTokensSelected.value || asZeroValue(value)) {
    resetFieldFrom();
  }

  if (value === toValue.value) return;

  setToValue(value);
  recountSwapValues();
}

async function runRecountSwapValues() {
  const value = isExchangeB.value ? toValue.value : fromValue.value;

  const quote = swapStore.swapQuote;

  if (!areTokensSelected.value || asZeroValue(value) || !quote) {
    swapStore.setAmountWithoutImpact();
    swapStore.setLiquidityProviderFee();
    swapStore.setRewards();
    swapStore.setRoute();
    swapStore.setDistribution();
    swapStore.selectDexId();
    return;
  }

  const setOppositeValue = isExchangeB.value ? setFromValue : setToValue;
  const resetOppositeValue = isExchangeB.value ? resetFieldFrom : resetFieldTo;
  const oppositeToken = (isExchangeB.value ? tokenFrom.value : tokenTo.value) as AccountAsset;

  try {
    const {
      dexId,
      result: { amount, amountWithoutImpact, fee, rewards, route, distribution },
    } = quote(
      (tokenFrom.value as Asset).address,
      (tokenTo.value as Asset).address,
      value,
      isExchangeB.value,
      [liquiditySource.value].filter(Boolean) as Array<LiquiditySourceTypes>
    );

    if (debugEnabled.value) {
      const rpcResult = await api.swap.getResultRpc(
        (tokenFrom.value as Asset).address,
        (tokenTo.value as Asset).address,
        value,
        isExchangeB.value,
        liquiditySource.value ?? undefined
      );

      console.table({
        frontend: amount,
        backend: rpcResult.amount,
        difference: +amount - +rpcResult.amount,
      });
    }

    setOppositeValue(getFPNumberFromCodec(amount, oppositeToken.decimals).toString());
    swapStore.setAmountWithoutImpact(amountWithoutImpact as string);
    swapStore.setLiquidityProviderFee(fee as CodecString);
    swapStore.setRewards(rewards as Array<LPRewardsInfo>);
    swapStore.setRoute(route as string[]);
    swapStore.setDistribution(distribution as Distribution[][]);
    swapStore.selectDexId(dexId as DexId);
  } catch (error) {
    console.error(error);
    resetOppositeValue();
  }
}

function resetQuoteSubscription() {
  quoteSubscription.value?.unsubscribe();
  quoteSubscription.value = null;
}

async function subscribeOnQuote() {
  resetQuoteSubscription();

  if (!areTokensSelected.value) return;

  quoteLoading.value = true;

  const observableQuote = api.swap.getDexesSwapQuoteObservable(
    (tokenFrom.value as AccountAsset).address,
    (tokenTo.value as AccountAsset).address
  );

  if (observableQuote) {
    quoteSubscription.value = observableQuote.subscribe((quoteData: SwapQuoteData) => {
      const { quote, isAvailable, liquiditySources } = quoteData;
      swapStore.setSubscriptionPayload({ quote, isAvailable, liquiditySources });
      recountSwapValues();
      quoteLoading.value = false;
    });
  } else {
    swapStore.setSubscriptionPayload();
    quoteLoading.value = false;
  }
}

function enableSwapSubscriptions() {
  swapStore.updateSubscriptions();
  subscribeOnQuote();
}

function resetSwapSubscriptions() {
  swapStore.resetSubscriptions();
  resetQuoteSubscription();
}

function openSelectTokenDialog(isFrom: boolean) {
  isTokenFromSelected.value = isFrom;
  showSelectTokenDialog.value = true;
}

async function handleSelectToken(token: AccountAsset) {
  if (!token) return;

  await withSelectAssetLoading(async () => {
    if (isTokenFromSelected.value) {
      await setTokenFromAddress(token.address);
    } else {
      await setTokenToAddress(token.address);
    }
    subscribeOnQuote();
  });
}

function handleSwapClick() {
  if (isErrorFiatDifferenceStatus.value && allowLossPopup.value) {
    lossWarningVisibility.value = true;
  } else {
    handleConfirm();
  }
}

function handleConfirm() {
  confirmOrExecute(exchangeTokens);
}

async function exchangeTokens() {
  if (isConfirmSwapDisabled.value) return;

  await withNotifications(async () => {
    await api.swap.execute(
      tokenFrom.value as AccountAsset,
      tokenTo.value as AccountAsset,
      fromValue.value,
      toValue.value,
      slippageTolerance.value,
      isExchangeB.value,
      liquiditySource.value as LiquiditySourceTypes,
      selectedDexId.value
    );

    resetFieldFrom();
    resetFieldTo();
    swapStore.setExchangeB(false);
  });
}

function handleFocusField(exchangeB = false) {
  const isZeroValue = exchangeB ? isZeroToAmount.value : isZeroFromAmount.value;
  const previous = isExchangeB.value;

  swapStore.setExchangeB(exchangeB);

  if (isZeroValue) {
    resetFieldFrom();
    resetFieldTo();
  }

  if (previous !== isExchangeB.value) {
    recountSwapValues();
  }
}

async function handleSwitchTokens() {
  if (!areTokensSelected.value) return;

  await swapStore.switchTokens();
  recountSwapValues();
}

function handleMaxValue() {
  if (!tokenFrom.value) return;

  swapStore.setExchangeB(false);
  const max = getMaxValue(tokenFrom.value, networkFee.value);
  handleInputFieldFrom(max);
}

function openSettingsDialog() {
  showSettings.value = true;
}

watch(liquiditySource, () => {
  runRecountSwapValues();
});

watch(nodeIsConnected, (connected) => {
  if (connected) {
    enableSwapSubscriptions();
  } else {
    resetSwapSubscriptions();
  }
});

onMounted(async () => {
  await withApi(async () => {
    await api.swap.update();
    enableSwapSubscriptions();
  });
});

onBeforeUnmount(() => {
  resetSwapSubscriptions();
  swapStore.reset();
});
</script>

<style lang="scss" scoped>
.swap-widget {
  @include buttons;
  @include full-width-button('action-button');
  @include full-width-button('swap-details', 0);
  @include vertical-divider('el-button--switch-tokens', $inner-spacing-medium);
}

.el-button.neumorphic.s-action:disabled {
  &,
  &:hover {
    &.el-button--switch-tokens.loading {
      border-color: transparent;
      box-shadow: var(--s-shadow-element-pressed);
    }
  }
}

.swap-form {
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
}

.price-difference {
  &__value {
    font-weight: 600;
    font-size: var(--s-font-size-small);
    white-space: nowrap;

    & > span {
      padding-right: 2px;
    }
  }
}

i.action-button-icon[class*=' s-icon-'] {
  margin-right: $inner-spacing-mini;
  &,
  &:hover {
    color: inherit;
  }
}
</style>
