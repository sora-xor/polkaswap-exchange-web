<template>
  <dialog-base :title="title" :visible.sync="isVisible" :tooltip="t('kensetsu.addCollateralDescription')">
    <div class="add-collateral">
      <token-input
        ref="collateralInput"
        class="add-collateral__collateral-input add-collateral__token-input"
        with-slider
        :title="t('kensetsu.depositCollateral')"
        v-model="collateralValue"
        is-fiat-editable
        :is-max-available="isMaxCollateralAvailable"
        :token="lockedAsset"
        :balance="collateralAssetBalance"
        :slider-value="collateralValuePercent"
        :disabled="loading"
        @max="handleMaxCollateralValue"
        @slide="handleCollateralPercentChange"
      />
      <prev-next-info-line
        :label="t('kensetsu.totalCollateral')"
        :tooltip="t('kensetsu.totalCollateralDescription')"
        :symbol="lockedSymbol"
        :prev="formattedPrevDeposit"
        :next="formattedNextDeposit"
      />
      <prev-next-info-line
        :label="t('kensetsu.debtAvailable')"
        :tooltip="t('kensetsu.debtAvailableDescription')"
        :symbol="debtSymbol"
        :prev="formattedPrevAvailable"
        :next="formattedNextAvailable"
      />
      <prev-next-info-line
        :label="t('kensetsu.ltv')"
        :tooltip="t('kensetsu.ltvDescription')"
        symbol="%"
        :prev="formattedPrevLtv"
        :next="formattedLtv"
      >
        <value-status v-if="ltv" class="ltv-badge-status" badge :value="ltvNumber" :getStatus="getLtvStatus">
          {{ ltvText }}
        </value-status>
      </prev-next-info-line>
      <s-button
        type="primary"
        class="s-typography-button--large action-button add-collateral__button"
        :disabled="disabled"
        @click="handleAddCollateral"
      >
        <template v-if="disabled">{{ errorMessage }}</template>
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
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { mixins, components, api } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop, Ref, Watch } from 'vue-property-decorator';

import type TokenInput from '@/components/shared/Input/TokenInput.vue';
import { Components, HundredNumber, ObjectInit, ZeroStringValue } from '@/consts';
import { LtvTranslations, VaultComponents } from '@/modules/vault/consts';
import { vaultLazyComponent } from '@/modules/vault/router';
import { getLtvStatus } from '@/modules/vault/util';
import { lazyComponent } from '@/router';
import { getter, state } from '@/store/decorators';
import { asZeroValue, getAssetBalance, hasInsufficientBalance } from '@/utils';

import type { CodecString, NetworkFeesObject } from '@sora-substrate/sdk';
import type { AccountAsset, RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { Collateral, Vault } from '@sora-substrate/sdk/build/kensetsu/types';

@Component({
  components: {
    DialogBase: components.DialogBase,
    InfoLine: components.InfoLine,
    TokenInput: lazyComponent(Components.TokenInput),
    ValueStatus: lazyComponent(Components.ValueStatusWrapper),
    PrevNextInfoLine: vaultLazyComponent(VaultComponents.PrevNextInfoLine),
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
  @Prop({ type: Object, default: ObjectInit }) readonly lockedAsset!: Nullable<RegisteredAccountAsset>;
  @Prop({ type: Object, default: ObjectInit }) readonly debtAsset!: Nullable<RegisteredAccountAsset>;
  @Prop({ type: Object, default: () => FPNumber.ZERO }) readonly prevLtv!: Nullable<FPNumber>;
  @Prop({ type: Object, default: () => FPNumber.ZERO }) readonly prevAvailable!: FPNumber;
  @Prop({ type: Object, default: () => FPNumber.ZERO }) readonly averageCollateralPrice!: FPNumber;
  @Prop({ type: Number, default: HundredNumber }) readonly maxLtv!: number;
  @Prop({ type: Number, default: 0 }) readonly borrowTax!: number;

  @state.wallet.settings.networkFees private networkFees!: NetworkFeesObject;
  @getter.assets.xor private accountXor!: Nullable<AccountAsset>;

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
    return this.t('kensetsu.addCollateral');
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

  get isCollateralZero(): boolean {
    return asZeroValue(this.collateralValue);
  }

  private get collateralFp(): FPNumber {
    if (this.isCollateralZero) return this.Zero;
    return this.getFPNumber(this.collateralValue, this.lockedAsset?.decimals);
  }

  get isInsufficientBalance(): boolean {
    if (!this.lockedAsset) return true;
    return hasInsufficientBalance(this.lockedAsset, this.collateralValue, this.networkFee);
  }

  get disabled(): boolean {
    return this.loading || this.isInsufficientXorForFee || this.isCollateralZero || this.isInsufficientBalance;
  }

  get collateralAssetBalance(): CodecString {
    return getAssetBalance(this.lockedAsset);
  }

  /** If collateral is XOR then we subtract the network fee */
  private get availableCollateralBalanceFp(): FPNumber {
    let availableCollateralBalance = this.getFPNumberFromCodec(this.collateralAssetBalance);
    if (this.lockedAsset?.address === XOR.address) {
      availableCollateralBalance = availableCollateralBalance.sub(this.fpNetworkFee);
      if (availableCollateralBalance.isLtZero()) {
        availableCollateralBalance = this.Zero;
      }
    }
    return availableCollateralBalance;
  }

  get isMaxCollateralAvailable(): boolean {
    if (this.shouldBalanceBeHidden || this.isCollateralZero) return true;
    if (this.availableCollateralBalanceFp.isLteZero()) return false;
    return !this.collateralFp.isEqualTo(this.availableCollateralBalanceFp);
  }

  get collateralValuePercent(): number {
    if (!this.collateralValue) return 0;

    const percent = this.collateralFp.div(this.availableCollateralBalanceFp).mul(HundredNumber).toNumber(0);
    return percent > HundredNumber ? HundredNumber : percent;
  }

  get debtSymbol(): string {
    return this.debtAsset?.symbol ?? '';
  }

  get lockedSymbol(): string {
    return this.lockedAsset?.symbol ?? '';
  }

  private get totalCollateralValue(): Nullable<FPNumber> {
    if (!this.vault) return null;
    return this.vault.lockedAmount.add(this.collateralValue || 0);
  }

  get formattedPrevDeposit(): string {
    if (!this.vault) return ZeroStringValue;
    return this.vault.lockedAmount.toLocaleString();
  }

  get formattedNextDeposit(): string {
    return this.totalCollateralValue?.toLocaleString() ?? ZeroStringValue;
  }

  get formattedPrevLtv(): string {
    return this.prevLtv?.toLocaleString(2) ?? ZeroStringValue;
  }

  private get maxBorrowPerCollateralValue(): FPNumber {
    if (this.isCollateralZero) return this.Zero;

    const collateralVolume = this.averageCollateralPrice.mul(this.collateralValue);
    const maxSafeDebt = collateralVolume
      .mul(this.collateral?.riskParams.liquidationRatioReversed ?? 0)
      .div(HundredNumber);

    let available = maxSafeDebt.sub(maxSafeDebt.mul(this.borrowTax));

    let totalAvailable = this.collateral?.riskParams.hardCap.sub(this.collateral.debtSupply) ?? this.Zero;
    totalAvailable = totalAvailable.sub(totalAvailable.mul(this.borrowTax));

    available = available.gt(totalAvailable) ? totalAvailable : available;
    return !available.isFinity() || available.isLteZero() ? this.Zero : available;
  }

  get formattedPrevAvailable(): string {
    return this.prevAvailable.toLocaleString();
  }

  private get nextAvailable(): FPNumber {
    return this.prevAvailable.add(this.maxBorrowPerCollateralValue);
  }

  get formattedNextAvailable(): string {
    return this.nextAvailable.toLocaleString();
  }

  private get maxSafeDebt(): Nullable<FPNumber> {
    if (!this.totalCollateralValue) return null;
    const collateralVolume = this.averageCollateralPrice.mul(this.totalCollateralValue);
    return collateralVolume.mul(this.collateral?.riskParams.liquidationRatioReversed ?? 0).div(HundredNumber);
  }

  private get ltvCoeff(): Nullable<FPNumber> {
    if (!(this.maxSafeDebt && this.vault)) return null;
    return this.vault.debt.div(this.maxSafeDebt);
  }

  get ltv(): Nullable<FPNumber> {
    return this.ltvCoeff?.isFinity() ? this.ltvCoeff.mul(HundredNumber) : null;
  }

  get ltvNumber(): number {
    if (!this.ltv) return 0;
    return this.ltv.toNumber();
  }

  get formattedLtv(): string {
    if (!this.ltvCoeff) return ZeroStringValue;
    return this.ltvCoeff.mul(this.maxLtv).toLocaleString(2);
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

  get errorMessage(): string {
    let error = '';
    if (this.isInsufficientXorForFee) {
      error = this.t('insufficientBalanceText', { tokenSymbol: this.xorSymbol });
    } else if (this.isCollateralZero) {
      error = this.t('kensetsu.error.enterCollateral');
    } else if (this.isInsufficientBalance) {
      error = this.t('insufficientBalanceText', { tokenSymbol: this.lockedSymbol });
    }
    return error;
  }

  async handleAddCollateral(): Promise<void> {
    if (this.disabled) {
      if (this.errorMessage) {
        this.$alert(this.errorMessage, { title: this.t('errorText') });
      }
    } else {
      try {
        await this.withNotifications(async () => {
          if (!(this.vault && this.lockedAsset)) {
            throw new Error('[api.kensetsu.depositCollateral]: vault or asset is null');
          }
          await api.kensetsu.depositCollateral(this.vault, this.collateralValue, this.lockedAsset);
        });
        this.$emit('confirm');
      } catch (error) {
        console.error(error);
      }
    }
    this.isVisible = false;
  }
}
</script>

<style lang="scss" scoped>
.add-collateral {
  @include full-width-button('action-button');

  &__button,
  &__token-input {
    margin-bottom: $inner-spacing-medium;
  }
  .ltv-badge-status {
    margin-left: $inner-spacing-mini;
  }
}
</style>
