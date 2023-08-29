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
      <p class="sora-card-hub-text">Card management coming soon</p>
      <div class="sora-card-hub-options">
        <s-button
          v-for="option in options"
          :key="option.icon"
          type="tertiary"
          @click="handleClick(option.type)"
          :disabled="true"
          class="sora-card-hub-button"
        >
          <component :is="option.icon" />
          {{ option.text }}
        </s-button>
      </div>
    </div>

    <div class="sora-card container sora-card-hub-info" v-loading="loading">
      <h4 class="sora-card-hub-info-title">Account information</h4>
      <div v-if="userInfo.iban" class="sora-card-hub-info-iban">
        <s-input :placeholder="'IBAN Account Details'" :value="iban" readonly />
        <s-icon name="basic-copy-24" @click.native="handleCopyIban" />
      </div>
      <div class="sora-card-hub-logout" @click="logoutFromSoraCard">
        <span>{{ 'Log out from SORA Card' }}</span>
        <s-icon name="arrows-chevron-right-rounded-24" size="18" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import ExchangeIcon from '@/assets/img/sora-card/hub/exchange.svg?inline';
import FreezeIcon from '@/assets/img/sora-card/hub/freeze.svg?inline';
import TopUpIcon from '@/assets/img/sora-card/hub/topup.svg?inline';
import TransferIcon from '@/assets/img/sora-card/hub/transfer.svg?inline';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import { state } from '@/store/decorators';
import { UserInfo } from '@/types/card';
import { copyToClipboard } from '@/utils';
import { clearPayWingsKeysFromLocalStorage } from '@/utils/card';

enum OptionsIcon {
  TopUp = 'TopUpIcon',
  Transfer = 'TransferIcon',
  Freeze = 'FreezeIcon',
  Exchange = 'ExchangeIcon',
}

enum Option {
  TopUp,
  Transfer,
  Freeze,
  Exchange,
}

type Options = { icon: OptionsIcon; text: string; type: Option };

@Component({
  components: {
    TopUpIcon,
    TransferIcon,
    FreezeIcon,
    ExchangeIcon,
  },
})
export default class Dashboard extends Mixins(mixins.LoadingMixin, TranslationMixin) {
  @state.soraCard.userInfo userInfo!: UserInfo;

  readonly options: Array<Options> = [
    { icon: OptionsIcon.TopUp, text: 'Top Up', type: Option.TopUp },
    { icon: OptionsIcon.Transfer, text: 'Transfer', type: Option.Transfer },
    { icon: OptionsIcon.Freeze, text: 'Freeze', type: Option.Freeze },
    { icon: OptionsIcon.Exchange, text: 'Exchange', type: Option.Exchange },
  ];

  get iban(): Nullable<string> {
    return this.userInfo.iban;
  }

  handleClick(type: Option): void {}

  handleCopyIban(): void {
    copyToClipboard(this.userInfo.iban || '');
  }

  logoutFromSoraCard(): void {
    clearPayWingsKeysFromLocalStorage(true);
    this.$emit('logout');
  }

  mounted(): void {}
}
</script>

<style lang="scss">
.sora-card.container.sora-card-hub-info {
  margin-top: 24px;
}

.sora-card {
  &-hub-info {
    &-iban {
      .el-input__inner {
        font-weight: 500;
      }
    }
  }
}
</style>

<style lang="scss" scoped>
.sora-card {
  &-hub {
    &-title {
      margin-bottom: 16px;
    }
    &-image {
      margin-bottom: 16px;
    }
    &-text {
      color: var(--s-color-base-content-secondary);
      text-align: center;
      font-size: 18px;
      font-weight: 500;
      letter-spacing: -0.3px;
      margin-bottom: 16px;
    }
    &-button {
      margin: 8px 8px 0 0;

      svg {
        margin-right: 8px;
      }
    }
    &-logout {
      margin-top: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--s-color-utility-body);
      font-size: var(--s-font-size-big);
      font-weight: 500;
      border-radius: var(--s-border-radius-small);
      padding: 18px $basic-spacing;
      color: var(--s-color-theme-accent-hover);

      i {
        color: var(--s-color-base-content-tertiary);
      }
      &:hover {
        cursor: pointer;
      }
      &:hover i {
        color: var(--s-color-base-content-secondary);
      }
    }
  }

  &-hub-info {
    &-title {
      font-weight: 500;
      margin-bottom: 16px;
    }
    &-iban {
      position: relative;

      .s-icon-basic-copy-24 {
        position: absolute;
        right: 16px;
        top: 16px;
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
