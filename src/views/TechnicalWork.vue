<template>
  <div class="technical-work">
    <technical-work-background class="technical-work-background" />
    <div class="technical-work-main">
      <div class="technical-work-content">
        <app-logo-button class="technical-work-logo" color="white" @click="navigateToApp" />
        <div class="technical-work-title">Technical Work in Progress</div>
      </div>
      <div class="technical-work-footer">
        <app-powered-by-sora color="#D5CDD0" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';

import AppLogoButton from '@/components/App/Header/AppLogoButton.vue';
import AppPoweredBySora from '@/components/App/Footer/PoweredBySora.vue';
import TechnicalWorkBackground from '@/components/TechnicalWork/Background.vue';

import { detectBaseUrl } from '@/api';
import router from '@/router';

@Component({
  components: {
    AppLogoButton,
    AppPoweredBySora,
    TechnicalWorkBackground,
  },
})
export default class TechnicalWork extends Vue {
  // load main page again
  navigateToApp(): void {
    const baseUrl = detectBaseUrl(router);
    window.location.assign(baseUrl);
  }
}
</script>

<style lang="scss">
.technical-work-logo.app-logo .app-logo__image {
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
  background: conic-gradient(
    from 60.27deg at 74.46% -61.66%,
    rgba(242, 153, 133, 0.68) 0deg,
    #ff3b7b 117.86deg,
    rgba(169, 69, 209, 0.605193) 168.75deg,
    rgba(24, 165, 184, 0.2) 220.98deg,
    rgba(171, 24, 184, 0.25) 297.86deg,
    rgba(242, 44, 109, 0.38) 360deg
  );

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
