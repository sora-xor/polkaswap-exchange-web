<template>
  <div class="quantity">
    <button class="quantity__minus" @click="decrease">-</button>
    <s-float-input
      :value="String(count)"
      :decimals="0"
      :max="max"
      :min="min"
      @input="handleInput"
      size="medium"
      class="quantity__input"
    />
    <button class="quantity__plus" @click="increase">+</button>
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
    this.handleInput(this.count - 1);
  }

  async increase(): Promise<void> {
    this.handleInput(this.count + 1);
  }

  handleInput(value: number | string): void {
    if (this.min && +value < this.min) {
      this.count = this.min;
    } else if (this.max && +value > this.max) {
      this.count = this.max;
    } else {
      this.count = +value;
    }
  }
}
</script>

<style lang="scss">
.quantity input {
  text-align: center !important;
}
</style>
