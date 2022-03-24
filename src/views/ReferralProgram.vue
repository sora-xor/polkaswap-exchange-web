<template>
  <div v-loading="loading" class="referral-program">
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
          v-if="xorTokenPrice"
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
        <s-collapse-item v-if="hasInvitedUsers" class="invited-users-container" name="invitedUsers">
          <template #title>
            <span class="invited-users-icon" />
            <h3 class="invited-users-collapse-title">
              {{ t('referralProgram.referralsNumber', { number: invitedUsersNumber }) }}
            </h3>
          </template>
          <s-scrollbar v-if="invitedUsers && invitedUsers.length" class="invited-users-scrollbar">
            <div class="invited-users-list">
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
            </div>
          </s-scrollbar>
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
      <s-collapse :borders="true">
        <s-collapse-item class="referrer-link-container" name="referrer">
          <template #title>
            <WalletAvatar v-if="referrer" class="referrer-icon" :address="referrer" />
            <h3 class="referrer-collapse-title">
              {{ t(`referralProgram.referrer.${referrer ? 'titleReferrer' : 'title'}`) }}
            </h3>
          </template>
          <template v-if="referrer">
            <h5>{{ t('referralProgram.referrer.referredBy', { referrer: referrerFormatted }) }}</h5>
            <p class="referrer-description" v-html="t('referralProgram.referrer.info')" />
          </template>
          <template v-else>
            <div class="referrer-link-details">
              <s-input
                class="referrer-link-code"
                :placeholder="t(`referralProgram.referrer.${emptyReferrerLink ? 'placeholder' : 'label'}`)"
                v-model="referrerLinkOrCode"
              >
                <template #right>
                  <s-button
                    v-if="!emptyReferrerLink"
                    class="s-typography-button--mini s-button--approve"
                    size="small"
                    type="primary"
                    :disabled="!isValidReferrerLink"
                    @click="handleSetReferrer($event)"
                  >
                    {{ t('referralProgram.referrer.approve') }}
                  </s-button>
                </template>
              </s-input>
            </div>
            <p class="referrer-description" v-html="t('referralProgram.referrer.description')" />
          </template>
          <s-card v-if="referrer" shadow="always" size="small" border-radius="medium">
            <div class="referrer-link-details">
              <div class="referral-link-label">{{ t('referralProgram.referrer.referredLablel') }}</div>
              <div class="referral-link" v-html="referrerLink.label" />
            </div>
          </s-card>
        </s-collapse-item>
      </s-collapse>
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
import { Component, Mixins, Watch } from 'vue-property-decorator';
import { Action, Getter } from 'vuex-class';
import { components, mixins, api } from '@soramitsu/soraneo-wallet-web';
import type { CodecString } from '@sora-substrate/util';
import { KnownSymbols } from '@sora-substrate/util/build/assets/consts';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

import router, { lazyComponent, lazyView } from '@/router';
import { PageNames, Components, LogoSize } from '@/consts';
import { detectBaseUrl } from '@/api';
import { copyToClipboard, formatAddress } from '@/utils';

import WalletConnectMixin from '@/components/mixins/WalletConnectMixin';

const namespace = 'referrals';

@Component({
  components: {
    FormattedAmount: components.FormattedAmount,
    InfoLine: components.InfoLine,
    TokenLogo: lazyComponent(Components.TokenLogo),
    ReferralBonding: lazyView(PageNames.ReferralBonding),
    WalletAvatar: components.WalletAvatar,
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
  referrerLinkOrCode = '';

  @Getter('tokenXOR', { namespace: 'assets' }) tokenXOR!: AccountAsset;
  @Getter('invitedUsers', { namespace }) invitedUsers!: Nullable<Array<string>>;
  @Getter('referrer', { namespace }) referrer!: string;

  @Action('resetInvitedUsersSubscription', { namespace }) resetInvitedUsersSubscription!: AsyncVoidFn;
  @Action('subscribeInvitedUsers', { namespace }) subscribeInvitedUsers!: (referrerId: string) => AsyncVoidFn;
  @Action('unsubscribeInvitedUsers', { namespace }) unsubscribeInvitedUsers!: AsyncVoidFn;
  @Action('getReferrer', { namespace }) getReferrer!: (invitedUserId: string) => Promise<void>;
  @Action('setReferrer', { namespace }) setReferrer!: (value: string) => Promise<void>;

  @Watch('isSoraAccountConnected')
  private async updateSubscriptions(value: boolean) {
    if (value) {
      await this.subscribeInvitedUsers(this.account?.address);
    } else {
      await this.unsubscribeInvitedUsers();
    }
  }

  get rewards(): string {
    return this.referralRewards?.rewards.toLocaleString() || '0';
  }

  get xorTokenPrice(): Nullable<CodecString> {
    return this.tokenXOR ? this.getAssetFiatPrice(this.tokenXOR) : null;
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

  get hasInvitedUsers(): boolean {
    return !!(this.invitedUsers && this.invitedUsers.length);
  }

  get invitedUsersNumber(): number {
    return this.invitedUsers ? this.invitedUsers.length : 0;
  }

  get routerMode(): string {
    return router.mode === 'hash' ? '#/' : '';
  }

  get linkHrefBase(): string {
    return `${detectBaseUrl(router)}${this.routerMode}referral/`;
  }

  get referralLink(): any {
    return {
      href: `${this.linkHrefBase}${this.account?.address}`,
      label: this.getLinkLabel(this.account?.address),
      isVisible: this.account && +this.bondedXOR > 0,
    };
  }

  get emptyReferrerLink(): boolean {
    if (!this.referrerLinkOrCode.trim()) {
      return true;
    }
    return false;
  }

  get referrerFormatted(): string {
    return this.referrer ? formatAddress(this.referrer, 8) : '';
  }

  get referrerAddress(): string {
    return this.referrer ? this.referrer : this.referrerLinkOrCode.substr(-49);
  }

  get isValidReferrerLink(): boolean {
    if (this.emptyReferrerLink) {
      return false;
    }
    if (!api.validateAddress(this.referrerAddress) || this.referrerAddress === this.account?.address) {
      return false;
    }
    if (this.referrerLinkOrCode === this.referrerAddress) {
      return true;
    }
    return this.referrerLinkOrCode === this.referrerLink.href;
  }

  get referrerLink(): any {
    return {
      href: `${this.linkHrefBase}${this.referrerAddress}`,
      label: this.getLinkLabel(this.referrerAddress),
    };
  }

  destroyed(): void {
    this.resetInvitedUsersSubscription();
  }

  async created(): Promise<void> {
    this.withApi(async () => {
      if (this.isSoraAccountConnected) {
        await this.subscribeInvitedUsers(this.account.address);
        await this.getAccountReferralRewards();
        await this.getReferrer(this.account.address);
      }
    });
  }

  formatRereffalAddress(invitedUser: string): string {
    return this.formatAddress(invitedUser, 12);
  }

  getLinkLabel(address: string): string {
    return `<span class="referral-link-address">Polkaswap.io/</span>${this.routerMode}referral/${address}`;
  }

  getInvitedUserReward(invitedUser: string): string {
    if (typeof invitedUser === 'string' && this.invitedUserRewards[invitedUser]?.rewards) {
      return this.formatCodecNumber(this.invitedUserRewards[invitedUser].rewards.toCodecString());
    }
    return this.formatCodecNumber('0');
  }

  async handleConnect(): Promise<void> {
    if (!this.isSoraAccountConnected) {
      return this.connectInternalWallet();
    }
  }

  handleBonding(isBond = false): void {
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

  async handleSetReferrer(event: Event): Promise<void> {
    event.stopImmediatePropagation();
    this.setReferrer(this.referrerAddress);
  }
}
</script>

<style lang="scss">
$referral-collapse-icon-size: 36px;
.referral-program {
  @include collapse-items(false);
  margin-top: $inner-spacing-mini;
  &.el-loading-parent--relative {
    .el-collapse-item,
    .el-collapse-item__header {
      box-shadow: none;
    }
  }
  .el-loading-mask {
    margin-right: auto;
    margin-left: auto;
    width: calc(100% - #{$inner-spacing-big} * 2);
  }
  .invited-users-container .el-collapse-item__content {
    padding: 0 0 $inner-spacing-mini;
  }
  @include element-size('token-logo--medium', $referral-collapse-icon-size);
  @include element-size('invited-users-icon', $referral-collapse-icon-size);
  &-hint--connected .link {
    color: var(--s-color-theme-accent);
  }
}
.bonded,
.invited-users,
.referrer {
  &-scrollbar {
    @include scrollbar;
  }
  &-list {
    max-height: 165px;
    padding-right: $inner-spacing-medium;
    padding-left: $inner-spacing-medium;
  }
  &-collapse-title {
    &:not(:first-child) {
      padding-left: $inner-spacing-medium;
    }
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
  .info-line {
    &:last-child {
      margin-bottom: $inner-spacing-medium;
    }
    &-address {
      cursor: pointer;
    }
  }
}
.referral,
.referrer {
  &-link {
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
}

.referral-link,
.referrer-link-container .el-input__inner {
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.referrer-link-container {
  .el-input__inner {
    font-size: var(--s-font-size-medium);
  }
}
</style>

<style lang="scss" scoped>
.referral-program {
  @include buttons;
  @include full-width-button('connect-button');
  @include rewards-hint(46px, true);
  &-hint {
    margin-bottom: $inner-spacing-small;
    &--connected {
      padding-right: 0;
      padding-left: 0;
    }
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

.referral,
.referrer {
  &-link {
    display: block;
    width: 100%;
    font-size: var(--s-font-size-medium);
    line-height: var(--s-line-height-medium);
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
      text-align: left;
    }
  }
}

.referrer {
  &-icon {
    height: var(--s-size-small);
  }
  &-link {
    &-container {
      margin-top: $inner-spacing-medium;
      &.el-collapse-item {
        margin-bottom: 0;
      }
      h5 + .referrer-description {
        margin-top: $inner-spacing-small;
      }
      .s-card {
        margin-top: $inner-spacing-medium;
      }
    }
    &-details {
      .s-button--approve {
        margin-left: $inner-spacing-mini;
        &.is-disabled {
          &,
          &:hover {
            background-color: var(--s-color-base-disabled);
            border-color: var(--s-color-base-disabled);
            box-shadow: $button-custom-shadow;
            color: var(--s-color-brand-day);
          }
        }
      }
    }
  }
  &-description {
    margin-top: $inner-spacing-medium;
    line-height: var(--s-line-height-medium);
    letter-spacing: var(--s-letter-spacing-small);
  }
}
</style>
