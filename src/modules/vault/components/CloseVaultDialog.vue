<template>
  <DialogBase :title="title" v-model:visible="isVisible" :tooltip="t('kensetsu.closeVaultDescription')">
    <div class="vault-close">
      <div class="vault-close__title s-flex">
        <PairTokenLogo class="vault-close__icon" size="medium" :first-token="debtAsset" :second-token="lockedAsset" />
        <h3>{{ vaultTitle }}</h3>
      </div>
      <InfoLine
        class="vault-close__collateral"
        :label="t('kensetsu.yourCollateral')"
        :label-tooltip="t('kensetsu.yourCollateralDescription')"
        :value="formattedLockedAmount"
        :asset-symbol="lockedSymbol"
        :fiat-value="fiatLockedAmount"
        is-formatted
      />
      <InfoLine
        class="vault-close__debt"
        :label="t('kensetsu.yourDebt')"
        :label-tooltip="t('kensetsu.yourDebtDescription')"
        :value="formattedDebtAmount"
        :asset-symbol="debtSymbol"
        :fiat-value="fiatDebt"
        is-formatted
      />
      <InfoLine
        class="vault-close__balance"
        :label="t('kensetsu.yourDebtTokenBalance', { tokenSymbol: debtSymbol })"
        :value="formattedDebtAssetBalance"
        :asset-symbol="debtSymbol"
        :fiat-value="fiatDebtAssetBalance"
        is-formatted
      />
      <s-card
        v-if="isInsufficientBalance"
        class="vault-close__error"
        border-radius="small"
        shadow="always"
        size="medium"
        pressed
      >
        <template #header>
          <div class="vault-close__error-card-header s-flex">
            <div class="vault-close__error-header s-flex-column">
              <p class="vault-close__error-title p3">{{ t('kensetsu.requiredAmountWithSlippage') }}</p>
              <h3 class="vault-close__error-value">{{ formattedDiffWithSlippage }}</h3>
            </div>
            <div class="vault-close__error-badge">
              <s-icon class="vault-close__error-icon" name="notifications-alert-triangle-24" size="24" />
            </div>
          </div>
        </template>
        <p class="vault-close__error-message p3">
          {{ t('kensetsu.requiredAmountWithSlippageDescription', { tokenSymbol: debtSymbol, amount: formattedDiff }) }}
        </p>
        <s-button type="primary" class="s-typography-button--large vault-close__button" @click.prevent="openSwap">
          <ExternalLink
            class="vault-close__error-link s-typography-button--large"
            tabindex="-1"
            :title="t('kensetsu.openSwap')"
            :href="swapLink"
          />
        </s-button>
      </s-card>
      <s-button
        type="primary"
        class="s-typography-button--large action-button vault-close__button"
        :disabled="disabled"
        @click="handleCloseVault"
      >
        <template v-if="disabled">{{ errorMessage }}</template>
        <template v-else>{{ title }}</template>
      </s-button>
      <InfoLine
        :label="t('networkFeeText')"
        :label-tooltip="t('networkFeeTooltipText')"
        :value="networkFeeFormatted"
        :asset-symbol="xorSymbol"
        :fiat-value="getFiatAmountByCodecString(networkFee)"
        is-formatted
      />
    </div>
  </DialogBase>
</template>

<script setup lang="ts">
import { Operation, FPNumber } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { components, api } from '@wallet';
import { computed } from 'vue';

import { ZeroStringValue, Components } from '@/consts';
import { useDialogModel } from '@/composables/useDialogModel';
import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useNotification } from '@/composables/useNotification';
import { useTransaction } from '@/composables/useTransaction';
import { useTranslation } from '@/composables/useTranslation';
import { lazyComponent } from '@/router';
import store from '@/store';
import { getAssetBalance } from '@/utils';

import type { CodecString, NetworkFeesObject } from '@sora-substrate/sdk';
import type { AccountAsset, RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { Vault } from '@sora-substrate/sdk/build/kensetsu/types';
import type { Nullable } from '@/types/common';

const DialogBase = components.DialogBase;
const InfoLine = components.InfoLine;
const ExternalLink = components.ExternalLink;
const PairTokenLogo = lazyComponent(Components.PairTokenLogo);

const props = withDefaults(
  defineProps<{
    visible?: boolean;
    vault?: Nullable<Vault>;
    lockedAsset?: Nullable<RegisteredAccountAsset>;
    debtAsset?: Nullable<RegisteredAccountAsset>;
  }>(),
  {
    visible: false,
    vault: null,
    lockedAsset: null,
    debtAsset: null,
  }
);

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void;
  (event: 'confirm'): void;
}>();

const { t } = useTranslation();
const { withNotifications, loading } = useTransaction();
const { getFPNumberFromCodec, getFiatAmountByFPNumber, getFiatAmountByCodecString, formatCodecNumber, Zero } =
  useFormattedAmount();
const { showAppAlert } = useNotification();
const { isVisible, closeDialog } = useDialogModel(props, emit);

const swapLink = '/#/swap/XOR/KUSD';
const xorSymbol = XOR.symbol;

const networkFees = computed(() => store.state.wallet.settings.networkFees as NetworkFeesObject | undefined);
const accountXor = computed(() => store.getters.assets.xor as Nullable<AccountAsset>);

const vault = computed(() => props.vault as Nullable<Vault>);
const lockedAsset = computed(() => props.lockedAsset as Nullable<RegisteredAccountAsset>);
const debtAsset = computed(() => props.debtAsset as Nullable<RegisteredAccountAsset>);

const networkFee = computed<CodecString>(() => networkFees.value?.[Operation.CloseVault] ?? ZeroStringValue);
const fpNetworkFee = computed(() => getFPNumberFromCodec(networkFee.value));
const xorBalance = computed(() => getFPNumberFromCodec(accountXor.value?.balance?.transferable ?? ZeroStringValue));
const networkFeeFormatted = computed(() => formatCodecNumber(networkFee.value));
const isInsufficientXorForFee = computed(() => xorBalance.value.sub(fpNetworkFee.value).isLtZero());

const debtSymbol = computed(() => debtAsset.value?.symbol ?? '');
const lockedSymbol = computed(() => lockedAsset.value?.symbol ?? '');
const vaultTitle = computed(() =>
  debtSymbol.value && lockedSymbol.value ? `${debtSymbol.value} / ${lockedSymbol.value}` : ''
);

const formattedLockedAmount = computed(() => vault.value?.lockedAmount.toLocaleString() ?? ZeroStringValue);
const fiatLockedAmount = computed(() => {
  if (!(vault.value && lockedAsset.value)) return ZeroStringValue;
  return getFiatAmountByFPNumber(vault.value.lockedAmount, lockedAsset.value) ?? ZeroStringValue;
});

const debt = computed(() => vault.value?.debt ?? Zero);
const formattedDebtAmount = computed(() => debt.value.toLocaleString());
const fiatDebt = computed(() => {
  if (!debtAsset.value) return ZeroStringValue;
  return getFiatAmountByFPNumber(debt.value, debtAsset.value) ?? ZeroStringValue;
});

const debtAssetBalanceFp = computed(() =>
  getFPNumberFromCodec(getAssetBalance(debtAsset.value) ?? 0, debtAsset.value?.decimals)
);
const formattedDebtAssetBalance = computed(() => debtAssetBalanceFp.value.toLocaleString());
const fiatDebtAssetBalance = computed(() => {
  if (!debtAsset.value) return ZeroStringValue;
  return getFiatAmountByFPNumber(debtAssetBalanceFp.value, debtAsset.value) ?? ZeroStringValue;
});

const isInsufficientBalance = computed(() => debt.value.gt(debtAssetBalanceFp.value));
const diff = computed(() => debt.value.sub(debtAssetBalanceFp.value));
const formattedDiff = computed(() => (isInsufficientBalance.value ? diff.value.toLocaleString() : ''));
const diffWithSlippage = computed(() => diff.value.mul(1.02));
const formattedDiffWithSlippage = computed(() =>
  isInsufficientBalance.value ? diffWithSlippage.value.toLocaleString() : ''
);
const fiatDiffWithSlippage = computed(() => {
  if (!debtAsset.value) return ZeroStringValue;
  return getFiatAmountByFPNumber(diffWithSlippage.value, debtAsset.value) ?? ZeroStringValue;
});

const disabled = computed(() => loading.value || isInsufficientXorForFee.value || isInsufficientBalance.value);
const errorMessage = computed(() => {
  if (isInsufficientXorForFee.value) {
    return t('insufficientBalanceText', { tokenSymbol: xorSymbol });
  }
  if (isInsufficientBalance.value) {
    return t('insufficientBalanceText', { tokenSymbol: debtSymbol.value });
  }
  return '';
});

const title = computed(() => t('kensetsu.closeVault'));

const handleCloseVault = async () => {
  if (disabled.value) {
    if (errorMessage.value) {
      showAppAlert(errorMessage.value, t('errorText'));
    }
    return;
  }

  try {
    await withNotifications(async () => {
      if (!(vault.value && lockedAsset.value && debtAsset.value)) {
        throw new Error('[api.kensetsu.closeVault]: vault or asset is null');
      }
      await api.kensetsu.closeVault(vault.value, lockedAsset.value, debtAsset.value);
    });
  } catch (error) {
    console.error(error);
  }

  isVisible.value = false;
  emit('confirm');
};

const openSwap = () => {
  const win = window.open(swapLink, '_blank', 'noopener,noreferrer');
  if (win) {
    win.opener = null;
    win.focus();
  }
};

defineExpose({
  handleCloseVault,
  openSwap,
  disabled,
  isInsufficientBalance,
  isInsufficientXorForFee,
  formattedDiff,
  formattedDiffWithSlippage,
  fiatDiffWithSlippage,
});
</script>
