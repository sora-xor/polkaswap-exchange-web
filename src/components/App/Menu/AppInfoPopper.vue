<template>
  <s-popover-panel
    ref="popoverRef"
    placement="top"
    v-model:show="visible"
    trigger="click"
    popper-class="app-info-popper"
  >
    <template #reference>
      <div class="app-info-popper__reference">
        <slot></slot>
      </div>
    </template>
    <div class="app-info">
      <p class="app-info__description">{{ t('mobilePopup.info') }}</p>
      <div>
        <a
          v-for="item in SocialNetworkLinks"
          :key="item.href"
          class="app-info-link app-info-link--social"
          :href="item.href"
          target="_blank"
          rel="nofollow noopener"
        >
          <s-icon :name="item.icon" size="20"></s-icon>
          <span>{{ t(`social.${item.title}`) }}</span>
        </a>
      </div>
      <div class="el-divider el-divider--horizontal s-divider-secondary"></div>
      <button type="button" class="app-info-link app-info-link--product s-button" @click="openProductDialog">
        <s-icon name="symbols-24" size="20"></s-icon>
        <span>{{ t('mobilePopup.sideMenu') }}</span>
      </button>
      <div class="el-divider el-divider--horizontal s-divider-secondary"></div>
      <div>
        <a class="app-info-link app-info-link--text" :href="Links.privacy" target="_blank" rel="nofollow noopener">
          <span>{{ t('helpDialog.privacyPolicy') }}</span>
        </a>
        <a class="app-info-link app-info-link--text" :href="Links.releaseNotes" target="_blank" rel="nofollow noopener">
          <span>{{ t('releaseNotesText') }}</span>
        </a>
        <a class="app-info-link app-info-link--text" :href="Links.terms" target="_blank" rel="nofollow noopener">
          <span>{{ t('helpDialog.termsOfService') }}</span>
        </a>
      </div>
      <div class="app-info__versions">
        <div>{{ app.name }} v{{ app.version }}</div>
      </div>
    </div>
  </s-popover-panel>
</template>

<script setup lang="ts">
import { ref } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { Links, SocialNetworkLinks, app } from '@/consts';

const emit = defineEmits<{
  (e: 'open-product-dialog', product: string): void;
}>();

const { t } = useTranslation();
const visible = ref(false);
const popoverRef = ref<{ doClose?: () => void } | null>(null);

function openProductDialog(): void {
  emit('open-product-dialog', 'soraMobile');
  visible.value = false;
  popoverRef.value?.doClose?.();
}
</script>

<style lang="scss">
.app-info-popper.el-popover.el-popper {
  max-width: min(240px, calc(100vw - 16px));
  max-height: calc(100dvh - 16px);
  border: 1px solid #ede4e7;
  border-radius: 16px;
  background: #fdf7fb;
  box-shadow:
    -5px -5px 10px 0 #fff,
    1px 1px 10px 0 rgba(0, 0, 0, 0.1),
    1px 1px 2px 0 inset rgba(255, 255, 255, 0.8);
  padding: 16px;
  color: #2a171f;
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  line-height: 1.4;
  overflow: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;

  .el-divider--horizontal {
    margin: 0 0 12px;
    height: 1px;
    background: #ede4e7;
    border-top: 0;
  }
}

.app-info {
  font-size: var(--s-font-size-small);
  line-height: 150%;
  color: inherit;
}

.app-info__description {
  margin: 0 0 12px;
  color: inherit;
}

.app-info-link {
  display: flex;
  align-items: center;
  font-size: 13px;
  line-height: 150%;
  color: inherit;
  text-decoration: none;

  span {
    overflow-wrap: anywhere;
  }

  i {
    color: #d5cdd0 !important;
    font-size: 20px !important;
    line-height: 20px !important;
    margin-right: 8px;
  }

  &:hover,
  &:focus,
  &:visited,
  &:active {
    color: inherit;
    text-decoration: none;
  }
}

.app-info-link--social,
.app-info-link--product {
  min-height: 34px;
}

.app-info-link--product {
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  appearance: none;
  text-align: left;
  cursor: pointer !important;
  user-select: none;
}

.app-info__versions {
  margin-top: 0;
  font-size: 11px;
  line-height: 150%;
  color: #a19a9d;
}

:root[data-theme='dark'] .app-info-popper.el-popover.el-popper,
:root[design-system-theme='dark'] .app-info-popper.el-popover.el-popper,
.sora-theme-provider[data-theme='dark'] .app-info-popper.el-popover.el-popper,
.sora-theme-provider[design-system-theme='dark'] .app-info-popper.el-popover.el-popper {
  border-color: var(--s-color-base-border-secondary);
  background: var(--s-color-utility-surface);
  box-shadow: var(--s-shadow-dialog);
  color: var(--s-color-base-content-primary);

  .el-divider--horizontal {
    background: var(--s-color-base-border-secondary);
  }

  .app-info-link i,
  .app-info__versions {
    color: var(--s-color-base-content-tertiary) !important;
  }
}
</style>

<style lang="scss" scoped>
.app-info-popper__reference {
  display: block;
}
</style>
