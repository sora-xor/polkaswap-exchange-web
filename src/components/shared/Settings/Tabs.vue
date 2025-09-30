<template>
  <s-tabs class="settings-tabs" type="rounded" :value="value" v-on="$listeners">
    <s-tab v-for="tab in sanitizedTabs" :key="tab.name" :name="tab.name" :label="tab.label">
      <p v-if="tab.content" v-html="tab.content" class="settings-content" />
    </s-tab>
  </s-tabs>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator';

import { TabItem } from '@/types/tabs';
import { sanitizeHtml } from '@/utils/sanitize';

@Component
export default class SettingsTabs extends Vue {
  @Prop({ type: String, default: '' }) value!: string;
  @Prop({ type: Array, default: () => [] }) tabs!: Array<TabItem>;

  get sanitizedTabs(): Array<TabItem> {
    return this.tabs.map((tab) => {
      if (!tab.content) return tab;

      return {
        ...tab,
        content: sanitizeHtml(tab.content, {
          allowedTags: ['a', 'span', 'strong', 'em', 'p', 'br', 'ul', 'li'],
          allowedAttributes: {
            '*': ['class'],
            a: ['href', 'rel', 'target', 'title'],
          },
        }),
      };
    });
  }
}
</script>

<style lang="scss">
.settings-tabs.s-tabs {
  .el-tabs__header {
    margin-bottom: 0;
    width: 100%;
  }

  .el-tabs__nav {
    width: 100%;
  }

  .el-tabs__item {
    @include slippage-tolerance-tabs;

    &.is-focus:not(.is-active) {
      box-shadow: none !important;
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
