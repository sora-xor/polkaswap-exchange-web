<template>
  <div class="wallet-settings-create-token">
    <template v-if="step === Step.CreateSimpleToken">
      <s-input
        v-model="tokenSymbol"
        v-maska="tokenSymbolMask"
        :placeholder="t('createToken.tokenSymbol.placeholder')"
        :minlength="1"
        :maxlength="7"
        :disabled="loading"
      ></s-input>
      <p class="wallet-settings-create-token_desc">{{ t('createToken.tokenSymbol.desc') }}</p>
      <s-input
        v-model="tokenName"
        v-maska="tokenNameMask"
        :placeholder="t('createToken.tokenName.placeholder')"
        :minlength="1"
        :maxlength="33"
        :disabled="loading"
      ></s-input>
      <p class="wallet-settings-create-token_desc">{{ t('createToken.tokenName.desc') }}</p>
      <s-float-input
        v-model="tokenSupply"
        :placeholder="t('createToken.tokenSupply.placeholder')"
        :decimals="decimals"
        has-locale-string
        :delimiters="delimiters"
        :max="maxTotalSupply"
        :disabled="loading"
      ></s-float-input>
      <p class="wallet-settings-create-token_desc">{{ t('createToken.tokenSupply.desc') }}</p>
      <div class="wallet-settings-create-token_supply-block">
        <s-switch v-model="extensibleSupply" :disabled="loading"></s-switch>
        <span>{{ t('createToken.extensibleSupply.placeholder') }}</span>
      </div>
      <p class="wallet-settings-create-token_desc">{{ t('createToken.extensibleSupply.desc') }}</p>
      <s-button
        class="wallet-settings-create-token_action s-typography-button--large"
        type="primary"
        :loading="loading"
        :disabled="isCreateDisabled"
        @click="onCreate"
      >
        <template v-if="!tokenSymbol">{{ t('createToken.enterSymbol') }}</template>
        <template v-else-if="!tokenName.trim()">{{ t('createToken.enterName') }}</template>
        <template v-else-if="!+tokenSupply">{{ t('createToken.enterSupply') }}</template>
        <template v-else>{{ t('createTokenText') }}</template>
      </s-button>
    </template>
    <template v-else-if="step === Step.Warn">
      <network-fee-warning-dialog :fee="formattedFee" @confirm="confirmNextTxFailure"></network-fee-warning-dialog>
    </template>
    <template v-else-if="step === Step.ConfirmSimpleToken">
      <info-line :label="t('createToken.tokenSymbol.placeholder')" :value="tokenSymbol"></info-line>
      <info-line :label="t('createToken.tokenName.placeholder')" :value="tokenName.trim()"></info-line>
      <info-line :label="t('createToken.tokenSupply.placeholder')" :value="formattedTokenSupply"></info-line>
      <info-line
        :label="t('createToken.extensibleSupply.placeholder')"
        :value="extensibleSupply ? 'Yes' : 'No'"
      ></info-line>
      <account-confirmation-option with-hint class="wallet-settings-create-token_action"></account-confirmation-option>
      <s-button
        class="wallet-settings-create-token_action s-typography-button--large"
        type="primary"
        :disabled="!hasEnoughXor"
        :loading="loading"
        @click="onConfirm"
      >
        <template v-if="!hasEnoughXor">{{ t('insufficientBalanceText', { symbol: XOR }) }}</template>
        <template v-else>{{ t('confirmText') }}</template>
      </s-button>
    </template>
    <wallet-fee v-if="!isCreateDisabled && showFee" :value="fee"></wallet-fee>
  </div>
</template>

<script setup lang="ts">
import { FPNumber, Operation } from '@sora-substrate/sdk';
import { MaxTotalSupply, XOR } from '@sora-substrate/sdk/build/assets/consts';
import { computed, ref } from 'vue';

import { useRouterStore } from '@/stores/router';
import { useWalletStore } from '@/stores/wallet';

import { useNetworkFeeWarning } from '../composables/useNetworkFeeWarning';
import { useNumberFormatter } from '../composables/useNumberFormatter';
import { useTransaction } from '../composables/useTransaction';
import { api } from '../api';
import { RouteNames, Step } from '../consts';

import AccountConfirmationOption from './Account/Settings/ConfirmationOption.vue';
import InfoLine from './InfoLine.vue';
import NetworkFeeWarningDialog from './NetworkFeeWarning.vue';
import WalletFee from './WalletFee.vue';

import type { Route } from '@/stores/router/types';

const props = withDefaults(
  defineProps<{
    step?: Step;
  }>(),
  {
    step: Step.CreateSimpleToken,
  }
);

const emit = defineEmits<{
  showTabs: [];
  showHeader: [];
  stepChange: [step: Step];
}>();

const routerStore = useRouterStore();
const walletStore = useWalletStore();
const { t, withNotifications, loading } = useTransaction();
const { formatStringValue, getCorrectSupply, getFPNumberFromCodec } = useNumberFormatter();
const { allowFeePopup, networkFees, isXorSufficientForNextTx } = useNetworkFeeWarning();

const decimals = FPNumber.DEFAULT_PRECISION;
const delimiters = FPNumber.DELIMITERS_CONFIG;
const maxTotalSupply = MaxTotalSupply;
const tokenSymbolMask = 'AAAAAAA';
const tokenNameMask = { mask: 'Z*', tokens: { Z: { pattern: /[0-9a-zA-Z ]/ } } };
const tokenSymbol = ref('');
const tokenName = ref('');
const tokenSupply = ref('');
const extensibleSupply = ref(false);
const showFee = ref(true);

const isConfirmTxDisabled = computed(() => walletStore.isConfirmTxDialogDisabled);
const fee = computed((): FPNumber => getFPNumberFromCodec(networkFees.value.RegisterAsset));
const formattedFee = computed(() => fee.value.toLocaleString());
const isCreateDisabled = computed(() => !(tokenSymbol.value && tokenName.value.trim() && +tokenSupply.value));
const formattedTokenSupply = computed(() => formatStringValue(tokenSupply.value, decimals));
const hasEnoughXor = computed(() => {
  const accountXor = api.assets.accountAssets.find((asset) => asset.address === XOR.address);
  if (!accountXor || !accountXor.balance || !+accountXor.balance.transferable) {
    return false;
  }
  const fpAccountXor = getFPNumberFromCodec(accountXor.balance.transferable, accountXor.decimals);
  return FPNumber.gte(fpAccountXor, fee.value);
});

function navigate(options: Route): void {
  routerStore.navigate(options);
}

async function registerAsset(): Promise<void> {
  return api.assets.register(tokenSymbol.value, tokenName.value.trim(), tokenSupply.value, extensibleSupply.value);
}

async function onCreate(): Promise<void> {
  if (!tokenSymbol.value.length || !tokenSupply.value.length || !tokenName.value.length) {
    return;
  }

  tokenSupply.value = getCorrectSupply(tokenSupply.value, decimals);

  emit('showTabs');

  if (allowFeePopup.value && hasEnoughXor.value && !isXorSufficientForNextTx({ type: Operation.RegisterAsset })) {
    emit('showHeader');
    showFee.value = false;
    emit('stepChange', Step.Warn);
    return;
  }

  if (isConfirmTxDisabled.value) {
    await onConfirm();
  } else {
    showFee.value = true;
    emit('stepChange', Step.ConfirmSimpleToken);
  }
}

async function onConfirm(): Promise<void> {
  await withNotifications(async () => {
    if (!hasEnoughXor.value) {
      throw new Error('insufficientBalanceText');
    }
    await registerAsset();
    navigate({ name: RouteNames.Wallet });
  });
}

function confirmNextTxFailure(): void {
  emit('showHeader');
  showFee.value = true;
  emit('stepChange', Step.ConfirmSimpleToken);
}
</script>

<style scoped lang="scss">
.wallet-settings-create-token {
  &_desc {
    color: var(--s-color-base-content-primary);
    font-size: var(--s-font-size-extra-small);
    font-weight: 300;
    line-height: var(--s-line-height-base);
    padding: var(--s-basic-spacing) #{$basic-spacing-small} #{$basic-spacing-medium};
  }
  &_supply-block {
    @include switch-block;
    & {
      padding: 0 #{$basic-spacing-small};
    }
  }
  &_action {
    margin-top: #{$basic-spacing-medium};
    width: 100%;
  }
  &_divider {
    margin: unset;
  }
}
</style>
