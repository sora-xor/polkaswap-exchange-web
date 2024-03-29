<template>
  <div>
    <dialog-base :title="title" :visible.sync="isVisible" tooltip="COMING SOON...">
      <div class="vault-create">
        <token-input
          ref="collateralInput"
          class="vault-create__collateral-input vault-create__token-input"
          with-slider
          title="DEPOSIT COLLATERAL"
          v-model="collateralValue"
          is-fiat-editable
          :is-max-available="isMaxCollateralAvailable"
          :token="asset"
          :balance="collateralAssetBalance"
          :slider-value="collateralValuePercent"
          :disabled="loading"
          @max="handleMaxCollateralValue"
          @slide="handleCollateralPercentChange"
        />
        <info-line
          label="MAX AVAILABLE TO BORROW"
          label-tooltip="COMING SOON..."
          :value="formattedMaxBorrow"
          :asset-symbol="kusdSymbol"
          :fiat-value="maxBorrowFiat"
          is-formatted
        />
        <info-line
          label="LOAN TO VALUE (LTV)"
          label-tooltip="COMING SOON..."
          :value="formattedLtv"
          asset-symbol="%"
          is-formatted
        >
          <value-status v-if="ltv" class="ltv-badge-status" badge :value="ltvNumber" :getStatus="getLtvStatus">
            {{ ltvText }}
          </value-status>
        </info-line>
        <s-button
          type="primary"
          class="s-typography-button--large action-button vault-create__button"
          :disabled="disabled"
          @click="handleAddCollateral"
        >
          <template v-if="isInsufficientXorForFee">
            {{ t('insufficientBalanceText', { tokenSymbol: xorSymbol }) }}
          </template>
          <template v-else-if="!ltv">ENTER COLLATERAL</template>
          <template v-else-if="isLessThanMinDeposit">ENTER MORE COLLATERAL</template>
          <template v-else-if="isLtvGtHundred">INSUFFICIENT COLLATERAL</template>
          <template v-else>OPEN</template>
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
  </div>
</template>

<script lang="ts">
import { Operation, FPNumber } from '@sora-substrate/util';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import { mixins, components, api } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop, Ref, Watch } from 'vue-property-decorator';

import type TokenInput from '@/components/shared/Input/TokenInput.vue';
import { Components, HundredNumber, ObjectInit, ZeroStringValue } from '@/consts';
import { LtvTranslations } from '@/modules/vault/consts';
import { getLtvStatus } from '@/modules/vault/util';
import { lazyComponent } from '@/router';
import { getter, state } from '@/store/decorators';
import { asZeroValue, getAssetBalance } from '@/utils';

import type { CodecString, NetworkFeesObject } from '@sora-substrate/util';
import type { AccountAsset, Asset, RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';
import type { Collateral, Vault } from '@sora-substrate/util/build/kensetsu/types';

@Component({
  components: {
    DialogBase: components.DialogBase,
    InfoLine: components.InfoLine,
    TokenInput: lazyComponent(Components.TokenInput),
    ValueStatus: lazyComponent(Components.ValueStatusWrapper),
  },
})
export default class AddCollateralDialog extends Mixins(
  mixins.TransactionMixin,
  mixins.DialogMixin,
  mixins.FormattedAmountMixin
) {
  readonly xorSymbol = XOR.symbol;
  readonly getLtvStatus = getLtvStatus;

  @Ref('collateralInput') collateralInput!: Nullable<TokenInput>;

  @Prop({ type: Object, default: ObjectInit }) readonly collateral!: Nullable<Collateral>;
  @Prop({ type: Object, default: ObjectInit }) readonly vault!: Nullable<Vault>;
  @Prop({ type: Object, default: ObjectInit }) readonly prevLtv!: Nullable<FPNumber>;
  @Prop({ type: Object, default: ObjectInit }) readonly asset!: Nullable<RegisteredAccountAsset>;

  @state.wallet.settings.networkFees private networkFees!: NetworkFeesObject;
  @state.vault.averageCollateralPrices private averageCollateralPrices!: Record<string, Nullable<FPNumber>>;
  @getter.assets.xor private accountXor!: Nullable<AccountAsset>;
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;

  @getter.vault.kusdToken kusdToken!: Nullable<RegisteredAccountAsset>;

  collateralValue = '';

  @Watch('visible')
  private async handleDialogVisibility(value: boolean): Promise<void> {
    await this.$nextTick();
    this.collateralValue = '';
    this.collateralInput?.focus();
  }

  private get xorBalance(): FPNumber {
    return this.getFPNumberFromCodec(this.accountXor?.balance?.transferable ?? ZeroStringValue);
  }

  get title(): string {
    return 'Add collateral';
  }

  get networkFee(): CodecString {
    return this.networkFees[Operation.DepositCollateral];
  }

  private get fpNetworkFee(): FPNumber {
    return this.getFPNumberFromCodec(this.networkFee);
  }

  get networkFeeFormatted(): string {
    return this.formatCodecNumber(this.networkFee);
  }

  get isInsufficientXorForFee(): boolean {
    return this.xorBalance.sub(this.fpNetworkFee).isLtZero();
  }

  get isLtvGtHundred(): boolean {
    return this.ltv?.gt(this.Hundred) ?? false;
  }

  get disabled(): boolean {
    return this.loading || this.isInsufficientXorForFee || !this.ltv || this.ltv.gt(this.Hundred);
  }

  get collateralAssetBalance(): CodecString {
    return getAssetBalance(this.asset);
  }

  get averageCollateralPrice(): FPNumber {
    if (!this.vault) return this.Zero;
    return this.averageCollateralPrices[this.vault.lockedAssetId] ?? this.Zero;
  }

  /** If collateral is XOR then we subtract the network fee */
  private get availableCollateralBalanceFp(): FPNumber {
    let availableCollateralBalance = this.getFPNumberFromCodec(this.collateralAssetBalance);
    if (this.asset?.address === XOR.address) {
      availableCollateralBalance = availableCollateralBalance.sub(this.fpNetworkFee);
      if (availableCollateralBalance.isLtZero()) {
        availableCollateralBalance = this.Zero;
      }
    }
    return availableCollateralBalance;
  }

  get isMaxCollateralAvailable(): boolean {
    if (this.shouldBalanceBeHidden || asZeroValue(this.collateralValue)) return true;
    if (this.availableCollateralBalanceFp.isLteZero()) return false;
    return !this.getFPNumber(this.collateralValue).isEqualTo(this.availableCollateralBalanceFp);
  }

  get collateralValuePercent(): number {
    if (!this.collateralValue) return 0;

    const percent = this.getFPNumber(this.collateralValue, this.asset?.decimals)
      .div(this.availableCollateralBalanceFp)
      .mul(HundredNumber)
      .toNumber(0);
    return percent > HundredNumber ? HundredNumber : percent;
  }

  get kusdSymbol(): string {
    return this.kusdToken?.symbol ?? '';
  }

  get collateralSymbol(): string {
    return this.asset?.symbol ?? '';
  }

  get maxBorrowPerMaxCollateralNumber(): number {
    return this.maxBorrowPerMaxCollateralFp.toNumber();
  }

  private get maxBorrowPerMaxCollateralFp(): FPNumber {
    if (
      !this.averageCollateralPrice ||
      !this.availableCollateralBalanceFp.isFinity() ||
      this.availableCollateralBalanceFp.isZero()
    )
      return this.Zero;

    const collateralVolume = this.averageCollateralPrice.mul(this.availableCollateralBalanceFp);
    const maxSafeDebt = collateralVolume
      .mul(this.collateral?.riskParams.liquidationRatioReversed ?? 0)
      .div(HundredNumber);
    return maxSafeDebt.dp(2);
  }

  get formattedMaxBorrow(): string {
    return this.maxBorrowPerMaxCollateralFp.toLocaleString();
  }

  get maxBorrowFiat(): Nullable<string> {
    if (!this.kusdToken) return null;
    return this.getFiatAmountByFPNumber(this.maxBorrowPerMaxCollateralFp, this.kusdToken);
  }

  get totalCollateralValue(): Nullable<FPNumber> {
    if (!this.vault) return null;
    return this.vault.lockedAmount.add(this.collateralValue ?? 0);
  }

  private get maxBorrowPerTotalCollateralValue(): FPNumber {
    if (!this.averageCollateralPrice || asZeroValue(this.collateralValue)) return this.Zero;

    const collateralVolume = this.averageCollateralPrice.mul(this.collateralValue);
    const maxSafeDebt = collateralVolume
      .mul(this.collateral?.riskParams.liquidationRatioReversed ?? 0)
      .div(HundredNumber);
    return maxSafeDebt;
  }

  get ltv(): Nullable<FPNumber> {
    if (!this.vault) return null;
    const ltv = this.vault.debt.div(this.maxBorrowPerTotalCollateralValue);
    return ltv.isFinity() ? ltv.mul(HundredNumber) : null;
  }

  get ltvNumber(): number {
    if (!this.ltv) return 0;
    return this.ltv.toNumber();
  }

  get formattedLtv(): string {
    if (!this.ltv) return ZeroStringValue;
    return this.ltv.toLocaleString(2);
  }

  get ltvText(): string {
    return LtvTranslations[getLtvStatus(this.ltvNumber)];
  }

  handleCollateralPercentChange(percent: number): void {
    this.collateralValue = this.availableCollateralBalanceFp.mul(percent / HundredNumber).toString();
  }

  handleMaxCollateralValue(): void {
    this.collateralValue = this.availableCollateralBalanceFp.toString();
  }

  async handleAddCollateral(): Promise<void> {
    if (!(this.vault && this.asset)) return;
    if (this.disabled) {
      if (this.isInsufficientXorForFee) {
        this.$alert(this.t('insufficientBalanceText', { tokenSymbol: this.xorSymbol }), {
          title: this.t('errorText'),
        });
      } else if (!this.ltv || this.isLtvGtHundred) {
        this.$alert('Insufficient collateral', {
          title: this.t('errorText'),
        });
      }
    } else {
      try {
        await this.withNotifications(async () => {
          await api.kensetsu.depositCollateral(this.vault as Vault, this.collateralValue, this.asset as Asset);
        });
      } catch (error) {
        console.error(error);
      }
    }
    this.isVisible = false;
  }
}
</script>

<style lang="scss" scoped>
.vault-create {
  @include full-width-button('action-button');

  &__button,
  &__token-input {
    margin-bottom: 16px;
  }
  .ltv-badge-status {
    margin-left: 8px;
  }
}
</style>
