<template>
  <div class="burn-container s-flex-column">
    <s-row :gutter="16">
      <s-col
        v-for="{ id, title, description, link, receivedAsset, rate, disabledText } in campaigns"
        :key="id"
        class="burn-column s-flex"
        :xs="12"
        :sm="12"
        :md="12"
        :lg="6"
        :xl="6"
      >
        <s-form
          v-loading="parentLoading"
          class="container container--burn el-form--actions"
          :class="{ disabled: ended[id] }"
          :show-message="false"
        >
          <generic-page-header class="page-header--burn" :title="title" />
          <p class="description centered p4">
            {{ description }}
          </p>
          <external-link class="p4 link" title="Read more" :href="link" />
          <info-line
            :label="`1 ${receivedAsset.symbol}`"
            :value="getFormattedXor(rate)"
            :asset-symbol="xor.symbol"
            :fiat-value="getFormattedXorFiat(rate)"
            is-formatted
          />
          <info-line label="Time left" :value="timeLeftFormatted[id]" />
          <info-line
            :label="`Your reserved ${receivedAsset.symbol} tokens`"
            :value="getFormattedAccountReserved(id, rate)"
            :asset-symbol="receivedAsset.symbol"
            is-formatted
            value-can-be-hidden
          />
          <info-line
            label="Your burned XOR tokens"
            :value="getFormattedAccountXorBurned(id)"
            :asset-symbol="xor.symbol"
            is-formatted
            value-can-be-hidden
          />
          <div class="info-card-container s-flex">
            <div class="info-card-item s-flex-column">
              <span class="info-card-title">TOTAL XOR BURNED</span>
              <span class="info-card-value">
                {{ getFormattedTotalXorBurned(id) }}
              </span>
            </div>
            <div class="info-card-item s-flex-column">
              <span class="info-card-title">TOTAL {{ receivedAsset.symbol }} RESERVED</span>
              <span class="info-card-value">
                {{ getFormattedTotalReserved(id, rate) }}
              </span>
            </div>
          </div>
          <s-button
            v-if="!isLoggedIn"
            type="primary"
            class="action-button s-typography-button--large"
            @click="connectSoraWallet"
          >
            {{ t('connectWalletText') }}
          </s-button>
          <s-button
            v-else
            class="action-button s-typography-button--large"
            type="primary"
            :disabled="ended[id]"
            :loading="parentLoading || (!ended[id] && loading)"
            @click="handleBurnClick(id)"
          >
            <template v-if="ended[id]">{{ disabledText ?? 'TIME IS OVER' }}</template>
            <template v-else>BURN MY XOR</template>
          </s-button>
        </s-form>
      </s-col>
    </s-row>
    <s-card class="burn-info" border-radius="small" shadow="always" size="medium" pressed>
      <div class="burn-info__content s-flex-column">
        <div class="burn-info__desc s-flex">
          <p class="description p4">
            The 'Burn XOR' is a community-proposed initiative. It’s not officially endorsed by any centralized authority
            or organization. Participation and interaction with the 'Burn XOR' should be considered with understanding
            of its community-driven nature.
          </p>
          <div class="burn-info__badge">
            <s-icon class="burn-info__icon" name="notifications-alert-triangle-24" size="24" />
          </div>
        </div>
      </div>
    </s-card>
    <burn-dialog
      :visible.sync="burnDialogVisible"
      :received-asset="selectedReceivedAsset"
      :burned-asset="selectedBurnedAsset"
      :rate="selectedRate"
      :max="selectedMax"
      :min="selectedMin"
      @confirm="handleBurnConfirm"
    />
  </div>
</template>

<script lang="ts">
import { FPNumber } from '@sora-substrate/sdk';
import { XOR, KEN } from '@sora-substrate/sdk/build/assets/consts';
import { components, mixins, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import dayjs from 'dayjs/esm';
import { Component, Mixins } from 'vue-property-decorator';

import InternalConnectMixin from '@/components/mixins/InternalConnectMixin';
import BurnDialog from '@/components/pages/Burn/BurnDialog.vue';
import { Components } from '@/consts';
import { fetchData } from '@/indexer/queries/burnXor';
import { lazyComponent } from '@/router';
import { state } from '@/store/decorators';
import { waitForSoraNetworkFromEnv } from '@/utils';

import type { Asset } from '@sora-substrate/sdk/build/assets/types';

const ZeroStr = '0';

type CampaignKey = 'chameleon' | 'kensetsu';

type Campaign = {
  id: CampaignKey;
  title: string;
  description: string;
  disabledText?: string;
  link: string;
  receivedAsset: Asset;
  rate: number;
  max: number;
  min: number;
  from: number;
  fromTimestamp: number;
  to: number;
  toTimestamp: number;
};

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    InfoLine: components.InfoLine,
    ExternalLink: components.ExternalLink,
    BurnDialog,
  },
})
export default class Kensetsu extends Mixins(mixins.LoadingMixin, mixins.FormattedAmountMixin, InternalConnectMixin) {
  readonly xor = XOR;
  private readonly blockDuration = 6_000; // 6 seconds
  private readonly defaultBurned: Record<CampaignKey, FPNumber> = {
    chameleon: FPNumber.ZERO,
    kensetsu: FPNumber.ZERO,
  };

  private readonly campaignsObj: Record<CampaignKey, Campaign> = {
    chameleon: {
      id: 'chameleon',
      title: 'Reserve KARMA by burning your XOR',
      description:
        'Burn 100M XOR (permanently remove from your wallet) on SORA for KARMA in a fair launch; KARMA token is a reward token for LPs who provide liquidity to Chameleon liquidity pools. 22 days only (till Jun 6 2024).',
      link: 'https://medium.com/@shibarimoto/earn-karma-with-a-sora-chameleon-01b25c12fd49',
      receivedAsset: { symbol: 'KARMA', address: '', name: 'Chameleon', decimals: 18 } as Asset,
      rate: 100_000_000,
      max: 1000,
      min: 0.1,
      from: 15_739_737,
      fromTimestamp: 1715791500000, // May 15 2024 16:45:00 GMT+0000
      to: 16_056_666,
      toTimestamp: 1717693074000, // Jun 06 2024 16:57:54 GMT+0000
      disabledText: 'Already distributed',
    },
    kensetsu: {
      id: 'kensetsu',
      title: 'Reserve KEN by burning your XOR',
      description:
        'Burn 1M XOR (permanently remove from your wallet) on SORA for KEN in a fair launch of Kensetsu; KEN incentivizes liquidity and is deflationary token with a status symbol appeal. 30 days only (till Mar 20 2024).',
      link: 'https://medium.com/@shibarimoto/kensetsu-ken-356077ebee78',
      receivedAsset: KEN,
      rate: 1_000_000,
      max: 10_000,
      min: 1,
      from: 14_464_000,
      fromTimestamp: 1708097280000, // Feb 16 2024 15:28:00 GMT+0000
      to: 14_939_200,
      toTimestamp: 1710949772883, // Mar 20 2024 15:49:32 GMT+0000
      disabledText: 'Already distributed',
    },
  };

  readonly campaigns = Object.values(this.campaignsObj);

  private interval: Nullable<ReturnType<typeof setInterval>> = null;
  private totalXorBurned: Record<CampaignKey, FPNumber> = { ...this.defaultBurned };
  private accountXorBurned: Record<CampaignKey, FPNumber> = { ...this.defaultBurned };

  timeLeftFormatted: Record<CampaignKey, string> = {
    chameleon: '30D',
    kensetsu: '30D',
  };

  ended: Record<CampaignKey, boolean> = {
    chameleon: false,
    kensetsu: false,
  };

  burnDialogVisible = false;

  selectedReceivedAsset = this.campaigns[0].receivedAsset;
  selectedBurnedAsset = XOR;
  selectedRate = this.campaigns[0].rate;
  selectedMax = this.campaigns[0].max;
  selectedMin = this.campaigns[0].min;

  @state.wallet.settings.blockNumber private blockNumber!: number;
  @state.wallet.settings.soraNetwork private soraNetwork!: Nullable<WALLET_CONSTS.SoraNetwork>;

  get minBlock(): number {
    return Math.min(...this.campaigns.map((c) => c.from));
  }

  get maxBlock(): number {
    return Math.max(...this.campaigns.map((c) => c.to));
  }

  getFormattedXor(rate: number): string {
    return this.getFPNumber(rate).toLocaleString();
  }

  getFormattedXorFiat(rate: number): Nullable<string> {
    return this.getFiatAmountByString(`${rate}`, this.xor);
  }

  getFormattedTotalXorBurned(id: CampaignKey): string {
    return this.totalXorBurned[id]?.toLocaleString() ?? ZeroStr;
  }

  getFormattedTotalReserved(id: CampaignKey, rate: number): string {
    return this.totalXorBurned[id]?.div(rate).toLocaleString(3) ?? ZeroStr;
  }

  getFormattedAccountXorBurned(id: CampaignKey): string {
    return this.accountXorBurned[id]?.toLocaleString() ?? ZeroStr;
  }

  getFormattedAccountReserved(id: CampaignKey, rate: number): string {
    return this.accountXorBurned[id]?.div(rate).toLocaleString(3) ?? ZeroStr;
  }

  /**
   * Works only with less than 1 month (31 days) interval.
   * If there will be some requirements for extending that period, you need to change
   * D[D] HH[H] mm[M] -> M[M] D[D] HH[H] mm[mm]
   */
  private calcCountdown(): void {
    for (const campaign of this.campaigns) {
      const msLeft = (campaign.to - this.blockNumber) * this.blockDuration;
      if (msLeft <= 0) {
        this.timeLeftFormatted[campaign.id] = '0D 0H 0M';
        this.ended[campaign.id] = true;
        continue;
      }
      const expires = dayjs.duration(msLeft);
      this.timeLeftFormatted[campaign.id] = expires.format('D[D] HH[H] mm[M]');
    }
  }

  private async fetchData(): Promise<void> {
    const start = this.minBlock;
    const end = this.maxBlock;
    const address = this.soraAddress;

    const burns = await fetchData(start, end);

    const accountXorBurned = { ...this.defaultBurned };
    const totalXorBurned = { ...this.defaultBurned };

    for (const campaign of this.campaigns) {
      const campaignBurns = burns.filter(
        ({ blockHeight }) => blockHeight >= campaign.from && blockHeight <= campaign.to
      );

      const accountsBurned = campaignBurns.reduce<Record<string, FPNumber>>((acc, { address, amount }) => {
        if (!acc[address]) {
          acc[address] = FPNumber.ZERO;
        }
        acc[address] = acc[address].add(amount);
        return acc;
      }, {});

      const minBurned = new FPNumber(campaign.rate * campaign.min);

      Object.entries(accountsBurned).forEach(([addr, amount]) => {
        if (amount.gte(minBurned)) {
          totalXorBurned[campaign.id] = totalXorBurned[campaign.id].add(amount);
          if (address === addr) {
            accountXorBurned[campaign.id] = accountXorBurned[campaign.id].add(amount);
          }
        }
      });
    }

    this.accountXorBurned = { ...accountXorBurned };
    this.totalXorBurned = { ...totalXorBurned };
  }

  private async fetchDataAndCalcCountdown(): Promise<void> {
    await this.withLoading(async () => {
      this.calcCountdown();
      await this.fetchData();
    });
  }

  handleBurnClick(id: CampaignKey): void {
    const campaign = this.campaignsObj[id];
    this.selectedReceivedAsset = campaign.receivedAsset;
    this.selectedRate = campaign.rate;
    this.selectedMax = campaign.max;
    this.selectedMin = campaign.min;
    this.burnDialogVisible = true;
  }

  async mounted(): Promise<void> {
    await this.withApi(async () => {
      const soraNetwork = this.soraNetwork ?? (await waitForSoraNetworkFromEnv());

      if (soraNetwork !== WALLET_CONSTS.SoraNetwork.Prod) {
        this.campaignsObj.chameleon.from = 11_000;
        this.campaignsObj.chameleon.to = 1_000_000;
        this.campaignsObj.kensetsu.from = 0;
        this.campaignsObj.kensetsu.to = 10_000;
      }
      await this.fetchDataAndCalcCountdown();

      this.interval = setInterval(this.fetchDataAndCalcCountdown, 60_000);
    });
  }

  handleBurnConfirm(done?: boolean): void {
    if (done) {
      this.loading = true;
    }
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
.container {
  margin: 0;
  &--burn {
    margin-bottom: $basic-spacing;
    box-shadow: var(--s-shadow-element-pressed);
    &.disabled {
      box-shadow: var(--s-shadow-element);
    }
  }
}
.page-header--burn {
  justify-content: center;
}
.description {
  margin-bottom: $inner-spacing-mini;
  font-size: var(--s-font-size-extra-small);
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
    font-size: var(--s-font-size-extra-small);
    margin-bottom: $inner-spacing-mini;
  }
  &-value {
    font-weight: 800;
    font-size: 16px;
  }
}
.burn {
  &-column {
    align-items: center;
    justify-content: center;
  }
  &-container {
    align-items: center;

    .link {
      font-size: var(--s-heading6-font-size);
      margin-bottom: 12px;
      color: var(--s-color-status-info);
      @include focus-outline;
    }
  }
  &-info {
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
