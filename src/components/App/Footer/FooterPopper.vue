<template>
  <el-popover
    ref="popover"
    placement="top"
    trigger="click"
    :popper-class="computedPopperClass"
    :tabindex="tabIndex"
    @show="handleShow"
  >
    <template #reference>
      <div
        v-button
        class="app-status__item s-flex"
        :class="computedClass"
        @keypress.enter="handleEnterClick"
        @blur="handleBlur"
      >
        <span v-if="isLoading" class="app-status__loading"></span>
        <s-icon v-else :name="icon" size="16"></s-icon>
        <span class="app-status__text">{{ panelText }}</span>
      </div>
    </template>
    <div class="item s-flex">
      <div class="item__title s-flex">
        <div class="item__label s-flex">
          <slot name="label"></slot>
        </div>
        <s-button v-if="actionText" class="item__action" size="small" type="secondary" @click="handleActionClick">
          {{ actionText }}
        </s-button>
      </div>
      <div class="item__desc s-flex">
        <slot></slot>
      </div>
    </div>
  </el-popover>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';

import { Status } from '@soramitsu-ui/ui/types';
import { delay } from '@/utils';

const cssPopperClass = 'app-status__tooltip';

const props = defineProps({
  status: {
    type: String as () => Status,
    required: true,
  },
  icon: {
    type: String,
    required: true,
  },
  panelClass: {
    type: String,
    default: '',
  },
  actionText: {
    type: String,
    default: '',
  },
  panelText: {
    type: String,
    required: true,
  },
});

const emit = defineEmits<{
  (e: 'action'): void;
}>();

const popover = ref<any>();

const computedPopperClass = computed(() => [cssPopperClass, props.status].filter(Boolean).join(' '));
const computedClass = computed(() => [props.panelClass, props.status].filter(Boolean).join(' '));
const isLoading = computed(() => props.status === Status.INFO);
const tabIndex = computed(() => (isLoading.value ? -1 : 0));

async function handleShow(): Promise<void> {
  await delay(100);
  const left = popover.value?.popperElm?.style?.getPropertyValue('left');
  if (left && left.includes('-')) {
    popover.value.popperElm.style.setProperty('left', '0');
  }
}

function handleActionClick(): void {
  emit('action');
}

function handleEnterClick(): void {
  popover.value?.doToggle();
}

function handleBlur(event: FocusEvent): void {
  const popperEl: Nullable<HTMLElement> = popover.value?.popperElm;
  const related = event.relatedTarget as Nullable<HTMLElement>;
  if (!popperEl || !related) return;
  if (!(popperEl === related || popperEl.contains(related))) {
    popover.value?.doClose();
  }
}
</script>

<style lang="scss">
$tooltip-placements: 'top'; // add another styles if needed
$status-classes: 'error', 'warning', 'info', 'success';
$footer-label-line-height: 150%;
$footer-action-color: #2a171f;
$footer-action-background-color: #f7f3f4;

.app-status__tooltip.el-popover.el-popper {
  border-color: var(--s-color-base-border-secondary);
  border-radius: var(--s-border-radius-mini);
  box-shadow: var(--s-shadow-tooltip);
  padding: $inner-spacing-mini $inner-spacing-small;
  color: var(--s-color-base-on-accent);

  @each $status in $status-classes {
    &.#{$status} {
      background-color: var(--s-color-status-#{$status});
      @each $placement in $tooltip-placements {
        &[x-placement^='#{$placement}'] .popper__arrow {
          border-#{$placement}-color: var(--s-color-base-border-secondary);
          &:after {
            border-#{$placement}-color: var(--s-color-status-#{$status});
          }
        }
      }
    }
  }

  .item {
    flex-direction: column;
    &__title {
      justify-content: space-between;
      align-items: center;
    }
    &__label {
      flex-direction: column;
      word-break: break-word;
      > :first-child {
        font-weight: 300;
        font-size: var(--s-font-size-mini);
        line-height: $footer-label-line-height;
      }
      > :last-child {
        font-weight: 500;
        font-size: var(--s-font-size-small);
        line-height: $footer-label-line-height;
      }
    }
    &__desc {
      flex-wrap: wrap;
      margin-top: $inner-spacing-mini;
      > * {
        font-weight: 400;
        font-size: var(--s-font-size-mini);
        line-height: $footer-label-line-height;
        padding: 6px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        margin-bottom: $inner-spacing-mini;
      }
      > :first-child {
        margin-right: $inner-spacing-mini;
      }
    }
    &__action {
      margin-left: 30px;
      &,
      &:hover,
      &:focus,
      &:active {
        box-shadow: none;
        background: $footer-action-background-color;
        color: $footer-action-color;
      }
    }
  }
}
</style>

<style lang="scss" scoped>
$status-classes: 'error', 'warning', 'success';

.app-status {
  &__item {
    @include app-status-item;

    @each $status in $status-classes {
      &.#{$status} i {
        color: var(--s-color-status-#{$status});
      }
    }
  }
  &__loading {
    height: var(--s-font-size-mini);
    width: var(--s-font-size-mini);
    background-image: url('@/assets/img/status-pending.svg');
    @include loading;
  }
  &__text {
    margin-left: $inner-spacing-mini;
  }
}
</style>
