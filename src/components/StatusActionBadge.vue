<template>
  <div class="status-action-badge">
    <span class="status-action-badge__label"><slot name="label" /></span>
    <span class="status-action-badge__value"><slot name="value" /></span>
    <div class="status-action-badge__action"><slot name="action" /></div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'

@Component
export default class StatusActionBadge extends Vue {}
</script>

<style lang="scss" scoped>
$badge-label-color: #53565A;

.status-action-badge {
  display: flex;
  align-items: center;
  flex-flow: row nowrap;
  position: relative;
  padding: ($inner-spacing-mini + 4) / 2 ($inner-spacing-big - 2) * 2 $inner-spacing-mini / 2 $inner-spacing-small;
  line-height: $s-line-height-medium;
  font-size: var(--s-heading7-font-size);
  font-weight: 300;
  letter-spacing: $s-letter-spacing-small;
  box-shadow: var(--s-shadow-surface);
  text-transform: uppercase;
  border-radius: var(--s-border-radius-big);
  background-color: var(--s-color-base-background);

  &__label {
    color: $badge-label-color;
    margin-right: $inner-spacing-mini / 2;
  }

  &__value {
    color: var(--s-color-theme-accent);
  }

  &__action {
    position: absolute;
    right: 0;
    background-color: var(--s-color-base-background);
    border-radius: 50%;
  }
}
</style>
