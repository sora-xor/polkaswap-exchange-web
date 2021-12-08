<template>
  <dialog-base
    :visible.sync="isVisible"
    :title="t(`referralProgram.confirm.${isBond ? 'bond' : 'unbond'}`)"
    custom-class="dialog--confirm-bond"
  >
    <div class="tokens">
      <div class="tokens-info-container">
        <span class="token-value">{{ formattedXorValue }}</span>
        <div v-if="tokenXOR" class="token">
          <token-logo :token="tokenXOR" />
          {{ tokenXOR.symbol }}
        </div>
      </div>
    </div>
    <p
      class="transaction-message"
      v-html="t(`referralProgram.confirm.${isBond ? 'bond' : 'unbond'}Text`, { xorValue: formattedXorValue })"
    />
    <s-divider />
    <info-line
      :label="t('referralProgram.networkFee')"
      :label-tooltip="t('referralProgram.networkFeeTooltip')"
      :value="formattedNetworkFee"
      :asset-symbol="xorSymbol"
      :fiat-value="getFiatAmountByCodecString(networkFee)"
      is-formatted
    />
    <template #footer>
      <s-button type="primary" class="s-typography-button--large" :disabled="loading" @click="handleConfirmBonding">
        {{ t('referralProgram.confirm.text') }}
      </s-button>
    </template>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { Getter, State } from 'vuex-class';
import { api, mixins, components } from '@soramitsu/soraneo-wallet-web';
import { AccountAsset, Operation, KnownSymbols, CodecString, NetworkFeesObject } from '@sora-substrate/util';

import DialogMixin from '@/components/mixins/DialogMixin';
import DialogBase from '@/components/DialogBase.vue';
import { lazyComponent } from '@/router';
import { Components } from '@/consts';

const namespace = 'referrals';

@Component({
  components: {
    DialogBase,
    TokenLogo: lazyComponent(Components.TokenLogo),
    InfoLine: components.InfoLine,
  },
})
export default class ConfirmBonding extends Mixins(mixins.TransactionMixin, mixins.FormattedAmountMixin, DialogMixin) {
  @State((state) => state[namespace].xorValue) xorValue!: string;

  @Getter networkFees!: NetworkFeesObject;
  @Getter('isBond', { namespace }) isBond!: boolean;
  @Getter('tokenXOR', { namespace: 'assets' }) tokenXOR!: AccountAsset;

  get formattedXorValue(): string {
    return this.formatStringValue(this.xorValue, this.tokenXOR?.decimals);
  }

  get xorSymbol(): string {
    return ' ' + KnownSymbols.XOR;
  }

  get networkFee(): CodecString {
    return this.networkFees[this.isBond ? Operation.ReferralReserveXor : Operation.ReferralUnreserveXor];
  }

  get formattedNetworkFee(): string {
    return this.formatCodecNumber(this.networkFee);
  }

  async handleConfirmBonding(): Promise<void> {
    try {
      await this.withNotifications(async () =>
        (await this.isBond) ? api.reserveXor(this.xorValue) : api.unreserveXor(this.xorValue)
      );
      this.$emit('confirm', true);
    } catch (error) {
      this.$emit('confirm');
    }
    this.isVisible = false;
  }
}
</script>

<style lang="scss">
.dialog--confirm-bond {
  .transaction-number {
    color: var(--s-color-base-content-primary);
    font-weight: 600;
    word-break: break-all;
  }
}
</style>

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
.transaction-message {
  margin-top: $inner-spacing-mini;
  color: var(--s-color-base-content-primary);
  line-height: var(--s-line-height-big);
}
</style>
