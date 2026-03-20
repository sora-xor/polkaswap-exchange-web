<template>
  <s-card
    v-bind="{
      primary: true,
      borderRadius: 'medium',
      shadow: 'always',
      size: 'big',
      ...$attrs,
    }"
    class="base"
  >
    <template #header>
      <div ref="headerBase" :class="headerClasses" :tabindex="hasFocusReset ? 0 : -1">
        <div v-if="showBack" :class="backButtonClass">
          <s-button type="action" @click="handleBackClick">
            <s-icon name="arrows-chevron-left-rounded-24" size="28"></s-icon>
          </s-button>
        </div>

        <h3 v-if="showHeader" class="base-title_text">
          {{ title }}
          <s-tooltip
            v-if="tooltip"
            class="base-title_tooltip"
            popper-class="info-tooltip base-title_tooltip-popper"
            border-radius="mini"
            :content="tooltip"
            placement="right"
            tabindex="-1"
          >
            <s-icon name="info-16" size="18px"></s-icon>
          </s-tooltip>
        </h3>

        <div class="base-title_action">
          <slot name="actions"></slot>
        </div>

        <s-button
          v-if="showClose"
          class="base-title_close"
          type="action"
          rounded
          :tooltip="t('closeText')"
          @click="handleCloseClick"
        >
          <s-icon name="basic-close-24" size="28"></s-icon>
        </s-button>
      </div>
    </template>
    <slot></slot>
  </s-card>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';

import { useTranslation } from '@/composables/useTranslation';

const props = withDefaults(
  defineProps<{
    title?: string;
    tooltip?: string;
    titleCenter?: boolean;
    showBack?: boolean;
    showClose?: boolean;
    showHeader?: boolean;
    resetFocus?: string;
  }>(),
  {
    title: '',
    tooltip: '',
    titleCenter: false,
    showBack: false,
    showClose: false,
    showHeader: true,
    resetFocus: '',
  }
);

const emit = defineEmits<{
  (event: 'back'): void;
  (event: 'close'): void;
}>();

const { t } = useTranslation();

const headerBase = ref<HTMLElement | null>(null);
const hasFocusReset = ref(false);

const setFocusToHeader = () => {
  const element = headerBase.value;
  if (!element) return;
  element.focus();
  element.blur();
};

watch(
  () => props.resetFocus,
  (value) => {
    if (value) {
      hasFocusReset.value = true;
      setFocusToHeader();
      hasFocusReset.value = false;
    }
  }
);

const headerClasses = computed(() => {
  const classes = ['base-title', 's-flex'];
  if (props.showBack || props.titleCenter) {
    classes.push('base-title--center');
  }
  if (props.showClose) {
    classes.push('base-title--actions');
  }
  return classes;
});

const backButtonClass = computed(() => {
  const base = ['base-title_back'];
  if (!props.showBack) base.push('base-title_back--hidden');
  return base;
});

const handleBackClick = () => {
  emit('back');
};

const handleCloseClick = () => {
  emit('close');
};

onMounted(() => {
  setFocusToHeader();
});

defineExpose({
  setFocusToHeader,
});
</script>

<style lang="scss">
.base {
  .el-loading-mask {
    background-color: var(--s-color-utility-surface);
  }
}

.base.s-card.s-size-big > .el-card__body {
  padding: 0;
}
.base-title_tooltip-popper.neumorphic.info-tooltip {
  max-width: 165px;
}
</style>

<style scoped lang="scss">
$button-size: var(--s-size-medium);

.base {
  max-width: 464px;
  width: 100%;
  overflow: hidden;
  font-family: var(--s-font-family-default, 'Sora, sans-serif');
  font-size: var(--s-font-size-small);
  line-height: var(--s-line-height-base);

  & > .el-card__body {
    padding: 0;
  }

  & > :deep(.el-card__header) {
    border: none;
    border-bottom: 1px solid transparent;
  }

  &-title {
    position: relative;
    height: $button-size;
    align-items: center;
    padding-right: calc(#{$button-size} + 16px);
    margin-bottom: 16px;
    &_action {
      display: flex;
      align-items: flex-start;

      :deep(.s-button) {
        display: block;
        height: 42px;
        min-height: 42px;
        box-shadow: var(--s-shadow-element);
        font-size: var(--s-font-size-small);
        line-height: 14px;
        font-weight: 500;
        background-color: var(--s-color-utility-body);
        border-color: var(--s-color-base-border-primary);
      }

      :deep(.s-button + .s-button) {
        margin-left: 10px;
      }

      :deep(.s-button .s-button__text) {
        font-size: var(--s-font-size-small);
        line-height: 14px;
        font-weight: 500;
      }

      :deep(.s-button.s-button_type_secondary),
      :deep(.s-button.s-tertiary) {
        min-width: 103px;
        padding: 5px 13px;
      }

      :deep(.s-button.s-button_type_action),
      :deep(.s-button.s-action) {
        width: 42px;
        min-width: 42px;
        padding: 0;
        color: var(--s-color-base-content-tertiary);
      }

      :deep(.s-button.s-button_type_action .s-button__icon > i),
      :deep(.s-button.s-action .s-button__icon > i) {
        color: inherit;
        opacity: 0.7;
      }
    }
    &--center {
      padding-left: calc(#{$button-size} + 16px);
      text-align: center;
    }
    &--has-history {
      .base-title_action {
        right: calc(var(--s-size-medium) + var(--s-basic-spacing));
      }
    }
    &--actions {
      padding-right: calc(#{$button-size} * 2 + 16px);

      &.base-title--center {
        padding-left: calc(#{$button-size} * 2 + 16px);
      }
    }
    &_text {
      flex: 1;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
      margin: 0;
      font-size: var(--s-font-size-large);
      line-height: var(--s-line-height-small);
      font-weight: 300;
      letter-spacing: var(--s-letter-spacing-mini);
    }
    &_back {
      position: absolute;
      left: 0;

      &--hidden {
        display: none;
      }
    }
    &_action,
    &_trash,
    &_close {
      position: absolute;
      top: 0;
      right: 0;
    }
    &_tooltip {
      margin-top: auto;
      margin-bottom: auto;
      margin-left: var(--s-basic-spacing);
      cursor: pointer;
    }
  }
}
</style>
