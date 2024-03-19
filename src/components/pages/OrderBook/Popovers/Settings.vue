<template>
  <div class="settings-popover">
    <h4>Customise page</h4>
    <div class="settings-popover-color" @click="openSetColorDialog">
      <s-icon name="basic-settings-24" size="24px" />
      <span>Chart color settings</span>
    </div>
    <s-divider />
    <div class="settings-popover-switches">
      <div v-for="(option, index) in options" :key="index" class="settings-popover-switches__item">
        <s-switch v-model="option[0]" />
        <span>{{ option[1] }}</span>
      </div>
      <s-divider />
      <div class="settings-popover-switches__item">
        <s-switch v-model="tradeReminder" :disabled="true" />
        <span>{{ 'Trade reminder' }}</span>
      </div>
      <div class="settings-popover-switches__item">
        <s-switch v-model="soundReminder" :disabled="true" />
        <span>{{ 'Sound reminder' }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { state, getter, mutation } from '@/store/decorators';

@Component({
  components: {},
})
export default class SettingsPopover extends Mixins(TranslationMixin, mixins.LoadingMixin) {
  chart = true;
  market = true;
  placing = true;
  pairs = true;
  tradingPair = true;

  tradeReminder = false;
  soundReminder = false;

  options = [
    [this.chart, 'Charts'],
    [this.market, 'Market trades'],
    [this.placing, 'Order placing'],
    [this.pairs, 'All pairs'],
    [this.tradingPair, 'Trading pair'],
  ];

  openSetColorDialog(): void {
    this.$emit('open-color-setting');
  }
}
</script>

<style lang="scss">
.settings-popover {
  background-color: var(--s-color-utility-body);
  border-radius: 16px;
  color: var(--s-color-base-content-primary);
  border: none;
  padding: $basic-spacing 32px $basic-spacing $basic-spacing;
  font-size: var(--s-font-size-small);

  &-color {
    display: flex;
    align-items: center;
    font-size: 16px;
    font-weight: 300;
    margin-top: 16px;

    .s-icon-basic-settings-24 {
      margin-right: 16px;
      color: var(--s-color-base-content-tertiary);
    }

    &:hover {
      cursor: pointer;

      .s-icon-basic-settings-24 {
        color: var(--s-color-base-content-secondary);
      }
    }
  }

  &-switches {
    &__item {
      margin-top: 12px;
      display: flex;
      justify-content: flex-start;
      align-items: center;
      font-size: 16px;
      font-weight: 300;

      span {
        margin: 0 8px;
      }
    }
  }
}
</style>
