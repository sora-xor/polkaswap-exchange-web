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
      />
      <formatted-amount
        v-if="userInfo.iban"
        class="sora-card-hub-balance"
        :value="balance"
        fiatSign="€"
        value-can-be-hidden
        is-fiat-value
      />
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
          <s-icon :name="option.icon" size="17" class="icon" />
          {{ t(`card.cardHub.${option.type}`) }}
        </s-button>
      </div>
    </div>

    <div class="sora-card container sora-card-hub-info" v-loading="loading">
      <h4 class="sora-card-hub-info-title">{{ t('card.cardhub.accountInfo') }}</h4>
      <div v-if="userInfo.iban" class="sora-card-hub-info-iban">
        <s-input :placeholder="t('card.cardHub.ibanLabel')" :value="iban" readonly />
        <s-icon name="basic-copy-24" @click.native="handleCopyIban" />
      </div>
      <div v-else class="sora-card-hub-info-iban-missing">
        <p class="label">{{ t('card.cardHub.ibanLabel') }}</p>
        <p v-html="t('card.ibanPendingDesc', { email: emailLink })" />
      </div>
      <div class="sora-card-hub-logout" @click="logoutFromSoraCard">
        <span>{{ t('card.cardHub.logout') }}</span>
        <s-icon name="arrows-chevron-right-rounded-24" size="18" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { components, mixins, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { state } from '@/store/decorators';
import { UserInfo } from '@/types/card';
import { copyToClipboard } from '@/utils';
import { clearPayWingsKeysFromLocalStorage } from '@/utils/card';

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

type Options = { icon: OptionsIcon; type: Option };

@Component({
  components: {
    FormattedAmount: components.FormattedAmount,
  },
})
export default class Dashboard extends Mixins(mixins.LoadingMixin, TranslationMixin) {
  @state.soraCard.userInfo userInfo!: UserInfo;
  @state.wallet.settings.shouldBalanceBeHidden private shouldBalanceBeHidden!: boolean;

  email = 'techsupport@soracard.com';

  get emailLink(): string {
    return `<a href='mailto: ${this.email} rel="nofollow noopener"'>${this.email}</a>`;
  }

  options: Array<Options> = [
    { icon: OptionsIcon.TopUp, type: Option.TopUp },
    { icon: OptionsIcon.Transfer, type: Option.Transfer },
    { icon: OptionsIcon.Freeze, type: Option.Freeze },
    { icon: OptionsIcon.Exchange, type: Option.Exchange },
  ];

  get iban(): Nullable<string> {
    return this.shouldBalanceBeHidden ? WALLET_CONSTS.HiddenValue : this.userInfo.iban;
  }

  get balance(): string {
    const balance = this.userInfo.availableBalance;

    if (!balance) return '0';

    return `${balance / 100}`;
  }

  handleClick(type: Option): void {}

  handleCopyIban(): void {
    copyToClipboard(this.userInfo.iban || '');
  }

  logoutFromSoraCard(): void {
    clearPayWingsKeysFromLocalStorage(true);
    this.$emit('logout');
  }
}
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

      .s-icon-basic-copy-24 {
        position: absolute;
        right: $basic-spacing;
        top: $basic-spacing;
        margin-top: auto;
        margin-bottom: auto;
        color: var(--s-color-base-content-tertiary);
        &:hover {
          cursor: pointer;
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
