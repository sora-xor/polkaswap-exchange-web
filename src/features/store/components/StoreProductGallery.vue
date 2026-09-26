<template>
  <figure class="tea-gallery">
    <div class="tea-gallery__image">
      <Transition name="tea-photo" mode="out-in">
        <img
          :key="selectedView"
          :src="photos[selectedView]"
          :alt="t(`communityStore.${selectedView}Photo`)"
          width="960"
          height="1280"
          fetchpriority="high"
        />
      </Transition>
    </div>
    <figcaption class="tea-gallery__caption">
      <span>{{ t('communityStore.leafLabel') }}</span>
      <div class="tea-gallery__views" role="group" :aria-label="t('communityStore.photoViews')">
        <button
          v-for="view in views"
          :key="view"
          type="button"
          :aria-pressed="selectedView === view"
          @click="selectedView = view"
        >
          {{ t(`communityStore.${view}View`) }}
        </button>
      </div>
    </figcaption>
  </figure>
</template>

<script setup lang="ts">
import { ref } from 'vue';

import backPhoto from '@/assets/img/store/sencha-back.jpg';
import frontPhoto from '@/assets/img/store/sencha-front.jpg';
import showcasePhoto from '@/assets/img/store/sencha-showcase.png';
import { useTranslation } from '@/composables/useTranslation';

/** Local product photographs with accessible front/label controls. */
const views = ['showcase', 'front', 'back'] as const;
const photos = { showcase: showcasePhoto, front: frontPhoto, back: backPhoto };
const selectedView = ref<(typeof views)[number]>('showcase');
const { t } = useTranslation();
</script>

<style scoped lang="scss">
.tea-gallery {
  margin: 0;
  min-width: 0;

  &__image {
    overflow: hidden;
    aspect-ratio: 1 / 1.12;
    background: #c6a156;
    border-radius: 18px;
    box-shadow: var(--s-shadow-element-pressed, inset 3px 3px 7px #00000010, inset -3px -3px 7px #ffffffb3);
  }

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: 50% 48%;
    transition: transform 650ms cubic-bezier(0.2, 0.7, 0.3, 1);
  }

  &__image:hover img {
    transform: scale(1.025);
  }

  &__caption {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    padding: 16px 0;
    color: var(--s-color-base-content-secondary, #737078);
    font-size: 10px;
    letter-spacing: 0.08em;
  }

  &__views {
    display: flex;
    gap: 10px;
  }

  button {
    padding: 6px 11px;
    color: inherit;
    border: 0;
    border-bottom: 1px solid transparent;
    border-radius: 8px;
    background: transparent;
    font: inherit;
    font-size: 12px;
    letter-spacing: 0;
    cursor: pointer;
  }

  button[aria-pressed='true'] {
    color: var(--s-color-base-content-primary, #242329);
    border-bottom-color: transparent;
    box-shadow: var(--s-shadow-element-pressed, inset 2px 2px 5px #00000012, inset -2px -2px 5px #ffffffb3);
  }

  button:focus-visible {
    outline: 2px solid var(--s-color-theme-accent, #e94b93);
    outline-offset: 5px;
  }
}

.tea-photo-enter-active,
.tea-photo-leave-active {
  transition:
    opacity 140ms ease,
    transform 140ms ease;
}
.tea-photo-enter-from,
.tea-photo-leave-to {
  opacity: 0;
  transform: scale(1.015);
}

@media (max-width: 640px) {
  .tea-gallery__image {
    aspect-ratio: 1 / 1;
  }
  .tea-gallery__caption {
    font-size: 9px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tea-gallery img,
  .tea-photo-enter-active,
  .tea-photo-leave-active {
    transition: none;
  }
  .tea-gallery__image:hover img {
    transform: none;
  }
}
</style>
