<template>
  <div v-loading="parentLoading" class="referral-program">
    <template v-if="isSoraAccountConnected">
      <div class="rewards-container">
        <span class="rewards-title">{{ t('referralProgram.receivedRewards') }}</span>
        <token-logo class="token-logo" :token="tokenXOR" :size="LogoSize.BIG" />
        <formatted-amount
          class="rewards-value"
          value-can-be-hidden
          :font-size-rate="FontSizeRate.MEDIUM"
          symbol-as-decimal
          :value="'12345.6789'"
          :asset-symbol="tokenXOR.symbol"
        />
        <formatted-amount
          is-fiat-value
          value-can-be-hidden
          :font-size-rate="FontSizeRate.MEDIUM"
          :value="'12345.6789'"
        />
      </div>
      <s-collapse :borders="true">
        <s-collapse-item class="bonded-container" name="bondedXOR">
          <template #title>
            <token-logo class="token-logo" :token="tokenXOR" />
            <h3 class="bonded-collapse-title">{{ t('referralProgram.bondedXOR') }}</h3>
          </template>
          <info-line
            v-if="bondedXOR"
            is-formatted
            value-can-be-hidden
            :label="t('referralProgram.bondedXOR')"
            :value="formatCodecNumber(bondedXOR)"
            :fiat-value="getFiatAmountByCodecString(bondedXOR)"
          />
          <div class="bonded--buttons">
            <s-button type="secondary" class="s-typography-button--medium" @click="handleBonding(true)">
              {{ t('referralProgram.action.bondMore') }}
            </s-button>
            <s-button type="secondary" class="s-typography-button--medium" @click="handleBonding()">
              {{ t('referralProgram.action.unbond') }}
            </s-button>
          </div>
        </s-collapse-item>
        <s-collapse-item class="invited-users-container" name="invitedUsers">
          <template #title>
            <!-- TODO: Change icon -->
            <token-logo class="token-logo" :token="tokenXOR" />
            <h3 class="invited-users-collapse-title">
              {{ t('referralProgram.referralsNumber', { number: invitedUsersNumber }) }}
            </h3>
          </template>
          <info-line v-for="invitedUser in invitedUsers" :key="invitedUser" :label="invitedUser.toString()" />
        </s-collapse-item>
      </s-collapse>
      <s-card shadow="always" size="small" border-radius="medium" class="referral-link-container">
        <div class="referral-link-details">
          <div class="referral-link-label">{{ t('referralProgram.invitationLink') }}</div>
          <div class="referral-link" v-html="referralLink.label" />
        </div>
        <s-button class="s-typography-button--mini" size="small" type="primary" @click="handleCopyAddress($event)">
          {{ t('referralProgram.action.copyLink') }}
          <s-icon name="copy-16" size="16" />
        </s-button>
      </s-card>
    </template>
    <template v-else>
      <p class="referral-program-hint" v-html="t('referralProgram.connectAccount')" />
      <s-button
        v-if="!(loading || isSoraAccountConnected)"
        class="connect-button s-typography-button--large"
        type="primary"
        @click="handleConnect"
      >
        {{ t('referralProgram.action.connectWallet') }}
      </s-button>
    </template>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { Action, Getter } from 'vuex-class';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { AccountAsset } from '@sora-substrate/util';

import router, { lazyComponent, lazyView } from '@/router';
import { PageNames, Components, LogoSize } from '@/consts';
import { copyToClipboard } from '@/utils';

import WalletConnectMixin from '@/components/mixins/WalletConnectMixin';

const namespace = 'referrals';

@Component({
  components: {
    FormattedAmount: components.FormattedAmount,
    InfoLine: components.InfoLine,
    TokenLogo: lazyComponent(Components.TokenLogo),
    ReferralBonding: lazyView(PageNames.ReferralBonding),
  },
})
export default class ReferralProgram extends Mixins(
  mixins.LoadingMixin,
  mixins.TransactionMixin,
  mixins.FormattedAmountMixin,
  WalletConnectMixin
) {
  readonly LogoSize = LogoSize;

  @Getter('tokenXOR', { namespace: 'assets' }) tokenXOR!: AccountAsset;
  @Getter('referral', { namespace }) referral!: string;
  @Getter('invitedUsers', { namespace }) invitedUsers!: Array<string>;

  @Action('getReferral', { namespace }) getReferral!: (invitedUserId: string) => Promise<void>;
  @Action('getInvitedUsers', { namespace }) getInvitedUsers!: (referralId: string) => Promise<void>;
  @Action('setBound', { namespace }) setBound!: (isBond: boolean) => Promise<void>;

  get bondedXOR(): string {
    return this.tokenXOR?.balance?.bonded || '';
  }

  get invitedUsersNumber(): number {
    return this.invitedUsers.length;
  }

  get referralLink(): any {
    const polkaswapLink = 'Polkaswap.io';
    return {
      href: `https://${polkaswapLink.toLowerCase()}/${this.account.address}`,
      label: `<span class="referral-link-address">${polkaswapLink}/</span>${this.account.address}`,
    };
  }

  created() {
    this.withApi(async () => {
      if (this.isSoraAccountConnected) {
        await this.getReferral('cnWRhrPhqeZBaR7LgWPMQLytum7AngL5TL9VPscmy2SRT2Ktv');
        await this.getInvitedUsers(this.account.address);
      }
    });
  }

  async handleConnect(): Promise<void> {
    if (!this.isSoraAccountConnected) {
      return this.connectInternalWallet();
    }
  }

  handleBonding(isBond: boolean): void {
    this.setBound(!!isBond);
    router.push({ name: PageNames.ReferralBonding });
  }

  async handleCopyAddress(event: Event): Promise<void> {
    event.stopImmediatePropagation();
    try {
      await copyToClipboard(this.referralLink.href);
      this.$notify({
        message: this.t('referralProgram.successCopy'),
        type: 'success',
        title: '',
      });
    } catch (error) {
      this.$notify({
        message: `${this.t('warningText')} ${error}`,
        type: 'warning',
        title: '',
      });
    }
  }
}
</script>

<style lang="scss">
.referral-program {
  @include collapse-items;
  margin-top: $inner-spacing-mini;
  .el-collapse-item__content {
    padding-bottom: 0;
  }
}
.bonded,
.invited-users {
  &-collapse-title {
    padding-left: $inner-spacing-medium;
    font-size: var(--s-font-size-large);
    line-height: var(--s-line-height-reset);
    letter-spacing: var(--s-letter-spacing-small);
    font-weight: 700;
  }
}
.bonded-container {
  margin-top: $inner-spacing-medium;
  .el-collapse-item__content {
    padding-bottom: $inner-spacing-big;
  }
}
.invited-users-container {
  .info-line {
    &:last-child {
      margin-bottom: $inner-spacing-medium;
    }
    &-label {
      margin-right: 0 !important;
      width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
}
.referral-link {
  &-container {
    .el-card__body {
      display: flex;
      align-items: center;
    }
    .s-icon-copy-16 {
      margin-left: calc(#{$inner-spacing-small} / 2);
    }
  }
  &-address {
    color: var(--s-color-base-content-primary);
  }
}
</style>

<style lang="scss" scoped>
.referral-program {
  @include buttons;
  @include full-width-button('connect-button');
  @include rewards-hint(46px, true);
}

.rewards {
  &-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    text-align: center;
    .token-logo,
    .rewards-value {
      margin-top: $inner-spacing-small;
    }
    .formatted-amount--fiat-value {
      font-size: var(--s-font-size-medium);
      line-height: var(--s-line-height-medium);
      letter-spacing: var(--s-letter-spacing-small);
      font-weight: 600;
    }
  }
  &-title {
    color: var(--s-color-base-content-secondary);
    font-weight: 400;
    text-transform: uppercase;
  }
  &-value {
    font-size: var(--s-font-size-large);
    line-height: var(--s-line-height-reset);
    letter-spacing: var(--s-letter-spacing-small);
    font-weight: 800;
  }
}

.bonded {
  &--buttons {
    .el-button {
      margin-top: $inner-spacing-medium;
      width: calc(50% - #{$inner-spacing-small / 2});
    }
  }
}

.referral-link {
  display: block;
  width: 100%;
  text-overflow: ellipsis;
  overflow: hidden;
  font-size: var(--s-font-size-medium);
  line-height: var(--s-line-height-medium);
  &-container {
    margin-top: $inner-spacing-medium;
    text-overflow: ellipsis;
  }
  &-details {
    display: flex;
    flex-direction: column;
    margin-right: $inner-spacing-mini;
    overflow: hidden;
    color: var(--s-color-theme-accent);
  }
  &-label {
    color: var(--s-color-base-content-secondary);
    font-size: var(--s-font-size-mini);
    line-height: var(--s-line-height-medium);
  }
}
</style>
