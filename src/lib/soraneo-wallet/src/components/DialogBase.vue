<template>
  <s-modal
    v-model:show="isVisible"
    :modal-class="modalClass"
    :overlay-class="'dialog-wrapper__overlay'"
    :lock-scroll="true"
    v-bind="$attrs"
  >
    <div :class="cardClasses" :style="cardStyle">
      <header class="dialog-card__header">
        <div v-if="showBack" class="dialog-card__back">
          <s-button type="action" size="sm" @click="handleBackClick">
            <s-icon name="arrows-chevron-left-rounded-24" size="28"></s-icon>
          </s-button>
        </div>
        <div class="dialog-card__title">
          <slot name="title">
            <span class="dialog-card__title-text">
              {{ title }}
            </span>
          </slot>
          <s-tooltip
            v-if="tooltip"
            class="dialog-card__tooltip"
            border-radius="mini"
            :content="tooltip"
            placement="top"
            tabindex="-1"
          >
            <s-icon name="info-16" size="18px"></s-icon>
          </s-tooltip>
        </div>
        <div class="dialog-card__actions">
          <slot name="header-actions"></slot>
          <s-button v-if="showCloseButton" class="dialog-card__close" type="action" size="sm" @click="closeDialog">
            <s-icon name="basic-close-24" size="28"></s-icon>
          </s-button>
        </div>
      </header>
      <div class="dialog-card__content">
        <slot></slot>
      </div>
      <footer v-if="$slots.footer" class="dialog-card__footer">
        <slot name="footer"></slot>
      </footer>
    </div>
  </s-modal>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

import { useDialogVisibility } from '@/composables/useDialog';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    customClass?: string;
    wrapperClass?: string | string[] | Record<string, boolean>;
    title?: string;
    tooltip?: string;
    width?: string;
    showBack?: boolean;
    showCloseButton?: boolean;
  }>(),
  {
    customClass: '',
    wrapperClass: '',
    title: '',
    tooltip: '',
    width: '',
    showBack: false,
    showCloseButton: true,
  }
);

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'back'): void;
}>();
const visibleModel = defineModel<boolean>('visible', { default: false });
const { isVisible, closeDialog } = useDialogVisibility(visibleModel, {
  onClose: () => emit('close'),
});

const cardClasses = computed(() => {
  const classes = ['dialog-card', 'neumorphic'];
  if (props.customClass) {
    classes.push(props.customClass);
  }
  return classes;
});

const flattenClassNames = (value: unknown): string[] => {
  if (!value) return [];
  if (typeof value === 'string') return value.split(/\s+/).filter(Boolean);
  if (Array.isArray(value)) return value.flatMap((item) => flattenClassNames(item));
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([className]) => className);
  }
  return [];
};

const modalClass = computed(() => {
  return ['dialog-wrapper', 'dialog-wrapper__modal', ...flattenClassNames(props.wrapperClass)];
});

const cardStyle = computed(() => {
  if (!props.width) return undefined;
  return {
    width: props.width,
    maxWidth: '100%',
  } as Record<string, string>;
});

const handleBackClick = () => {
  emit('back');
};
</script>

<style lang="scss">
.dialog-wrapper__modal {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $basic-spacing-big;
  box-sizing: border-box;
  width: 100%;
  max-width: 100vw;
  min-width: 0;
  @include scrollbar;
}

.dialog-wrapper__overlay {
  background: var(--s-color-utility-overlay, rgba(42, 23, 31, 0.1));
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  opacity: 1;
}

.dialog-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  max-width: min(496px, calc(100vw - (#{$basic-spacing-big} * 2)));
  background: var(--s-color-utility-surface);
  border-radius: var(--s-border-radius-medium);
  box-shadow: var(--s-shadow-surface);
}

.dialog-card__header {
  display: flex;
  align-items: center;
  gap: $basic-spacing;
  padding: $basic-spacing-big;
  box-shadow: var(--s-shadow-tooltip);
}

.dialog-card__back {
  margin-right: $basic-spacing;
}

.dialog-card__title {
  display: flex;
  align-items: center;
  gap: $basic-spacing;
  flex: 1;
  min-width: 0;
}

.dialog-card__title-text {
  display: inline-flex;
  align-items: center;
  gap: $basic-spacing-small;
  color: var(--s-color-base-content-primary);
  font-size: var(--s-heading2-font-size, 30px);
  font-weight: 600;
  letter-spacing: var(--s-letter-spacing-small);
  line-height: var(--s-line-height-medium);
}

.dialog-card__tooltip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.dialog-card__actions {
  display: flex;
  align-items: center;
  gap: $basic-spacing;
}

.dialog-card__content {
  padding: $basic-spacing $basic-spacing-big $basic-spacing-big;
  max-height: 70vh;
  overflow-x: hidden;
  overflow-y: auto;
}

.dialog-card__footer {
  padding: $basic-spacing $basic-spacing-big $basic-spacing-big;
  display: flex;
  flex-wrap: wrap;
  gap: $basic-spacing;
  justify-content: flex-end;
}
</style>
