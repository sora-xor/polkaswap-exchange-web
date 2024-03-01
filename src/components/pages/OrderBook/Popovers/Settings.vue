<template>
  <div class="settings-popover">
    <h4>Customise page</h4>
    <div class="settings-popover-color" @click="openSetColorDialog">
      <s-icon name="basic-settings-24" size="24px" />
      <span>Chart color settings</span>
    </div>
    <div class="delimiter" />
    <div class="settings-popover-switches">
      <div class="settings-popover-switches__item">
        <s-switch v-model="one" :disabled="true" />
        <span>{{ 'Charts' }}</span>
      </div>
      <div class="settings-popover-switches__item">
        <s-switch v-model="two" :disabled="true" />
        <span>{{ 'Market trades' }}</span>
      </div>
      <div class="settings-popover-switches__item">
        <s-switch v-model="three" :disabled="true" />
        <span>{{ 'Order placing' }}</span>
      </div>
      <div class="settings-popover-switches__item">
        <s-switch v-model="four" :disabled="true" />
        <span>{{ 'All pairs' }}</span>
      </div>
      <div class="settings-popover-switches__item">
        <s-switch v-model="five" :disabled="true" />
        <span>{{ 'Trading pair' }}</span>
      </div>
      <div class="delimiter" />
      <div class="settings-popover-switches__item">
        <s-switch v-model="six" :disabled="true" />
        <span>{{ 'Trade reminder' }}</span>
      </div>
      <div class="settings-popover-switches__item">
        <s-switch v-model="seven" :disabled="true" />
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
  one = true;
  two = true;
  three = true;
  four = true;
  five = true;
  six = false;
  seven = false;

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

  .delimiter {
    background-color: var(--s-color-base-border-secondary);
    width: 100%;
    height: 1px;
    margin: 14px 0 4px 0;
  }
}
</style>
