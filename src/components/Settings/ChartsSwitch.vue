<template>
  <div class="charts-switch">
    <s-switch v-model="enableCharts" />
    <span>{{ t('dexSettings.charts') }}</span>
    <p class="charts-switch-description">{{ t('dexSettings.сhartsDescription') }}</p>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';

import { lazyComponent } from '@/router';
import { Components } from '@/consts';
import { state, mutation } from '@/store/decorators';

@Component({
  components: {
    SettingsHeader: lazyComponent(Components.SettingsHeader),
  },
})
export default class ChartsSwitch extends Mixins(TranslationMixin) {
  @state.settings.сhartsEnabled сhartsEnabled!: boolean;
  @mutation.settings.setChartsEnabled private setChartsEnabled!: (value: boolean) => void;

  get enableCharts(): boolean {
    return this.сhartsEnabled;
  }

  set enableCharts(value: boolean) {
    this.setChartsEnabled(value);
  }
}
</script>

<style lang="scss">
.charts-switch {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  padding-right: $inner-spacing-small;
  padding-left: $inner-spacing-small;

  & > span {
    margin-left: $inner-spacing-small;
    font-size: var(--s-font-size-medium);
    font-weight: 400;
    letter-spacing: var(--s-letter-spacing-small);
    line-height: var(--s-line-height-medium);
  }

  &-description {
    margin-top: $inner-spacing-mini;
    width: 100%;
    font-weight: 300;
    font-size: var(--s-font-size-extra-small);
    line-height: var(--s-line-height-base);
  }
}
</style>
