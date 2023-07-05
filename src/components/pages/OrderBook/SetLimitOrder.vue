<template>
  <div>
    <s-tabs :value="currentTab" type="card" @input="handleChangeTab">
      <s-tab
        v-for="rewardsTab in LimitOrderTabsItems"
        :key="rewardsTab"
        :label="t(`rewards.${rewardsTab}`)"
        :name="rewardsTab"
      />
    </s-tabs>
  </div>
</template>

<script lang="ts">
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { LimitOrderTabsItems } from '@/consts';

@Component
export default class SetLimitOrder extends Mixins(TranslationMixin) {
  readonly LimitOrderTabsItems = LimitOrderTabsItems;

  currentTab = LimitOrderTabsItems.Buy;

  handleChangeTab(): void {}
}
</script>
