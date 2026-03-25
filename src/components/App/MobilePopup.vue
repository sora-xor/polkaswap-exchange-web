<template>
  <dialog-base class="popup" v-model:visible="isVisible">
    <div class="popup-mobile">
      <div class="popup-info">
        <h3 class="popup-info__headline" v-html="headlineHtml"></h3>
        <p class="popup-info__text">
          {{ t('mobilePopup.info') }}
        </p>
        <div>
          <a :href="StoreLinks.AppStore" target="_blank" rel="nofollow noopener" tabindex="-1">
            <s-button class="logo logo__app-store">App Store</s-button>
          </a>
          <a :href="StoreLinks.GooglePlay" target="_blank" rel="nofollow noopener" tabindex="-1">
            <s-button class="logo logo__google-play">Google Play</s-button>
          </a>
        </div>
      </div>
      <div class="popup-app">
        <img src="@/assets/img/mobile/sora-app-left.png" alt="mobile-left" class="popup-app__left-image" />
        <img src="@/assets/img/mobile/qr-code.svg?inline" alt="qr-code" class="popup-app__qr-code" />
        <img src="@/assets/img/mobile/sora-app-right.png" alt="mobile-right" class="popup-app__right-image" />
      </div>
    </div>
  </dialog-base>
</template>

<script lang="ts" setup>
import { components } from '@/shims/wallet-components';
import { computed } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { StoreLinks, app } from '@/consts';
import { escapeHtml, sanitizeHtml } from '@/utils/sanitize';

defineOptions({
  components: {
    DialogBase: components.DialogBase,
  },
});

const props = defineProps({
  fee: {
    type: String,
    default: undefined,
  },
});

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const isVisible = defineModel<boolean>('visible', { default: false });
const { t } = useTranslation();

const polkaswapHighlight = computed(() => {
  const safeName = escapeHtml(app.name);
  return `<span class="popup-info__headline--highlight">${safeName}</span>`;
});

const headlineHtml = computed(() => {
  const headline = t('mobilePopup.header', { polkaswapHighlight: polkaswapHighlight.value });

  return sanitizeHtml(headline, {
    allowedTags: ['span', 'strong', 'em', 'br'],
    allowedAttributes: {
      span: ['class'],
    },
  });
});
</script>

<style lang="scss">
.popup .el-dialog {
  width: min(660px, calc(100vw - 24px)) !important;
  max-width: min(660px, calc(100vw - 24px)) !important;
  margin-top: clamp(16px, 22vh, 180px) !important;
}

.popup-info {
  &__headline {
    margin-bottom: $basic-spacing;
    font-weight: 500;
    text-transform: unset;
    &--highlight {
      color: var(--s-color-theme-accent);
    }
  }

  &__text {
    margin-bottom: $basic-spacing;
  }
}
</style>

<style lang="scss" scoped>
.popup-mobile {
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  gap: $inner-spacing-medium;
}

.popup-info {
  flex: 1 1 auto;
  min-width: 0;
}

@include mobile-app-logos;

.popup-app {
  display: flex;
  position: relative;
  flex: 0 0 auto;
  justify-content: center;
  min-width: 260px;

  &__qr-code {
    width: 244px;
    height: 244px;
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    border-radius: 8%;
    top: 0;
  }

  &__left-image {
    height: 320px;
    width: 200px;
    margin-top: -50px;
  }

  &__right-image {
    height: 260px;
    width: 150px;
    margin-left: -50px;
  }
}

@include tablet(true) {
  .popup-mobile {
    flex-direction: column;
    gap: $inner-spacing-small;
  }

  .popup-app {
    width: 100%;
    min-width: 0;
    padding-top: $inner-spacing-medium;

    &__left-image {
      width: auto;
      height: 220px;
      margin-top: 0;
      margin-left: auto;
      margin-right: auto;
    }

    &__right-image {
      display: none;
    }

    &__qr-code {
      width: 156px;
      height: 156px;
      top: 32px;
    }
  }
}

@include mobile(true) {
  .popup-app {
    padding-top: $inner-spacing-small;

    &__left-image {
      height: 188px;
    }

    &__qr-code {
      width: 132px;
      height: 132px;
      top: 28px;
    }
  }
}
</style>
