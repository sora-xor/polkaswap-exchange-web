<template>
  <s-button :class="['app-logo', { responsive }]" type="link" size="large" @click="onClick">
    <polkaswap-logo :theme="theme" class="app-logo__image"></polkaswap-logo>
  </s-button>
</template>

<script lang="ts" setup>
import { toRefs } from 'vue';

import PolkaswapLogo from '@/components/shared/Logo/Polkaswap.vue';
import { Theme } from '@/consts/theme';

defineOptions({
  components: {
    PolkaswapLogo,
  },
});

const props = withDefaults(
  defineProps<{
    /**
     * Theme applied to the Polkaswap logo.
     */
    theme?: Theme;
    /**
     * When true the logo shrinks on smaller layouts and switches image at breakpoints.
     */
    responsive?: boolean;
  }>(),
  {
    theme: Theme.LIGHT,
    responsive: false,
  }
);

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void;
}>();

const { theme, responsive } = toRefs(props);

/**
 * Re-emit click events so consumers can handle interactions without relying on compat listeners.
 */
function onClick(event: MouseEvent): void {
  emit('click', event);
}
</script>

<style lang="scss" scoped>
$logo-full-width: 172px;
$logo-full-height: 46px;

.app-logo {
  background-size: cover;
  width: $logo-full-width;
  height: $logo-full-height;
  border-radius: 0;

  &.el-button {
    padding: 0;
    margin-left: 0;
    margin-right: 0;
    transition-duration: 0s;
  }

  &.responsive {
    background-image: url('@/assets/img/pswap.svg');
    width: var(--s-size-medium);
    height: var(--s-size-medium);

    @include desktop {
      background-image: none;
      width: $logo-full-width;
      height: $logo-full-height;
    }

    .app-logo__image {
      visibility: hidden;

      @include desktop {
        visibility: visible;
      }
    }
  }
}
</style>
