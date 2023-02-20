<template>
  <s-button
    type="tertiary"
    size="medium"
    :class="['account-control', { 's-pressed': isLoggedIn }]"
    :tooltip="accountTooltip"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <div class="account-control-icon">
      <s-icon v-if="!isLoggedIn" name="finance-wallet-24" size="28" />
      <WalletAvatar v-else :address="account.address" />
    </div>
    <div :class="['account-control-title', { name: isLoggedIn }]">{{ accountInfo }}</div>
  </s-button>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { components, WALLET_TYPES } from '@soramitsu/soraneo-wallet-web';

import TranslationMixin from '@/components/mixins/TranslationMixin';

import { formatAddress } from '@/utils';
import { getter } from '@/store/decorators';

@Component({
  components: {
    WalletAvatar: components.WalletAvatar,
  },
})
export default class AppAccountButton extends Mixins(TranslationMixin) {
  @getter.wallet.account.account account!: WALLET_TYPES.PolkadotJsAccount;
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;

  get accountTooltip(): string {
    if (this.isLoggedIn) {
      return this.t('connectedAccount');
    }
    return this.t('connectWalletTextTooltip');
  }

  get accountInfo(): string {
    if (!this.isLoggedIn) {
      return this.t('connectWalletText');
    }
    return this.account.name || formatAddress(this.account.address, 8);
  }
}
</script>

<style lang="scss">
$account-control-name-max-width: 200px;

.account-control {
  &:hover,
  &:focus {
    [class^='s-icon-'] {
      color: var(--s-color-base-content-secondary);
    }
  }

  &-title {
    display: none;
    font-size: var(--s-font-size-small);
    max-width: $account-control-name-max-width;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-left: $basic-spacing-mini;
    &.name {
      text-transform: none;
    }

    @include tablet {
      display: inline-block;
    }
  }
  &.s-tertiary {
    &.el-button {
      padding-left: $basic-spacing-mini;
      padding-right: $basic-spacing-mini;
    }
  }
  &-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--s-size-small);
    height: var(--s-size-small);
    overflow: hidden;
    border-radius: 50%;

    svg circle:first-child {
      fill: var(--s-color-utility-surface);
    }
  }

  [class^='s-icon-'] {
    @include icon-styles;
  }
}
</style>
