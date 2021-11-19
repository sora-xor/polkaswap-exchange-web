<template>
  <div class="technical-work">
    <technical-work-background class="technical-work-background" />
    <div class="technical-work-main">
      <div class="technical-work-content">
        <app-logo-button class="technical-work-logo" color="white" />
        <div class="technical-work-title">Technical Work in Progress</div>
      </div>
      <div class="technical-work-footer">
        <app-powered-by-sora color="#D5CDD0" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';

import AppLogoButton from '@/components/App/Header/AppLogoButton.vue';
import AppPoweredBySora from '@/components/App/Footer/PoweredBySora.vue';
import TechnicalWorkBackground from '@/components/TechnicalWork/Background.vue';

@Component({
  components: {
    AppLogoButton,
    AppPoweredBySora,
    TechnicalWorkBackground,
  },
})
export default class TechnicalWork extends Mixins(TranslationMixin) {}
</script>

<style lang="scss">
.stub-logo.app-logo .app-logo__image {
  width: 217px;
  height: 58px;
}
</style>

<style lang="scss" scoped>
$offset: 48px;

.technical-work {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;

  &-background,
  &-main {
    position: absolute;
    top: 0;
    left: 0;
    min-width: 100%;
    height: 100%;
  }

  &-background {
    z-index: 0;
  }

  &-main {
    display: flex;
    flex-flow: column nowrap;
    align-items: center;
    z-index: 1;
  }

  &-content,
  &-footer {
    display: flex;
    flex-flow: column nowrap;
    align-items: center;
    justify-content: center;
  }

  &-content {
    flex: 1;
    max-width: 650px;
    text-align: center;
  }

  &-title {
    color: white;
    font-size: 80px;
    font-weight: 800;
    line-height: 72px;
  }

  &-footer,
  &-logo {
    margin-bottom: $offset;
  }
}
</style>
