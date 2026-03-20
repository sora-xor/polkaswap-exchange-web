<template>
  <dialog-base
    v-model:visible="isVisible"
    :title="t('dexSettings.title')"
    :append-to-body="appendToBody"
    :modal-append-to-body="appendToBody"
    custom-class="settings"
  >
    <swap-market-algorithm></swap-market-algorithm>
  </dialog-base>
</template>

<script setup lang="ts">
import { components } from '@wallet';
import { computed } from 'vue';

import { useTranslation } from '@/composables/useTranslation';

import SwapMarketAlgorithm from './MarketAlgorithm/MarketAlgorithm.vue';

defineOptions({
  name: 'SwapSettingsDialog',
  components: {
    DialogBase: components.DialogBase,
  },
});

const props = withDefaults(
  defineProps<{
    appendToBody?: boolean;
  }>(),
  {
    appendToBody: false,
  }
);

const { t } = useTranslation();
const isVisible = defineModel<boolean>('visible', { required: true });

const appendToBody = computed(() => props.appendToBody);
</script>

<style lang="scss">
.settings {
  /* Legacy DialogBase implementation (element-ui dialog). */
  &.el-dialog__wrapper .el-dialog {
    overflow: hidden;
    border-radius: var(--s-border-radius-small);
    box-shadow: var(--s-shadow-element-pressed);
    color: var(--s-color-base-content-primary);
  }

  &.el-dialog__wrapper .el-dialog .el-dialog__header {
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: $inner-spacing-big $inner-spacing-big $inner-spacing-mini;
    border-bottom: 0;
  }

  &.el-dialog__wrapper .el-dialog .el-dialog__title {
    color: var(--s-color-base-content-primary);
    font-size: 24px;
    line-height: 31.2px;
    font-weight: 300;
    letter-spacing: -0.96px;
  }

  &.el-dialog__wrapper .el-dialog .el-dialog__close {
    top: $inner-spacing-big;
    right: $inner-spacing-big;
    width: 42px;
    height: 42px;
    border: 0;
    border-radius: 50%;
    background-color: var(--s-color-base-border-secondary);
    box-shadow: var(--s-shadow-element-pressed);
    color: var(--s-color-base-content-tertiary);
  }

  &.el-dialog__wrapper .el-dialog .el-dialog__close > span > i {
    font-size: 24px !important;
    line-height: 24px !important;
  }

  &.el-dialog__wrapper .el-dialog .el-dialog__body {
    padding-top: $inner-spacing-mini;
    padding-bottom: $inner-spacing-big;
  }

  /* Current DialogBase implementation (s-modal + dialog-card). */
  &.dialog-card {
    display: block;
    width: 496px;
    max-width: calc(100vw - (#{$basic-spacing-big} * 2));
    border-radius: var(--s-border-radius-small);
    box-shadow: var(--s-shadow-element-pressed);
    color: var(--s-color-base-content-primary);
  }

  &.dialog-card .dialog-card__header {
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: $inner-spacing-big $inner-spacing-big $inner-spacing-mini;
    border-bottom: 0 !important;
    box-shadow: none !important;
  }

  &.dialog-card .dialog-card__title,
  &.dialog-card .dialog-card__title-text {
    color: var(--s-color-base-content-primary);
    font-size: 24px;
    line-height: 31.2px;
    font-weight: 300;
    letter-spacing: -0.96px;
  }

  &.dialog-card .dialog-card__content {
    overflow: visible;
    padding-top: $inner-spacing-mini;
    padding-bottom: $inner-spacing-big;
  }

  &.dialog-card .dialog-card__close {
    width: 42px;
    min-width: 42px;
    height: 42px;
    min-height: 42px;
    border: 0;
    outline: none;
    box-shadow: var(--s-shadow-element-pressed);
    background-color: var(--s-color-base-border-secondary);
    color: var(--s-color-base-content-tertiary);
    font-weight: 500;
    line-height: 14px;
  }

  &.dialog-card .dialog-card__close:focus,
  &.dialog-card .dialog-card__close:focus-visible {
    outline: none !important;
    box-shadow: var(--s-shadow-element-pressed);
  }

  &.dialog-card .dialog-card__close .s-button__icon > i {
    font-size: 24px !important;
    line-height: 24px !important;
  }

  .el-divider {
    margin: $inner-spacing-mini $inner-spacing-small $inner-spacing-medium;
    width: calc(100% - #{$inner-spacing-small} * 2);
  }
}
</style>
