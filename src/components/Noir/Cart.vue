<template>
  <div class="cart">
    <div class="cart__bg-1"></div>
    <div class="cart__bg-2"></div>
    <img src="img/cloud-pink.png" loading="lazy" alt="" class="cloud-pink" />
    <img src="img/cloud-perple.png" loading="lazy" alt="" class="cloud-perple" />
    <div class="blur-circle-1"></div>
    <div class="blur-circle-2"></div>

    <img src="img/cart-float-img.png" loading="lazy" alt="" class="cart__float-img" />

    <img src="img/stroke-img.png" loading="lazy" alt="" class="cart__stroke" />

    <div class="cart__corner corner">
      <div class="corner__inner">
        <div class="corner__circle">
          <img src="img/corner-circle-stroke.png" loading="lazy" alt="" class="corner__circle-stroke first" />
          <img src="img/corner-circle-stroke.png" loading="lazy" alt="" class="corner__circle-stroke second" />
        </div>
      </div>

      <img src="img/bottle.png" loading="lazy" alt="" class="corner__bottle-img" />
    </div>

    <div class="cart__content">
      <div class="cart__row">
        <div class="cart__currency">$NOIR</div>
      </div>

      <div class="cart__row">
        <div class="cart__title">New Moon Edition <span class="color-pink">1</span></div>
      </div>

      <div class="cart__spacer"></div>

      <div class="cart__row">
        <div class="pricing-stats">
          <div class="qwest pricing-stats__qwest">?</div>
          <span class="pricing-stats__text">Dynamic Pricing Stats</span>
        </div>
      </div>

      <div class="cart__row cart__row-price">
        <div class="price">
          <span>$90018</span><span class="price__after-dot">.04</span>
          <span class="color-pink">USD</span>
        </div>

        <div class="available">
          <span class="available__current">21</span>
          /
          <span class="available__max">302</span>
          Available
        </div>
      </div>

      <div class="cart__line"></div>

      <div class="cart__row">
        <div class="cart__description">
          Buy and sell the first phygital wine with digital currency.
          <br />
          Delivered on demand worldwide.
          <a href="#"> Learn more</a>
        </div>
      </div>

      <div class="cart__row-btns">
        <button class="btn btn-fill w-100 with-img-bg" @click="buy">
          <img src="img/btn-bg-1.png" loading="lazy" alt="" class="btn__bg" />
          <span class="btn__text">BUY</span>
        </button>
        <button class="btn btn-empty" @click="sell">Sell</button>
        <button class="btn btn-empty" @click="redeem">Redeem</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component
export default class Cart extends Vue {
  @Prop({ default: () => {}, type: Function }) readonly buy!: VoidFunction;
  @Prop({ default: () => {}, type: Function }) readonly sell!: VoidFunction;
  @Prop({ default: () => {}, type: Function }) readonly redeem!: VoidFunction;
}
</script>
