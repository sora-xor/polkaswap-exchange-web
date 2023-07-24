<template>
  <div :class="['value-status-wrapper', status, { badge }]">
    <s-icon v-if="errorIcon" name="notifications-alert-triangle-24" size="12" class="value-status-wrapper-icon" />
    <slot />
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

enum Status {
  Success = 'success',
  Warning = 'warning',
  Error = 'error',
}

const getStatusDefault = (value: number): string => {
  if (value > 0) return Status.Success;
  if (value < -5) return Status.Error;
  if (value < -1) return Status.Warning;
  return '';
};

@Component
export default class ValueStatusWrapper extends Vue {
  @Prop({ default: false, type: Boolean }) readonly badge!: boolean;
  @Prop({ default: '', type: [String, Number] }) readonly value!: string | number;
  @Prop({ default: getStatusDefault, type: Function }) readonly getStatus!: (value: number) => string;

  get formatted(): number {
    const value = Number(this.value);

    return Number.isFinite(value) ? value : 0;
  }

  get status(): string {
    return this.getStatus(this.formatted);
  }

  get errorIcon(): boolean {
    return this.status === Status.Error && this.badge;
  }
}
</script>

<style lang="scss" scoped>
@mixin text-status($status: 'success', $property: 'color') {
  &.#{$status} {
    #{$property}: var(--s-color-status-#{$status});
  }
}

.value-status-wrapper {
  display: flex;
  flex-flow: row nowrap;
  align-items: baseline;
  gap: $inner-spacing-tiny;

  &:not(.badge) {
    @include text-status('success');
    @include text-status('warning');
    @include text-status('error');
  }

  &.badge {
    color: white;
    background-color: var(--s-color-base-content-tertiary);
    padding: 0 $inner-spacing-mini;
    border-radius: 100px;

    @include text-status('success', 'background-color');
    @include text-status('warning', 'background-color');
    @include text-status('error', 'background-color');
  }

  &-icon {
    color: white;
  }
}
</style>
