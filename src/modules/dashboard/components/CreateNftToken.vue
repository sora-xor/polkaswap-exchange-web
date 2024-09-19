<template>
  <div class="wallet-settings-create-token">
    <s-input
      :placeholder="t('createToken.tokenSymbol.placeholder')"
      :minlength="1"
      :maxlength="7"
      :disabled="loading"
      v-maska="tokenSymbolMask"
      v-model="tokenSymbol"
    />
    <p class="wallet-settings-create-token_desc">{{ t('createToken.tokenSymbol.desc') }}</p>
    <s-input
      :placeholder="t('createToken.tokenName.placeholder')"
      :minlength="1"
      :maxlength="33"
      :disabled="loading"
      v-maska="tokenNameMask"
      v-model="tokenName"
    />
    <p class="wallet-settings-create-token_desc">{{ t('createToken.tokenName.desc') }}</p>
    <s-float-input
      v-model="tokenSupply"
      :placeholder="t('createToken.tokenSupply.placeholder')"
      :decimals="decimals"
      has-locale-string
      :delimiters="delimiters"
      :max="maxTotalSupply"
      :disabled="loading"
    />
    <p class="wallet-settings-create-token_desc">{{ t('createToken.tokenSupply.desc') }}</p>
    <div class="wallet-settings-create-token_supply-block">
      <s-switch v-model="extensibleSupply" :disabled="loading" />
      <span>{{ t('createToken.extensibleSupply.placeholder') }}</span>
    </div>
    <p class="wallet-settings-create-token_desc">{{ t('createToken.extensibleSupply.desc') }}</p>
  </div>
</template>

<script lang="ts">
import { FPNumber, Operation } from '@sora-substrate/sdk';
import { MaxTotalSupply, XOR } from '@sora-substrate/sdk/build/assets/consts';
import { mixins, components, WALLET_CONSTS, api } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';

@Component({
  components: {
    InfoLine: components.InfoLine,
  },
})
export default class CreateNftToken extends Mixins(TranslationMixin, mixins.NumberFormatterMixin) {
  readonly XOR = XOR.symbol;
  readonly decimals = FPNumber.DEFAULT_PRECISION;
  readonly delimiters = FPNumber.DELIMITERS_CONFIG;
  readonly maxTotalSupply = MaxTotalSupply;
  readonly tokenSymbolMask = 'AAAAAAA';
  readonly tokenNameMask = { mask: 'Z*', tokens: { Z: { pattern: /[0-9a-zA-Z ]/ } } };

  tokenSymbol = '';
  tokenName = '';
  tokenSupply = '';
  extensibleSupply = false;

  loading = false; //

  get isCreateDisabled(): boolean {
    return !(this.tokenSymbol && this.tokenName.trim() && +this.tokenSupply);
  }

  get formattedTokenSupply(): string {
    return this.formatStringValue(this.tokenSupply, this.decimals);
  }
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
