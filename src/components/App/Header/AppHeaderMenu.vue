<template>
  <div class="app-header-menu">
    <s-button
      v-if="!isLargeDesktop"
      type="action"
      class="settings-control s-pressed"
      :tooltip="t('headerMenu.settings')"
      @click="handleClickHeaderMenu"
    >
      <s-dropdown
        ref="headerMenu"
        class="header-menu__button"
        popper-class="header-menu"
        icon="grid-block-align-left-24"
        type="ellipsis"
        placement="bottom-start"
        @select="handleSelectHeaderMenu"
      >
        <template #menu>
          <s-dropdown-item
            v-for="{ value, icon, text } in dropdownHeaderMenuItems"
            :key="value"
            class="header-menu__item"
            :icon="icon"
            :value="value"
          >
            {{ text }}
          </s-dropdown-item>
        </template>
      </s-dropdown>
    </s-button>
    <div class="app-header-menu_panel" v-else>
      <s-button
        v-for="{ value, icon, text } in headerMenuItems"
        :key="value"
        type="action"
        class="s-pressed app-header-menu__button"
        :tooltip="text"
        @click="handleSelectHeaderMenu(value)"
      >
        <s-icon :name="icon" :size="iconSize" />
      </s-button>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme';
import { switchTheme } from '@soramitsu/soramitsu-js-ui/lib/utils';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { getter, mutation, state } from '@/store/decorators';

enum HeaderMenuType {
  HideBalances = 'hide-balances',
  Theme = 'theme',
  Language = 'language',
}

type MenuItem = {
  value: HeaderMenuType;
  icon: string;
  text: string;
};

const BREAKPOINT = 1440;

@Component
export default class AppHeaderMenu extends Mixins(TranslationMixin) {
  readonly iconSize = 28;
  readonly HeaderMenuType = HeaderMenuType;

  @state.wallet.settings.shouldBalanceBeHidden private shouldBalanceBeHidden!: boolean;
  @getter.libraryTheme private libraryTheme!: Theme;

  @mutation.wallet.settings.toggleHideBalance private toggleHideBalance!: AsyncVoidFn;
  @mutation.settings.setSelectLanguageDialogVisibility private setLanguageDialogVisibility!: (flag: boolean) => void;

  isLargeDesktop: boolean = window.innerWidth >= BREAKPOINT;

  private updateLargeDesktopFlag(e: MediaQueryListEvent): void {
    this.isLargeDesktop = e.matches;
  }

  get mediaQueryList(): MediaQueryList {
    return window.matchMedia(`(min-width: ${BREAKPOINT}px)`);
  }

  private getThemeIcon(isDropdown = false): string {
    if (isDropdown) {
      return this.libraryTheme === Theme.LIGHT ? 'various-moon-24' : 'various-brightness-low-24';
    } else {
      return this.libraryTheme === Theme.LIGHT ? 'various-brightness-low-24' : 'various-moon-24';
    }
  }

  get themeTitle(): string {
    return this.libraryTheme === Theme.LIGHT ? Theme.DARK : Theme.LIGHT;
  }

  get themeText(): string {
    const theme = this.t(this.themeTitle);
    return this.t('headerMenu.switchTheme', { theme });
  }

  private getHideBalancesIcon(isDropdown = false): string {
    if (isDropdown) {
      return this.shouldBalanceBeHidden ? 'basic-eye-no-24' : 'basic-filterlist-24';
    } else {
      return this.shouldBalanceBeHidden ? 'basic-filterlist-24' : 'basic-eye-no-24';
    }
  }

  get hideBalancesText(): string {
    return this.t(`headerMenu.${this.shouldBalanceBeHidden ? 'showBalances' : 'hideBalances'}`);
  }

  private getHeaderMenuItems(isDropdown = false): Array<MenuItem> {
    return [
      {
        value: HeaderMenuType.HideBalances,
        icon: this.getHideBalancesIcon(isDropdown),
        text: this.hideBalancesText,
      },
      {
        value: HeaderMenuType.Theme,
        icon: this.getThemeIcon(isDropdown),
        text: this.themeText,
      },
      {
        value: HeaderMenuType.Language,
        icon: 'basic-globe-24',
        text: this.t('headerMenu.switchLanguage'),
      },
    ];
  }

  get headerMenuItems(): Array<MenuItem> {
    return this.getHeaderMenuItems();
  }

  get dropdownHeaderMenuItems(): Array<MenuItem> {
    return this.getHeaderMenuItems(true);
  }

  mounted(): void {
    this.mediaQueryList.addEventListener('change', this.updateLargeDesktopFlag);
  }

  beforeDestroy(): void {
    this.mediaQueryList.removeEventListener('change', this.updateLargeDesktopFlag);
  }

  handleClickHeaderMenu(): void {
    const dropdown = (this.$refs.headerMenu as any).dropdown;
    dropdown.visible ? dropdown.hide() : dropdown.show();
  }

  handleSelectHeaderMenu(value: HeaderMenuType): void {
    switch (value) {
      case HeaderMenuType.HideBalances:
        this.toggleHideBalance();
        break;
      case HeaderMenuType.Theme:
        switchTheme();
        break;
      case HeaderMenuType.Language:
        this.setLanguageDialogVisibility(true);
        break;
    }
  }
}
</script>

<style lang="scss">
$icon-size: 28px;

.header-menu {
  $dropdown-background: var(--s-color-utility-body);
  $dropdown-margin: 24px;
  $dropdown-item-line-height: 42px;

  &.el-dropdown-menu.el-popper {
    margin-top: $dropdown-margin;
    background-color: $dropdown-background;
    border-color: var(--s-color-base-border-secondary);
    .popper__arrow {
      display: none;
    }
  }
  &__button i {
    font-size: $icon-size !important; // cuz font-size is inline style
  }
  &__item.el-dropdown-menu__item {
    line-height: $dropdown-item-line-height;
    font-weight: 300;
    font-size: var(--s-font-size-small);
    letter-spacing: var(--s-letter-spacing-small);
    font-feature-settings: 'case' on;
    color: var(--s-color-base-content-secondary);
    display: flex;
    align-items: center;
    i {
      color: var(--s-color-base-content-tertiary);
      font-size: $icon-size;
    }
    &:not(.is-disabled) {
      &:hover,
      &:focus {
        background-color: transparent;
        &,
        i {
          color: var(--s-color-base-content-secondary);
        }
      }
    }
  }
}
</style>

<style scoped lang="scss">
.app-header-menu {
  .app-header-menu_panel {
    &:not(:last-child) {
      margin-right: $inner-spacing-mini;
    }

    & > *:not(:last-child) {
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
    }

    & > *:not(:first-child) {
      border-top-left-radius: 0;
      border-bottom-left-radius: 0;
    }

    .el-button {
      + .el-button {
        margin-left: 0;
      }
    }

    @include desktop {
      margin-left: auto;
    }

    border-radius: var(--s-border-radius-small);

    & > *:not(:last-child) {
      border-right: 1px solid var(--s-color-base-content-tertiary) !important;
    }

    & > * {
      box-shadow: none !important;
    }
  }
}
</style>
