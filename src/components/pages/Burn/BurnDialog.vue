<template>
  <dialog-base :visible.sync="isVisible" :title="title" custom-class="dialog--confirm-burn">
    <token-input
      class="token-input"
      :max="max"
      :title="receivedPlaceholder"
      :is-fiat-editable="false"
      :token="receivedAsset"
      :value="value"
      @input="handleInputField"
    />
    <info-line
      :label="toBeBurnedLabel"
      :key="toBeBurnedKey"
      :value="formattedWillBeBurned"
      :asset-symbol="burnedAsset.symbol"
      :fiat-value="formattedFiatWillBeBurned"
      is-formatted
    />
    <info-line
      :label="yourBalanceLeftLabel"
      :key="yourBalanceLeftKey"
      :value="formattedTokensLeft"
      :asset-symbol="burnedAsset.symbol"
      :fiat-value="formattedFiatTokensLeft"
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
        Disclaimer: Burning your {{ burnedAsset.symbol }} tokens is an irreversible action that permanently removes them
        from your wallet. Please proceed with caution and ensure you fully understand the implications of this
        transaction
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
        <template v-else-if="isAmountLessThanOne">NEED TO RESERVE MORE THAN 1</template>
        <template v-else-if="isInsufficientBalance">
          {{ t('insufficientBalanceText', { tokenSymbol: burnedAsset.symbol }) }}
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
import { Component, Mixins, Watch, Prop } from 'vue-property-decorator';

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
    TokenInput: lazyComponent(Components.TokenInput),
  },
})
export default class BurnDialog extends Mixins(
  mixins.TransactionMixin,
  mixins.DialogMixin,
  mixins.FormattedAmountMixin
) {
  readonly xor = XOR;

  @Prop({ type: Object, required: true }) readonly receivedAsset!: Asset;
  @Prop({ type: Object, required: true }) readonly burnedAsset!: Asset;
  @Prop({ type: Number, default: 1_000_000 }) readonly rate!: number;
  @Prop({ type: Number, default: 10_000 }) readonly max!: number;

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

  /** We need to force re-render InfoLine components with dynamic content */
  getKey(key: string): string {
    return this.isVisible ? `${key}-opened` : `${key}-closed`;
  }

  private get willBeBurned() {
    return this.getFPNumber(+(this.value || '0') * this.rate);
  }

  get title(): string {
    return `Reserve ${this.receivedAsset.symbol} token`;
  }

  get receivedPlaceholder(): string {
    return `HOW MUCH ${this.receivedAsset.symbol} DO YOU WANT?`;
  }

  get toBeBurnedLabel(): string {
    return `${this.burnedAsset.symbol} TO BE BURNED`;
  }

  get toBeBurnedKey(): string {
    return this.getKey(`${this.burnedAsset.symbol}-burned`);
  }

  get yourBalanceLeftLabel(): string {
    return `YOUR ${this.burnedAsset.symbol} BALANCE LEFT`;
  }

  get yourBalanceLeftKey(): string {
    return this.getKey(`${this.burnedAsset.symbol}-left`);
  }

  get isAmountLessThanOne(): boolean {
    return +(this.value || '0') < 1;
  }

  get formattedWillBeBurned(): string {
    return this.willBeBurned.toLocaleString();
  }

  get formattedFiatWillBeBurned(): Nullable<string> {
    return this.getFiatAmountByFPNumber(this.willBeBurned, this.burnedAsset);
  }

  get networkFee(): CodecString {
    return this.networkFees[Operation.Burn];
  }

  get networkFeeFormatted(): string {
    return this.formatCodecNumber(this.networkFee);
  }

  private get xorBalance() {
    // Replace with burnedAsset if needed
    return this.getFPNumberFromCodec(this.accountXor?.balance?.transferable ?? '0');
  }

  private get tokensLeft() {
    return this.xorBalance.gte(this.willBeBurned) ? this.xorBalance.sub(this.willBeBurned) : this.Zero;
  }

  get formattedTokensLeft(): string {
    return this.tokensLeft.toLocaleString();
  }

  get formattedFiatTokensLeft(): Nullable<string> {
    return this.getFiatAmountByFPNumber(this.tokensLeft, this.burnedAsset);
  }

  get isZeroAmount(): boolean {
    return asZeroValue(this.value);
  }

  get isInsufficientBalance(): boolean {
    // Replace with burnedAsset and add networkFee check with xor balance if needed
    const left = this.xorBalance.sub(this.willBeBurned).sub(this.getFPNumberFromCodec(this.networkFee));
    return left.isLtZero();
  }

  get isBurnDisabled(): boolean {
    return this.loading || this.isZeroAmount || this.isAmountLessThanOne || this.isInsufficientBalance;
  }

  handleInputField(value: string): void {
    if (this.value === value) return;

    this.value = value;
  }

  async handleConfirmBurn(): Promise<void> {
    if (this.isInsufficientBalance) {
      this.$alert(this.t('insufficientBalanceText', { tokenSymbol: this.burnedAsset.symbol }), {
        title: this.t('errorText'),
      });
      this.$emit('confirm');
    } else {
      try {
        await this.withNotifications(async () => {
          await api.assets.burn(this.burnedAsset, this.willBeBurned.toString());
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
