<template>
  <div class="big-counter">
    <div class="big-counter__row">
      <button class="big-counter__less" @click="decrease">
        <img src="img/big-counter-left.png" loading="lazy" alt="" />
      </button>

      <ul class="big-counter__numbers">
        <li class="big-counter__number active">{{ count }}</li>
        <li class="big-counter__number">{{ count + 1 }}</li>
        <li class="big-counter__number">{{ count + 2 }}</li>
      </ul>

      <button class="big-counter__more" @click="increase">
        <img src="img/big-counter-right.png" loading="lazy" alt="" />
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, ModelSync, Vue } from 'vue-property-decorator';

@Component
export default class BigCounter extends Vue {
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
