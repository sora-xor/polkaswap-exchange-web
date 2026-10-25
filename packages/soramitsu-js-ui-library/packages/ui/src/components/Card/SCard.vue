<script setup lang="ts">
import { computed, useSlots } from 'vue'

import { usePropTypeFilter } from '@/composables/prop-type-filter'

import {
  CARD_BORDER_RADIUS_VALUES,
  CARD_SHADOW_VALUES,
  CARD_SIZE_VALUES,
  CARD_STATUS_VALUES,
  type CardBorderRadius,
  type CardShadow,
  type CardSize,
  type CardStatus,
} from './consts'

type BodyStyle = Record<string, string | number>

const props = withDefaults(
  defineProps<{
    header?: string
    bodyStyle?: BodyStyle
    shadow?: CardShadow
    clickable?: boolean
    borderRadius?: CardBorderRadius
    pressed?: boolean
    primary?: boolean
    status?: CardStatus
    size?: CardSize
    tag?: string
    neumorphic?: boolean
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
  },
)

const emit = defineEmits<(event: 'click', value: MouseEvent) => void>()

const slots = useSlots()
const filterProp = usePropTypeFilter(props)

const normalizedShadow = filterProp('shadow', CARD_SHADOW_VALUES, 'never')
const normalizedBorderRadius = filterProp('borderRadius', CARD_BORDER_RADIUS_VALUES, 'medium')
const normalizedStatus = filterProp('status', CARD_STATUS_VALUES, 'default')
const normalizedSize = filterProp('size', CARD_SIZE_VALUES, 'medium')

const rootTag = computed(() => props.tag || 'div')

const hasHeaderSlot = computed(() => typeof slots.header === 'function')
const shouldRenderHeader = computed(() => Boolean(props.header) || hasHeaderSlot.value)

const isDefaultStatus = computed(() => normalizedStatus.value === 'default')

const classes = computed(() => {
  const result = new Set<string>()

  result.add('s-card')
  result.add('el-card')

  if (props.neumorphic) {
    result.add('neumorphic')
  }

  if (props.clickable) {
    result.add('s-clickable')
  }

  if (props.primary) {
    result.add('s-primary')
  }

  if (props.pressed) {
    result.add('s-pressed')
  }

  if (!isDefaultStatus.value) {
    result.add(`s-status-${normalizedStatus.value}`)
  }

  if (CARD_SIZE_VALUES.includes(normalizedSize.value)) {
    result.add(`s-size-${normalizedSize.value}`)
  }

  if (CARD_BORDER_RADIUS_VALUES.includes(normalizedBorderRadius.value)) {
    result.add(`s-border-radius-${normalizedBorderRadius.value}`)
  }

  if (normalizedShadow.value === 'always') {
    result.add('is-always-shadow')
  } else if (normalizedShadow.value === 'hover') {
    result.add('is-hover-shadow')
  }

  return Array.from(result)
})

const handleClick = (event: MouseEvent) => {
  if (!props.clickable) return

  emit('click', event)
}

const resolvedBodyStyle = computed(() => props.bodyStyle)
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

<style lang="scss">
@use '@/theme';

$padding-big: 24px;
$padding-big-bottom: 32px;
$padding-medium: 16px;
$padding-small-y: 8px;
$padding-small-x: 12px;
$padding-mini-y: 2px;
$padding-mini-x: 6px;

.s-card {
  @apply block transition-shadow duration-150 ease-in-out;
  position: relative;
  border: 1px solid var(--s-color-base-border-primary);
  border-radius: var(--s-border-radius-medium);
  background-color: var(--s-color-utility-surface);
  color: var(--s-color-base-content-primary);

  &.s-clickable {
    cursor: pointer;
  }

  &.is-always-shadow {
    border-color: transparent;
    box-shadow: var(--s-shadow-element);
  }

  &.is-hover-shadow:hover,
  &.is-hover-shadow:focus {
    border-color: transparent;
    box-shadow: var(--s-shadow-element);
  }

  &.s-pressed {
    box-shadow: var(--s-shadow-element-pressed);
  }

  &.s-primary {
    background-color: var(--s-color-utility-surface);
  }

  &.neumorphic {
    border: none;
    background-color: var(--s-color-base-background);

    &.is-always-shadow,
    &.is-hover-shadow:hover,
    &.is-hover-shadow:focus {
      box-shadow: var(--s-shadow-element);
    }
  }

  &.s-border-radius-big {
    border-radius: var(--s-border-radius-big);
  }

  &.s-border-radius-small {
    border-radius: var(--s-border-radius-small);
  }

  &.s-border-radius-mini {
    border-radius: var(--s-border-radius-mini);
  }

  &.s-status-success {
    background-color: var(--s-color-status-success-background);
    color: var(--s-color-status-success);
  }

  &.s-status-warning {
    background-color: var(--s-color-status-warning-background);
    color: var(--s-color-status-warning);
  }

  &.s-status-error {
    background-color: var(--s-color-status-error-background);
    color: var(--s-color-status-error);
  }

  &.s-status-info {
    background-color: var(--s-color-utility-surface);
    color: var(--s-color-base-content-primary);
  }

  .el-card__header {
    padding: 0;
    border-bottom: none;
    text-align: left;
  }

  .el-card__body {
    padding: $padding-medium;
  }

  &.s-size-big .el-card__body {
    padding: $padding-big $padding-big $padding-big-bottom;
  }

  &.s-size-small .el-card__body {
    padding: $padding-small-y $padding-small-x;
  }

  &.s-size-mini .el-card__body {
    padding: $padding-mini-y $padding-mini-x;
  }
}
</style>
