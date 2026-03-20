<template>
  <div>
    <s-form class="el-form--actions" :show-message="false">
      <token-input
        :balance="getTokenBalance(firstToken)"
        is-select-available
        :is-max-available="isFirstMaxButtonAvailable"
        :title="t('createPair.deposit')"
        :token="firstToken"
        :model-value="firstTokenValue"
        :disabled="!areTokensSelected"
        @update:model-value="handleTokenChange($event, setFirstTokenValue)"
        @focus="setFocusedField(FocusedField.First)"
        @max="handleAddLiquidityMaxValue($event, setFirstTokenValue)"
        @select="openSelectTokenDialog(true)"
      ></token-input>

      <s-icon class="icon-divider" name="plus-16"></s-icon>

      <token-input
        :balance="getTokenBalance(secondToken)"
        is-select-available
        :is-max-available="isSecondMaxButtonAvailable"
        :title="t('createPair.deposit')"
        :token="secondToken"
        :model-value="secondTokenValue"
        :disabled="!areTokensSelected"
        @update:model-value="handleTokenChange($event, setSecondTokenValue)"
        @focus="setFocusedField(FocusedField.Second)"
        @max="handleAddLiquidityMaxValue($event, setSecondTokenValue)"
        @select="openSelectTokenDialog(false)"
      ></token-input>

      <slippage-tolerance class="slippage-tolerance-settings"></slippage-tolerance>

      <s-button
        type="primary"
        class="action-button s-typography-button--large"
        :disabled="!areTokensSelected || emptyAssets || isInsufficientBalance"
        :loading="loading || isSelectAssetLoading"
        @click="handleAddLiquidity"
      >
        <template v-if="!areTokensSelected">
          {{ t('buttons.chooseTokens') }}
        </template>
        <template v-else-if="emptyAssets">
          {{ t('buttons.enterAmount') }}
        </template>
        <template v-else-if="isInsufficientBalance">
          {{ t('insufficientBalanceText', { tokenSymbol: insufficientBalanceTokenSymbol }) }}
        </template>
        <template v-else>
          {{ t('createPair.supply') }}
        </template>
      </s-button>

      <template v-if="areTokensSelected">
        <div v-if="!(isAvailable && isNotFirstLiquidityProvider) && emptyAssets" class="info-line-container">
          <p class="info-line-container__title">{{ t('createPair.firstLiquidityProvider') }}</p>
          <info-line>
            <template #info-line-prefix>
              <p class="info-line--first-liquidity" v-html="firstLiquidityProviderInfo"></p>
            </template>
          </info-line>
        </div>

        <add-liquidity-transaction-details
          v-if="!emptyAssets || (liquidityInfo || {}).balance"
          :info-only="false"
          class="info-line-container"
        ></add-liquidity-transaction-details>
      </template>
    </s-form>

    <select-token
      is-add-liquidity
      append-to-body
      v-model:visible="showSelectTokenDialog"
      :connected="isLoggedIn"
      :asset="isFirstTokenSelected ? secondToken : firstToken"
      :is-first-token-selected="isFirstTokenSelected"
      :disabled-custom="isFirstTokenSelected"
      @select="selectToken"
    ></select-token>

    <add-liquidity-confirm
      v-model:visible="confirmDialogVisible"
      :parent-loading="loading"
      :share-of-pool="shareOfPool"
      :first-token="firstToken"
      :second-token="secondToken"
      :first-token-value="firstTokenValue"
      :second-token-value="secondTokenValue"
      :price="price"
      :price-reversed="priceReversed"
      :slippage-tolerance="slippageToleranceValue"
      :insufficient-balance-token-symbol="insufficientBalanceTokenSymbol"
      @confirm="depositLiquidity"
    ></add-liquidity-confirm>

    <network-fee-warning-dialog
      v-model:visible="showWarningFeeDialog"
      :fee="removeLiquidityFormattedFee"
      @confirm="confirmNetworkFeeWariningDialog"
    ></network-fee-warning-dialog>
  </div>
</template>

<script setup lang="ts">
import { Operation } from '@sora-substrate/sdk';
import { XOR, XSTUSD } from '@sora-substrate/sdk/build/assets/consts';
import { components, WALLET_CONSTS } from '@wallet';
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { useTransaction } from '@/composables/useTransaction';
import { useNetworkFeeWarning } from '@/composables/useNetworkFeeWarning';
import { useNetworkFeeDialog } from '@/composables/useNetworkFeeDialog';
import { useTokenSelect } from '@/composables/useTokenSelect';
import { usePoolTokenPair } from '@/modules/pool/composables/usePoolTokenPair';
import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useTranslation } from '@/composables/useTranslation';
import { Components } from '@/consts';
import { PoolComponents } from '@/modules/pool/consts';
import { poolLazyComponent } from '@/modules/pool/router';
import { lazyComponent } from '@/router';
import store from '@/store';
import { FocusedField } from '@/store/addLiquidity/types';
import { getMaxValue, isMaxButtonAvailable, hasInsufficientBalance, getAssetBalance } from '@/utils';
import { sanitizeHtml } from '@/utils/sanitize';

import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { CodecString } from '@sora-substrate/sdk';
import type { AccountLiquidity } from '@sora-substrate/sdk/build/poolXyk/types';

const emit = defineEmits<{ (event: 'back'): void }>();

const { t } = useTranslation();
const poolTokenPair = usePoolTokenPair();
const { formatCodecNumber, getFPNumber } = useFormattedAmount();
const { isSelectAssetLoading, withSelectAssetLoading } = useTokenSelect();
const { allowFeePopup, isXorSufficientForNextTx } = useNetworkFeeWarning();
const {
  showWarningFeeDialog,
  isWarningFeeDialogConfirmed,
  openWarningFeeDialog,
  closeWarningFeeDialog,
  confirmNetworkFeeWariningDialog,
  waitOnFeeWarningConfirmation,
} = useNetworkFeeDialog();
const { loading, withNotifications } = useTransaction();

const shareOfPool = computed(() => store.getters.addLiquidity.shareOfPool as string);
const liquidityInfo = computed(() => store.getters.addLiquidity.liquidityInfo as Nullable<AccountLiquidity>);
const isNotFirstLiquidityProvider = computed(() => store.getters.addLiquidity.isNotFirstLiquidityProvider as boolean);
const isLoggedIn = computed(() => store.getters.wallet.account.isLoggedIn as boolean);
const xor = computed(() => store.getters.assets.xor as AccountAsset);
const slippageToleranceValue = computed(() => store.state.settings.slippageTolerance as string);
const isConfirmTxDisabled = computed(() => store.state.wallet.transactions.isConfirmTxDialogDisabled as boolean);
const nodeIsConnected = computed(() => store.getters.settings.nodeIsConnected as boolean);

const showSelectTokenDialog = ref(false);
const isFirstTokenSelected = ref(false);
const insufficientBalanceTokenSymbol = ref('');
const confirmDialogVisible = ref(false);

const AddLiquidityConfirm = poolLazyComponent(PoolComponents.AddLiquidityConfirm);
const AddLiquidityTransactionDetails = poolLazyComponent(PoolComponents.AddLiquidityTransactionDetails);
const SelectToken = lazyComponent(Components.SelectToken);
const SlippageTolerance = lazyComponent(Components.SlippageTolerance);
const NetworkFeeWarningDialog = lazyComponent(Components.NetworkFeeWarningDialog);
const TokenInput = lazyComponent(Components.TokenInput);
const InfoLine = components.InfoLine;

const firstToken = poolTokenPair.firstToken;
const secondToken = poolTokenPair.secondToken;
const firstTokenValue = poolTokenPair.firstTokenValue;
const secondTokenValue = poolTokenPair.secondTokenValue;
const formattedPrice = poolTokenPair.formattedPrice;
const formattedPriceReversed = poolTokenPair.formattedPriceReversed;
const networkFee = poolTokenPair.networkFee;
const networkFees = poolTokenPair.networkFees;
const emptyAssets = poolTokenPair.emptyAssets;
const isAvailable = poolTokenPair.isAvailable;
const price = poolTokenPair.price;
const priceReversed = poolTokenPair.priceReversed;

const areTokensSelected = computed(() => Boolean(firstToken.value && secondToken.value));

const removeLiquidityFormattedFee = computed(() =>
  formatCodecNumber(networkFees.value?.[Operation.RemoveLiquidity] ?? '0')
);

const isXorSufficientForNextOperation = () => {
  const params: WALLET_CONSTS.NetworkFeeWarningOptions = {
    type: isAvailable.value ? Operation.AddLiquidity : Operation.CreatePair,
  };

  if (firstToken.value?.address === XOR.address) {
    params.amount = getFPNumber(firstTokenValue.value);
    params.isXor = true;
  }

  return isXorSufficientForNextTx(params);
};

const isFirstMaxButtonAvailable = computed(() => {
  const token = firstToken.value;
  if (!(token && isLoggedIn.value)) return false;

  return isMaxButtonAvailable(token, firstTokenValue.value, networkFee.value, xor.value);
});

const isSecondMaxButtonAvailable = computed(() => {
  const token = secondToken.value;
  if (!(token && isLoggedIn.value)) return false;

  return isMaxButtonAvailable(token, secondTokenValue.value, networkFee.value, xor.value);
});

const isInsufficientBalance = computed(() => {
  if (isLoggedIn.value && areTokensSelected.value) {
    if (firstToken.value && hasInsufficientBalance(firstToken.value, firstTokenValue.value, networkFee.value)) {
      insufficientBalanceTokenSymbol.value = firstToken.value.symbol;
      return true;
    }

    if (secondToken.value && hasInsufficientBalance(secondToken.value, secondTokenValue.value, networkFee.value)) {
      insufficientBalanceTokenSymbol.value = secondToken.value.symbol;
      return true;
    }
  }

  insufficientBalanceTokenSymbol.value = '';
  return false;
});

const firstLiquidityProviderInfo = computed(() =>
  sanitizeHtml(t('createPair.firstLiquidityProviderInfo'), {
    allowedTags: ['strong', 'em', 'span', 'p', 'br'],
    allowedAttributes: {
      '*': ['class'],
    },
  })
);

const setFirstTokenAddress = (address: string) => store.dispatch.addLiquidity.setFirstTokenAddress(address);
const setSecondTokenAddress = (address: string) => store.dispatch.addLiquidity.setSecondTokenAddress(address);
const setFirstTokenValue = (value: string) => store.dispatch.addLiquidity.setFirstTokenValue(value);
const setSecondTokenValue = (value: string) => store.dispatch.addLiquidity.setSecondTokenValue(value);
const addLiquidity = () => store.dispatch.addLiquidity.addLiquidity();
const updateSubscriptions = () => store.dispatch.addLiquidity.updateSubscriptions();
const resetSubscriptions = () => store.dispatch.addLiquidity.resetSubscriptions();
const setFocusedField = (value: FocusedField) => store.commit.addLiquidity.setFocusedField(value);

watch(
  nodeIsConnected,
  (connected) => {
    if (connected) {
      void updateSubscriptions();
    } else {
      void resetSubscriptions();
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  resetSubscriptions();
});

const handleTokenChange = async (value: string, setter: (val: string) => Promise<void>) => {
  await setter(value);
};

const handleAddLiquidityMaxValue = async (token: Nullable<AccountAsset>, setter: (val: string) => Promise<void>) => {
  if (!token) return;
  await handleTokenChange(getMaxValue(token, networkFee.value), setter);
};

const handleAddLiquidity = async () => {
  if (allowFeePopup.value && !isXorSufficientForNextOperation()) {
    openWarningFeeDialog();
    await waitOnFeeWarningConfirmation();
    if (!isWarningFeeDialogConfirmed.value) {
      return;
    }
    isWarningFeeDialogConfirmed.value = false;
    closeWarningFeeDialog();
  }

  await confirmOrExecute(depositLiquidity);
};

const confirmOrExecute = async (handler: () => Promise<void>) => {
  if (isConfirmTxDisabled.value) {
    await handler();
    return;
  }
  confirmDialogVisible.value = true;
};

const getTokenBalance = (token: Nullable<AccountAsset>): CodecString => getAssetBalance(token);

const openSelectTokenDialog = (isFirst: boolean) => {
  isFirstTokenSelected.value = isFirst;
  showSelectTokenDialog.value = true;
};

const selectToken = async (token: AccountAsset) => {
  const address = token?.address;
  if (!address) return;

  await withSelectAssetLoading(async () => {
    if (isFirstTokenSelected.value) {
      await setFirstTokenAddress(address);
    } else {
      await setSecondTokenAddress(address);
    }

    if (firstToken.value?.address === XSTUSD.address && secondToken.value?.address === XOR.address) {
      await setFirstTokenAddress(XOR.address);
      await setSecondTokenAddress(XSTUSD.address);
    }
  });
};

const depositLiquidity = async () => {
  await withNotifications(async () => {
    await addLiquidity();
    emit('back');
  });
  confirmDialogVisible.value = false;
};

defineExpose({
  handleAddLiquidity,
  confirmDialogVisible,
  showWarningFeeDialog,
  depositLiquidity,
});
</script>

<style lang="scss" scoped>
.info-line--first-liquidity {
  color: var(--s-color-base-content-secondary);
  font-size: var(--s-font-size-mini);
}

.el-form--actions {
  @include full-width-button('action-button');
}

@include vertical-divider('icon-divider', $inner-spacing-medium);
@include vertical-divider('el-divider');
</style>
