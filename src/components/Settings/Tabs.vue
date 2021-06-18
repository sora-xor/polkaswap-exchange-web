<template>
  <s-tabs class="settings-tabs" type="rounded" :value="value" v-on="$listeners">
    <s-tab
      v-for="tab in tabs"
      :key="tab.name"
      :name="tab.name"
      :label="tab.label"
    >
      <p v-if="tab.content" v-html="tab.content" class="settings-content" />
    </s-tab>
  </s-tabs>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'

import { TabItem } from '@/types/tabs'

@Component
export default class SettingsTabs extends Vue {
  @Prop({ type: String, default: '' }) value!: string
  @Prop({ type: Array, default: () => [] }) tabs!: Array<TabItem>
}
</script>

<style lang="scss">
.settings-tabs.s-tabs {
  .el-tabs__header {
    margin-bottom: 0;
  }

  .el-tabs__item {
    font-size: var(--s-font-size-medium);
    font-feature-settings: $s-font-feature-settings-common;
    font-weight: 400 !important;
    text-align: center;

    &.is-focus:not(.is-active) {
      box-shadow: none !important;
    }

    &.is-active {
      box-shadow: var(--s-shadow-tab) !important;
    }
  }

  .settings-content {
    padding: $inner-spacing-medium $inner-spacing-small $inner-spacing-mini;
    font-size: var(--s-font-size-extra-small);
    line-height: var(--s-line-height-base);
    font-weight: 300;
    .algorithm {
      font-weight: 400;
    }
  }
}
</style>
