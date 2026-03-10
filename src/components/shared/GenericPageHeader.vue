<template>
  <div :class="headerClasses">
    <slot name="back">
      <s-button
        v-if="hasButtonBack"
        type="action"
        icon="arrows-chevron-left-rounded-24"
        @click="handleBack($event)"
      ></s-button>
    </slot>

    <h3 class="page-header-title" :class="{ bold }">
      <slot name="title">
        {{ title }}
      </slot>
      <s-tooltip
        v-if="tooltip"
        class="page-header-tooltip s-icon-info-16"
        wrapper-tag="i"
        popper-class="info-tooltip info-tooltip--page-header"
        border-radius="mini"
        :content="tooltip"
        :placement="tooltipPlacement"
        tabindex="-1"
      ></s-tooltip>
    </h3>
    <slot></slot>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    hasButtonBack?: boolean;
    bold?: boolean;
    title?: string;
    tooltip?: string;
    tooltipPlacement?: string;
  }>(),
  {
    hasButtonBack: false,
    bold: false,
    title: '',
    tooltip: '',
    tooltipPlacement: 'right-start',
  }
);

const emit = defineEmits<{
  (event: 'back', value?: Event): void;
}>();

const headerClasses = computed(() => {
  const baseClass = 'page-header';
  return props.hasButtonBack ? `${baseClass} ${baseClass}--center` : baseClass;
});

const handleBack = (event?: Event): void => {
  emit('back', event);
};
</script>

<style lang="scss">
.info-tooltip--page-header {
  margin-top: 0 !important;
}
</style>

<style lang="scss" scoped>
$page-header-class: '.page-header';
$tooltip-area-height: var(--s-size-medium);
$tooltip-size: var(--s-size-mini);
$title-padding: calc(#{var(--s-size-medium)} + #{$inner-spacing-small});

#{$page-header-class} {
  position: relative;
  display: flex;
  gap: $inner-spacing-small;
  margin: 0 0 $inner-spacing-medium;
  width: 100%;
  &--center {
    .el-button {
      position: absolute;
    }
    #{$page-header-class}-title {
      width: 100%;
      padding-right: $title-padding;
      padding-left: $title-padding;
      text-align: center;
    }
  }
  &-title {
    margin: 0;
    color: var(--s-color-base-content-primary);
    line-height: $tooltip-area-height;

    @include page-header-title;

    & + .el-button {
      right: 0;
      &--settings {
        margin-left: auto;
      }
    }
  }
  :deep(.page-header-tooltip) {
    display: inline;
    color: var(--s-color-base-content-tertiary);
    margin-top: auto;
    margin-bottom: auto;
    margin-left: $inner-spacing-mini;
    font-size: 18px;
    line-height: $tooltip-area-height;
    cursor: pointer;
  }
}
</style>
