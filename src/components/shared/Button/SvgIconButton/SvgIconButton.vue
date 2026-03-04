<template>
  <s-button :class="classes" type="action" v-bind="attrs">
    <template #icon>
      <component :is="iconComponent"></component>
    </template>
  </s-button>
</template>

<script lang="ts" setup>
import { computed, defineAsyncComponent, useAttrs } from 'vue';

import { SvgIcons } from './icons';

const createIconLoader = (loader: () => Promise<unknown>) =>
  defineAsyncComponent({
    loader,
    suspensible: false,
  });

const iconComponents = {
  [SvgIcons.LineIcon]: createIconLoader(() => import('@/components/shared/Button/SvgIconButton/Icons/Line.vue')),
  [SvgIcons.CandleIcon]: createIconLoader(() => import('@/components/shared/Button/SvgIconButton/Icons/Candle.vue')),
} as const;

defineOptions({
  name: 'SvgIconButton',
  inheritAttrs: false,
});

const props = withDefaults(
  defineProps<{
    active?: boolean;
    icon?: SvgIcons;
  }>(),
  {
    active: false,
    icon: undefined,
  }
);

const attrs = useAttrs();

const classes = computed(() => ['svg-icon-button', { 's-pressed': props.active }]);
const iconComponent = computed(() => (props.icon ? (iconComponents[props.icon] ?? null) : null));

defineExpose({
  classes,
  iconComponent,
});
</script>

<style lang="scss">
.svg-icon-button {
  svg {
    & > path {
      fill: var(--s-color-base-content-tertiary);
    }
  }

  &:hover,
  &:focus {
    svg {
      & > path {
        fill: var(--s-color-base-content-secondary);
      }
    }
  }

  &.s-pressed {
    svg {
      & > path {
        fill: var(--s-color-theme-accent);
      }
    }
  }
}
</style>
