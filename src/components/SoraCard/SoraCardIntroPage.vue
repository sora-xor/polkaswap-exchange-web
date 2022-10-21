<template>
  <div class="container sora-card">
    <div class="sora-card__image">
      <sora-card />
    </div>
    <div class="sora-card__intro">
      <span class="sora-card__intro-name">SORA CARD</span>
      <h3 class="sora-card__intro-title">Pay with your crypto online, in-store or withdraw in ATM</h3>
      <span class="sora-card__intro-info">
        Get Euro IBAN account and Mastercard Debit Card connected to your SORA Wallet
      </span>
    </div>
    <s-button
      type="primary"
      class="sora-card__btn s-typography-button--large"
      :loading="loading"
      @click="handleConfirm"
    >
      APPLY FOR CARD
    </s-button>
  </div>
</template>

<script lang="ts">
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';
import SoraCard from '@/assets/img/sora-card/sora-card.svg?inline';

@Component({
  components: {
    SoraCard,
  },
})
export default class SoraCardIntroPage extends Mixins(mixins.LoadingMixin) {
  handleConfirm(): void {
    this.$emit('confirm-apply');
  }
}
</script>

<style lang="scss" scoped>
$color: #ee2233;
.sora-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  &__intro {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;

    &-title {
      width: 85%;
      text-align: center;
    }

    &-info {
      margin-top: 16px;
      font-weight: 300;
      width: 85%;
      text-align: center;
    }

    &-name {
      margin: 24px;
      font-size: 18px;
      font-weight: 600;
      color: $color;
    }
  }

  &__image {
    margin-top: -58px;
  }
}
</style>
