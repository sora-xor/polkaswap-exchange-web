<template>
  <div :class="['app-menu', { visible, collapsed, 'app-menu__loading': pageLoading }]">
    <s-button
      class="collapse-button"
      id="collapse-button"
      type="action"
      size="small"
      :icon="collapseIcon"
      :tooltip="collapseTooltip"
      @click="collapseMenu"
    />
    <s-scrollbar class="app-sidebar-scrollbar">
      <aside class="app-sidebar">
        <slot name="head"></slot>
        <div class="app-sidebar-menu">
          <s-menu
            class="menu"
            mode="vertical"
            background-color="transparent"
            box-shadow="none"
            text-color="var(--s-color-base-content-primary)"
            :active-text-color="mainMenuActiveColor"
            active-hover-color="transparent"
            :default-active="currentPath"
            @select="onSelect"
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
                  @click.native="preventAnchorNavigation"
                />
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
              />
            </s-menu-item-group>
          </s-menu>

          <s-menu
            class="menu"
            mode="vertical"
            background-color="transparent"
            box-shadow="none"
            text-color="var(--s-color-base-content-tertiary)"
            active-text-color="var(--s-color-base-content-tertiary)"
            active-hover-color="transparent"
          >
            <app-sidebar-item-content
              v-if="false"
              v-button
              icon="star-16"
              title="Vote on Survey!"
              href="https://form.typeform.com/to/Mb6p2Kpy"
              tag="a"
              target="_blank"
              rel="nofollow noopener"
              class="el-menu-item menu-item--small marketing"
            />
            <app-info-popper @open-product-dialog="openProductDialog">
              <app-sidebar-item-content
                v-button
                icon="info-16"
                :title="t('footerMenu.info')"
                class="el-menu-item menu-item--small"
                tabindex="0"
              />
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
            />
          </s-menu>
        </div>
      </aside>
    </s-scrollbar>
  </div>
</template>

<script lang="ts">
import Theme from '@soramitsu-ui/ui-vue2/lib/types/Theme';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import {
  PageNames,
  PoolChildPages,
  BridgeChildPages,
  RewardsChildPages,
  ExploreChildPages,
  SidebarMenuGroups,
  SidebarMenuItemLink,
  FaucetLink,
} from '@/consts';
import { DashboardPageNames } from '@/modules/dashboard/consts';
import { isDashboardPage } from '@/modules/dashboard/router';
import { PoolPageNames } from '@/modules/pool/consts';
import { StakingPageNames } from '@/modules/staking/consts';
import { isStakingPage } from '@/modules/staking/router';
import { VaultPageNames } from '@/modules/vault/consts';
import { isVaultPage } from '@/modules/vault/router';
import { getter, mutation, state } from '@/store/decorators';

import AppInfoPopper from './AppInfoPopper.vue';
import AppSidebarItemContent from './SidebarItemContent.vue';

@Component({
  components: {
    AppInfoPopper,
    AppSidebarItemContent,
  },
})
export default class AppMenu extends Mixins(TranslationMixin) {
  @Prop({ default: false, type: Boolean }) readonly visible!: boolean;
  @Prop({ default: () => {}, type: Function }) readonly onSelect!: (item: any) => void;

  @state.settings.faucetUrl faucetUrl!: string;
  @state.router.loading pageLoading!: boolean;
  @state.settings.menuCollapsed collapsed!: boolean;

  @getter.settings.orderBookEnabled private orderBookEnabled!: boolean;
  @getter.settings.kensetsuEnabled private kensetsuEnabled!: boolean;
  @getter.settings.assetOwnerEnabled private assetOwnerEnabled!: boolean;
  @getter.libraryTheme private libraryTheme!: Theme;

  @mutation.settings.setMenuCollapsed private setMenuCollapsed!: (collapsed: boolean) => void;

  readonly FaucetLink = FaucetLink;

  private resizeObserver: Nullable<ResizeObserver> = null;

  private onMenuWidthChange(): void {
    const width = this.$el?.clientWidth ?? 0;
    if (!width) return;

    document.documentElement.style.setProperty('--sidebar-width', `${width}px`);
  }

  async mounted(): Promise<void> {
    await this.$nextTick();
    if (!(this.$el && window.ResizeObserver)) return;
    this.resizeObserver = new ResizeObserver(this.onMenuWidthChange);
    this.resizeObserver.observe(this.$el);
  }

  beforeDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  get collapseIcon(): string {
    return this.collapsed ? 'arrows-chevron-right-24' : 'arrows-chevron-left-24';
  }

  get collapseTooltip(): string {
    return this.collapsed ? 'Expand' : 'Collapse';
  }

  get mainMenuActiveColor(): string {
    return this.libraryTheme === Theme.LIGHT ? 'var(--s-color-theme-accent)' : 'var(--s-color-theme-accent-focused)';
  }

  get sidebarMenuItems(): Array<SidebarMenuItemLink> {
    let menuItems = SidebarMenuGroups;

    if (!this.orderBookEnabled) {
      menuItems = menuItems.filter(({ title }) => title !== PageNames.OrderBook);
    }
    if (!this.kensetsuEnabled) {
      menuItems = menuItems.filter(({ title }) => title !== VaultPageNames.VaultsContainer);
    }
    if (!this.assetOwnerEnabled) {
      menuItems = menuItems.filter(({ title }) => title !== PageNames.AssetOwnerContainer);
    }

    return menuItems;
  }

  get currentPath(): string {
    const currentName = this.$route.name as PageNames;
    if (PoolChildPages.includes(currentName)) {
      return PoolPageNames.Pool;
    }
    if (BridgeChildPages.includes(currentName)) {
      return PageNames.Bridge;
    }
    if (RewardsChildPages.includes(currentName)) {
      return PageNames.Rewards;
    }
    if (isStakingPage(currentName)) {
      return StakingPageNames.Staking;
    }
    if (ExploreChildPages.includes(currentName)) {
      return PageNames.ExploreTokens;
    }
    if (isDashboardPage(currentName)) {
      return DashboardPageNames.AssetOwner;
    }
    if (isVaultPage(currentName)) {
      return VaultPageNames.Vaults;
    }
    return currentName;
  }

  openProductDialog(product: string): void {
    this.$emit('open-product-dialog', product);
  }

  /** To ignore left click */
  preventAnchorNavigation(e?: Event): void {
    e?.preventDefault();
  }

  collapseMenu(e?: PointerEvent) {
    ((e?.target as HTMLElement | null)?.closest?.('#collapse-button') as HTMLElement | null)?.blur();
    this.setMenuCollapsed(!this.collapsed);
  }
}
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

    flex-shrink: 0;
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: $app-sidebar-layer;
    visibility: hidden;

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
