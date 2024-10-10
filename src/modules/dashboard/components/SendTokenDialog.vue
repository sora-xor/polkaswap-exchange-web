<template>
  <dialog-base :title="title" :visible.sync="isVisible" tooltip="COMING SOON...">
    <div class="dashboard-send">
      <address-book-input
        class="dashboard-send__address"
        exclude-connected
        v-model="address"
        :is-valid="validAddress"
        :disabled="loading"
      />
      <p v-if="showIsNotSbtOwnerReceiver" class="dashboard-send__address-error">
        {{ t('sbtDetails.noReceiverAccess') }}
      </p>
      <token-input
        ref="tokenInput"
        class="dashboard-send__token-input"
        with-slider
        title="AMOUNT"
        v-model="value"
        :is-fiat-editable="editableFiat"
        :is-max-available="isMaxAvailable"
        :token="asset"
        :balance="balance"
        :slider-value="valuePercent"
        :disabled="loading"
        @max="handleMaxValue"
        @slide="handlePercentChange"
      />
      <s-input
        class="dashboard-send__comment"
        type="textarea"
        placeholder="Comment (Optional)"
        v-model="comment"
        :rows="4"
        :maxlength="128"
        :disabled="loading"
        @keypress.native="handleCommentInput($event)"
      />
      <s-button
        type="primary"
        class="s-typography-button--large action-button dashboard-send__button"
        :disabled="disabled"
        @click="handleSend"
      >
        <template v-if="isInsufficientXorForFee">
          {{ t('insufficientBalanceText', { tokenSymbol: xorSymbol }) }}
        </template>
        <template v-else-if="emptyAddress">
          {{ t('walletSend.enterAddress') }}
        </template>
        <template v-else-if="!validAddress">
          {{ t('walletSend.badAddress') }}
        </template>
        <template v-else-if="emptyValue">
          {{ t('buttons.enterAmount') }}
        </template>
        <template v-else-if="isInsufficientBalance">
          {{ t('insufficientBalanceText', { tokenSymbol }) }}
        </template>
        <template v-else>{{ title }}</template>
      </s-button>
      <info-line
        :label="t('networkFeeText')"
        :label-tooltip="t('networkFeeTooltipText')"
        :value="networkFeeFormatted"
        :asset-symbol="xorSymbol"
        :fiat-value="getFiatAmountByCodecString(networkFee)"
        is-formatted
      />
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { Operation, FPNumber } from '@sora-substrate/sdk';
import { getAssetBalance } from '@sora-substrate/sdk/build/assets';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { type AccountAsset, type Asset, AssetTypes } from '@sora-substrate/sdk/build/assets/types';
import { mixins, components, api } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch, Ref, Prop } from 'vue-property-decorator';

import type TokenInput from '@/components/shared/Input/TokenInput.vue';
import { Components, ZeroStringValue, HundredNumber, ObjectInit } from '@/consts';
import type { OwnedAsset } from '@/modules/dashboard/types';
import { lazyComponent } from '@/router';
import { getter, state } from '@/store/decorators';
import { isMaxButtonAvailable } from '@/utils';

import type { CodecString, NetworkFeesObject } from '@sora-substrate/sdk';

@Component({
  components: {
    DialogBase: components.DialogBase,
    InfoLine: components.InfoLine,
    AddressBookInput: components.AddressBookInput,
    TokenInput: lazyComponent(Components.TokenInput),
  },
})
export default class SendTokenDialog extends Mixins(
  mixins.TransactionMixin,
  mixins.DialogMixin,
  mixins.FormattedAmountMixin
) {
  readonly xorSymbol = XOR.symbol;

  @Ref('tokenInput') tokenInput!: Nullable<TokenInput>;

  @Prop({ default: ZeroStringValue, type: String }) readonly balance!: CodecString;
  @Prop({ default: false, type: Boolean }) readonly editableFiat!: boolean;
  @Prop({ default: ObjectInit, type: Object }) readonly asset!: OwnedAsset;

  @state.wallet.settings.networkFees private networkFees!: NetworkFeesObject;
  @state.wallet.account.assets private assets!: Asset[];
  @getter.assets.xor private accountXor!: Nullable<AccountAsset>;

  value = '';
  address = '';
  comment = '';
  showIsNotSbtOwnerReceiver = false;

  @Watch('address')
  async getIsNotSbtOwnerReceiver(): Promise<void> {
    if (this.validAddress && this.asset.address) {
      const regulatedAsset = this.assets.find(
        (asset) => asset.address === this.asset.address && asset.type === AssetTypes.Regulated
      );

      if (regulatedAsset) {
        const sbtAddress = await api.extendedAssets.getSbtAddress(regulatedAsset.address);

        const balance = await getAssetBalance(api.api, this.address, sbtAddress);

        if (this.getFPNumberFromCodec(balance.total).lte(FPNumber.ZERO)) {
          this.showIsNotSbtOwnerReceiver = true;
        } else {
          this.showIsNotSbtOwnerReceiver = false;
        }
      }
    } else {
      this.showIsNotSbtOwnerReceiver = false;
    }
  }

  @Watch('visible')
  private async handleDialogVisibility(value: boolean): Promise<void> {
    await this.$nextTick();
    this.value = '';
    this.address = '';
    this.comment = '';
    this.tokenInput?.focus();
  }

  private get fpBalance() {
    return this.getFPNumberFromCodec(this.balance, this.asset.decimals);
  }

  private get xorBalance() {
    return this.getFPNumberFromCodec(this.accountXor?.balance?.transferable ?? ZeroStringValue, this.asset.decimals);
  }

  private get assetWithBalance(): AccountAsset {
    return { ...this.asset, balance: { transferable: this.balance } } as unknown as AccountAsset;
  }

  get tokenSymbol(): string {
    return this.asset.symbol;
  }

  get title(): string {
    return `Send ${this.tokenSymbol}`;
  }

  get networkFee(): CodecString {
    return this.networkFees[Operation.XorlessTransfer];
  }

  private get fpNetworkFee() {
    return this.getFPNumberFromCodec(this.networkFee);
  }

  get networkFeeFormatted(): string {
    return this.formatCodecNumber(this.networkFee);
  }

  get emptyValue(): boolean {
    return !+this.value;
  }

  get isMaxAvailable(): boolean {
    return isMaxButtonAvailable(
      this.assetWithBalance,
      this.value ?? 0,
      this.networkFee,
      this.accountXor as AccountAsset
    );
  }

  get isInsufficientBalance(): boolean {
    return this.fpBalance.sub(this.value || 0).isLtZero();
  }

  get isInsufficientXorForFee(): boolean {
    return this.xorBalance.sub(this.fpNetworkFee).isLtZero();
  }

  get emptyAddress(): boolean {
    return !this.address.trim();
  }

  get validAddress(): boolean {
    return !this.emptyAddress && api.validateAddress(this.address);
  }

  get disabled(): boolean {
    return (
      this.loading ||
      this.isInsufficientXorForFee ||
      this.emptyValue ||
      !this.validAddress ||
      this.isInsufficientBalance ||
      this.showIsNotSbtOwnerReceiver
    );
  }

  get valuePercent(): number {
    if (!this.value) return 0;

    const percent = this.getFPNumber(this.value, this.asset.decimals)
      .div(this.fpBalance)
      .mul(HundredNumber)
      .toNumber(0);
    return percent > HundredNumber ? HundredNumber : percent;
  }

  handlePercentChange(percent: number): void {
    this.value = this.fpBalance.mul(percent / HundredNumber).toString();
  }

  handleMaxValue(): void {
    this.value = this.fpBalance.toString();
  }

  handleCommentInput(e: KeyboardEvent): boolean | void {
    if (/^[A-Za-z0-9 _',.#]+$/.test(e.key)) return true;
    e.preventDefault();
  }

  async handleSend(): Promise<void> {
    const comment = this.comment.trim() || undefined;
    const address = this.address.trim();

    if (this.isInsufficientBalance) {
      this.$alert(this.t('insufficientBalanceText', { tokenSymbol: this.tokenSymbol }), {
        title: this.t('errorText'),
      });
    } else {
      try {
        await this.withNotifications(async () => {
          await api.assets.transfer(this.asset, address, this.value, { feeType: 'xor', comment });
        });
      } catch (error) {
        console.error(error);
      }
    }
    this.isVisible = false;
  }
}
</script>

<style lang="scss">
.dashboard-send__comment .el-textarea__inner {
  max-height: 84px; // rows: 4 (21px*4)
}

.s-input__input .el-textarea.is-disabled .el-textarea__inner {
  background-color: var(--s-color-base-background); // TODO: fix in UI lib
}
</style>

<style lang="scss" scoped>
.dashboard-send {
  @include full-width-button('action-button');

  &__address,
  &__button,
  &__token-input {
    margin-bottom: $basic-spacing;
  }

  &__address-error {
    color: var(--s-color-status-error);
    margin-bottom: var(--s-basic-spacing);
    font-weight: 400;
    font-size: var(--s-font-size-extra-small);
    line-height: var(--s-line-height-base);
    padding-right: calc(var(--s-basic-spacing) * 1.25);
    padding-left: calc(var(--s-basic-spacing) * 1.25);
  }
}
</style>
