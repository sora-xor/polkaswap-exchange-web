<template>
  <dialog-base
    :visible.sync="isVisible"
    :title="t(`referralProgram.confirm.${isBond ? 'bond' : 'unbond'}`)"
    custom-class="dialog--confirm-bond"
  >
    <div class="tokens">
      <div class="tokens-info-container">
        <span class="token-value">{{ formattedAmount }}</span>
        <div class="token">
          <token-logo class="token-logo" :token="xor" />
          {{ xorSymbol }}
        </div>
      </div>
    </div>
    <s-divider />
    <info-line
      :label="t('networkFeeText')"
      :label-tooltip="t('networkFeeTooltipText')"
      :value="networkFeeFormatted"
      :asset-symbol="xorSymbol"
      :fiat-value="getFiatAmountByCodecString(networkFee)"
      is-formatted
    />
    <template #footer>
      <account-confirmation-option with-hint class="confirmation-option" />
      <s-button type="primary" class="s-typography-button--large" @click="handleConfirmBonding">
        {{ t('confirmText') }}
      </s-button>
    </template>
  </dialog-base>
</template>

<script lang="ts">
import { Operation, CodecString, NetworkFeesObject } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { mixins, components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { PageNames } from '@/consts';
import { state } from '@/store/decorators';

@Component({
  components: {
    DialogBase: components.DialogBase,
    InfoLine: components.InfoLine,
    TokenLogo: components.TokenLogo,
    AccountConfirmationOption: components.AccountConfirmationOption,
  },
})
export default class ReferralsConfirmBonding extends Mixins(
  mixins.FormattedAmountMixin,
  mixins.DialogMixin,
  TranslationMixin
) {
  readonly xor = XOR;

  @state.referrals.amount private amount!: string;
  @state.wallet.settings.networkFees private networkFees!: NetworkFeesObject;

  get xorSymbol(): string {
    return XOR.symbol;
  }

  get isBond(): boolean {
    return this.$route.name === PageNames.ReferralBonding;
  }

  get formattedAmount(): string {
    return this.formatStringValue(this.amount, XOR.decimals);
  }

  get networkFee(): CodecString {
    return this.networkFees[this.isBond ? Operation.ReferralReserveXor : Operation.ReferralUnreserveXor];
  }

  get networkFeeFormatted(): string {
    return this.formatCodecNumber(this.networkFee);
  }

  handleConfirmBonding(): void {
    this.$emit('confirm');
    this.isVisible = false;
  }
}
</script>

<style lang="scss" scoped>
.tokens {
  display: flex;
  flex-direction: column;
  font-size: var(--s-heading2-font-size);
  line-height: var(--s-line-height-small);
  &-info-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 800;
  }
}
.token {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  white-space: nowrap;
  &-value {
    margin-right: $inner-spacing-medium;
  }
  &-logo {
    display: block;
    margin-right: $inner-spacing-medium;
    flex-shrink: 0;
  }
}
.info-line {
  border-bottom: none;
}
.confirmation-option {
  margin-bottom: $inner-spacing-medium;
}
</style>
