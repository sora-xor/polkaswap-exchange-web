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

const { t } = useTranslation();
const { formatStringValue } = useNumberFormatter();

const decimals = FPNumber.DEFAULT_PRECISION;
const delimiters = FPNumber.DELIMITERS_CONFIG;
const maxTotalSupply = MaxTotalSupply;
const tokenSymbolMask = 'AAAAAAA';
const tokenNameMask = { mask: 'Z*', tokens: { Z: { pattern: /[0-9a-zA-Z ]/ } } };

const tokenSymbol = ref('');
const tokenName = ref('');
const tokenSupply = ref('');
const extensibleSupply = ref(false);
const loading = ref(false);

const isCreateDisabled = computed(() => {
  return !(tokenSymbol.value && tokenName.value.trim() && Number(tokenSupply.value));
});

const formattedTokenSupply = computed(() => formatStringValue(tokenSupply.value, decimals));

defineExpose({
  tokenSymbol,
  tokenName,
  tokenSupply,
  extensibleSupply,
  loading,
  isCreateDisabled,
  formattedTokenSupply,
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
