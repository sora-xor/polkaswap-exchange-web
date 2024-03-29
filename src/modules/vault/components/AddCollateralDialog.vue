<template>
  <div>
    <dialog-base :title="title" :visible.sync="isVisible" tooltip="COMING SOON...">
      <div class="add-collateral">
        <token-input
          ref="collateralInput"
          class="add-collateral__collateral-input add-collateral__token-input"
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
        <prev-next-info-line
          label="TOTAL COLLATERAL"
          tooltip="COMING SOON..."
          :symbol="collateralSymbol"
          :prev="formattedPrevDeposit"
          :next="formattedNextDeposit"
        />
        <prev-next-info-line
          label="DEBT AVAILABLE"
          tooltip="COMING SOON..."
          :symbol="kusdSymbol"
          :prev="formattedPrevAvailable"
          :next="formattedNextAvailable"
        />
        <prev-next-info-line
          label="LOAN TO VALUE (LTV)"
          tooltip="COMING SOON..."
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
          <template v-if="isInsufficientXorForFee">
            {{ t('insufficientBalanceText', { tokenSymbol: xorSymbol }) }}
          </template>
          <template v-else-if="!ltv">ENTER COLLATERAL</template>
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
  </div>
</template>

<script lang="ts">
import { Operation, FPNumber } from '@sora-substrate/util';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import { mixins, components, api } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop, Ref, Watch } from 'vue-property-decorator';

import type TokenInput from '@/components/shared/Input/TokenInput.vue';
import { Components, HundredNumber, ObjectInit, ZeroStringValue } from '@/consts';
import { LtvTranslations, VaultComponents } from '@/modules/vault/consts';
import { vaultLazyComponent } from '@/modules/vault/router';
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
  @Prop({ type: Object, default: ObjectInit }) readonly asset!: Nullable<RegisteredAccountAsset>;
  @Prop({ type: Object, default: () => FPNumber.ZERO }) readonly prevLtv!: FPNumber;
  @Prop({ type: Object, default: () => FPNumber.ZERO }) readonly prevAvailable!: FPNumber;
  @Prop({ type: Object, default: () => FPNumber.ZERO }) readonly averageCollateralPrice!: FPNumber;

  @state.wallet.settings.networkFees private networkFees!: NetworkFeesObject;
  @getter.assets.xor private accountXor!: Nullable<AccountAsset>;
  @getter.vault.kusdToken private kusdToken!: Nullable<RegisteredAccountAsset>;

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

  get disabled(): boolean {
    return this.loading || this.isInsufficientXorForFee || !this.ltv || this.ltv.gt(this.Hundred);
  }

  get collateralAssetBalance(): CodecString {
    return getAssetBalance(this.asset);
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
    return this.prevLtv.toLocaleString(2);
  }

  private get maxBorrowPerCollateralValue(): FPNumber {
    if (asZeroValue(this.collateralValue)) return this.Zero;

    const collateralVolume = this.averageCollateralPrice.mul(this.collateralValue);
    const maxSafeDebt = collateralVolume
      .mul(this.collateral?.riskParams.liquidationRatioReversed ?? 0)
      .div(HundredNumber);
    return maxSafeDebt;
  }

  get formattedPrevAvailable(): string {
    return this.prevAvailable.toLocaleString(2);
  }

  private get nextAvailable(): FPNumber {
    return this.prevAvailable.add(this.maxBorrowPerCollateralValue);
  }

  get formattedNextAvailable(): string {
    return this.nextAvailable.toLocaleString(2);
  }

  private get maxSafeDebt(): Nullable<FPNumber> {
    if (!this.totalCollateralValue) return null;
    const collateralVolume = this.averageCollateralPrice.mul(this.totalCollateralValue);
    return collateralVolume
      .mul(this.collateral?.riskParams.liquidationRatioReversed ?? 0)
      .div(HundredNumber)
      .dp(2);
  }

  get ltv(): Nullable<FPNumber> {
    if (!(this.maxSafeDebt && this.vault)) return null;
    const ltvCoeff = this.vault.debt.div(this.maxSafeDebt);
    return ltvCoeff.isFinity() ? ltvCoeff.mul(HundredNumber) : null;
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
      } else if (!this.ltv) {
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
