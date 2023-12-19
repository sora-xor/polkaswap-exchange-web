<template>
  <s-scrollbar
    class="app-menu app-sidebar-scrollbar"
    :class="{ visible, 'app-menu__about': isAboutPageOpened, 'app-menu__loading': pageLoading }"
  >
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
</template>

<script lang="ts">
import Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import {
  PageNames,
  PoolChildPages,
  BridgeChildPages,
  RewardsChildPages,
  StakingChildPages,
  ExploreChildPages,
  SidebarMenuGroups,
  SidebarMenuItemLink,
  FaucetLink,
} from '@/consts';
import { StakingPageNames } from '@/modules/staking/consts';
import { getter, state } from '@/store/decorators';

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
  @Prop({ default: false, type: Boolean }) readonly isAboutPageOpened!: boolean;
  @Prop({ default: () => {}, type: Function }) readonly onSelect!: FnWithoutArgs;

  @state.settings.faucetUrl faucetUrl!: string;
  @state.router.loading pageLoading!: boolean;
  @getter.settings.soraCardEnabled private soraCardEnabled!: boolean;
  @getter.libraryTheme private libraryTheme!: Theme;

  readonly SidebarMenuGroups = SidebarMenuGroups;
  readonly FaucetLink = FaucetLink;

  get mainMenuActiveColor(): string {
    return this.libraryTheme === Theme.LIGHT ? 'var(--s-color-theme-accent)' : 'var(--s-color-theme-accent-focused)';
  }

  get sidebarMenuItems(): Array<SidebarMenuItemLink> {
    if (this.soraCardEnabled) return SidebarMenuGroups;
    return SidebarMenuGroups.filter((menuItem) => menuItem.title !== PageNames.SoraCard);
  }

  get currentPath(): string {
    const currentName = this.$route.name as any;
    if (PoolChildPages.includes(currentName)) {
      return PageNames.Pool;
    }
    if (BridgeChildPages.includes(currentName)) {
      return PageNames.Bridge;
    }
    if (RewardsChildPages.includes(currentName)) {
      return PageNames.Rewards;
    }
    if (StakingChildPages.includes(currentName)) {
      return StakingPageNames.Staking;
    }
    if (ExploreChildPages.includes(currentName)) {
      return PageNames.ExploreFarming;
    }
    return currentName as string;
  }

  openProductDialog(product: string): void {
    this.$emit('open-product-dialog', product);
  }

  /** To ignore left click */
  preventAnchorNavigation(e?: Event): void {
    e?.preventDefault();
  }
}
</script>

<style lang="scss">
.app-sidebar-scrollbar {
  @include scrollbar;
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
    i.el-icon-bank-card {
      width: 28px; // to avoid issue with paddings
    }
  }
}
</style>

<style lang="scss" scoped>
.app {
  &-menu {
    flex-shrink: 0;
    visibility: hidden;
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: $app-sidebar-layer;

    @include large-mobile(true) {
      position: fixed;

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

      .app-sidebar {
        max-width: initial;
      }
    }

    @include large-desktop {
      position: absolute;
      right: initial;
    }

    &__about {
      @include tablet {
        position: relative;
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
    padding-top: $inner-spacing-small;
    border-right: none;

    &-menu {
      display: flex;
      flex: 1;
      flex-flow: column nowrap;
      justify-content: space-between;
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
        padding-left: $inner-spacing-mini * 2.5 !important;
        padding-right: $inner-spacing-mini * 2.5;
      }
    }

    &.menu-item--small {
      font-size: var(--s-font-size-extra-mini);
      font-weight: 300;
      padding: 0;
      line-height: var(--s-line-height-medium);
      color: var(--s-color-base-content-secondary);

      @include large-mobile {
        padding: 0 $inner-spacing-mini * 1.25;
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
@/modules/staking/demeter/consts
