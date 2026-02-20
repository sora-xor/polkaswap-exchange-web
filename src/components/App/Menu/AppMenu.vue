<template>
  <div :class="['app-menu', { visible, collapsed, 'app-menu__loading': pageLoading }]" @click="emit('click', $event)">
    <s-button
      class="collapse-button"
      id="collapse-button"
      type="action"
      size="small"
      :icon="collapseIcon"
      :tooltip="collapseTooltip"
      @click.stop="collapseMenu"
    ></s-button>
    <s-scrollbar class="app-sidebar-scrollbar">
      <aside class="app-sidebar">
        <slot name="head"></slot>
        <div class="app-sidebar-menu">
          <s-menu
            class="menu"
            role="menubar"
            mode="vertical"
            background-color="transparent"
            box-shadow="none"
            text-color="var(--s-color-base-content-primary)"
            :active-text-color="mainMenuActiveColor"
            active-hover-color="transparent"
            :default-active="currentPath"
            @select="handleSelect"
          >
            <s-menu-item-group v-for="item in sidebarMenuItems" :key="item.index || item.title">
              <s-menu-item
                v-button
                :key="item.title"
                :index="item.index || item.title"
                :disabled="item.disabled"
                tabindex="0"
                class="menu-item"
              >
                <app-sidebar-item-content
                  tag="a"
                  rel="nofollow noopener"
                  tabindex="-1"
                  :href="item.href"
                  :icon="item.icon"
                  :title="t(`mainMenu.${item.title}`)"
                  @click.prevent="preventAnchorNavigation"
                ></app-sidebar-item-content>
              </s-menu-item>
            </s-menu-item-group>
            <s-menu-item-group>
              <app-sidebar-item-content
                v-button
                class="menu-item menu-item--bottom el-menu-item s-flex"
                icon="finance-PSWAP-24"
                href="https://about.polkaswap.io"
                tag="a"
                target="_blank"
                rel="nofollow noopener"
                :title="t('mainMenu.About')"
              ></app-sidebar-item-content>
            </s-menu-item-group>
          </s-menu>

          <s-menu
            class="menu"
            role="menubar"
            mode="vertical"
            background-color="transparent"
            box-shadow="none"
            text-color="var(--s-color-base-content-tertiary)"
            active-text-color="var(--s-color-base-content-tertiary)"
            active-hover-color="transparent"
          >
            <app-info-popper @open-product-dialog="openProductDialog">
              <app-sidebar-item-content
                v-button
                icon="info-16"
                :title="t('footerMenu.info')"
                class="el-menu-item menu-item--small"
                tabindex="0"
              ></app-sidebar-item-content>
            </app-info-popper>
            <app-sidebar-item-content
              v-if="faucetUrl"
              :icon="FaucetLink.icon"
              :title="t(`footerMenu.${FaucetLink.title}`)"
              :href="faucetUrl"
              tag="a"
              target="_blank"
              rel="nofollow noopener"
              class="el-menu-item menu-item--small"
            ></app-sidebar-item-content>
          </s-menu>
        </div>
      </aside>
    </s-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { Components, PageNames, SidebarMenuGroups, SidebarMenuItemLink, FaucetLink } from '@/consts';
import { Theme } from '@/consts/theme';
import { lazyComponent } from '@/router';
import store from '@/store';

import AppInfoPopper from './AppInfoPopper.vue';
import AppSidebarItemContent from './SidebarItemContent.vue';

const props = defineProps<{
  visible: boolean;
  onSelect: (item: any) => void;
}>();

const emit = defineEmits<{
  (e: 'click', event: Event): void;
  (e: 'open-product-dialog'): void;
}>();

const { t } = useTranslation();

const pageLoading = computed(() => Boolean(store.state.router?.loading));
const collapsed = computed(() => Boolean(store.state.settings?.menuCollapsed));
const faucetUrl = computed(() => (store.state.settings?.faucetUrl as string) ?? '');
const libraryTheme = computed(() => store.getters?.libraryTheme as Theme);
const orderBookEnabled = computed(() => Boolean(store.getters?.settings?.orderBookEnabled));
const kensetsuEnabled = computed(() => Boolean(store.getters?.settings?.kensetsuEnabled));
const assetOwnerEnabled = computed(() => Boolean(store.getters?.settings?.assetOwnerEnabled));

const menuElement = ref<HTMLElement | null>(null);

const currentPath = computed(() => (store.state.router?.currentRoute as string) ?? '');

const sidebarMenuItems = computed(() => {
  let menuItems: SidebarMenuItemLink[] = SidebarMenuGroups.slice();
  if (!orderBookEnabled.value) {
    menuItems = menuItems.filter(({ title }) => title !== PageNames.OrderBook);
  }
  if (!kensetsuEnabled.value) {
    menuItems = menuItems.filter(({ title }) => title !== PageNames.KensetsuVaults);
  }
  if (!assetOwnerEnabled.value) {
    menuItems = menuItems.filter(({ title }) => title !== PageNames.AssetOwnerContainer);
  }
  return menuItems;
});

const collapseIcon = computed(() => (collapsed.value ? 'arrows-chevron-right-24' : 'arrows-chevron-left-24'));
const collapseTooltip = computed(() => (collapsed.value ? 'Expand' : 'Collapse'));
const mainMenuActiveColor = computed(() =>
  libraryTheme.value === Theme.LIGHT ? 'var(--s-color-theme-accent)' : 'var(--s-color-theme-accent-focused)'
);

function collapseMenu(): void {
  store.commit.settings.setMenuCollapsed(!collapsed.value);
}

function preventAnchorNavigation(event: Event): void {
  event.preventDefault();
}

function openProductDialog(): void {
  emit('open-product-dialog');
}

function handleSelect(item: any): void {
  props.onSelect(item);
}

onMounted(() => {
  menuElement.value = document.querySelector('.app-sidebar') as HTMLElement | null;
  if (!menuElement.value) return;
  const resizeObserver = new ResizeObserver(() => {
    const width = menuElement.value?.clientWidth ?? 0;
    if (width) {
      document.documentElement.style.setProperty('--sidebar-width', `${width}px`);
    }
  });
  resizeObserver.observe(menuElement.value);
});

onBeforeUnmount(() => {
  document.documentElement.style.removeProperty('--sidebar-width');
});
</script>

<style lang="scss">
.app-sidebar-scrollbar {
  @include scrollbar(0, 100%, true);
}

.app-menu {
  background: var(--s-color-utility-body);
}

.app-menu.collapsed {
  @include tablet {
    background: transparent;

    .sidebar-item-content {
      & > .icon-container + span {
        display: none;
      }
    }

    .collapse-button {
      pointer-events: none;
    }

    &:hover,
    &:focus {
      background: var(--s-color-utility-body);
      box-shadow: 20px 20px 60px 0px #0000001a;

      .sidebar-item-content {
        & > .icon-container + span {
          display: initial;
        }
      }

      .collapse-button {
        pointer-events: all;
      }
    }
  }
}

.menu.el-menu {
  .el-menu-item-group__title {
    display: none;
  }

  &:not(.el-menu--horizontal) > :not(:last-child) {
    margin-bottom: 0;
  }

  .el-menu-item {
    .icon-container {
      box-shadow: var(--s-shadow-element-pressed);
    }

    &.menu-item--small {
      .icon-container {
        box-shadow: none;
        margin: 0;
        background-color: unset;

        & + span {
          margin-left: 0;
        }
      }
    }

    &.marketing .icon-container > i {
      color: var(--s-color-theme-accent);
    }

    &.is-disabled {
      opacity: 1;
      color: var(--s-color-base-content-secondary) !important;

      i {
        color: var(--s-color-base-content-tertiary);
      }
    }
    &:not(.is-active):not(.is-disabled) {
      &:hover,
      &:focus {
        i {
          color: var(--s-color-base-content-secondary) !important;
        }
        &.marketing i {
          color: var(--s-color-theme-accent-focused) !important;
        }
      }
    }
    &:active,
    &.is-disabled,
    &.is-active {
      &:not(.menu-item--small) {
        .icon-container {
          box-shadow: var(--s-shadow-element);
        }
      }
    }
    &.is-active {
      i {
        color: var(--s-color-theme-accent) !important;
      }
      span {
        font-weight: 400;
      }
    }
    &:focus {
      background-color: unset !important;
    }
  }
}
</style>

<style lang="scss" scoped>
.collapse-button {
  position: absolute;
  top: 100%;
  left: calc(100% - var(--s-size-small) / 2);
  bottom: 0;
  margin: auto;
  transition-duration: 0.2s;
  z-index: #{$app-sidebar-layer} + 1;

  &:hover,
  &:focus,
  &.focusing {
    background: var(--s-color-theme-accent-hover) !important;
    border-color: var(--s-color-utility-surface) !important;
    color: var(--s-color-base-on-accent) !important;
  }
}
.app {
  &-sidebar-scrollbar {
    height: 100%;
  }
  &-menu {
    flex-shrink: 0;
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: $app-sidebar-layer;
    visibility: hidden;

    .collapse-button {
      opacity: 0;

      @include tablet {
        &:not(.collapsed) {
          opacity: 0;
        }
      }
    }

    @include tablet {
      &:hover,
      &:focus,
      &:focus-within {
        .collapse-button {
          opacity: 1;
        }
      }
    }

    @include large-mobile(true) {
      position: fixed;
      right: 0;
      z-index: $app-above-loader-layer;

      &.visible {
        visibility: visible;
        background-color: rgba(42, 23, 31, 0.1);
        backdrop-filter: blur(4px);

        .app-sidebar {
          transform: translateX(0);
          transition-duration: 0.2s;
        }
      }

      .app-sidebar {
        width: 50%;
        min-width: calc(#{$breakpoint_mobile} / 2);
        background-color: var(--s-color-utility-body);
        padding: $inner-spacing-mini $inner-spacing-medium;
        filter: drop-shadow(32px 0px 64px rgba(0, 0, 0, 0.1));
        transform: translateX(-100%);
      }
    }

    @include large-mobile {
      visibility: visible;
      position: relative;
    }

    @include desktop {
      position: absolute;

      &:not(.collapsed) {
        position: relative;
      }
    }

    @include large-desktop {
      &:not(.collapsed) {
        position: absolute;
      }
    }

    &__loading {
      z-index: $app-above-loader-layer;
    }
  }

  &-sidebar {
    overflow-x: hidden;
    display: flex;
    flex: 1;
    flex-flow: column nowrap;
    padding: $inner-spacing-mini 0;
    border-right: none;

    &-menu {
      display: flex;
      flex: 1;
      flex-flow: column nowrap;
      justify-content: space-between;
      max-width: $sidebar-max-width;
      padding-right: $inner-spacing-mini; // for shadow
    }
  }
}

.menu {
  padding: 0;
  border-right: none;

  & + .menu {
    margin-top: $inner-spacing-small;
  }

  &.s-menu {
    border-bottom: none;

    .el-menu-item {
      margin-right: 0;
      margin-bottom: 0;
      border: none;
      border-radius: 0;
    }
  }

  .el-menu-item {
    padding-top: $inner-spacing-mini;
    padding-bottom: $inner-spacing-mini;

    height: initial;
    font-size: var(--s-font-size-medium);
    font-weight: 300;
    line-height: var(--s-line-height-medium);

    &:not(.menu-item--small) {
      padding-left: 0 !important;
      padding-right: 0;

      @include large-mobile {
        padding-left: $inner-spacing-mini !important;
        padding-right: $inner-spacing-mini;
      }

      @include tablet {
        padding-left: $inner-spacing-mini * 2 !important;
        padding-right: $inner-spacing-mini * 2;
      }
    }

    &.menu-item--small {
      font-size: var(--s-font-size-extra-mini);
      font-weight: 300;
      padding: 0;
      line-height: var(--s-line-height-medium);
      color: var(--s-color-base-content-secondary);

      @include large-mobile {
        padding: 0 $inner-spacing-mini;
      }
      @include tablet {
        padding: 0 $inner-spacing-small;
      }
    }

    &.marketing {
      color: var(--s-color-theme-accent);
      &:hover {
        color: var(--s-color-theme-accent-focused);
      }
    }
  }
}
</style>
