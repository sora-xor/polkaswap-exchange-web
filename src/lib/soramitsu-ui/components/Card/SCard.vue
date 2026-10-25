<script setup lang="ts">
import { computed, useSlots } from 'vue';

import { usePropTypeFilter } from '@soramitsu-ui/ui/composables/prop-type-filter';
import { resolveDynamicComponentTag } from '@/lib/soramitsu-ui/util';

import {
  CARD_BORDER_RADIUS_VALUES,
  CARD_SHADOW_VALUES,
  CARD_SIZE_VALUES,
  CARD_STATUS_VALUES,
  type CardBorderRadius,
  type CardShadow,
  type CardSize,
  type CardStatus,
} from './consts';

type BodyStyle = Record<string, string | number>;

const props = withDefaults(
  defineProps<{
    header?: string;
    bodyStyle?: BodyStyle;
    shadow?: CardShadow;
    clickable?: boolean;
    borderRadius?: CardBorderRadius;
    pressed?: boolean;
    primary?: boolean;
    status?: CardStatus;
    size?: CardSize;
    tag?: string;
    neumorphic?: boolean;
  }>(),
  {
    bodyStyle: undefined,
    shadow: 'never',
    clickable: false,
    borderRadius: 'medium',
    pressed: false,
    primary: false,
    status: 'default',
    size: 'medium',
    tag: 'div',
    neumorphic: true,
  }
);

const emit = defineEmits<(event: 'click', value: MouseEvent) => void>();

const slots = useSlots();
const filterProp = usePropTypeFilter(props);

const normalizedShadow = filterProp('shadow', CARD_SHADOW_VALUES, 'never');
const normalizedBorderRadius = filterProp('borderRadius', CARD_BORDER_RADIUS_VALUES, 'medium');
const normalizedStatus = filterProp('status', CARD_STATUS_VALUES, 'default');
const normalizedSize = filterProp('size', CARD_SIZE_VALUES, 'medium');

const rootTag = computed(() => resolveDynamicComponentTag(props.tag, 'div'));

const hasHeaderSlot = computed(() => typeof slots.header === 'function');
const shouldRenderHeader = computed(() => Boolean(props.header) || hasHeaderSlot.value);

const classes = computed(() => {
  const result = new Set<string>();

  result.add('s-card');
  result.add('el-card');

  if (props.neumorphic) {
    result.add('neumorphic');
  }

  if (props.clickable) {
    result.add('s-clickable');
  }

  if (props.primary) {
    result.add('s-primary');
  }

  if (props.pressed) {
    result.add('s-pressed');
  }

  result.add(`s-status-${normalizedStatus.value}`);

  if (CARD_SIZE_VALUES.includes(normalizedSize.value)) {
    result.add(`s-size-${normalizedSize.value}`);
  }

  if (CARD_BORDER_RADIUS_VALUES.includes(normalizedBorderRadius.value)) {
    result.add(`s-border-radius-${normalizedBorderRadius.value}`);
  }

  if (normalizedShadow.value === 'always') {
    result.add('is-always-shadow');
  } else if (normalizedShadow.value === 'hover') {
    result.add('is-hover-shadow');
  }

  return Array.from(result);
});

const handleClick = (event: MouseEvent) => {
  if (!props.clickable) return;

  emit('click', event);
};

const resolvedBodyStyle = computed(() => props.bodyStyle);
</script>

<template>
  <component :is="rootTag" :class="classes" @click="handleClick">
    <div v-if="shouldRenderHeader" class="el-card__header">
      <slot name="header">
        {{ header }}
      </slot>
    </div>
    <div class="el-card__body" :style="resolvedBodyStyle">
      <slot />
    </div>
  </component>
</template>
