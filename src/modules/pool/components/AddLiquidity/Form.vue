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

    <SelectToken
      is-add-liquidity
      append-to-body
      v-model:visible="showSelectTokenDialog"
      :connected="isLoggedIn"
      :asset="isFirstTokenSelected ? secondToken : firstToken"
      :is-first-token-selected="isFirstTokenSelected"
      :disabled-custom="isFirstTokenSelected"
      @select="handleSelectToken"
    ></SelectToken>

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
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import NetworkFeeWarningDialog from '@/components/shared/Dialog/NetworkFeeWarning.vue';
import TokenInput from '@/components/shared/Input/TokenInput.vue';
import SelectToken from '@/components/shared/SelectAsset/SelectToken.vue';
import SlippageTolerance from '@/components/shared/Settings/SlippageTolerance.vue';
import { useTransaction } from '@/composables/useTransaction';
import { useNetworkFeeWarning } from '@/composables/useNetworkFeeWarning';
import { useNetworkFeeDialog } from '@/composables/useNetworkFeeDialog';
import { useTokenSelect } from '@/composables/useTokenSelect';
import type { NetworkFeeWarningOptions } from '@/consts';
import { usePoolTokenPair } from '@/modules/pool/composables/usePoolTokenPair';
import AddLiquidityConfirm from '@/modules/pool/components/AddLiquidity/Confirm.vue';
import AddLiquidityTransactionDetails from '@/modules/pool/components/AddLiquidity/TransactionDetails.vue';
import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useTranslation } from '@/composables/useTranslation';
import { useAssetsStore } from '@/stores/assets';
import { usePoolStore } from '@/stores/pool';
import { AddLiquidityFocusedField as FocusedField } from '@/stores/pool/types';
import { useSettingsStore } from '@/stores/settings';
import { useWalletStore } from '@/stores/wallet';
import { getMaxValue, isMaxButtonAvailable, hasInsufficientBalance, getAssetBalance } from '@/utils';
import { sanitizeHtml } from '@/utils/sanitize';

import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { CodecString } from '@sora-substrate/sdk';
import type { AccountLiquidity } from '@sora-substrate/sdk/build/poolXyk/types';
import WalletComponentInfoLine from '@/lib/soraneo-wallet/src/components/InfoLine.vue';

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
const assetsStore = useAssetsStore();
const poolStore = usePoolStore();
const settingsStore = useSettingsStore();
const walletStore = useWalletStore();

const shareOfPool = computed(() => poolStore.addLiquidityShareOfPool);
const liquidityInfo = computed(() => poolStore.addLiquidityLiquidityInfo as Nullable<AccountLiquidity>);
const isNotFirstLiquidityProvider = computed(() => poolStore.addLiquidityIsNotFirstLiquidityProvider);
const isLoggedIn = computed(() => walletStore.isLoggedIn);
const xor = computed(() => assetsStore.xor as AccountAsset);
const slippageToleranceValue = computed(() => settingsStore.slippageTolerance as string);
const isConfirmTxDisabled = computed(() => walletStore.isConfirmTxDialogDisabled as boolean);
const nodeIsConnected = computed(() => settingsStore.nodeIsConnected as boolean);

const showSelectTokenDialog = ref(false);
const isFirstTokenSelected = ref(false);
const insufficientBalanceTokenSymbol = ref('');
const confirmDialogVisible = ref(false);

const InfoLine = WalletComponentInfoLine;

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
  const params: NetworkFeeWarningOptions = {
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

const setFirstTokenAddress = (address: string) => poolStore.setAddLiquidityFirstTokenAddress(address);
const setSecondTokenAddress = (address: string) => poolStore.setAddLiquiditySecondTokenAddress(address);
const setFirstTokenValue = (value: string) => poolStore.setAddLiquidityFirstTokenValue(value);
const setSecondTokenValue = (value: string) => poolStore.setAddLiquiditySecondTokenValue(value);
const addLiquidity = () => poolStore.submitAddLiquidity();
const updateSubscriptions = () => poolStore.updateAddLiquiditySubscriptions();
const resetSubscriptions = () => poolStore.resetAddLiquiditySubscriptions();
const setFocusedField = (value: FocusedField) => poolStore.setAddLiquidityFocusedField(value);

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

const handleSelectToken = async (token: AccountAsset) => {
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
