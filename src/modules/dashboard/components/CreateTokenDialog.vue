<template>
  <dialog-base :title="'Сreate asset'" :visible.sync="isVisible">
    <div class="dashboard-create">
      <div v-if="currentStep === Step.CreateTokenCommon" class="dashboard-create__common">
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
        <div class="dashboard-create-token_supply-block">
          <s-switch v-model="extensibleSupply" :disabled="loading" />
          <span>{{ t('createToken.extensibleSupply.placeholder') }}</span>
        </div>
        <p class="dashboard-create-token_desc">{{ t('createToken.extensibleSupply.desc') }}</p>
        <s-divider class="dashboard-create-token_divider" />
        <span class="dashboard-create-token_type">Asset type</span>
        <s-tabs class="dashboard-create__tab" type="rounded" :value="currentTab" @input="handleChangeTab">
          <s-tab v-for="tab in TokenTabs" :key="tab" :label="getTabName(tab)" :name="tab" />
        </s-tabs>
      </div>
      <div v-else-if="currentStep === Step.CreateNftContent" class="dashboard-create__nft-content">
        <s-input
          :placeholder="t('createToken.nft.link.placeholder')"
          :minlength="1"
          :maxlength="200"
          :disabled="loading"
          v-model="tokenContentLink"
          @input="handleInputLinkChange"
        >
          <s-tooltip
            slot="suffix"
            popper-class="ipfs-tooltip"
            :content="t('createToken.nft.link.tooltip')"
            placement="bottom"
            tabindex="-1"
          >
            <s-icon class="ipfs-tooltip__icon" name="info-16" size="18px" />
          </s-tooltip>
        </s-input>
      </div>
      <div v-else-if="currentStep === Step.CreateNftDescription" class="dashboard-create__nft-desc"></div>
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

export enum Step {
  CreateTokenCommon = 'CreateTokenCommon',
  CreateNftContent = 'CreateNftContent',
  CreateNftDescription = 'CreateNftDescription',
}

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
  readonly tokenSymbolMask = 'AAAAAAA';
  readonly tokenNameMask = { mask: 'Z*', tokens: { Z: { pattern: /[0-9a-zA-Z ]/ } } };
  readonly xorSymbol = XOR.symbol;
  readonly TokenTabs = WALLET_CONSTS.TokenTabs;
  readonly Step = Step;

  currentStep: Step = Step.CreateTokenCommon;

  tokenSymbol = '';
  tokenName = '';
  extensibleSupply = false;

  @state.wallet.settings.networkFees private networkFees!: NetworkFeesObject;
  @getter.assets.xor private accountXor!: Nullable<AccountAsset>;

  currentTab = WALLET_CONSTS.TokenTabs.Token;

  private get xorBalance() {
    return this.getFPNumberFromCodec(this.accountXor?.balance?.transferable ?? ZeroStringValue);
  }

  get title(): string {
    return 'Create asset';
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

<style lang="scss">
.dashboard-create {
  @include custom-tabs;

  &__tab {
    margin: 8px 0 #{$basic-spacing-mini} 0;
  }
}
</style>

<style lang="scss" scoped>
.dashboard-create {
  &-token {
    &_desc {
      color: var(--s-color-base-content-primary);
      font-size: var(--s-font-size-extra-small);
      font-weight: 300;
      line-height: var(--s-line-height-base);
      padding: var(--s-basic-spacing) #{$basic-spacing-small} #{$basic-spacing-medium};
    }
    &_supply-block {
      @include switch-block;
      padding: 0 #{$basic-spacing-small};
    }
    &_action {
      margin-top: #{$basic-spacing-medium};
      width: 100%;
    }
    &_type {
      margin-left: 8px;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--s-color-base-content-secondary);
    }
    &_divider {
      margin: 0 0 20px 0;
    }
  }

  @include full-width-button('action-button');

  &__button {
    margin-bottom: 16px;
  }
}
</style>
