<template>
  <div v-loading="loading" class="referral-program">
    <template v-if="isSoraAccountConnected">
      <div class="rewards-container">
        <span class="rewards-title">{{ t('referralProgram.receivedRewards') }}</span>
        <token-logo :token="xor" :size="LogoSize.BIG" />
        <formatted-amount
          class="rewards-value"
          value-can-be-hidden
          :font-size-rate="FontSizeRate.SMALL"
          symbol-as-decimal
          :value="formattedRewards"
          :asset-symbol="xorSymbol"
        />
        <formatted-amount
          v-if="isPriceAvailable"
          is-fiat-value
          value-can-be-hidden
          :font-size-rate="FontSizeRate.MEDIUM"
          :value="formattedRewards"
          is-formatted
        />
      </div>
      <s-card
        v-if="hasAccountWithBondedXor"
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
      <s-collapse :borders="true">
        <s-collapse-item :class="bondedContainerClasses" :disabled="!hasAccountWithBondedXor" name="bondedXOR">
          <template v-if="hasAccountWithBondedXor" #title>
            <token-logo class="token-logo" :token="xor" />
            <h3 class="bonded-collapse-title">{{ t('referralProgram.bondedXOR') }}</h3>
          </template>
          <div v-if="!hasAccountWithBondedXor" class="unbonded-info">
            <token-logo class="token-logo" :token="xor" />
            <p
              class="referral-program-hint referral-program-hint--connected"
              v-html="t('referralProgram.startInviting')"
            />
          </div>
          <info-line
            is-formatted
            value-can-be-hidden
            :label="t('referralProgram.bondedXOR')"
            :value="formatCodecNumber(bondedXorCodecBalance)"
            :fiat-value="getFiatAmountByCodecString(bondedXorCodecBalance)"
          />
          <div class="bonded--buttons">
            <s-button :type="bondButtonType" class="s-typography-button--medium" @click="handleBonding(true)">
              {{ t('referralProgram.action.bondMore') }}
            </s-button>
            <s-button
              v-if="hasAccountWithBondedXor"
              type="secondary"
              class="s-typography-button--medium"
              @click="handleBonding()"
            >
              {{ t('referralProgram.action.unbond') }}
            </s-button>
          </div>
        </s-collapse-item>
        <s-collapse-item v-if="invitedUsersCount" class="invited-users-container" name="invitedUsers">
          <template #title>
            <span class="invited-users-icon" />
            <h3 class="invited-users-collapse-title">
              {{ t('referralProgram.referralsNumber', { number: invitedUsersCount }) }}
            </h3>
          </template>
          <template v-if="invitedUsersCount">
            <div :class="invitedUsersClasses">
              <info-line
                v-for="invitedUser in filteredInvitedUsers"
                value-can-be-hidden
                :key="invitedUser"
                :value="getInvitedUserReward(invitedUser)"
                :asset-symbol="xorSymbol"
                :fiat-value="getFiatAmountByCodecString(getInvitedUserReward(invitedUser))"
                is-formatted
              >
                <template #info-line-prefix>
                  <s-tooltip :content="t('account.copy')">
                    <span class="info-line-address" @click="handleCopyAddress($event)">
                      {{ formatReferralAddress(invitedUser) }}
                    </span>
                  </s-tooltip>
                </template>
              </info-line>
            </div>
            <s-pagination
              v-if="hasMultipleInvitedUsersPages"
              layout="total, prev, next"
              :current-page.sync="currentPage"
              :page-size="pageAmount"
              :total="invitedUsersCount"
              @prev-click="handlePrevClick"
              @next-click="handleNextClick"
            />
          </template>
        </s-collapse-item>
        <s-collapse-item class="referrer-link-container" name="referrer">
          <template #title>
            <WalletAvatar v-if="referrer" class="referrer-icon" :size="36" :address="referrer" />
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
                :placeholder="t(`referralProgram.referrer.${isReferrerLinkEmpty ? 'placeholder' : 'label'}`)"
                v-model="referrerLinkOrCode"
              >
                <template #right>
                  <s-button
                    v-if="!isReferrerLinkEmpty"
                    class="s-typography-button--mini s-button--approve"
                    size="small"
                    type="primary"
                    :disabled="!isValidReferrerLink || isReferrerApproved"
                    @click.stop="handleSetReferrer"
                  >
                    {{ t(`referralProgram.referrer.${isReferrerApproved ? 'approved' : 'approve'}`) }}
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
import last from 'lodash/fp/last';
import { Component, Mixins, Watch } from 'vue-property-decorator';
import { components, mixins, api, WALLET_TYPES } from '@soramitsu/soraneo-wallet-web';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import type { CodecString, FPNumber } from '@sora-substrate/util';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

import router, { lazyComponent, lazyView } from '@/router';
import { PageNames, Components, LogoSize, ZeroStringValue } from '@/consts';
import { detectBaseUrl } from '@/api';
import { copyToClipboard, formatAddress } from '@/utils';

import WalletConnectMixin from '@/components/mixins/WalletConnectMixin';
import { action, getter, mutation, state } from '@/store/decorators';

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
  mixins.FormattedAmountMixin,
  mixins.ReferralRewardsMixin,
  mixins.PaginationSearchMixin,
  WalletConnectMixin
) {
  readonly LogoSize = LogoSize;

  referrerLinkOrCode = '';
  referrerHasApproved = false;
  pageAmount = 5; // override PaginationSearchMixin

  @state.referrals.invitedUsers invitedUsers!: Array<string>;
  @state.referrals.referrer referrer!: string;
  @state.referrals.isReferrerApproved isReferrerApproved!: boolean;
  @getter.assets.xor xor!: Nullable<AccountAsset>;
  @getter.wallet.account.account private account!: WALLET_TYPES.Account;

  @mutation.referrals.reset private reset!: VoidFunction;
  @mutation.referrals.unsubscribeFromInvitedUsers private unsubscribeFromInvitedUsers!: VoidFunction;
  @mutation.referrals.setStorageReferrer private setStorageReferrer!: (value: string) => void;
  @action.referrals.subscribeOnInvitedUsers private subscribeOnInvitedUsers!: AsyncVoidFn;
  @action.referrals.getReferrer private getReferrer!: AsyncVoidFn;

  @Watch('isSoraAccountConnected')
  private async updateSubscriptions(value: boolean): Promise<void> {
    if (value) {
      if (this.isSoraAccountConnected) {
        await this.subscribeOnInvitedUsers();
        await this.getAccountReferralRewards();
        await this.getReferrer();
      }
    } else {
      this.unsubscribeFromInvitedUsers();
    }
  }

  get isPriceAvailable(): boolean {
    return !!this.getAssetFiatPrice(XOR);
  }

  get xorSymbol(): string {
    return XOR.symbol;
  }

  get formattedRewards(): string {
    return this.referralRewards?.rewards.toLocaleString() || ZeroStringValue;
  }

  get invitedUserRewards(): Record<string, { rewards: FPNumber }> {
    return this.referralRewards?.invitedUserRewards;
  }

  get bondedXorCodecBalance(): CodecString {
    return this.xor?.balance?.bonded ?? '';
  }

  get invitedUsersCount(): number {
    return this.invitedUsers.length;
  }

  get invitedUsersClasses(): Array<string> {
    const baseClass = 'invited-users-list';
    const cssClasses: Array<string> = [baseClass];

    if (this.hasMultipleInvitedUsersPages) {
      cssClasses.push(`${baseClass}--multiple-pages`);
    }

    return cssClasses;
  }

  get routerMode(): string {
    return router.mode === 'hash' ? '#/' : '';
  }

  get linkHrefBase(): string {
    return `${detectBaseUrl(router)}${this.routerMode}referral/`;
  }

  get referralLink() {
    return {
      href: `${this.linkHrefBase}${this.account.address}`,
      label: this.getLinkLabel(this.account.address),
    };
  }

  get hasAccountWithBondedXor(): boolean {
    return this.account && +this.bondedXorCodecBalance > 0;
  }

  get bondedContainerClasses(): Array<string> {
    const baseClass = 'bonded-container';
    const cssClasses: Array<string> = [baseClass];

    if (!this.hasAccountWithBondedXor) {
      cssClasses.push('is-active');
      cssClasses.push(`${baseClass}--visible-content`);
    }

    return cssClasses;
  }

  get isReferrerLinkEmpty(): boolean {
    return !this.referrerLinkOrCode.trim();
  }

  get referrerFormatted(): string {
    return this.referrer ? formatAddress(this.referrer, 8) : '';
  }

  get referrerAddress(): string {
    if (this.referrer) return this.referrer;

    return last(this.referrerLinkOrCode.split('/')) as string;
  }

  get isValidReferrerLink(): boolean {
    if (this.isReferrerLinkEmpty) {
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

  get filteredInvitedUsers(): Array<string> {
    return this.getPageItems(this.invitedUsers);
  }

  get hasMultipleInvitedUsersPages(): boolean {
    return this.invitedUsers.length > this.pageAmount;
  }

  get referrerLink() {
    return {
      href: `${this.linkHrefBase}${this.referrerAddress}`,
      label: this.getLinkLabel(this.referrerAddress),
    };
  }

  get bondButtonType(): string {
    return this.hasAccountWithBondedXor ? 'secondary' : 'primary';
  }

  destroyed(): void {
    this.reset();
  }

  async created(): Promise<void> {
    this.withApi(async () => {
      if (this.isSoraAccountConnected) {
        await this.subscribeOnInvitedUsers();
        await this.getAccountReferralRewards();
        await this.getReferrer();
      }
    });
  }

  formatReferralAddress(invitedUser: string): string {
    return this.formatAddress(invitedUser, 12);
  }

  getLinkLabel(address: string): string {
    return `<span class="referral-link-address">Polkaswap.io/</span>${this.routerMode}referral/${address}`;
  }

  getInvitedUserReward(invitedUser: string): string {
    const rewards = this.invitedUserRewards[invitedUser]?.rewards;
    if (typeof invitedUser === 'string' && rewards) {
      return this.formatCodecNumber(rewards.toCodecString());
    }
    return ZeroStringValue;
  }

  handleConnect(): void {
    if (!this.isSoraAccountConnected) {
      this.connectInternalWallet();
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

  handleSetReferrer(): void {
    this.setStorageReferrer(this.referrerAddress);
  }
}
</script>

<style lang="scss">
$referral-collapse-icon-size: 36px;
.referral-program {
  @include collapse-items(false, true);
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
  .invited-users-container {
    .el-collapse-item__content {
      padding: 0 0 $inner-spacing-mini;
    }
    .el-pagination {
      display: flex;
      justify-content: space-between;
      padding: #{$inner-spacing-mini / 2} $inner-spacing-medium 0;
      &__total {
        margin-right: auto;
        padding-left: 0;
        padding-right: 0;
        font-size: var(--s-font-size-extra-small);
        color: var(--s-color-base-content-secondary);
        font-weight: 800;
      }
      .btn-prev,
      .btn-next,
      .el-icon-arrow-right,
      .el-icon-arrow-left {
        width: var(--s-icon-font-size-medium);
        height: var(--s-icon-font-size-medium);
      }
      .btn-prev,
      .btn-next {
        color: var(--s-color-base-content-tertiary);
        padding: 0;
        min-width: var(--s-icon-font-size-medium);
        &:disabled {
          opacity: 0.4;
        }
      }
      .btn-next {
        padding-left: 0;
        padding-right: 0;
      }
      .el-icon {
        font-size: var(--s-icon-font-size-mini);
        line-height: var(--s-icon-font-size-medium);
        font-weight: 600;
        &-arrow-right,
        &-arrow-left {
          background-color: transparent;
          box-shadow: none;
        }
      }
    }
    &--empty {
      .el-collapse-item__content {
        padding-bottom: 0;
      }
    }
  }
  @include element-size('token-logo--medium', $referral-collapse-icon-size);
  @include element-size('invited-users-icon', $referral-collapse-icon-size);
  @include element-size('referrer-icon', $referral-collapse-icon-size);
  &-hint--connected .link {
    color: var(--s-color-theme-accent);
  }
}
.bonded,
.invited-users,
.referrer {
  &-collapse-title {
    &:not(:first-child) {
      padding-left: $inner-spacing-medium;
    }
    font-size: var(--s-font-size-large);
    line-height: var(--s-line-height-reset);
    letter-spacing: var(--s-letter-spacing-small);
    font-weight: 700;
  }
}
.bonded,
.invited-users {
  &-list {
    padding-right: $inner-spacing-medium;
    padding-left: $inner-spacing-medium;
  }
  &-icon {
    background: var(--s-color-base-content-tertiary) url('~@/assets/img/invited-users.svg') 50% 50% no-repeat;
    border-radius: 50%;
  }
}
.bonded-container {
  &--visible-content {
    .el-collapse-item__header {
      display: none;
    }
    .el-collapse-item__wrap {
      display: block !important;
    }
  }
  .el-collapse-item__content {
    padding-bottom: $inner-spacing-big;
  }
}
.invited-users {
  &-container {
    .info-line {
      &:last-child {
        margin-bottom: $inner-spacing-medium;
      }
      &-address {
        cursor: pointer;
      }
    }
  }
  &-list--multiple-pages {
    min-height: 165px;
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

.referrer {
  &-icon svg circle:first-child {
    fill: var(--s-color-utility-surface);
  }
  &-link-container {
    .el-input__inner {
      font-size: var(--s-font-size-medium);
    }
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

.rewards-container,
.unbonded-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  text-align: center;
}
.rewards {
  &-container {
    margin-bottom: $inner-spacing-medium;
    @include element-size('token-logo', 48px);
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
    margin-bottom: $inner-spacing-mini;
    color: var(--s-color-base-content-secondary);
    font-weight: 400;
    line-height: var(--s-line-height-medium);
    text-transform: uppercase;
  }
  &-value {
    font-size: var(--s-font-size-large);
    line-height: var(--s-line-height-extra-small);
    letter-spacing: var(--s-letter-spacing-small);
    font-weight: 800;
  }
}

.bonded {
  &--buttons {
    .el-button {
      margin-top: $inner-spacing-medium;
      &.s-secondary {
        width: calc(50% - #{$inner-spacing-small / 2});
      }
      &.s-primary {
        width: 100%;
      }
    }
  }
}

.unbonded-info {
  .token-logo {
    margin-bottom: $inner-spacing-medium;
    margin-top: $inner-spacing-medium;
    height: var(--s-heading1-font-size);
    width: var(--s-heading1-font-size);
  }
  .referral-program-hint {
    font-size: var(--s-heading3-font-size);
    font-weight: 700;
  }
}

.referral-link-container.s-card.neumorphic,
.referrer-link-container .s-card.neumorphic {
  padding: #{$inner-spacing-mini * 0.75} $inner-spacing-medium;
}

.referral,
.referrer {
  &-link {
    display: block;
    width: 100%;
    font-size: var(--s-font-size-medium);
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
    &,
    &-label {
      line-height: var(--s-line-height-medium);
      letter-spacing: var(--s-letter-spacing-small);
    }
    &-label {
      color: var(--s-color-base-content-secondary);
      font-size: var(--s-font-size-mini);
      text-align: left;
    }
  }
}

.referrer {
  &-link {
    &-container {
      margin-top: $inner-spacing-medium;
      h5 {
        letter-spacing: var(--s-letter-spacing-small);
        + .referrer-description {
          margin-top: $inner-spacing-small;
        }
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
