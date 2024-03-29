<template>
  <div class="progress-bar-container">
    <div class="progress-bar">
      <div class="success" />
      <div class="warning" />
      <div class="error" />
    </div>
    <div class="pointer" :style="{ left }" />
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component
export default class LtvProgressBar extends Vue {
  @Prop({ default: 0, type: Number, required: true }) readonly percentage!: number;

  get left(): string {
    if (this.percentage > 100) return '100%';
    if (this.percentage < 0) return '0%';
    return `${this.percentage}%`;
  }
}
</script>

<style lang="scss" scoped>
$progress-bar-radius: 8px;
$progress-bar-height: 20px;

@mixin text-status($status: 'success', $property: 'background-color') {
  .#{$status} {
    #{$property}: var(--s-color-status-#{$status});
    height: $progress-bar-height;
  }
}

.progress-bar-container {
  width: 100%;
  position: relative;
}

.progress-bar {
  width: 100%;
  height: $progress-bar-height;
  display: flex;

  @include text-status('success');
  @include text-status('warning');
  @include text-status('error');

  .success {
    flex: 3; // 0-30%
    border-top-left-radius: $progress-bar-radius;
    border-bottom-left-radius: $progress-bar-radius;
  }

  .warning {
    flex: 2; // 30-50%
  }

  .error {
    flex: 5; // 50-100%
    border-top-right-radius: $progress-bar-radius;
    border-bottom-right-radius: $progress-bar-radius;
  }
}

.pointer {
  position: absolute;
  top: -6px;
  height: 32px;
  width: 8px;
  background-color: var(--s-color-base-content-primary);
  border: 2px solid var(--s-color-utility-surface);
  border-radius: $progress-bar-radius;
}
</style>
