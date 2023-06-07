<template>
  <div class="container route-assets-routing-process">
    <div class="route-assets__page-header-title">Routing assets...</div>
    <div class="fields-container">
      <div v-for="(token, idx) in recipientsTokens" :key="idx">
        <div class="field">
          <div class="field__value pointer">
            <div>{{ token.symbol }}</div>
            <div>
              <token-logo class="token-logo" :token="token" />
            </div>
          </div>
          <div class="field__label" :class="`field__label_${getStatus(token)}`">{{ getStatus(token) }}</div>
        </div>
        <s-divider />
      </div>
    </div>
    <div class="buttons-container">
      <s-button
        type="primary"
        class="s-typography-button--big"
        :disabled="continueButtonDisabled"
        @click.stop="onContinueClick"
      >
        {{ 'Continue' }}
      </s-button>
    </div>
  </div>
</template>

<script lang="ts">
import { Asset } from '@sora-substrate/util/build/assets/types';
import { components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { action, getter } from '@/store/decorators';
import { Recipient, RecipientStatus } from '@/store/routeAssets/types';
@Component({
  components: {
    TokenLogo: components.TokenLogo,
  },
})
export default class RoutingAssets extends Mixins(TranslationMixin) {
  @action.routeAssets.processingNextStage nextStage!: any;
  @getter.routeAssets.recipients private recipients!: Array<Recipient>;
  @getter.routeAssets.recipientsTokens recipientsTokens!: Asset[];

  get continueButtonDisabled() {
    return !!this.recipients.find(
      (recipient) => recipient.status === RecipientStatus.PENDING || recipient.status === RecipientStatus.PASSED
    );
  }

  onContinueClick() {
    this.nextStage();
  }

  getStatus(asset) {
    const transactions = this.recipients.filter((recipient) => recipient.asset.address === asset.address);
    if (transactions.some((recipient) => recipient.status === RecipientStatus.FAILED)) return 'failed';
    if (transactions.some((recipient) => recipient.status === RecipientStatus.PASSED)) return 'passed';
    return transactions.find((recipient) => recipient.status === RecipientStatus.PENDING) ? 'waiting' : 'routed';
  }

  formatNumber(num) {
    return !num || !Number.isFinite(num)
      ? '-'
      : num.toLocaleString('en-US', {
          maximumFractionDigits: 4,
        });
  }
}
</script>

<style lang="scss">
.route-assets-routing-process {
  width: 464px;
  text-align: center;
  font-weight: 300;
  font-feature-settings: 'case' on;

  > *:not(:last-child) {
    margin-bottom: $inner-spacing-big;
  }

  .token-logo {
    > span {
      width: 24px;
      height: 24px;
    }
  }
}
</style>

<style scoped lang="scss">
.container {
  min-height: auto;
}

.fields-container {
  .field {
    &__label {
      &_failed {
        color: var(--s-color-status-error);
        font-weight: 600;
        fill: var(--s-color-status-error);
        &::after {
          margin-left: 4px;
          content: '✕';
          display: inline;
          color: var(--s-color-status-error);
        }
      }
      &_routed {
        color: var(--s-color-status-success);
        font-weight: 600;
        fill: var(--s-color-status-success);
        &::after {
          margin-left: 4px;
          content: '✓';
          display: inline;
          color: var(--s-color-status-success);
        }
      }
      &_waiting,
      &_passed {
        color: var(--s-color-status-warning);
        font-weight: 600;
        fill: var(--s-color-status-warning);
        &::after {
          margin-left: 4px;
          content: '...';
          display: inline;
          color: var(--s-color-status-warning);
        }
      }
    }
  }
}

.buttons-container {
  margin-top: 150px;

  button {
    width: 100%;
    display: block;
    margin: 0;
  }
}
</style>
