<template>
  <dialog-base :title="title" :visible.sync="isVisible" :tooltip="t('kensetsu.closeVaultDescription')">
    <div class="vault-close">
      <div class="vault-close__title s-flex">
        <pair-token-logo class="vault-close__icon" size="medium" :first-token="debtAsset" :second-token="lockedAsset" />
        <h3>{{ vaultTitle }}</h3>
      </div>
      <info-line
        class="vault-close__collateral"
        :label="t('kensetsu.yourCollateral')"
        :label-tooltip="t('kensetsu.yourCollateralDescription')"
        :value="formattedLockedAmount"
        :asset-symbol="lockedSymbol"
        :fiat-value="fiatLockedAmount"
        is-formatted
      />
      <info-line
        class="vault-close__debt"
        :label="t('kensetsu.yourDebt')"
        :label-tooltip="t('kensetsu.yourDebtDescription')"
        :value="formattedDebtAmount"
        :asset-symbol="debtSymbol"
        :fiat-value="fiatDebt"
        is-formatted
      />
      <info-line
        class="vault-close__balance"
        :label="t('kensetsu.yourDebtTokenBalance', { tokenSymbol: debtSymbol })"
        :value="formattedDebtAssetBalance"
        :asset-symbol="debtSymbol"
        :fiat-value="fiatDebtAssetBalance"
        is-formatted
      />
      <s-card
        v-if="isInsufficientBalance"
        class="vault-close__error"
        border-radius="small"
        shadow="always"
        size="medium"
        pressed
      >
        <div slot="header" class="vault-close__error-card-header s-flex">
          <div class="vault-close__error-header s-flex-column">
            <p class="vault-close__error-title p3">{{ t('kensetsu.requiredAmountWithSlippage') }}</p>
            <h3 class="vault-close__error-value">{{ formattedDiffWithSlippage }}</h3>
          </div>
          <div class="vault-close__error-badge">
            <s-icon class="vault-close__error-icon" name="notifications-alert-triangle-24" size="24" />
          </div>
        </div>
        <p class="vault-close__error-message p3">
          {{ t('kensetsu.requiredAmountWithSlippageDescription', { tokenSymbol: debtSymbol, amount: formattedDiff }) }}
        </p>
        <s-button type="primary" class="s-typography-button--large vault-close__button" @click.prevent="openSwap">
          <external-link
            class="vault-close__error-link s-typography-button--large"
            tabindex="-1"
            :title="t('kensetsu.openSwap')"
            :href="swapLink"
          />
        </s-button>
      </s-card>
      <s-button
        type="primary"
        class="s-typography-button--large action-button vault-close__button"
        :disabled="disabled"
        @click="handleCloseVault"
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
  readonly swapLink = '/#/swap/XOR/KUSD';

  @Prop({ type: Object, default: ObjectInit }) readonly vault!: Nullable<Vault>;
  @Prop({ type: Object, default: ObjectInit }) readonly lockedAsset!: Nullable<RegisteredAccountAsset>;
  @Prop({ type: Object, default: ObjectInit }) readonly debtAsset!: Nullable<RegisteredAccountAsset>;

  @state.wallet.settings.networkFees private networkFees!: NetworkFeesObject;
  @getter.assets.xor private accountXor!: Nullable<AccountAsset>;

  private get xorBalance() {
    return this.getFPNumberFromCodec(this.accountXor?.balance?.transferable ?? ZeroStringValue);
  }

  get title(): string {
    return this.t('kensetsu.closeVault');
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

  private get debtSymbol(): string {
    return this.debtAsset?.symbol ?? '';
  }

  get lockedSymbol(): string {
    return this.lockedAsset?.symbol ?? '';
  }

  get vaultTitle(): string {
    if (!(this.debtSymbol && this.lockedSymbol)) return '';
    return `${this.debtSymbol} / ${this.lockedSymbol}`;
  }

  get formattedLockedAmount(): string {
    return this.vault?.lockedAmount.toLocaleString() ?? ZeroStringValue;
  }

  get fiatLockedAmount(): string {
    if (!(this.vault && this.lockedAsset)) return ZeroStringValue;

    return this.getFiatAmountByFPNumber(this.vault.lockedAmount, this.lockedAsset) ?? ZeroStringValue;
  }

  private get debt(): FPNumber {
    return this.vault?.debt ?? this.Zero;
  }

  get formattedDebtAmount(): string {
    return this.debt.toLocaleString() ?? ZeroStringValue;
  }

  get fiatDebt(): string {
    if (!this.debtAsset) return ZeroStringValue;

    return this.getFiatAmountByFPNumber(this.debt, this.debtAsset) ?? ZeroStringValue;
  }

  private get debtAssetBalanceFp(): FPNumber {
    return this.getFPNumberFromCodec(getAssetBalance(this.debtAsset) ?? 0, this.debtAsset?.decimals);
  }

  get formattedDebtAssetBalance(): string {
    return this.debtAssetBalanceFp.toLocaleString();
  }

  get fiatDebtAssetBalance(): string {
    if (!this.debtAsset) return ZeroStringValue;

    return this.getFiatAmountByFPNumber(this.debtAssetBalanceFp, this.debtAsset) ?? ZeroStringValue;
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
    if (!this.debtAsset) return ZeroStringValue;

    return this.getFiatAmountByFPNumber(this.diffWithSlippage, this.debtAsset) ?? ZeroStringValue;
  }

  get disabled(): boolean {
    return this.loading || this.isInsufficientXorForFee || this.isInsufficientBalance;
  }

  get errorMessage(): string {
    let error = '';
    if (this.isInsufficientXorForFee) {
      error = this.t('insufficientBalanceText', { tokenSymbol: this.xorSymbol });
    } else if (this.isInsufficientBalance) {
      error = this.t('insufficientBalanceText', { tokenSymbol: this.debtSymbol });
    }
    return error;
  }

  openSwap(): void {
    window.open(this.swapLink, '_blank');
  }

  async handleCloseVault(): Promise<void> {
    if (this.disabled) {
      if (this.errorMessage) {
        this.$alert(this.errorMessage, { title: this.t('errorText') });
      }
    } else {
      try {
        await this.withNotifications(async () => {
          if (!(this.vault && this.lockedAsset && this.debtAsset)) {
            throw new Error('[api.kensetsu.closeVault]: vault or asset is null');
          }
          await api.kensetsu.closeVault(this.vault, this.lockedAsset, this.debtAsset);
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
$item-size: 40px;

.vault-close {
  @include full-width-button('action-button');

  &__title {
    align-items: center;
    margin-bottom: $inner-spacing-medium;
  }

  &__error {
    margin-top: $inner-spacing-medium;

    &-card-header {
      align-items: center;
    }
    &-header {
      flex: 1;
    }
    &-value {
      color: var(--s-color-status-error);
      font-weight: 700;
    }
    &-badge {
      width: $item-size;
      height: $item-size;
      border-radius: 50%;
      background-color: var(--s-color-status-error);
      padding: $inner-spacing-mini;
      box-shadow: var(--s-shadow-element-pressed);
      margin-left: $inner-spacing-mini;
    }
    &-icon {
      color: white;
    }
    &-card-header,
    &-message {
      margin-bottom: $inner-spacing-medium;
    }
    & &-link {
      color: var(--s-color-base-on-accent);
      width: 100%;
      height: $item-size;
      line-height: $item-size;
      margin: -$inner-spacing-small;
    }
  }

  &__button {
    width: 100%;
  }
}

.action-button {
  margin-bottom: $inner-spacing-medium;
}
</style>
