<template>
  <sora-card-intro v-if="step === Step.Intro" @confirm-apply="confirmApply" />
  <sora-card-kyc v-else-if="step === Step.KYC" @go-to-intro="openIntro" />
</template>

<script lang="ts">
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { Component, Mixins } from 'vue-property-decorator';

enum Step {
  Intro = 'Intro',
  KYC = 'KYC',
}

@Component({
  components: {
    SoraCardIntro: lazyComponent(Components.SoraCardIntroPage),
    SoraCardKyc: lazyComponent(Components.SoraCardKYC),
  },
})
export default class SoraCardIntroPage extends Mixins() {
  step: Step = Step.Intro;

  Step = Step;

  confirmApply(): void {
    this.step = Step.KYC;
  }

  openIntro(): void {
    this.step = Step.Intro;
  }
}
</script>

<style lang="scss">
$color: #ee2233;

.sora-card__btn {
  margin-top: 24px;
  width: 100%;
  background-color: $color !important;
}

.sora-card__no-spam {
  text-align: center;
  color: var(--s-color-base-content-secondary);
  margin-bottom: 8px;
}

.sora-card__input-description {
  color: var(--s-color-base-content-primary);
  font-size: var(--s-font-size-extra-small);
  font-weight: 300;
  line-height: var(--s-line-height-base);
  padding: var(--s-basic-spacing) calc(var(--s-basic-spacing) * 1.5) calc(var(--s-basic-spacing) * 2);
}
</style>
