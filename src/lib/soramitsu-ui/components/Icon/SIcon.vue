<script setup lang="ts">
import { computed } from 'vue';
import type { Component } from 'vue';
import { SSpinner } from '../Spinner';

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
    tooltipText: '',
  }
);

const ICON_COMPONENTS = import.meta.glob('../../icons/icomoon/*.svg', {
  eager: true,
  import: 'default',
}) as Record<string, Component>;

const LEGACY_LOADING_ICON = 'el-icon-loading';

const ELEMENT_ICON_MAP: Record<string, string> = {
  'el-icon-arrow-down': 'arrows-chevron-bottom-24',
  'el-icon-arrow-up': 'arrows-chevron-top-24',
  'el-icon-arrow-left': 'arrows-chevron-left-24',
  'el-icon-arrow-right': 'arrows-chevron-right-24',
  'el-icon-caret-top': 'arrows-chevron-top-24',
  'el-icon-caret-bottom': 'arrows-chevron-bottom-24',
  'el-icon-caret-left': 'arrows-chevron-left-24',
  'el-icon-caret-right': 'arrows-chevron-right-24',
  'el-icon-close': 'basic-close-24',
  'el-icon-edit': 'basic-edit-24',
  'el-icon-delete': 'basic-delete-24',
  'el-icon-document': 'basic-newspaper-24',
  'el-icon-link': 'basic-link-24',
  'el-icon-success': 'basic-circle-checked-24',
};

const rawName = computed(() => props.name.trim());

const iconClassTokens = computed(() => rawName.value.split(/\s+/).filter(Boolean));
const legacyElementClassTokens = computed(() => iconClassTokens.value.filter((token) => token.startsWith('el-icon')));
const isLoadingIcon = computed(() => iconClassTokens.value.some((token) => token === LEGACY_LOADING_ICON));

const normalizedName = computed(() => {
  if (!rawName.value) return '';
  if (isLoadingIcon.value) return '';

  const token = iconClassTokens.value.find((item) => item.startsWith('el-icon-')) ?? iconClassTokens.value[0];
  if (!token) return '';

  const noPrefix = token.startsWith('s-icon-') ? token.slice(7) : token;
  if (token.startsWith('el-icon-') && !ELEMENT_ICON_MAP[noPrefix]) return '';
  return ELEMENT_ICON_MAP[noPrefix] ?? noPrefix;
});

const iconComponent = computed(() => {
  if (!normalizedName.value) return null;
  return ICON_COMPONENTS[`../../icons/icomoon/${normalizedName.value}.svg`] ?? null;
});

const inferIconSize = (value: string): string => {
  const tokens = value.split('-');

  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const token = Number(tokens[index]);
    if (Number.isFinite(token) && token >= 12 && token <= 128) {
      return `${token}px`;
    }
  }

  return '16px';
};

const iconSize = computed(() => {
  if (typeof props.size === 'number') return `${props.size}px`;
  if (typeof props.size === 'string' && props.size.trim()) {
    const normalizedSize = props.size.trim();
    return /^\d+(\.\d+)?$/.test(normalizedSize) ? `${normalizedSize}px` : normalizedSize;
  }
  return inferIconSize(normalizedName.value || rawName.value);
});
const isLegacyElementIcon = computed(
  () => iconClassTokens.value.some((token) => token.startsWith('el-icon-')) && !normalizedName.value
);

const classes = computed(() => {
  const result = new Set<string>();

  // Preserve legacy Element icon class hooks for existing CSS selectors.
  legacyElementClassTokens.value.forEach((token) => result.add(token));

  if (isLegacyElementIcon.value && iconClassTokens.value.length) {
    iconClassTokens.value.forEach((token) => result.add(token));
  }

  if (!isLegacyElementIcon.value && normalizedName.value) {
    result.add(`s-icon-${normalizedName.value}`);
  }

  if (isLoadingIcon.value) {
    result.add('s-icon-loading');
  }

  return Array.from(result);
});

const styles = computed(() => {
  if (isLegacyElementIcon.value && !isLoadingIcon.value) return undefined;

  return {
    fontSize: iconSize.value,
    lineHeight: iconSize.value,
  };
});
</script>

<template>
  <i :class="classes" :style="styles" :title="tooltipText || undefined" aria-hidden="true">
    <SSpinner v-if="isLoadingIcon" class="s-icon__spinner" :size="iconSize" />
    <component :is="iconComponent" v-else-if="iconComponent" class="s-icon__svg" />
  </i>
</template>

<style lang="scss">
i[class*='s-icon-'] {
  display: inline-block;
  flex-shrink: 0;
  width: 1em;
  height: 1em;
  line-height: 1;
  vertical-align: middle;
  color: inherit;

  .s-icon__svg {
    width: 100%;
    height: 100%;
    display: block;

    [fill]:not([fill='none']) {
      fill: currentColor;
    }

    [stroke]:not([stroke='none']) {
      stroke: currentColor;
    }

    path:not([fill='none']),
    rect:not([fill='none']),
    circle:not([fill='none']),
    ellipse:not([fill='none']),
    polygon:not([fill='none']),
    polyline:not([fill='none']) {
      fill: currentColor;
    }
  }

  .s-icon__spinner {
    display: block;
  }
}
</style>
