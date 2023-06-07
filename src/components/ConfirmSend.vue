<template>
  <dialog-base :visible.sync="isVisible" :title="t('walletSend.confirmTitle')" custom-class="dialog--confirm-swap">
    <div class="tokens">
      <div class="tokens-info-container">
        <span class="token-value">{{ formattedFromValue }}</span>
        <div v-if="tokenFrom" class="token">
          <token-logo :token="tokenFrom" />
          {{ tokenFrom.symbol }}
        </div>
      </div>
    </div>
    <div class="confirm">
      <div class="confirm-from">{{ from }}</div>
      <s-icon name="arrows-arrow-bottom-24" />
      <div class="confirm-to">{{ to }}</div>
    </div>
    <s-divider />
    <info-line
      :label="t('swap.networkFee')"
      :tooltip-content="t('swap.networkFeeTooltip')"
      :value="formattedNetworkFee"
      :asset-symbol="KnownSymbols.XOR"
    />
    <template #footer>
      <s-button type="primary" class="s-typography-button--large" :disabled="loading" @click="handleConfirmSend">
        {{ t('walletSend.confirm') }}
      </s-button>
    </template>
  </dialog-base>
</template>

<script lang="ts">
import { CodecString, Operation, NetworkFeesObject } from '@sora-substrate/util';
import { KnownSymbols } from '@sora-substrate/util/build/assets/consts';
import { api, mixins, components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

// import DialogMixin from '@/components/mixins/DialogMixin';
// import DialogBase from '@/components/DialogBase.vue';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { state, getter } from '@/store/decorators';

import type { AccountAsset, Asset } from '@sora-substrate/util/build/assets/types';

@Component({
  components: {
    DialogBase: components.DialogBase,
    InfoLine: components.InfoLine,
    TokenLogo: components.TokenLogo,
  },
})
export default class ConfirmSend extends Mixins(mixins.TransactionMixin, mixins.DialogMixin) {
  @state.wallet.settings.networkFees networkFees!: NetworkFeesObject;
  @getter.swap.tokenFrom tokenFrom!: Nullable<AccountAsset>;
  @state.swap.fromValue fromValue!: string;

  @Prop({ default: false, type: Boolean }) readonly isInsufficientBalance!: boolean;
  @Prop({ default: '', type: String }) readonly from!: string;
  @Prop({ default: '', type: String }) readonly to!: string;

  KnownSymbols = KnownSymbols;

  get formattedFromValue(): string {
    return this.formatStringValue(this.fromValue, this.tokenFrom?.decimals);
  }

  get networkFee(): CodecString {
    return this.networkFees[Operation.Transfer];
  }

  get formattedNetworkFee(): string {
    return this.formatCodecNumber(this.networkFee);
  }

  async handleConfirmSend(): Promise<void> {
    if (this.isInsufficientBalance) {
      this.$alert(
        this.t('exchange.insufficientBalance', { tokenSymbol: this.tokenFrom ? this.tokenFrom.symbol : '' }),
        { title: this.t('errorText') }
      );
      this.$emit('confirm');
    } else {
      try {
        await this.withNotifications(async () => await api.transfer(this.tokenFrom as Asset, this.to, this.fromValue));
        this.$emit('confirm', true);
      } catch (error) {
        this.$emit('confirm');
      }
    }
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
  margin-bottom: $inner-spacing-medium;

  &-info-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
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
.confirm {
  &-from {
    margin-bottom: $inner-spacing-mini;
  }

  &-to {
    margin-top: $inner-spacing-mini;
  }

  &-from,
  &-to {
    font-size: var(--s-font-size-mini);
    font-weight: 500;
    line-height: var(--s-line-height-small);
  }
}

@include vertical-divider;
@include vertical-divider('el-divider', $inner-spacing-medium);
</style>
