<template functional>
  <s-card shadow="always" size="small" class="status-action-badge">
    <span class="status-action-badge__label"><slot name="label" /></span>
    <span class="status-action-badge__value"><slot name="value" /></span>
    <div class="status-action-badge__action"><slot name="action" /></div>
  </s-card>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';

@Component
export default class SwapStatusActionBadge extends Vue {}
</script>

<style lang="scss">
.status-action-badge.s-card.neumorphic.s-size-small {
  padding: $inner-spacing-tiny * 1.75 $inner-spacing-big * 2 $inner-spacing-tiny * 1.75 $inner-spacing-small;
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
    border-radius: 50%;
  }
}
</style>
