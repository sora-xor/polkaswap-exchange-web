<template>
  <div class="kensetsu-container s-flex-column">
    <s-form v-loading="parentLoading" class="container container--kensetsu el-form--actions" :show-message="false">
      <generic-page-header class="page-header--kensetsu" title="Reserve KEN by burning your XOR" />
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
      <info-line
        label="Your reserved KEN tokens"
        :value="formattedAccountKenReserved"
        asset-symbol="KEN"
        is-formatted
        value-can-be-hidden
      />
      <info-line
        label="Your burned XOR tokens"
        :value="formattedAccountXorBurned"
        :asset-symbol="xor.symbol"
        is-formatted
        value-can-be-hidden
      />
      <div class="info-card-container s-flex">
        <div class="info-card-item s-flex-column">
          <span class="info-card-title">TOTAL XOR BURNED</span>
          <span class="info-card-value">
            {{ formattedTotalXorBurned }}
          </span>
        </div>
        <div class="info-card-item s-flex-column">
          <span class="info-card-title">TOTAL KEN RESERVED</span>
          <span class="info-card-value">
            {{ formattedTotalKenReserved }}
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
import { FPNumber } from '@sora-substrate/util';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import { components, mixins, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import dayjs from 'dayjs';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import BurnDialog from '@/components/pages/Kensetsu/BurnDialog.vue';
import { Components, PageNames } from '@/consts';
import { fetchData } from '@/indexer/queries/kensetsu';
import router, { lazyComponent } from '@/router';
import { getter, state } from '@/store/decorators';
import { waitForSoraNetworkFromEnv } from '@/utils';

const ZeroStr = '0';

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

  private from = {
    block: 14_464_000,
    timestamp: 1708097280000, // Feb 16 2024 15:28:00 GMT+0000
  };

  private to = {
    block: 14_939_200,
    timestamp: 1710949772883, // Mar 20 2024 15:49:32 GMT+0000
  };

  private interval: Nullable<ReturnType<typeof setInterval>> = null;
  private totalXorBurned: FPNumber = FPNumber.ZERO;
  private accountXorBurned: FPNumber = FPNumber.ZERO;

  timeLeftFormatted = '30D';
  ended = false; // if time is over
  burnDialogVisible = false;

  @state.settings.blockNumber private blockNumber!: number;
  @state.wallet.account.address soraAccountAddress!: string;
  @state.wallet.settings.soraNetwork private soraNetwork!: Nullable<WALLET_CONSTS.SoraNetwork>;
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;

  get xorFormattedMillion(): string {
    return this.million.toLocaleString();
  }

  get xorFormattedFiat(): Nullable<string> {
    return this.getFiatAmountByFPNumber(this.million, this.xor);
  }

  get formattedTotalXorBurned(): string {
    return this.totalXorBurned?.toLocaleString() ?? ZeroStr;
  }

  get formattedTotalKenReserved(): string {
    return this.totalXorBurned?.div(this.million).toLocaleString(3) ?? ZeroStr;
  }

  get formattedAccountXorBurned(): string {
    return this.accountXorBurned?.toLocaleString() ?? ZeroStr;
  }

  get formattedAccountKenReserved(): string {
    return this.accountXorBurned?.div(this.million).toLocaleString(3) ?? ZeroStr;
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

  private async fetchData(): Promise<void> {
    const start = this.from.block;
    const end = this.to.block;
    const address = this.soraAccountAddress;

    const burns = await fetchData(start, end);

    let accountXorBurned = FPNumber.ZERO;
    let totalXorBurned = FPNumber.ZERO;

    burns.forEach((burn) => {
      if (burn.amount.gte(this.million)) {
        totalXorBurned = totalXorBurned.add(burn.amount);
        if (address === burn.address) {
          accountXorBurned = accountXorBurned.add(burn.amount);
        }
      }
    });

    this.accountXorBurned = accountXorBurned;
    this.totalXorBurned = totalXorBurned;
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

  async mounted(): Promise<void> {
    await this.withApi(async () => {
      const soraNetwork = this.soraNetwork ?? (await waitForSoraNetworkFromEnv());

      if (soraNetwork !== WALLET_CONSTS.SoraNetwork.Prod) {
        this.from = { block: 0, timestamp: 0 };
        this.to = { block: 100_000, timestamp: 600_000 };
      }

      this.fetchDataAndCalcCountdown();

      this.interval = setInterval(this.fetchDataAndCalcCountdown, 60_000);
    });
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

    .link {
      @include focus-outline;
      font-size: var(--s-heading6-font-size);
      margin-bottom: 12px;
      color: var(--s-color-status-info);
    }
  }
  &-info {
    margin-top: $basic-spacing;
    max-width: $inner-window-width;
    width: 100%;
    flex: 1;
    &__content {
      .link {
        margin-bottom: 0;
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
