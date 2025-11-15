<template>
  <div>
    <div class="sora-card container sora-card-hub" v-loading="loading">
      <h3 class="sora-card-hub-title">SORA Card</h3>
      <s-image
        src="card/sora-card-front.png"
        lazy
        fit="cover"
        draggable="false"
        class="unselectable sora-card-hub-image"
      ></s-image>
      <formatted-amount
        v-if="userInfo.iban"
        class="sora-card-hub-balance"
        :value="balance"
        fiat-sign="€"
        value-can-be-hidden
        is-fiat-value
      ></formatted-amount>
      <p class="sora-card-hub-management-coming">
        {{ t('card.cardHub.comingSoon') }}
      </p>
      <div class="sora-card-hub-options">
        <s-button
          v-for="option in options"
          :key="option.icon"
          type="tertiary"
          @click="handleClick(option.type)"
          :disabled="true"
          class="sora-card-hub-button"
        >
          <s-icon :name="option.icon" size="17" class="icon"></s-icon>
          {{ t(`card.cardHub.${option.type}`) }}
        </s-button>
      </div>
    </div>

    <div class="sora-card container sora-card-hub-info" v-loading="loading">
      <h4 class="sora-card-hub-info-title">{{ t('card.cardhub.accountInfo') }}</h4>
      <div v-if="userInfo.iban" class="sora-card-hub-info-iban">
        <s-input :placeholder="t('card.cardHub.ibanLabel')" :value="iban" readonly></s-input>
        <button v-button class="sora-card-hub-info-iban-copy" type="button" @click="handleCopyIban">
          <s-icon name="basic-copy-24"></s-icon>
        </button>
      </div>
      <div v-else class="sora-card-hub-info-iban-missing">
        <p class="label">{{ t('card.cardHub.ibanLabel') }}</p>
        <p v-html="ibanPendingDescription"></p>
      </div>
      <div v-button class="sora-card-hub-logout" @click="logoutFromSoraCard">
        <span>{{ t('card.cardHub.logout') }}</span>
        <s-icon name="arrows-chevron-right-rounded-24" size="18"></s-icon>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { components, WALLET_CONSTS } from '@wallet';
import { computed, ref } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import store from '@/store';
import type { UserInfo } from '@/types/card';
import { copyToClipboard } from '@/utils';
import { clearPayWingsKeysFromLocalStorage } from '@/utils/card';
import { escapeHtml, sanitizeHtml } from '@/utils/sanitize';

enum OptionsIcon {
  TopUp = 'basic-download-24',
  Transfer = 'basic-download-bold-24',
  Freeze = 'time-time-24',
  Exchange = 'music-repeat-24',
}

enum Option {
  TopUp = 'topup',
  Transfer = 'transfer',
  Freeze = 'freeze',
  Exchange = 'exchange',
}

type CardOption = {
  icon: OptionsIcon;
  type: Option;
};

defineOptions({
  name: 'SoraCardDashboard',
  components: {
    FormattedAmount: components.FormattedAmount,
  },
});

const emit = defineEmits<{
  (event: 'logout'): void;
}>();

const loading = ref(false);
const { t } = useTranslation();

const email = 'techsupport@soracard.com';
const emailLink = computed(() => {
  const safeEmail = escapeHtml(email);
  return `<a href="mailto:${safeEmail}" rel="nofollow noopener">${safeEmail}</a>`;
});

const userInfo = computed<UserInfo>(() => {
  return (store.state?.soraCard?.userInfo as UserInfo | undefined) ?? { iban: null, availableBalance: null };
});

const shouldBalanceBeHidden = computed(() => Boolean(store.state?.wallet?.settings?.shouldBalanceBeHidden));

const ibanPendingDescription = computed(() => {
  const translation = t('card.ibanPendingDesc', { email: emailLink.value });

  return sanitizeHtml(translation, {
    allowedTags: ['a', 'span', 'p', 'br'],
    allowedAttributes: {
      '*': ['class'],
      a: ['href', 'rel', 'target', 'title'],
    },
  });
});

const options: ReadonlyArray<CardOption> = [
  { icon: OptionsIcon.TopUp, type: Option.TopUp },
  { icon: OptionsIcon.Transfer, type: Option.Transfer },
  { icon: OptionsIcon.Freeze, type: Option.Freeze },
  { icon: OptionsIcon.Exchange, type: Option.Exchange },
];

const iban = computed<Nullable<string>>(() => {
  return shouldBalanceBeHidden.value ? WALLET_CONSTS.HiddenValue : userInfo.value.iban;
});

const balance = computed(() => {
  const balanceValue = userInfo.value.availableBalance;
  if (!balanceValue) return '0';
  return `${balanceValue / 100}`;
});

const handleClick = (_type: Option): void => {};

const handleCopyIban = (): void => {
  copyToClipboard(userInfo.value.iban || '');
};

const logoutFromSoraCard = (): void => {
  clearPayWingsKeysFromLocalStorage(true);
  emit('logout');
};
</script>

<style lang="scss">
.sora-card.container.sora-card-hub-info {
  margin-top: var(--s-size-mini);
}

.sora-card {
  &-hub {
    &-balance {
      margin-bottom: $basic-spacing;
      .formatted-amount {
        font-size: 28px;
        letter-spacing: -0.56px;

        &__value {
          color: var(--s-color-base-content-primary);
          font-size: 28px;
          font-weight: 700;

          .formatted-amount__prefix {
            padding-right: 0;
          }
        }
      }
    }
    &-info {
      &-iban {
        .el-input__inner {
          font-weight: 500;
        }
      }
    }
  }
}
</style>

<style lang="scss" scoped>
.sora-card {
  &-hub {
    &-title {
      margin-bottom: $basic-spacing;
    }

    &-options {
      .icon {
        margin-right: 4px;

        &:hover {
          cursor: not-allowed;
          color: unset !important;
        }
      }
    }
    &-image {
      margin-bottom: $basic-spacing;
    }
    &-button {
      margin: $inner-spacing-mini $inner-spacing-mini 0 0;

      svg {
        margin-right: $inner-spacing-mini;
      }
    }

    &-management-coming {
      text-align: center;
      color: var(--s-color-base-content-secondary);
      font-size: var(--s-font-size-medium);
      margin-bottom: $basic-spacing-mini;
      font-weight: 500;
    }

    &-logout {
      margin-top: $inner-spacing-mini;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--s-color-utility-body);
      font-size: var(--s-font-size-medium);
      font-weight: 500;
      border-radius: var(--s-border-radius-small);
      padding: 18px $basic-spacing;
      color: var(--s-color-theme-accent-hover);

      &:hover {
        cursor: pointer;
      }

      &:hover i {
        color: var(--s-color-base-content-secondary);
      }
    }

    &-info {
      &-iban-missing {
        margin-top: $inner-spacing-mini;
        background: var(--s-color-utility-body);
        font-size: var(--s-font-size-medium);
        font-weight: 400;
        border-radius: var(--s-border-radius-small);
        padding: 18px $basic-spacing;
        line-height: 140%;

        .label {
          color: var(--s-color-base-content-secondary);
          margin-bottom: 5px;
        }

        &:hover i {
          color: var(--s-color-base-content-secondary);
        }
      }

      i {
        color: var(--s-color-base-content-tertiary);
      }
    }
  }

  &-hub-info {
    &-title {
      font-weight: 500;
      margin-bottom: $basic-spacing;
    }
    &-iban {
      position: relative;

      .sora-card-hub-info-iban-copy {
        position: absolute;
        right: $basic-spacing;
        top: $basic-spacing;
        display: inline-flex;
        align-items: center;
        margin-top: auto;
        margin-bottom: auto;
        padding: 0;
        border: 0;
        background: none;
        color: var(--s-color-base-content-tertiary);
        cursor: pointer;

        @include focus-outline;

        .s-icon {
          color: inherit;
        }

        &:hover {
          color: var(--s-color-base-content-secondary);
        }
      }
    }
  }
}
</style>

<style lang="scss">
.sora-card-hub-info-iban-missing {
  a {
    color: var(--s-color-base-content-primary);

    @include focus-outline;
  }
}
</style>
