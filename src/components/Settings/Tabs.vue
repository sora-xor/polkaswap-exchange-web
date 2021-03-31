<template>
  <s-tabs class="settings-tabs" type="rounded" :value="value" v-on="$listeners">
    <s-tab
      v-for="tab in tabs"
      :key="tab.name"
      :name="tab.name"
      :label="tab.label"
    />
  </s-tabs>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'

@Component
export default class SettingsTabs extends Vue {
  @Prop({ type: String, default: '' }) value!: string
  @Prop({ type: Array, default: () => [] }) tabs!: Array<any>
}
</script>

<style lang="scss">
.settings-tabs.s-tabs {
  .el-tabs__header {
    margin-bottom: 0;
  }

  .el-tabs__item {
    font-size: var(--s-font-size-mini);
    font-feature-settings: $s-font-feature-settings-common;
    font-weight: 600 !important;
    text-align: center;

    &.is-focus,
    &.is-active {
      box-shadow: var(--s-shadow-tab) !important;
    }
  }
}
</style>
