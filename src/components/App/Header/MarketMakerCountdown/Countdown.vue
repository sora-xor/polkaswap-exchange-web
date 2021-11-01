<template>
  <div class="countdown">
    <el-progress
      type="circle"
      :width="38"
      :stroke-width="2"
      :percentage="percentage"
      :show-text="false"
      color="white"
    />
    <div class="countdown-content">
      <span class="countdown-content__count">{{ count }}</span>
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

.countdown {
  cursor: pointer;
  flex-shrink: 0;
  width: var(--s-size-medium);
  height: var(--s-size-medium);
  background-color: var(--s-color-theme-accent);
  border-radius: 50%;
  box-shadow: 1px 1px 2px rgba(255, 255, 255, 0.1), inset -5px -5px 5px rgba(255, 255, 255, 0.05),
    inset 1px 1px 10px rgba(41, 0, 71, 0.33);
  padding: $coundown-container-padding;
  position: relative;

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
    color: white;
    line-height: 1;

    &__count {
      font-weight: 600;
      font-size: var(--s-font-size-small);
    }

    &__unit {
      font-size: var(--s-font-size-extra-mini);
    }
  }
}
</style>
