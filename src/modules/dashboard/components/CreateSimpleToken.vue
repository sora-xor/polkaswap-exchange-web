<template>
  <div class="wallet-settings-create-token">
    <s-input
      :placeholder="t('createToken.tokenSymbol.placeholder')"
      :minlength="1"
      :maxlength="7"
      :disabled="loading"
      v-maska="tokenSymbolMask"
      v-model="tokenSymbol"
    ></s-input>
    <p class="wallet-settings-create-token_desc">{{ t('createToken.tokenSymbol.desc') }}</p>
    <s-input
      :placeholder="t('createToken.tokenName.placeholder')"
      :minlength="1"
      :maxlength="33"
      :disabled="loading"
      v-maska="tokenNameMask"
      v-model="tokenName"
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
  </div>
</template>

<script setup lang="ts">
import { FPNumber } from '@sora-substrate/sdk';
import { MaxTotalSupply } from '@sora-substrate/sdk/build/assets/consts';
import { computed, ref } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { useNumberFormatter } from '@/composables/useNumberFormatter';
import { api } from '@/lib/soraneo-wallet/src/api';

const { t } = useTranslation();
const { formatStringValue, getCorrectSupply } = useNumberFormatter();

withDefaults(
  defineProps<{
    loading?: boolean;
  }>(),
  {
    loading: false,
  }
);

const decimals = FPNumber.DEFAULT_PRECISION;
const delimiters = FPNumber.DELIMITERS_CONFIG;
const maxTotalSupply = MaxTotalSupply;
const tokenSymbolMask = 'AAAAAAA';
const tokenNameMask = { mask: 'Z*', tokens: { Z: { pattern: /[0-9a-zA-Z ]/ } } };

const tokenSymbol = ref('');
const tokenName = ref('');
const tokenSupply = ref('');
const extensibleSupply = ref(false);

const hasPositiveSupply = computed(() => {
  try {
    const supply = new FPNumber(tokenSupply.value || '0', decimals);
    return supply.isFinity() && FPNumber.gt(supply, FPNumber.ZERO);
  } catch {
    return false;
  }
});
const isCreateDisabled = computed(() => {
  return !(tokenSymbol.value.trim() && tokenName.value.trim() && hasPositiveSupply.value);
});

const formattedTokenSupply = computed(() => formatStringValue(tokenSupply.value, decimals));
const buttonTitle = computed(() => {
  if (!tokenSymbol.value.trim()) return t('createToken.enterSymbol');
  if (!tokenName.value.trim()) return t('createToken.enterName');
  if (!hasPositiveSupply.value) return t('createToken.enterSupply');
  return t('createTokenText');
});

/** Clears all token form fields when the parent dialog is reopened. */
const resetForm = () => {
  tokenSymbol.value = '';
  tokenName.value = '';
  tokenSupply.value = '';
  extensibleSupply.value = false;
};

/** Registers a simple token asset after normalizing the requested supply. */
const registerAsset = async (): Promise<void> => {
  if (isCreateDisabled.value) return;

  tokenSupply.value = getCorrectSupply(tokenSupply.value, decimals);
  await api.assets.register(tokenSymbol.value.trim(), tokenName.value.trim(), tokenSupply.value, extensibleSupply.value);
};

defineExpose({
  tokenSymbol,
  tokenName,
  tokenSupply,
  extensibleSupply,
  hasPositiveSupply,
  isCreateDisabled,
  buttonTitle,
  formattedTokenSupply,
  resetForm,
  registerAsset,
  decimals,
  delimiters,
  maxTotalSupply,
  tokenSymbolMask,
  tokenNameMask,
  t,
});
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
    // @include switch-block;
    padding: 0 #{$basic-spacing-small};
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
