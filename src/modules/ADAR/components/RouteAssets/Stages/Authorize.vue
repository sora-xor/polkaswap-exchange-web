<template>
  <div class="container route-assets-authorize-routing">
    <div class="route-assets__page-header-title">Authorize Routing Template</div>
    <div class="fields-container">
      <div class="field">
        <div class="field__label">INPUT ASSET</div>
        <div class="field__value pointer">
          <div>{{ inputToken.symbol }}</div>
          <div>
            <token-logo class="token-logo" :token="inputToken" />
          </div>
        </div>
      </div>
      <s-divider />
      <div class="field">
        <div class="field__label">total</div>
        <div class="field__value">
          {{ totalAmount }} <span class="usd">{{ totalUSD }}</span>
        </div>
      </div>
    </div>
    <s-input :placeholder="'Your email address'" v-model="email" />
    <s-checkbox :size="'mini'" v-model="checkboxValue">
      I agree to the <a>Terms and Conditions</a> of opting out of receiving the summary email
    </s-checkbox>
    <div class="buttons-container">
      <s-button
        type="primary"
        class="s-typography-button--big"
        :disabled="!email || !checkboxValue"
        @click.stop="onContinueClick"
      >
        {{ 'Continue' }}
      </s-button>
      <s-button type="secondary" class="s-typography-button--big" @click.stop="cancelButtonAction">
        {{ `CANCEL PROCESSING` }}
      </s-button>
    </div>
  </div>
</template>

<script lang="ts">
import { FPNumber } from '@sora-substrate/util/build';
import { AccountAsset, Asset } from '@sora-substrate/util/build/assets/types';
import { components, SUBQUERY_TYPES } from '@soramitsu/soraneo-wallet-web';
import { sumBy } from 'lodash';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { action, getter, state } from '@/store/decorators';
import { Recipient } from '@/store/routeAssets/types';
@Component({
  components: {
    TokenLogo: components.TokenLogo,
  },
})
export default class AuthorizeRoutingTemplate extends Mixins(TranslationMixin) {
  @action.routeAssets.processingNextStage nextStage!: any;
  @action.routeAssets.runAssetsRouting runAssetsRouting!: any;
  @getter.routeAssets.inputToken inputToken!: Asset;
  @getter.routeAssets.recipients private recipients!: Array<Recipient>;
  @state.wallet.account.fiatPriceObject private fiatPriceObject!: any;
  @action.routeAssets.cancelProcessing private cancelProcessing!: () => void;
  email = '';
  checkboxValue = false;

  get totalAmount() {
    return this.formatNumber(this.totalUSD / Number(this.getAssetUSDPrice(this.inputToken)));
  }

  get totalUSD() {
    return sumBy(this.recipients, (item: Recipient) => Number(item.usd));
  }

  getAssetUSDPrice(asset: Asset) {
    return FPNumber.fromCodecValue(this.fiatPriceObject[asset.address] ?? 0, 18);
  }

  formatNumber(num) {
    return !num || !Number.isFinite(num)
      ? '-'
      : num.toLocaleString('en-US', {
          maximumFractionDigits: 4,
        });
  }

  onContinueClick() {
    this.runAssetsRouting();
    this.nextStage();
  }

  cancelButtonAction() {
    this.cancelProcessing();
  }
}
</script>

<style lang="scss">
.route-assets-authorize-routing {
  width: 464px;
  text-align: center;
  font-weight: 300;
  font-feature-settings: 'case' on;

  &__title {
    font-size: 24px;
  }

  &__description {
    font-size: 16px;
  }

  > *:not(:last-child) {
    margin-bottom: $inner-spacing-big;
  }

  &__button {
    width: 100%;
    padding: inherit 30px;
  }

  &__label {
    font-weight: 300;
    font-size: 13px;
    line-height: 140%;
    color: var(--s-color-brand-day);
  }

  .token-logo {
    > span {
      width: 16px;
      height: 16px;
    }
  }

  .el-checkbox {
    display: flex;
    align-items: center;
    text-align: left;

    &__label {
      white-space: normal;
      font-weight: 300;
      font-size: 12px;
      line-height: 100%;
      > a {
        color: red;
      }
    }
  }
}
</style>

<style scoped lang="scss">
.container {
  min-height: auto;
}
.fields-container {
  .el-divider {
    margin-bottom: $inner-spacing-medium;
    margin-top: $inner-spacing-medium;
  }
}
.usd {
  color: var(--s-color-status-warning);
  &::before {
    content: '~ $';
    display: inline;
  }
}

.buttons-container {
  margin-top: 150px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  button {
    width: 100%;
    display: block;
    margin: 0;
  }
}
</style>
