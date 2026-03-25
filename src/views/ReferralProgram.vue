<template>
  <div v-loading="loading" class="referral-program">
    <template v-if="isLoggedIn">
      <div class="rewards-container">
        <span class="rewards-title">{{ t('referralProgram.receivedRewards') }}</span>
        <token-logo :token="xor" :size="LogoSize.BIGGER"></token-logo>
        <formatted-amount
          class="rewards-value"
          value-can-be-hidden
          :font-size-rate="FontSizeRate.SMALL"
          symbol-as-decimal
          :value="formattedRewards"
          :asset-symbol="xorSymbol"
        ></formatted-amount>
        <formatted-amount
          v-if="formattedRewardsFiatValue"
          is-fiat-value
          fiat-default-rounding
          value-can-be-hidden
          :font-size-rate="FontSizeRate.MEDIUM"
          :value="formattedRewardsFiatValue"
          is-formatted
        ></formatted-amount>
      </div>
      <template v-if="hasAccountWithBondedXor">
        <div v-if="isInsufficientBondedAmount" class="referral-insufficient-bonded-amount">
          {{ t('referralProgram.insufficientBondedAmount', { inviteUserFee }) }}
        </div>
        <s-card v-else class="referral-link-container" shadow="always" size="small" border-radius="medium">
          <div class="referral-link-details with-text">
            <div class="referral-link-label">{{ t('referralProgram.invitationLink') }}</div>
            <div class="referral-link" v-html="referralLink.label"></div>
          </div>
          <s-button
            class="s-typography-button--mini"
            size="small"
            type="primary"
            :tooltip="refLinkTooltip"
            @click="handleClickRefLink($event)"
          >
            {{ refLinkText }}
            <s-icon name="copy-16" size="16"></s-icon>
          </s-button>
        </s-card>
      </template>
      <s-collapse :borders="true">
        <s-collapse-item :class="bondedContainerClasses" :disabled="!hasAccountWithBondedXor" name="bondedXOR">
          <template v-if="hasAccountWithBondedXor" #title>
            <token-logo :token="xor"></token-logo>
            <h3 class="bonded-collapse-title">{{ t('referralProgram.bondedXOR') }}</h3>
          </template>
          <div v-if="!hasAccountWithBondedXor" class="unbonded-info">
            <token-logo :token="xor"></token-logo>
            <p class="referral-program-hint referral-program-hint--connected" v-html="startInvitingHtml"></p>
          </div>
          <info-line
            is-formatted
            value-can-be-hidden
            :label="t('referralProgram.bondedXOR')"
            :value="formattedBondedXorBalance"
            :fiat-value="formattedBondedXorFiatValue"
          ></info-line>
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
            <span class="invited-users-icon"></span>
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
                is-formatted
              >
                <template #info-line-prefix>
                  <formatted-address :value="invitedUser" :tooltip-text="t('transaction.referral')"></formatted-address>
                </template>
              </info-line>
            </div>
            <s-pagination
              v-if="hasMultipleInvitedUsersPages"
              layout="total, prev, next"
              v-model:current-page="currentPage"
              :page-size="pageAmount"
              :total="invitedUsersCount"
              @prev-click="handlePrevClick"
              @next-click="handleNextClick"
            ></s-pagination>
          </template>
        </s-collapse-item>
        <s-collapse-item class="referrer-link-container" name="referrer">
          <template #title>
            <WalletAvatar v-if="referrer" class="referrer-icon" :size="32" :address="referrer"></WalletAvatar>
            <h3 class="referrer-collapse-title">
              {{ t(`referralProgram.referrer.${referrer ? 'titleReferrer' : 'title'}`) }}
            </h3>
          </template>
          <template v-if="referrer">
            <h5>{{ t('referralProgram.referrer.referredBy', { referrer: referrerFormatted }) }}</h5>
            <p class="referrer-description" v-html="referrerInfoHtml"></p>
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
            <p class="referrer-description" v-html="referrerDescriptionHtml"></p>
          </template>
          <s-card v-if="referrer" shadow="always" size="small" border-radius="medium">
            <div class="referrer-link-details with-text">
              <div class="referral-link-label">{{ t('referralProgram.referrer.referredLablel') }}</div>
              <div class="referral-link" v-html="referrerLink.label"></div>
            </div>
          </s-card>
        </s-collapse-item>
      </s-collapse>
    </template>
    <template v-else>
      <p class="referral-program-hint" v-html="connectAccountHtml"></p>
      <s-button
        v-if="!isLoggedIn"
        class="connect-button s-typography-button--large"
        type="primary"
        @click="connectSoraWallet"
      >
        {{ t('connectWalletText') }}
      </s-button>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { FPNumber } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { components } from '@/shims/wallet-components';
import { api } from '@/shims/wallet-api';
import last from 'lodash/fp/last';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { FontSizeRate, FontWeightRate, LogoSize } from '@/shims/wallet-consts';
import type { PolkadotJsAccount } from '@/shims/wallet-common-types';
import { getFullBaseUrl, getRouterMode } from '@/api';
import { PageNames, ZeroStringValue } from '@/consts';
import { useCopyAddress } from '@/composables/useCopyAddress';
import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useInternalConnect } from '@/composables/useInternalConnect';
import { useLoading } from '@/composables/useLoading';
import { useTranslation } from '@/composables/useTranslation';
import type { ReferrerRewards } from '@/indexer/queries/referrals';
import router from '@/router';
import { createAsyncComponent } from '@/router/lazy';
import { useAssetsStore } from '@/stores/assets';
import { useReferralsStore } from '@/stores/referrals';
import { useSettingsStore } from '@/stores/settings';
import { useWalletStore } from '@/stores/wallet';
import type { Nullable } from '@/types/common';
import { formatAddress } from '@/utils';
import { escapeHtml, sanitizeHtml } from '@/utils/sanitize';
import { tmaSdkService } from '@/utils/telegram';

import type { CodecString } from '@sora-substrate/sdk';
import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';

defineOptions({
  components: {
    FormattedAmount: components.FormattedAmount,
    FormattedAddress: components.FormattedAddress,
    InfoLine: components.InfoLine,
    ReferralBonding: createAsyncComponent(() => import('@/views/ReferralBonding.vue')),
    WalletAvatar: components.WalletAvatar,
    TokenLogo: components.TokenLogo,
  },
});

const { t } = useTranslation();
const { loading, withApi } = useLoading();
const { connectSoraWallet, isLoggedIn } = useInternalConnect();
const { handleCopyAddress, copyTooltip } = useCopyAddress();
const referralsStore = useReferralsStore();
const settingsStore = useSettingsStore();
const walletStore = useWalletStore();
const assetsStore = useAssetsStore();
const {
  Zero,
  formatCodecNumber,
  getAssetFiatPrice,
  getFiatAmountByFPNumber,
  getFiatAmountByCodecString,
  getFPNumberFromCodec,
} = useFormattedAmount();

const referralRewards = computed(() => referralsStore.referralRewards as Nullable<ReferrerRewards>);
const invitedUsers = computed(() => referralsStore.invitedUsers as Array<string>);
const referrer = computed(() => referralsStore.referrer as string);
const isReferrerApproved = computed(() => Boolean(referralsStore.isReferrerApproved));
const isTMA = computed(() => Boolean(settingsStore.isTMA));
const telegramBotUrl = computed(() => settingsStore.telegramBotUrl as Nullable<string>);
const xor = computed(() => assetsStore.xor as Nullable<AccountAsset>);
const account = computed(() => walletStore.account as Nullable<PolkadotJsAccount>);
const networkFees = computed(() => walletStore.networkFees as Nullable<Record<string, CodecString>>);

const referrerLinkOrCode = ref('');
const pageAmount = 5;
const currentPage = ref(1);

const startIndex = computed(() => (currentPage.value - 1) * pageAmount);
const endIndex = computed(() => currentPage.value * pageAmount);

const invitedUsersCount = computed(() => invitedUsers.value.length);
const hasMultipleInvitedUsersPages = computed(() => invitedUsersCount.value > pageAmount);
const filteredInvitedUsers = computed(() => invitedUsers.value.slice(startIndex.value, endIndex.value));

const bondedXorCodecBalance = computed<CodecString>(() => xor.value?.balance?.bonded ?? '');
const inviteUserFee = computed(() => {
  const fee = networkFees.value?.ReferralSetInvitedUser;
  return fee ? formatCodecNumber(fee) : ZeroStringValue;
});

const isInsufficientBondedAmount = computed(() => {
  const fee = networkFees.value?.ReferralSetInvitedUser;
  if (!bondedXorCodecBalance.value || !fee) return false;

  return FPNumber.gt(getFPNumberFromCodec(fee), getFPNumberFromCodec(bondedXorCodecBalance.value));
});

const formattedBondedXorBalance = computed(() =>
  bondedXorCodecBalance.value ? formatCodecNumber(bondedXorCodecBalance.value) : ZeroStringValue
);

const formattedBondedXorFiatValue = computed(() =>
  bondedXorCodecBalance.value ? getFiatAmountByCodecString(bondedXorCodecBalance.value) : null
);

const hasAccountWithBondedXor = computed(() => {
  const bonded = bondedXorCodecBalance.value;
  return Boolean(account.value && bonded && !FPNumber.fromCodecValue(bonded).isZero());
});

const bondedContainerClasses = computed(() => {
  const baseClass = 'bonded-container';
  const classes = [baseClass];

  if (!hasAccountWithBondedXor.value) {
    classes.push('is-active', `${baseClass}--visible-content`);
  }

  return classes;
});

const invitedUserRewards = computed<Record<string, FPNumber>>(() => referralRewards.value?.invitedUserRewards ?? {});

const formattedRewards = computed(() => referralRewards.value?.rewards.toLocaleString() ?? ZeroStringValue);

const formattedRewardsFiatValue = computed(() =>
  referralRewards.value?.rewards ? getFiatAmountByFPNumber(referralRewards.value.rewards) : null
);

const isPriceAvailable = computed(() => Boolean(getAssetFiatPrice(XOR)));
const xorSymbol = XOR.symbol;

const linkHrefBase = computed(() => `${getFullBaseUrl(router)}referral/`);

const referrerFormatted = computed(() => (referrer.value ? formatAddress(referrer.value, 8) : ''));

const isReferrerLinkEmpty = computed(() => referrerLinkOrCode.value.trim().length === 0);

const referrerAddress = computed(() => {
  if (referrer.value) return referrer.value;
  return last(referrerLinkOrCode.value.split('/')) ?? '';
});

const hasTMALink = computed(() => isTMA.value && Boolean(telegramBotUrl.value));

const refLinkTooltip = computed(() =>
  hasTMALink.value ? t('referralProgram.inviteViaTelegram') : copyTooltip(t('referralProgram.invitationLink'))
);

const connectAccountHtml = computed(() =>
  sanitizeHtml(t('referralProgram.connectAccount'), {
    allowedTags: ['a', 'span', 'strong', 'em', 'p', 'br'],
    allowedAttributes: {
      '*': ['class'],
      a: ['href', 'rel', 'target', 'title'],
    },
  })
);

const startInvitingHtml = computed(() =>
  sanitizeHtml(t('referralProgram.startInviting'), {
    allowedTags: ['a', 'span', 'strong', 'em', 'p', 'br'],
    allowedAttributes: {
      '*': ['class'],
      a: ['href', 'rel', 'target', 'title'],
    },
  })
);

const referrerInfoHtml = computed(() =>
  sanitizeHtml(t('referralProgram.referrer.info'), {
    allowedTags: ['a', 'span', 'strong', 'em', 'p', 'br', 'ul', 'li'],
    allowedAttributes: {
      '*': ['class'],
      a: ['href', 'rel', 'target', 'title'],
    },
  })
);

const referrerDescriptionHtml = computed(() =>
  sanitizeHtml(t('referralProgram.referrer.description'), {
    allowedTags: ['a', 'span', 'strong', 'em', 'p', 'br', 'ul', 'li'],
    allowedAttributes: {
      '*': ['class'],
      a: ['href', 'rel', 'target', 'title'],
    },
  })
);

const referralLink = computed(() => {
  const address = account.value?.address ?? '';
  const href = getSafeReferralLinkHref(address);
  const label = getLinkLabel(address);
  return { href, label };
});

const referrerLink = computed(() => {
  const address = referrerAddress.value;
  return {
    href: getSafeReferralLinkHref(address),
    label: getLinkLabel(address),
  };
});

const refLinkText = computed(() =>
  hasTMALink.value ? t('referralProgram.action.shareLink') : t('referralProgram.action.copyLink')
);

const invitedUsersClasses = computed(() => {
  const baseClass = 'invited-users-list';
  return hasMultipleInvitedUsersPages.value ? [baseClass, `${baseClass}--multiple-pages`] : [baseClass];
});

const bondButtonType = computed(() => (hasAccountWithBondedXor.value ? 'secondary' : 'primary'));

const handlePrevClick = (page: number) => {
  currentPage.value = page;
};

const handleNextClick = (page: number) => {
  currentPage.value = page;
};

const isValidReferrerLink = computed(() => {
  if (isReferrerLinkEmpty.value) return false;
  const address = referrerAddress.value;

  if (!api.validateAddress(address)) return false;
  if (api.formatAddress(address) === account.value?.address) return false;
  if (referrerLinkOrCode.value === address) return true;

  return referrerLinkOrCode.value === referrerLink.value.href;
});

const tmaShareLink = () => {
  if (!telegramBotUrl.value || !account.value?.address) return;

  const botUrl = `${telegramBotUrl.value}/app?startapp=${account.value.address}`;
  tmaSdkService.shareLink(botUrl, t('referralProgram.welcomeMessage'));
};

const handleClickRefLink = (event?: MouseEvent) => {
  if (!hasTMALink.value) {
    void handleCopyAddress(referralLink.value.href, event);
    return;
  }

  tmaShareLink();
};

const getLinkLabel = (address: string): string => {
  const routerMode = getRouterMode(router);
  const safeAddress = escapeHtml(address);
  const raw = `<span class="referral-link-address">Polkaswap.io/</span>${routerMode}referral/${safeAddress}`;

  return sanitizeHtml(raw, {
    allowedTags: ['span'],
    allowedAttributes: {
      span: ['class'],
    },
  });
};

const getSafeReferralLinkHref = (address: string): string => {
  const safeAddress = escapeHtml(address);
  return `${linkHrefBase.value}${safeAddress}`;
};

const getInvitedUserReward = (invitedUser: string): string => {
  const rewards = invitedUserRewards.value[invitedUser];
  if (typeof invitedUser === 'string' && rewards) {
    return formatCodecNumber(rewards.toCodecString());
  }
  return ZeroStringValue;
};

const handleBonding = (isBond = false) => {
  router.push({ name: isBond ? PageNames.ReferralBonding : PageNames.ReferralUnbonding });
};

const handleSetReferrer = () => {
  if (!isValidReferrerLink.value) return;
  referralsStore.setStorageReferrer(referrerAddress.value);
};

const resetSubscriptions = () => {
  referralsStore.unsubscribeFromInvitedUsers();
  referralsStore.resetReferrerSubscription();
};

const resetState = () => {
  referralsStore.reset();
};

const initData = async () => {
  if (!isLoggedIn.value) return;

  await referralsStore.subscribeOnInvitedUsers();
  await referralsStore.getAccountReferralRewards();
  await referralsStore.getReferrer();
  await referralsStore.subscribeOnReferrer();
};

watch(isLoggedIn, async (value) => {
  if (value) {
    await initData();
  } else {
    resetSubscriptions();
  }
});

onMounted(() => {
  void withApi(async () => {
    await initData();
  });
});

onBeforeUnmount(() => {
  resetSubscriptions();
  resetState();
});
</script>

<style lang="scss">
.referral-program {
  margin-top: $inner-spacing-mini;
  @include collapse-items(false, true);
  &.el-loading-parent--relative {
    .el-collapse-item,
    .el-collapse-item__header {
      box-shadow: none;
    }
  }
  .el-loading-mask {
    margin-right: auto;
    margin-left: auto;
    width: 100%;
  }
  .invited-users-container {
    .el-collapse-item__content {
      padding: 0 0 $inner-spacing-mini;
    }
    .el-pagination {
      display: flex;
      justify-content: space-between;
      padding: $inner-spacing-tiny $inner-spacing-medium 0;
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
        position: relative;
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

  @include element-size('referrer-icon', var(--s-size-small));
  &-hint--connected .link {
    color: var(--s-color-theme-accent);
  }
}
.bonded,
.invited-users,
.referrer {
  &-collapse-title {
    font-size: var(--s-font-size-large);
    line-height: var(--s-line-height-reset);
    font-weight: 700;
    &:not(:first-child) {
      padding-left: $inner-spacing-medium;
    }
  }
}
.bonded,
.invited-users {
  &-list {
    padding-right: $inner-spacing-medium;
    padding-left: $inner-spacing-medium;
  }
  &-icon {
    background: var(--s-color-base-content-tertiary) url('@/assets/img/invited-users.svg') 50% 50% no-repeat;
    border-radius: 50%;
    width: var(--s-size-small);
    height: var(--s-size-small);
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

.unbonded-info {
  .asset-logo {
    margin-top: $basic-spacing;
    margin-bottom: $basic-spacing;
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
    margin-bottom: $inner-spacing-small;
    .rewards-value {
      margin-top: $inner-spacing-small;
    }
    .formatted-amount--fiat-value {
      font-size: var(--s-font-size-medium);
      line-height: var(--s-line-height-medium);
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
    font-weight: 800;
  }
}

.bonded {
  &--buttons {
    .el-button {
      margin-top: $inner-spacing-medium;
      &.s-secondary {
        width: calc(50% - (#{$inner-spacing-small} / 2));
      }
      &.s-primary {
        width: 100%;
      }
    }
  }
}

.unbonded-info {
  .asset-logo {
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
      color: var(--s-color-theme-accent);
      &.with-text {
        margin-right: $inner-spacing-mini;
        overflow: hidden;
      }
    }
    &,
    &-label {
      line-height: var(--s-line-height-medium);
    }
    &-label {
      color: var(--s-color-base-content-secondary);
      font-size: var(--s-font-size-mini);
      text-align: left;
    }
  }
}

.referral-insufficient-bonded-amount {
  text-align: center;
  font-size: var(--s-font-size-extra-small);
  line-height: var(--s-line-height-medium);
}

.referrer {
  &-link {
    &-container {
      margin-top: $inner-spacing-medium;
      h5 {
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
    &-code {
      outline-offset: -1px;
    }
  }
  &-description {
    margin-top: $inner-spacing-medium;
    line-height: var(--s-line-height-medium);
  }
}
</style>
