<template>
  <s-scrollbar :class="['app-menu', 'app-sidebar-scrollbar', { visible }]">
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
          :default-active="getCurrentPath()"
          @select="onSelect"
        >
          <s-menu-item-group v-for="(group, index) in SidebarMenuGroups" :key="index">
            <s-menu-item
              v-for="item in group"
              :key="item.title"
              :index="item.title"
              :disabled="item.disabled"
              class="menu-item"
            >
              <sidebar-item-content :icon="item.icon" :title="t(`mainMenu.${item.title}`)" />
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
          <app-info-popper>
            <sidebar-item-content icon="info-16" :title="t('footerMenu.info')" class="el-menu-item menu-item--small" />
          </app-info-popper>

          <sidebar-item-content
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
import { Component, Mixins, Prop } from 'vue-property-decorator';
import { Getter, State } from 'vuex-class';
import Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme';

import TranslationMixin from '@/components/mixins/TranslationMixin';

import { PageNames, PoolChildPages, BridgeChildPages, SidebarMenuGroups, FaucetLink, Components } from '@/consts';

import router, { lazyComponent } from '@/router';

@Component({
  components: {
    AppInfoPopper: lazyComponent(Components.AppInfoPopper),
    SidebarItemContent: lazyComponent(Components.SidebarItemContent),
  },
})
export default class AppMenu extends Mixins(TranslationMixin) {
  @Prop({ default: false, type: Boolean }) readonly visible!: boolean;
  @Prop({ default: () => {}, type: Function }) readonly onSelect!: VoidFunction;

  @State((state) => state.settings.faucetUrl) faucetUrl!: string;
  @Getter libraryTheme!: Theme;

  readonly SidebarMenuGroups = SidebarMenuGroups;
  readonly FaucetLink = FaucetLink;

  get mainMenuActiveColor(): string {
    return this.libraryTheme === Theme.LIGHT ? 'var(--s-color-theme-accent)' : 'var(--s-color-theme-accent-focused)';
  }

  getCurrentPath(): string {
    if (PoolChildPages.includes(router.currentRoute.name as PageNames)) {
      return PageNames.Pool;
    }
    if (BridgeChildPages.includes(router.currentRoute.name as PageNames)) {
      return PageNames.Bridge;
    }
    return router.currentRoute.name as string;
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
      background-color: unset;
    }
  }
}
</style>

<style lang="scss" scoped>
.app {
  &-menu {
    visibility: hidden;
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 3;

    @include mobile {
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
        min-width: $breakpoint_mobile / 2;
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

    @include tablet {
      position: absolute;
      right: initial;
    }
  }

  &-sidebar {
    overflow-x: hidden;
    display: flex;
    flex: 1;
    flex-flow: column nowrap;
    padding: $inner-spacing-small 0;
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
      letter-spacing: var(--s-letter-spacing-small);
      line-height: var(--s-line-height-medium);
      color: var(--s-color-base-content-secondary);

      @include large-mobile {
        padding: 0 $inner-spacing-mini * 1.25;
      }
      @include tablet {
        padding: 0 $inner-spacing-small;
      }
    }
  }
}
</style>
