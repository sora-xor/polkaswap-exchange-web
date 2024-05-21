<template>
  <dialog-base :title="t('createToken.titleCommon')" :visible.sync="isVisible" tooltip="COMING SOON...">
    <div class="dashboard-create">
      <s-tabs class="token__tab" type="rounded" :value="currentTab" @input="handleChangeTab">
        <s-tab v-for="tab in TokenTabs" :key="tab" :label="getTabName(tab)" :name="tab" />
      </s-tabs>
      <component :is="currentTab" />
      <s-button
        type="primary"
        class="s-typography-button--large action-button dashboard-create__button"
        :disabled="disabled"
        @click="handleCreate"
      >
        <template v-if="isInsufficientXorForFee">
          {{ t('insufficientBalanceText', { tokenSymbol: xorSymbol }) }}
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
import { Operation } from '@sora-substrate/util';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import { mixins, components, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import { Components, ZeroStringValue } from '@/consts';
import { DashboardComponents } from '@/modules/dashboard/consts';
import { dashboardLazyComponent } from '@/modules/dashboard/router';
import { getter, state } from '@/store/decorators';

import type { CodecString, NetworkFeesObject } from '@sora-substrate/util';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

@Component({
  components: {
    DialogBase: components.DialogBase,
    InfoLine: components.InfoLine,
    CreateSimpleToken: dashboardLazyComponent(DashboardComponents.CreateSimpleToken),
    CreateNftToken: dashboardLazyComponent(DashboardComponents.CreateNftToken),
  },
})
export default class BurnDialog extends Mixins(
  mixins.TransactionMixin,
  mixins.DialogMixin,
  mixins.FormattedAmountMixin
) {
  readonly xorSymbol = XOR.symbol;
  readonly TokenTabs = WALLET_CONSTS.TokenTabs;

  @state.wallet.settings.networkFees private networkFees!: NetworkFeesObject;
  @getter.assets.xor private accountXor!: Nullable<AccountAsset>;

  currentTab = WALLET_CONSTS.TokenTabs.Token;

  private get xorBalance() {
    return this.getFPNumberFromCodec(this.accountXor?.balance?.transferable ?? ZeroStringValue);
  }

  get title(): string {
    return 'Create token';
  }

  get networkFee(): CodecString {
    return this.networkFees[Operation.RegisterAsset];
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

  get disabled(): boolean {
    return this.loading || this.isInsufficientXorForFee;
  }

  getTabName(tab: WALLET_CONSTS.TokenTabs): string {
    if (tab === WALLET_CONSTS.TokenTabs.NonFungibleToken) {
      return this.TranslationConsts.NFT;
    }
    return this.t(`createToken.${tab}`);
  }

  handleChangeTab(value: WALLET_CONSTS.TokenTabs): void {
    this.currentTab = value;
  }

  handleCreate(): void {}
}
</script>

<style lang="scss" scoped>
.dashboard-create {
  @include full-width-button('action-button');

  &__button {
    margin-bottom: 16px;
  }
}
</style>
