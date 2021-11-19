<template>
  <div class="stub">
    <stub-background class="stub-background" />
    <div class="stub-main">
      <div class="stub-content">
        <app-logo-button class="stub-logo" color="white" />
        <slot />
      </div>
      <div class="stub-footer">
        <app-powered-by-sora :theme="theme" color="#D5CDD0" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme';

import { Components } from '@/consts';
import { lazyComponent } from '@/router';

import StubBackground from '@/components/Stub/Background.vue';

@Component({
  components: {
    StubBackground,
    AppLogoButton: lazyComponent(Components.AppLogoButton),
    AppPoweredBySora: lazyComponent(Components.AppPoweredBySora),
  },
})
export default class StubLayout extends Vue {
  readonly theme = Theme.DARK;
}
</script>

<style lang="scss">
.stub-logo.app-logo .app-logo__image {
  width: 217px;
  height: 58px;
}
</style>

<style lang="scss" scoped>
$offset: 48px;

.stub {
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
  }

  &-footer,
  &-logo {
    margin-bottom: $offset;
  }
}
</style>
