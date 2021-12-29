<template>
  <div class="sora-logo">
    <span class="sora-logo__title" :style="{ color: titleColor }">{{ t('poweredBy') }}</span>
    <a class="sora-logo__image" href="https://sora.org" title="Sora" target="_blank" rel="nofollow noopener">
      <sora-logo :theme="theme" :color="color" />
    </a>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme';

import TranslationMixin from '@/components/mixins/TranslationMixin';

import SoraLogo from '@/components/logo/Sora.vue';

@Component({
  components: {
    SoraLogo,
  },
})
export default class PoweredBySora extends Mixins(TranslationMixin) {
  @Prop({ default: Theme.LIGHT, type: String }) readonly theme!: Theme;
  @Prop({ default: '', type: String }) readonly color!: string;

  get titleColor(): string {
    if (this.color) return this.color;
    if (this.theme === Theme.DARK) return 'var(--s-color-base-content-tertiary)';

    return 'var(--s-color-base-content-primary)';
  }
}
</script>

<style lang="scss" scoped>
$sora-logo-height: 36px;
$sora-logo-width: 173.7px;

.sora-logo {
  display: flex;
  align-items: center;

  &__title {
    text-transform: uppercase;
    font-weight: 200;
    font-size: 15px;
    line-height: 16px;
    margin-right: $basic-spacing;
    white-space: nowrap;
  }

  &__image {
    width: $sora-logo-width;
    height: $sora-logo-height;
  }
}
</style>
