<template>
  <div class="count-input">
    <button class="count-input__btn" @click="decrease">-</button>
    <span class="count-input__value">{{ count }}</span>
    <button class="count-input__btn" @click="increase">+</button>
  </div>
</template>

<script lang="ts">
import { Component, Prop, ModelSync, Vue } from 'vue-property-decorator';

@Component
export default class CountInput extends Vue {
  @Prop({ default: 1, type: Number }) readonly min!: number;
  @Prop({ default: 0, type: Number }) readonly max!: number;

  @ModelSync('value', 'input', { type: Number })
  count!: number;

  async decrease(): Promise<void> {
    if (this.min && this.count === this.min) return;

    this.count = this.count - 1;
  }

  async increase(): Promise<void> {
    if (this.max && this.count === this.max) return;

    this.count = this.count + 1;
  }
}
</script>

<style lang="scss" scoped>
.count-input {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 172px;
  height: 58px;
  background: rgba(255, 154, 233, 0.5);
  backdrop-filter: blur(25px);
  border-radius: 15px;
  color: #ffffff;
  font-size: 15px;
  line-height: 18px;

  &__btn {
    width: 40px;
    height: 100%;
    color: #ffffff;

    &:first-child {
      border-right: 1px solid rgba(255, 255, 255, 0.2);
    }

    &:last-child {
      border-left: 1px solid rgba(255, 255, 255, 0.2);
    }
  }
}
</style>
