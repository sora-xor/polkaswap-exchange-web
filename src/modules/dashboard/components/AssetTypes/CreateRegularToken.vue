<template>
  <wallet-base :title="t('createToken.titleCommon')" @back="handleBack" show-back>
    <div class="dashboard-create">
      <s-input
        :placeholder="t('createToken.tokenSymbol.placeholder')"
        :minlength="1"
        :maxlength="7"
        :disabled="loading"
        v-maska="tokenSymbolMask"
        v-model="tokenSymbol"
      />
      <p class="dashboard-create-token_desc">{{ t('createToken.tokenSymbol.desc') }}</p>
      <s-input
        :placeholder="t('createToken.tokenName.placeholder')"
        :minlength="1"
        :maxlength="33"
        :disabled="loading"
        v-maska="tokenNameMask"
        v-model="tokenName"
      />
      <p class="dashboard-create-token_desc">{{ t('createToken.tokenName.desc') }}</p>
      <s-float-input
        v-model="tokenSupply"
        :placeholder="t('createToken.tokenSupply.placeholder')"
        :decimals="decimals"
        has-locale-string
        :delimiters="delimiters"
        :max="maxTotalSupply"
        :disabled="loading"
      />
      <p class="dashboard-create-token_desc">{{ t('createToken.tokenSupply.desc') }}</p>
      <div class="dashboard-create-token_supply-block">
        <s-switch v-model="extensibleSupply" :disabled="loading" />
        <span>{{ t('createToken.extensibleSupply.placeholder') }}</span>
      </div>
      <p class="dashboard-create-token_desc">{{ t('createToken.extensibleSupply.desc') }}</p>
      <s-divider class="dashboard-create-token_divider" />
    </div>
    <s-button
      type="primary"
      class="s-typography-button--large action-button dashboard-create__button"
      :disabled="disabled"
      @click="onCreate"
    >
      <template v-if="isInsufficientXorForFee">
        {{ t('insufficientBalanceText', { tokenSymbol: xorSymbol }) }}
      </template>
      <template v-if="!tokenSymbol">{{ t('createToken.enterSymbol') }}</template>
      <template v-else-if="!tokenName.trim()">{{ t('createToken.enterName') }}</template>
      <template v-else-if="!+tokenSupply">{{ t('createToken.enterSupply') }}</template>
      <template v-else>{{ t('createToken.action') }}</template>
    </s-button>
    <wallet-fee v-if="!isCreateDisabled && showFee" :value="fee" />
  </wallet-base>
</template>

<script lang="ts">
import { FPNumber, Operation } from '@sora-substrate/util';
import { XOR, MaxTotalSupply } from '@sora-substrate/util/build/assets/consts';
import { mixins, components, WALLET_CONSTS, api } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import { DashboardPageNames } from '@/modules/dashboard/consts';
import router from '@/router';

import type { CodecString } from '@sora-substrate/util';

@Component({
  components: {
    WalletBase: components.WalletBase,
    WalletFee: components.WalletFee,
  },
})
export default class CreateRegularToken extends Mixins(
  mixins.TransactionMixin,
  mixins.FormattedAmountMixin,
  mixins.NetworkFeeWarningMixin
) {
  readonly tokenSymbolMask = 'AAAAAAA';
  readonly tokenNameMask = { mask: 'Z*', tokens: { Z: { pattern: /[0-9a-zA-Z ]/ } } };
  readonly xorSymbol = XOR.symbol;
  readonly decimals = FPNumber.DEFAULT_PRECISION;
  readonly delimiters = FPNumber.DELIMITERS_CONFIG;
  readonly maxTotalSupply = MaxTotalSupply;
  readonly TokenTabs = WALLET_CONSTS.TokenTabs;

  @Prop({ type: Boolean, default: false }) readonly isRegulated!: boolean;

  tokenSymbol = '';
  tokenName = '';
  tokenSupply = '';
  extensibleSupply = false;
  showFee = true;

  currentTab = WALLET_CONSTS.TokenTabs.Token;

  get title(): string {
    return 'Create asset';
  }

  get networkFee(): CodecString {
    return this.networkFees[Operation.RegisterAsset];
  }

  get fee(): FPNumber {
    return this.getFPNumberFromCodec(this.networkFees.RegisterAsset);
  }

  get isCreateDisabled(): boolean {
    return !(this.tokenSymbol && this.tokenName.trim() && +this.tokenSupply);
  }

  private get fpNetworkFee() {
    return this.getFPNumberFromCodec(this.networkFee);
  }

  get isInsufficientXorForFee(): boolean {
    return this.xorBalance.sub(this.fpNetworkFee).isLtZero();
  }

  get disabled(): boolean {
    return (
      this.loading || this.isInsufficientXorForFee || !(this.tokenSymbol && this.tokenName.trim() && +this.tokenSupply)
    );
  }

  get hasEnoughXor(): boolean {
    const accountXor = api.assets.accountAssets.find((asset) => asset.address === XOR.address);
    if (!accountXor || !accountXor.balance || !+accountXor.balance.transferable) {
      return false;
    }
    const fpAccountXor = this.getFPNumberFromCodec(accountXor.balance.transferable, accountXor.decimals);
    return FPNumber.gte(fpAccountXor, this.fee);
  }

  handleChangeTab(value: WALLET_CONSTS.TokenTabs): void {
    this.currentTab = value;
  }

  async registerAsset(): Promise<void> {
    if (this.isRegulated) {
      await api.extendedAssets.registerRegulatedAsset(
        this.tokenSymbol,
        this.tokenName.trim(),
        this.tokenSupply,
        this.extensibleSupply
      );

      this.$emit('go-to-create');
      return;
    }
    await api.assets.register(this.tokenSymbol, this.tokenName.trim(), this.tokenSupply, this.extensibleSupply);
    router.push({ name: DashboardPageNames.AssetOwner });
  }

  async onCreate(): Promise<void> {
    if (!this.tokenSymbol.length || !this.tokenSupply.length || !this.tokenName.length) {
      return;
    }

    this.tokenSupply = this.getCorrectSupply(this.tokenSupply, this.decimals);

    if (this.allowFeePopup && this.hasEnoughXor && !this.isXorSufficientForNextTx({ type: Operation.RegisterAsset })) {
      this.showFee = false;
      // TODO: show warning
      return;
    }

    await this.withNotifications(async () => {
      if (!this.hasEnoughXor) {
        throw new Error('walletSend.badAmount');
      }
      await this.registerAsset();
    });
  }

  handleBack(): void {
    this.$emit('go-back');
  }
}
</script>

<style lang="scss" scoped>
.dashboard-create {
  &-token {
    &_desc {
      padding: var(--s-basic-spacing) #{$basic-spacing-small} #{$basic-spacing-medium};
      color: var(--s-color-base-content-primary);
      font-size: var(--s-font-size-extra-small);
      line-height: var(--s-line-height-base);
      font-weight: 300;
    }
    &_supply-block {
      @include switch-block;
      padding: 0 #{$basic-spacing-small};
    }
    &_action {
      margin-top: #{$basic-spacing-medium};
      width: 100%;
    }
    &_divider {
      margin: 0 0 20px 0;
    }
  }

  &__button {
    margin-bottom: $basic-spacing;
    width: 100%;
  }
}
</style>
