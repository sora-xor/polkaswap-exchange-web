<template>
  <dialog-base :visible.sync="isVisible" title="Reserve KEN token" custom-class="dialog--confirm-burn">
    <token-input
      class="token-input"
      max="10000"
      title="HOW MUCH KEN DO YOU WANT?"
      :is-fiat-editable="false"
      :token="ken"
      :value="value"
      @input="handleInputField"
    />
    <info-line
      label="XOR TO BE BURNED"
      :value="formattedXorWillBeBurned"
      :asset-symbol="xor.symbol"
      :fiat-value="formattedFiatXorWillBeBurned"
      is-formatted
    />
    <info-line
      label="YOUR XOR BALANCE LEFT"
      :value="formattedXorLeft"
      :asset-symbol="xor.symbol"
      :fiat-value="formattedFiatXorLeft"
      is-formatted
      value-can-be-hidden
    />
    <info-line
      v-if="isLoggedIn"
      :label="t('networkFeeText')"
      :label-tooltip="t('networkFeeTooltipText')"
      :value="networkFeeFormatted"
      :asset-symbol="xor.symbol"
      :fiat-value="getFiatAmountByCodecString(networkFee)"
      is-formatted
    />
    <div class="disclaimer s-flex">
      <p class="disclaimer__text p3">
        Disclaimer: Burning your XOR tokens is an irreversible action that permanently removes them from your wallet.
        Please proceed with caution and ensure you fully understand the implications of this transaction
      </p>
      <div class="disclaimer__badge s-flex">
        <s-icon class="disclaimer__icon" name="notifications-alert-triangle-24" size="24" />
      </div>
    </div>
    <template #footer>
      <s-button type="primary" class="s-typography-button--large" :disabled="isBurnDisabled" @click="handleConfirmBurn">
        <template v-if="isZeroAmount">
          {{ t('buttons.enterAmount') }}
        </template>
        <template v-else-if="isInsufficientBalance">
          {{ t('insufficientBalanceText', { tokenSymbol: xor.symbol }) }}
        </template>
        <template v-else>RESERVE</template>
      </s-button>
    </template>
  </dialog-base>
</template>

<script lang="ts">
import { Operation } from '@sora-substrate/util';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import { api, components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { state, getter } from '@/store/decorators';
import { asZeroValue } from '@/utils';

import type { CodecString, NetworkFeesObject } from '@sora-substrate/util';
import type { AccountAsset, Asset } from '@sora-substrate/util/build/assets/types';

@Component({
  components: {
    DialogBase: components.DialogBase,
    TokenLogo: components.TokenLogo,
    InfoLine: components.InfoLine,
    SwapTransactionDetails: lazyComponent(Components.SwapTransactionDetails),
    TokenInput: lazyComponent(Components.TokenInput),
  },
})
export default class BurnDialog extends Mixins(
  mixins.TransactionMixin,
  mixins.DialogMixin,
  mixins.FormattedAmountMixin
) {
  private readonly million = 1_000_000;
  readonly xor = XOR;
  readonly ken: Asset = {
    address: '',
    decimals: 0,
    isMintable: true,
    name: 'KEN',
    symbol: 'KEN',
  } as const;

  @state.wallet.settings.networkFees private networkFees!: NetworkFeesObject;
  @getter.assets.xor private accountXor!: Nullable<AccountAsset>;
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;

  value = '';

  @Watch('visible')
  private async handleDialogVisibility(value: boolean): Promise<void> {
    await this.$nextTick();

    if (!value) return;
    this.value = '';
  }

  private get xorWillBeBurned() {
    return this.getFPNumber(+(this.value || '0') * this.million);
  }

  get formattedXorWillBeBurned(): string {
    return this.xorWillBeBurned.toLocaleString();
  }

  get formattedFiatXorWillBeBurned(): Nullable<string> {
    return this.getFiatAmountByFPNumber(this.xorWillBeBurned, this.xor);
  }

  get networkFee(): CodecString {
    return this.networkFees[Operation.Burn];
  }

  get networkFeeFormatted(): string {
    return this.formatCodecNumber(this.networkFee);
  }

  private get xorBalance() {
    return this.getFPNumberFromCodec(this.accountXor?.balance?.transferable ?? '0');
  }

  private get xorLeft() {
    return this.xorBalance.gte(this.xorWillBeBurned) ? this.xorBalance.sub(this.xorWillBeBurned) : this.Zero;
  }

  get formattedXorLeft(): string {
    return this.xorLeft.toLocaleString();
  }

  get formattedFiatXorLeft(): Nullable<string> {
    return this.getFiatAmountByFPNumber(this.xorLeft, this.xor);
  }

  get isZeroAmount(): boolean {
    return asZeroValue(this.value);
  }

  get isInsufficientBalance(): boolean {
    const xorLeft = this.xorBalance.sub(this.xorWillBeBurned).sub(this.getFPNumberFromCodec(this.networkFee));
    return xorLeft.isLtZero();
  }

  get isBurnDisabled(): boolean {
    return this.loading || this.isZeroAmount || this.isInsufficientBalance;
  }

  handleInputField(value: string): void {
    if (this.value === value) return;

    this.value = value;
  }

  async handleConfirmBurn(): Promise<void> {
    if (this.isInsufficientBalance) {
      this.$alert(this.t('insufficientBalanceText', { tokenSymbol: this.xor.symbol }), {
        title: this.t('errorText'),
      });
      this.$emit('confirm');
    } else {
      try {
        await this.withNotifications(async () => {
          await api.assets.burn(this.xor, this.xorWillBeBurned.toString());
        });
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
.token-input {
  margin-bottom: $basic-spacing;
}
.disclaimer {
  align-items: flex-start;
  margin-top: $basic-spacing;
  padding: $inner-spacing-medium;
  width: 100%;
  background-color: var(--s-color-base-background);
  border-radius: var(--s-border-radius-small);
  box-shadow: var(--s-shadow-dialog);
  &__text {
    flex: 1;
  }
  &__badge {
    border-radius: 50%;
    background-color: var(--s-color-status-error);
    box-shadow: var(--s-shadow-element-pressed);
    margin-left: $inner-spacing-mini;
    width: 42px;
    height: 42px;
    align-items: center;
    justify-content: center;
  }
  &__icon {
    color: white;
  }
}
</style>
