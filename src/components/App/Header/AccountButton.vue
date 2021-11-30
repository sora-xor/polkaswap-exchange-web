<template>
  <s-button type="secondary" size="big" class="btn account-control" v-bind="$attrs" v-on="$listeners">
    <div v-if="isLoggedIn" class="account-control-icon">
      <WalletAvatar :address="account.address" />
    </div>
    <div :class="['account-control-title', { name: isLoggedIn }]">{{ accountInfo }}</div>
  </s-button>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { Getter } from 'vuex-class';
import { components, WALLET_TYPES } from '@soramitsu/soraneo-wallet-web';

import TranslationMixin from '@/components/mixins/TranslationMixin';

import { formatAddress } from '@/utils';

@Component({
  components: {
    WalletAvatar: components.WalletAvatar,
  },
})
export default class AccountButton extends Mixins(TranslationMixin) {
  @Getter account!: WALLET_TYPES.Account;
  @Getter isLoggedIn!: boolean;

  get accountInfo(): string {
    if (!this.isLoggedIn) {
      return 'CONNECT WALLET';
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

  &-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--s-size-small);
    height: var(--s-size-small);
    overflow: hidden;
    border-radius: 50%;

    svg circle:first-child {
      fill: transparent;
    }
  }
}
</style>
