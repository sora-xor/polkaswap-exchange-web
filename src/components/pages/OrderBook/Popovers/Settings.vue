<template>
  <div class="settings-popover">
    <h4>Customise page</h4>
    <div>
      <s-icon name="basic-settings-24" size="24px" />
      <span>Chart color settings</span>
    </div>
    <div class="settings-popover-switches">
      <div class="settings-popover-switches__item">
        <s-switch v-model="one" :disabled="loading" />
        <span>{{ 'Charts' }}</span>
      </div>
      <div class="settings-popover-switches__item">
        <s-switch v-model="two" :disabled="loading" />
        <span>{{ 'Market trades' }}</span>
      </div>
      <div class="settings-popover-switches__item">
        <s-switch v-model="three" :disabled="loading" />
        <span>{{ 'Order placing' }}</span>
      </div>
      <div class="settings-popover-switches__item">
        <s-switch v-model="four" :disabled="loading" />
        <span>{{ 'All pairs' }}</span>
      </div>
      <div class="settings-popover-switches__item">
        <s-switch v-model="five" :disabled="loading" />
        <span>{{ 'Trading pair' }}</span>
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
  one;
  two;
  three;
  four;
  five;
}
</script>

<style lang="scss">
.settings-popover {
  &-switches {
    &__item {
      display: flex;
      justify-content: center;
      align-items: center;
    }
  }
}
</style>
