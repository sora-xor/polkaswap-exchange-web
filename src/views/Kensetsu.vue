<template>
  <div class="kensetsu-container s-flex-column">
    <s-form v-loading="parentLoading" class="container container--kensetsu el-form--actions" :show-message="false">
      <generic-page-header class="page-header--kensetsu" title="Unlock KEN by burning your XOR" />
      <p class="description centered p4">
        Burn 1M XOR (permanently remove from your wallet) on SORA for KEN in a fair launch; KEN incentivizes liquidity
        and is deflationary token with a status symbol appeal. 30 days only (till Mar 20 2024).
      </p>
      <external-link class="p4 link" title="Read more" :href="link" />
      <info-line
        label="1 KEN"
        :value="xorFormattedMillion"
        :asset-symbol="xor.symbol"
        :fiat-value="xorFormattedFiat"
        is-formatted
      />
      <info-line label="Time left" :value="timeLeftFormatted" />
      <template v-if="true">
        <info-line label="Your reserved KEN tokens" value="COMING SOON..." />
        <info-line label="Your burned XOR tokens" value="COMING SOON..." />
      </template>
      <template v-else>
        <info-line
          label="Your reserved KEN tokens"
          :value="formattedAccountKenReserved"
          asset-symbol="KEN"
          is-formatted
        />
        <info-line
          label="Your burned XOR tokens"
          :value="formattedAccountXorBurned"
          :asset-symbol="xor.symbol"
          is-formatted
        />
      </template>
      <div class="info-card-container s-flex">
        <div class="info-card-item s-flex-column">
          <span class="info-card-title">TOTAL XOR BURNED</span>
          <span class="info-card-value">
            <template v-if="true">COMING SOON...</template>
            <template v-else>{{ formattedTotalXorBurned }}</template>
          </span>
        </div>
        <div class="info-card-item s-flex-column">
          <span class="info-card-title">TOTAL KEN RESERVED</span>
          <span class="info-card-value">
            <template v-if="true">COMING SOON...</template>
            <template v-else>{{ formattedTotalKenReserved }}</template>
          </span>
        </div>
      </div>
      <s-button
        v-if="!isLoggedIn"
        type="primary"
        class="action-button s-typography-button--large"
        @click="handleConnectWallet"
      >
        {{ t('connectWalletText') }}
      </s-button>
      <s-button
        v-else
        class="action-button s-typography-button--large"
        type="primary"
        :disabled="isBurnDisabled"
        :loading="loading || parentLoading"
        @click="handleBurnClick"
      >
        <template v-if="ended">TIME IS OVER</template>
        <template v-else>BURN MY XOR</template>
      </s-button>
    </s-form>
    <s-card class="kensetsu-info" border-radius="small" shadow="always" size="medium" pressed>
      <div class="kensetsu-info__content s-flex-column">
        <div class="kensetsu-info__desc s-flex">
          <p class="description p4">
            The KEN token is a community-proposed initiative. It’s not officially endorsed by any centralized authority
            or organization. Participation and interaction with the KEN token should be considered with understanding of
            its community-driven nature.
          </p>
          <div class="kensetsu-info__badge">
            <s-icon class="kensetsu-info__icon" name="notifications-alert-triangle-24" size="24" />
          </div>
        </div>
        <external-link class="p4 link" title="Read more" :href="link" />
      </div>
    </s-card>
    <burn-dialog :visible.sync="burnDialogVisible" />
  </div>
</template>

<script lang="ts">
import { XOR } from '@sora-substrate/util/build/assets/consts';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import dayjs from 'dayjs';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import BurnDialog from '@/components/pages/Kensetsu/BurnDialog.vue';
import { Components, PageNames } from '@/consts';
import router, { lazyComponent } from '@/router';
import { getter, state } from '@/store/decorators';

import type { FPNumber } from '@sora-substrate/util';

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    InfoLine: components.InfoLine,
    ExternalLink: components.ExternalLink,
    BurnDialog,
  },
})
export default class Kensetsu extends Mixins(mixins.LoadingMixin, mixins.FormattedAmountMixin, TranslationMixin) {
  readonly link = 'https://medium.com/@shibarimoto/kensetsu-ken-356077ebee78';
  readonly xor = XOR;
  private readonly blockDuration = 6_000; // 6 seconds
  private readonly million = this.getFPNumber(1_000_000);

  private readonly from = {
    block: 14_464_000,
    hash: '0xb420a9368c7f4e33039d4125fe7ca42b042789b909e20ce4b1cfee60840169fc',
    timestamp: 1708097280000, // Feb 16 2024 15:28:00 GMT+0000
  } as const;

  private readonly to = {
    block: 14_939_200,
    timestamp: 1710949772883, // Mar 20 2024 15:49:32 GMT+0000
  } as const;

  private interval: Nullable<ReturnType<typeof setInterval>> = null;
  private totalXorBurned: Nullable<FPNumber> = this.Zero;
  private accountXorBurned: Nullable<FPNumber> = this.Zero;

  timeLeftFormatted = '30D';
  ended = false; // if time is over
  burnDialogVisible = false;

  @state.settings.blockNumber private blockNumber!: number;
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;

  get xorFormattedMillion(): string {
    return this.million.toLocaleString();
  }

  get xorFormattedFiat(): Nullable<string> {
    return this.getFiatAmountByFPNumber(this.million, this.xor);
  }

  get formattedTotalXorBurned(): string {
    return this.totalXorBurned?.toLocaleString() ?? '0';
  }

  get formattedTotalKenReserved(): string {
    return this.totalXorBurned?.div(this.million).toLocaleString(0) ?? '0';
  }

  get formattedAccountXorBurned(): string {
    return this.accountXorBurned?.toLocaleString() ?? '0';
  }

  get formattedAccountKenReserved(): string {
    return this.accountXorBurned?.div(this.million).toLocaleString(0) ?? '0';
  }

  get isBurnDisabled(): boolean {
    return this.ended;
  }

  /**
   * Works only with less than 1 month (31 days) interval.
   * If there will be some requirements for extending that period, you need to change
   * D[D] HH[H] mm[M] -> M[M] D[D] HH[H] mm[mm]
   */
  private calcCountdown(): void {
    const msLeft = (this.to.block - this.blockNumber) * this.blockDuration;
    if (msLeft <= 0) {
      this.timeLeftFormatted = '0D 0H 0M';
      this.ended = true;
      return;
    }
    const expires = dayjs.duration(msLeft);
    this.timeLeftFormatted = expires.format('D[D] HH[H] mm[M]');
  }

  private fetchData() {
    // TODO: ADD STATS REQUESTS (assets.burn)
    // 1st for the current account burned xor amount during the period of 'from' and 'to' timestamp
    // 2nd for whole burned xor amounts during the period of 'from' and 'to' timestamp
    if (!this.isLoggedIn) {
      this.accountXorBurned = this.Zero;
    } else {
      // this.accountXorBurned = ...
    }
    // this.totalXorBurned = ...
  }

  private fetchDataAndCalcCountdown(): void {
    this.calcCountdown();
    this.fetchData();
  }

  handleConnectWallet(): void {
    router.push({ name: PageNames.Wallet });
  }

  handleBurnClick(): void {
    this.burnDialogVisible = true;
  }

  mounted(): void {
    this.withApi(this.fetchDataAndCalcCountdown);
    this.interval = setInterval(this.fetchDataAndCalcCountdown, 60_000);
  }

  beforeUnmount(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
}
</script>

<style lang="scss" scoped>
.el-form--actions {
  @include buttons;
  @include full-width-button('action-button');
}
.page-header--kensetsu {
  justify-content: center;
}
.description {
  margin-bottom: $inner-spacing-mini;
  font-size: 13px;
  &.centered {
    text-align: center;
  }
}
.link {
  @include focus-outline;
  font-size: var(--s-heading6-font-size);
  margin-bottom: $inner-spacing-mini;
}
.info-card {
  &-container {
    align-items: center;
    justify-content: space-between;
    width: 100%;
    margin-top: $inner-spacing-mini;
  }
  &-item {
    flex: 1;
    box-shadow: var(--s-shadow-dialog);
    background-color: var(--s-color-base-border-primary);
    padding: $inner-spacing-medium;
    margin-top: var(--s-basic-spacing);
    border-radius: calc(var(--s-border-radius-mini) / 2);
    & + & {
      margin-left: $inner-spacing-mini;
    }
  }
  &-title {
    color: var(--s-color-base-content-secondary);
    font-weight: 800;
    margin-bottom: $inner-spacing-mini;
  }
  &-value {
    font-weight: 800;
    font-size: 16px;
  }
}
.kensetsu {
  &-container {
    align-items: center;
  }
  &-info {
    margin-top: $basic-spacing;
    max-width: $inner-window-width;
    width: 100%;
    flex: 1;
    &__content {
      .link {
        margin-bottom: 0;
        color: var(--s-color-status-info);
      }
    }
    &__desc {
      align-items: flex-start;
      .description {
        flex: 1;
      }
    }
    &__badge {
      border-radius: 50%;
      background-color: var(--s-color-status-info);
      padding: $inner-spacing-mini;
      box-shadow: var(--s-shadow-element-pressed);
      margin-left: $inner-spacing-mini;
    }
    &__icon {
      color: white;
    }
  }
}
</style>
