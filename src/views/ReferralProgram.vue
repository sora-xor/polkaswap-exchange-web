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
          :value="rewards"
          :asset-symbol="xorSymbol"
        />
        <formatted-amount
          is-fiat-value
          value-can-be-hidden
          :font-size-rate="FontSizeRate.MEDIUM"
          :value="rewards"
          is-formatted
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
        <s-collapse-item :class="invitedUsersClasses" name="invitedUsers">
          <template #title>
            <span class="invited-users-icon" />
            <h3 class="invited-users-collapse-title">
              {{ t('referralProgram.referralsNumber', { number: invitedUsersNumber }) }}
            </h3>
          </template>
          <info-line
            v-for="invitedUser in invitedUsers"
            value-can-be-hidden
            :key="invitedUser.toString()"
            :value="getInvitedUserReward(invitedUser.toString())"
            :asset-symbol="xorSymbol"
            :fiat-value="getFiatAmountByCodecString(getInvitedUserReward(invitedUser.toString()))"
            is-formatted
          >
            <template #info-line-prefix>
              <s-tooltip :content="t('account.copy')">
                <span class="info-line-address" @click="handleCopyAddress($event)">
                  {{ formatRereffalAddress(invitedUser.toString()) }}
                </span>
              </s-tooltip>
            </template>
          </info-line>
        </s-collapse-item>
      </s-collapse>
      <s-card
        v-if="referralLink.isVisible"
        class="referral-link-container"
        shadow="always"
        size="small"
        border-radius="medium"
      >
        <div class="referral-link-details">
          <div class="referral-link-label">{{ t('referralProgram.invitationLink') }}</div>
          <div class="referral-link" v-html="referralLink.label" />
        </div>
        <s-button class="s-typography-button--mini" size="small" type="primary" @click="handleCopyAddress($event)">
          {{ t('referralProgram.action.copyLink') }}
          <s-icon name="copy-16" size="16" />
        </s-button>
      </s-card>
      <p
        v-else
        class="referral-program-hint referral-program-hint--connected"
        v-html="t('referralProgram.startInviting')"
      />
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
import { KnownSymbols } from '@sora-substrate/util/build/assets/consts';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

import router, { lazyComponent, lazyView } from '@/router';
import { PageNames, Components, LogoSize } from '@/consts';
import { detectBaseUrl } from '@/api';
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
  mixins.ReferralRewardsMixin,
  WalletConnectMixin
) {
  readonly LogoSize = LogoSize;

  @Getter('tokenXOR', { namespace: 'assets' }) tokenXOR!: AccountAsset;
  @Getter('invitedUsers', { namespace }) invitedUsers!: Array<string>;

  @Action('getInvitedUsers', { namespace }) getInvitedUsers!: (referralId: string) => Promise<void>;
  @Action('setBound', { namespace }) setBound!: (isBond: boolean) => Promise<void>;

  get rewards(): string {
    return this.referralRewards?.rewards.toLocaleString() || '0';
  }

  get invitedUserRewards(): any {
    return this.referralRewards?.invitedUserRewards;
  }

  get bondedXOR(): string {
    return this.tokenXOR?.balance?.bonded || '';
  }

  get xorSymbol(): string {
    return KnownSymbols.XOR;
  }

  get invitedUsersNumber(): number {
    return this.invitedUsers.length;
  }

  get invitedUsersClasses(): Array<string> {
    const baseClass = 'invited-users-container';
    const cssClasses: Array<string> = [baseClass];
    if (!this.invitedUsersNumber) {
      cssClasses.push('is-active');
      cssClasses.push(`${baseClass}--empty`);
    }
    return cssClasses;
  }

  get referralLink(): any {
    const routerMode = router.mode === 'hash' ? '#/' : '';
    return {
      href: `${detectBaseUrl(router)}${routerMode}referral/${this.account.address}`,
      label: `<span class="referral-link-address">Polkaswap.io/</span>${routerMode}referral/${this.account.address}`,
      isVisible: +this.bondedXOR > 0,
    };
  }

  async created(): Promise<void> {
    this.withApi(async () => {
      if (this.isSoraAccountConnected) {
        await this.getInvitedUsers(this.account.address);
        await this.getAccountReferralRewards();
      }
    });
  }

  formatRereffalAddress(invitedUser: string): string {
    return this.formatAddress(invitedUser, 12);
  }

  getInvitedUserReward(invitedUser: string): string {
    if (this.invitedUserRewards[invitedUser]) {
      return this.formatCodecNumber(this.invitedUserRewards[invitedUser]?.rewards);
    }
    return this.formatCodecNumber('0');
  }

  async handleConnect(): Promise<void> {
    if (!this.isSoraAccountConnected) {
      return this.connectInternalWallet();
    }
  }

  handleBonding(isBond: boolean): void {
    this.setBound(!!isBond);
    router.push({ name: isBond ? PageNames.ReferralBonding : PageNames.ReferralUnbonding });
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
$referral-collapse-icon-size: 36px;
.referral-program {
  @include collapse-items(false);
  margin-top: $inner-spacing-mini;
  .el-collapse-item__content {
    padding-bottom: 0;
  }
  @include element-size('token-logo--medium', $referral-collapse-icon-size);
  @include element-size('invited-users-icon', $referral-collapse-icon-size);
  &-hint--connected .link {
    color: var(--s-color-theme-accent);
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
  &-icon {
    background: var(--s-color-base-content-tertiary) url('~@/assets/img/invited-users.svg') 50% 50% no-repeat;
    border-radius: 50%;
  }
}
.bonded-container {
  margin-top: $inner-spacing-medium;
  .el-collapse-item__content {
    padding-bottom: $inner-spacing-big;
  }
}
.invited-users-container {
  &--empty.is-active {
    .el-collapse-item__header {
      cursor: default;
    }
    .el-collapse-item__arrow {
      display: none;
    }
  }
  .info-line {
    &:last-child {
      margin-bottom: $inner-spacing-medium;
    }
    &-address {
      cursor: pointer;
    }
  }
}
.referral-link {
  &-container {
    .el-card__body {
      display: flex;
      align-items: center;
    }
    .el-button.neumorphic {
      border-color: var(--s-color-theme-accent);
      &:hover,
      &:focus,
      &.focusing {
        border-color: var(--s-color-theme-accent-hover);
      }
      &:active,
      &.s-pressed {
        border-color: var(--s-color-theme-accent-pressed);
      }
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
  &-hint--connected {
    padding-right: 0;
    padding-left: 0;
  }
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
  white-space: nowrap;
  &-container {
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
