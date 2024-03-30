<template>
  <dialog-base :title="title" :visible.sync="isVisible" tooltip="COMING SOON...">
    <div class="vault-close">
      <div class="vault-close__title s-flex">
        <pair-token-logo class="vault-close__icon" size="medium" :first-token="kusdToken" :second-token="asset" />
        <h3>{{ vaultTitle }}</h3>
      </div>
      <info-line
        class="vault-close__collateral"
        label="YOUR COLLATERAL"
        label-tooltip="COMING SOON"
        :value="formattedLockedAmount"
        :asset-symbol="collateralSymbol"
        :fiat-value="fiatLockedAmount"
        is-formatted
      />
      <info-line
        class="vault-close__debt"
        label="YOUR DEBT"
        label-tooltip="COMING SOON"
        :value="formattedDebtAmount"
        :asset-symbol="kusdSymbol"
        :fiat-value="fiatDebt"
        is-formatted
      />
      <info-line
        class="vault-close__balance"
        label="YOUR KUSD BALANCE"
        label-tooltip="COMING SOON"
        :value="formattedDebtAssetBalance"
        :asset-symbol="kusdSymbol"
        :fiat-value="fiatDebtAssetBalance"
        is-formatted
      />
      <div v-if="isInsufficientBalance" class="vault-close__error">
        <p class="vault-close__error-message p3">
          Your vault cannot be closed at this time due to insufficient funds to cover the debt. To successfully close
          the vault, you must have a minimum of {{ formattedDiff }} {{ kusdSymbol }}, which exceeds your current
          balance. To cover the required debt and proceed with the closure, you need to acquire
          {{ formattedDiffWithSlippage }} {{ kusdSymbol }}. You can do so by swapping your existing assets to KUSD.
        </p>
        <info-line
          class="vault-close__error-diff"
          label="KUSD REQUIRED"
          label-tooltip="COMING SOON"
          :value="formattedDiffWithSlippage"
          :asset-symbol="kusdSymbol"
          :fiat-value="fiatDiffWithSlippage"
          is-formatted
        />
        <external-link class="vault-close__error-link" title="Navigate to Swap page" :href="swapLink" />
      </div>
      <s-button
        type="primary"
        class="s-typography-button--large action-button vault-close__button"
        :disabled="disabled"
        @click="handleCloseVault"
      >
        <template v-if="disabled">
          {{ errorMessage }}
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
import { Operation, FPNumber } from '@sora-substrate/util';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import { mixins, components, api } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import { Components, ObjectInit, ZeroStringValue } from '@/consts';
import { lazyComponent } from '@/router';
import { getter, state } from '@/store/decorators';
import { getAssetBalance } from '@/utils';

import type { CodecString, NetworkFeesObject } from '@sora-substrate/util';
import type { AccountAsset, RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';
import type { Vault } from '@sora-substrate/util/build/kensetsu/types';

@Component({
  components: {
    DialogBase: components.DialogBase,
    InfoLine: components.InfoLine,
    ExternalLink: components.ExternalLink,
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
  },
})
export default class CloseVaultDialog extends Mixins(
  mixins.TransactionMixin,
  mixins.DialogMixin,
  mixins.FormattedAmountMixin
) {
  readonly xorSymbol = XOR.symbol;
  readonly swapLink = '/#/swap';

  @Prop({ type: Object, default: ObjectInit }) readonly vault!: Nullable<Vault>;
  @Prop({ type: Object, default: ObjectInit }) readonly asset!: Nullable<RegisteredAccountAsset>;

  @state.wallet.settings.networkFees private networkFees!: NetworkFeesObject;
  @getter.assets.xor private accountXor!: Nullable<AccountAsset>;
  @getter.vault.kusdToken kusdToken!: Nullable<RegisteredAccountAsset>;

  private get xorBalance() {
    return this.getFPNumberFromCodec(this.accountXor?.balance?.transferable ?? ZeroStringValue);
  }

  get title(): string {
    return 'Close position';
  }

  get networkFee(): CodecString {
    return this.networkFees[Operation.CloseVault];
  }

  private get fpNetworkFee() {
    return this.getFPNumberFromCodec(this.networkFee);
  }

  get networkFeeFormatted(): string {
    return this.formatCodecNumber(this.networkFee);
  }

  get isInsufficientXorForFee(): boolean {
    return this.xorBalance.sub(this.fpNetworkFee).isLtZero();
  }

  private get kusdSymbol(): string {
    return this.kusdToken?.symbol ?? '';
  }

  get collateralSymbol(): string {
    return this.asset?.symbol ?? '';
  }

  get vaultTitle(): string {
    if (!(this.kusdSymbol && this.asset)) return '';
    return `${this.kusdSymbol} / ${this.collateralSymbol}`;
  }

  get formattedLockedAmount(): string {
    return this.vault?.lockedAmount.toLocaleString(2) ?? ZeroStringValue;
  }

  get fiatLockedAmount(): string {
    if (!(this.vault && this.asset)) return ZeroStringValue;

    return this.getFiatAmountByFPNumber(this.vault.lockedAmount, this.asset) ?? ZeroStringValue;
  }

  private get debt(): FPNumber {
    return this.vault?.debt ?? this.Zero;
  }

  get formattedDebtAmount(): string {
    return this.debt.toLocaleString(2) ?? ZeroStringValue;
  }

  get fiatDebt(): string {
    if (!this.kusdToken) return ZeroStringValue;

    return this.getFiatAmountByFPNumber(this.debt, this.kusdToken) ?? ZeroStringValue;
  }

  private get debtAssetBalanceFp(): FPNumber {
    return this.getFPNumberFromCodec(getAssetBalance(this.kusdToken) ?? 0, this.kusdToken?.decimals);
  }

  get formattedDebtAssetBalance(): string {
    return this.debtAssetBalanceFp.toLocaleString();
  }

  get fiatDebtAssetBalance(): string {
    if (!this.kusdToken) return ZeroStringValue;

    return this.getFiatAmountByFPNumber(this.debtAssetBalanceFp, this.kusdToken) ?? ZeroStringValue;
  }

  get isInsufficientBalance(): boolean {
    return this.debt.gt(this.debtAssetBalanceFp);
  }

  private get diff(): FPNumber {
    return this.debt.sub(this.debtAssetBalanceFp);
  }

  get formattedDiff(): string {
    if (!this.isInsufficientBalance) return '';
    return this.diff.toLocaleString();
  }

  /** Slippage is set to 2% by default */
  private get diffWithSlippage(): FPNumber {
    return this.diff.mul(1.02);
  }

  get formattedDiffWithSlippage(): string {
    if (!this.isInsufficientBalance) return '';
    return this.diffWithSlippage.toLocaleString();
  }

  get fiatDiffWithSlippage(): string {
    if (!this.kusdToken) return ZeroStringValue;

    return this.getFiatAmountByFPNumber(this.diffWithSlippage, this.kusdToken) ?? ZeroStringValue;
  }

  get disabled(): boolean {
    return this.loading || this.isInsufficientXorForFee || this.isInsufficientBalance;
  }

  get errorMessage(): string {
    let error = '';
    if (this.isInsufficientXorForFee) {
      error = this.t('insufficientBalanceText', { tokenSymbol: this.xorSymbol });
    } else if (this.isInsufficientBalance) {
      error = this.t('insufficientBalanceText', { tokenSymbol: this.kusdSymbol });
    }
    return error;
  }

  async handleCloseVault(): Promise<void> {
    if (this.disabled) {
      if (this.errorMessage) {
        this.$alert(this.errorMessage, { title: this.t('errorText') });
      }
    } else {
      try {
        await this.withNotifications(async () => {
          if (!(this.vault && this.asset)) throw new Error('[api.kensetsu.closeVault]: vault or asset is null');
          await api.kensetsu.closeVault(this.vault, this.asset);
        });
      } catch (error) {
        console.error(error);
      }
    }
    this.isVisible = false;
    this.$emit('confirm');
  }
}
</script>

<style lang="scss" scoped>
.vault-close {
  @include full-width-button('action-button');

  &__title {
    align-items: center;
    margin-bottom: 16px;
  }

  &__error {
    margin-top: 16px;

    &-message {
      margin-bottom: 16px;
    }
    &-diff {
      margin-bottom: 16px;
    }
    &-link {
      font-size: var(--s-heading6-font-size);
    }
  }

  &__button {
    margin-bottom: 16px;
  }
}
</style>
