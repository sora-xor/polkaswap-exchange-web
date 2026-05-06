<template>
  <s-tabs class="settings-tabs" type="rounded" :value="value" v-bind="attrs">
    <s-tab v-for="tab in sanitizedTabs" :key="tab.name" :name="tab.name" :label="tab.label">
      <p v-if="tab.content" v-html="tab.content" class="settings-content"></p>
    </s-tab>
  </s-tabs>
</template>

<script lang="ts" setup>
import { computed, useAttrs } from 'vue';

import { TabItem } from '@/types/tabs';
import { sanitizeHtml } from '@/utils/sanitize';

const props = withDefaults(
  defineProps<{
    value?: string;
    tabs?: Array<TabItem>;
  }>(),
  {
    value: '',
    tabs: () => [],
  }
);

const attrs = useAttrs();

const sanitizedTabs = computed(() =>
  props.tabs.map((tab) => {
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
  })
);
</script>

<style lang="scss">
.settings-tabs.s-tabs {
  font-size: var(--s-font-size-extra-small);
  line-height: 1.15;
  width: 100%;

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
