<script setup lang="ts">
import { computed } from 'vue';
import type { Component } from 'vue';

defineOptions({
  name: 'SIcon',
  inheritAttrs: true,
});

const props = withDefaults(
  defineProps<{
    name?: string;
    size?: string | number;
    tooltipText?: string;
  }>(),
  {
    name: '',
    size: '16px',
    tooltipText: '',
  }
);

const ICON_COMPONENTS = import.meta.glob('../../icons/icomoon/*.svg', {
  eager: true,
  import: 'default',
}) as Record<string, Component>;

const ELEMENT_ICON_MAP: Record<string, string> = {
  'el-icon-close': 'basic-close-24',
  'el-icon-edit': 'basic-edit-24',
  'el-icon-delete': 'basic-delete-24',
  'el-icon-document': 'basic-newspaper-24',
  'el-icon-link': 'basic-link-24',
  'el-icon-success': 'basic-circle-checked-24',
  'el-icon-arrow-right': 'arrow-right-16',
  'el-icon-arrow-left': 'arrow-left-16',
  'el-icon-arrow-up': 'arrow-top-16',
  'el-icon-arrow-down': 'arrow-bottom-16',
  'el-icon-loading': 'arrows-refresh-cw-24',
};

const ICON_SPIN_SET = new Set(['el-icon-loading']);

const rawName = computed(() => props.name.trim());

const iconClassTokens = computed(() => rawName.value.split(/\s+/).filter(Boolean));

const normalizedName = computed(() => {
  if (!rawName.value) return '';

  const token = iconClassTokens.value.find((item) => item.startsWith('el-icon-')) ?? iconClassTokens.value[0];
  if (!token) return '';

  const noPrefix = token.startsWith('s-icon-') ? token.slice(7) : token;
  return ELEMENT_ICON_MAP[noPrefix] ?? noPrefix;
});

const iconComponent = computed(() => {
  if (!normalizedName.value) return null;
  return ICON_COMPONENTS[`../../icons/icomoon/${normalizedName.value}.svg`] ?? null;
});

const iconSize = computed(() => (typeof props.size === 'number' ? `${props.size}px` : props.size));

const classes = computed(() => {
  const result: string[] = [];

  if (normalizedName.value) {
    result.push(`s-icon-${normalizedName.value}`);
  }

  if (iconClassTokens.value.length) {
    result.push(...iconClassTokens.value);
  }

  if (iconClassTokens.value.some((token) => ICON_SPIN_SET.has(token))) {
    result.push('s-icon--spin');
  }

  result.push('s-icon');

  return result;
});

const styles = computed(() => ({
  width: iconSize.value,
  height: iconSize.value,
  fontSize: iconSize.value,
}));
</script>

<template>
  <i :class="classes" :style="styles" :title="tooltipText || undefined" aria-hidden="true">
    <component :is="iconComponent" v-if="iconComponent" class="s-icon__svg" />
  </i>
</template>

<style lang="scss">
.s-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  line-height: 1;
  color: inherit;

  &__svg {
    width: 100%;
    height: 100%;
  }
}

.s-icon--spin {
  animation: s-icon-spin 1s linear infinite;
}

@keyframes s-icon-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
