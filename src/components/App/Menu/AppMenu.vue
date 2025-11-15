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
}>();

const { t } = useTranslation();

const pageLoading = computed(() => store.state.router.loading as boolean);
const collapsed = computed(() => store.state.settings.menuCollapsed as boolean);
const faucetUrl = computed(() => store.state.settings.faucetUrl as string);
const libraryTheme = computed(() => store.getters.libraryTheme as Theme);
const orderBookEnabled = computed(() => store.getters.settings.orderBookEnabled as boolean);
const kensetsuEnabled = computed(() => store.getters.settings.kensetsuEnabled as boolean);
const assetOwnerEnabled = computed(() => store.getters.settings.assetOwnerEnabled as boolean);

const menuElement = ref<HTMLElement | null>(null);

const currentPath = computed(() => store.state.router.currentRoute as string);

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
  store.commit.settings.setProductDialogVisibility(true);
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
