<template>
  <div v-button class="countdown">
    <el-progress
      type="circle"
      :width="width"
      :stroke-width="strokeWidth"
      :percentage="percentage"
      :show-text="false"
      color="white"
    />
    <div class="countdown-content">
      <span class="countdown-content__count">{{ formattedCount }}</span>
      <span class="countdown-content__unit">{{ unit }}</span>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component
export default class Countdown extends Vue {
  @Prop({ default: 0, type: Number }) readonly count!: number;
  @Prop({ default: 100, type: Number }) readonly percentage!: number;
  @Prop({ default: '', type: String }) readonly unit!: string;
  @Prop({ default: 38, type: Number }) readonly width!: number;
  @Prop({ default: 2, type: Number }) readonly strokeWidth!: number;

  get formattedCount(): string {
    if (this.count < 1000) return String(this.count);

    return `${Math.trunc(this.count / 1000)}K`;
  }
}
</script>

<style lang="scss">
.countdown .el-progress-circle__track {
  stroke: rgba(255, 255, 255, 0.5);
}
</style>

<style lang="scss" scoped>
$coundown-container-padding: 2px;
$coundown-content-padding: 8px;
$countdown-box-shadow: 1px 1px 2px rgba(255, 255, 255, 0.1), inset -5px -5px 5px rgba(255, 255, 255, 0.05),
  inset 1px 1px 10px rgba(41, 0, 71, 0.33);

.countdown {
  cursor: pointer;
  flex-shrink: 0;
  width: var(--s-size-medium);
  height: var(--s-size-medium);
  background-color: var(--s-color-theme-accent);
  border-radius: 50%;
  box-shadow: $countdown-box-shadow;
  padding: $coundown-container-padding;
  position: relative;

  @include focus-outline;

  &-content {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    padding: $coundown-content-padding;
    display: flex;
    flex-flow: column nowrap;
    align-items: center;
    justify-content: center;
    color: white;
    line-height: 1;
    font-size: $s-heading3-caps-font-size;

    &__count {
      font-weight: 600;
      font-size: 1.4em;
    }
  }
}
</style>
