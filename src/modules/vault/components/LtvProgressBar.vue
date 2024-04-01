<template>
  <div class="progress-bar-container">
    <div class="progress-bar">
      <div class="success" />
      <div class="warning" />
      <div class="error" />
      <div class="pointer" :style="{ left }" />
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component
export default class LtvProgressBar extends Vue {
  @Prop({ default: 0, type: Number, required: true }) readonly percentage!: number;

  get left(): string {
    if (this.percentage >= 100) return 'calc(100% - 8px)'; // $progress-bar-pointer-width: 8px
    if (this.percentage < 0) return '0%';
    return `${this.percentage}%`;
  }
}
</script>

<style lang="scss" scoped>
$progress-bar-container-height: 32px;
$progress-bar-height: 20px;
$progress-bar-pointer-width: 8px;
$progress-bar-radius: 8px;

@mixin text-status($status: 'success', $property: 'background-color') {
  .#{$status} {
    &,
    &::before,
    &::after {
      #{$property}: var(--s-color-status-#{$status});
      height: $progress-bar-height;
    }
  }
}

.progress-bar-container {
  height: $progress-bar-container-height;
  align-items: center;
  justify-content: center;
  padding: 0 $progress-bar-pointer-width;
}

.progress-bar-container,
.progress-bar {
  position: relative;
  display: flex;
  width: 100%;
}

.progress-bar {
  height: $progress-bar-height;

  @include text-status('success');
  @include text-status('warning');
  @include text-status('error');

  .success,
  .error {
    &::before,
    &::after {
      position: absolute;
      top: 0;
      width: $progress-bar-pointer-width * 2; // to avoid concatenation issues
      content: '';
    }
  }

  .success {
    flex: 3; // 0-30%
    &::before {
      left: -$progress-bar-pointer-width;
      border-top-left-radius: $progress-bar-radius;
      border-bottom-left-radius: $progress-bar-radius;
    }
  }

  .warning {
    flex: 2; // 30-50%
  }

  .error {
    flex: 5; // 50-100%
    &::after {
      right: -$progress-bar-pointer-width;
      border-top-right-radius: $progress-bar-radius;
      border-bottom-right-radius: $progress-bar-radius;
    }
  }
}

.pointer {
  position: absolute;
  top: -(($progress-bar-container-height - $progress-bar-height) / 2); // center
  height: $progress-bar-container-height;
  width: $progress-bar-pointer-width;
  background-color: var(--s-color-base-content-primary);
  border: 2px solid var(--s-color-utility-surface);
  border-radius: $progress-bar-radius;
}
</style>
