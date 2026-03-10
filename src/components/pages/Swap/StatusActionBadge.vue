<template>
  <s-card shadow="always" size="small" border-radius="small" class="status-action-badge">
    <span class="status-action-badge__label"><slot name="label"></slot></span>
    <span class="status-action-badge__value"><slot name="value"></slot></span>
    <div class="status-action-badge__action"><slot name="action"></slot></div>
  </s-card>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'SwapStatusActionBadge',
});
</script>

<style lang="scss">
.status-action-badge.s-card.neumorphic.s-size-small {
  min-height: 32px;
  height: 32px;
  border-radius: 24px !important;
  padding: $inner-spacing-tiny * 1.75 $inner-spacing-big * 2 $inner-spacing-tiny * 1.75 $inner-spacing-small;

  > .el-card__body {
    padding: 0;
  }
}
</style>

<style lang="scss" scoped>
$max-width: 158px;
$base-class: '.status-action-badge';

.s-card#{$base-class} {
  display: flex;
  align-items: center;
  flex-flow: row nowrap;
  position: relative;
  line-height: var(--s-line-height-medium);
  font-size: var(--s-font-size-mini);
  font-weight: 300;
  text-transform: uppercase;
  overflow: unset;
  box-shadow: var(--s-shadow-element);
  max-width: $max-width;

  #{$base-class}__label {
    margin-right: $inner-spacing-tiny;
  }

  #{$base-class}__value {
    color: var(--s-color-theme-accent);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  #{$base-class}__action {
    position: absolute;
    right: 0;
    top: 50%;
    transform: translate(0, -50%);
    background-color: var(--s-color-utility-body);
    border-radius: 50%;

    :deep(.s-button) {
      min-width: 42px;
      width: 42px;
      min-height: 42px;
      height: 42px;
      color: var(--s-color-base-content-tertiary);

      &:hover,
      &:focus {
        color: var(--s-color-base-content-secondary);
      }
    }
  }
}
</style>
