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
            v-for="{ value, icon, text } in headerMenuItems"
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
    <template v-else>
      <s-button
        v-for="{ value, icon, text } in headerMenuItems"
        :key="value"
        type="action"
        class="s-pressed"
        :tooltip="text"
        @click="handleSelectHeaderMenu(value)"
      >
        <s-icon :name="icon" :size="iconSize" />
      </s-button>
    </template>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { Getter, Action } from 'vuex-class';
import Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme';
import { switchTheme } from '@soramitsu/soramitsu-js-ui/lib/utils';
import TranslationMixin from '@/components/mixins/TranslationMixin';

enum HeaderMenuType {
  HideBalances = 'hide-balances',
  Theme = 'theme',
  Language = 'language',
}

const BREAKPOINT = 1440;

@Component
export default class AppHeaderMenu extends Mixins(TranslationMixin) {
  readonly iconSize = 28;
  readonly HeaderMenuType = HeaderMenuType;
  // $breakpoint_large-desktop: 1440px;
  private readonly mediaQueryList = window.matchMedia(`(min-width: ${BREAKPOINT}px;)`);

  @Getter libraryTheme!: Theme;
  @Getter shouldBalanceBeHidden!: boolean;

  @Action toggleHideBalance!: AsyncVoidFn;
  @Action setSelectLanguageDialogVisibility!: (flag: boolean) => Promise<void>;

  isLargeDesktop = window.innerWidth >= BREAKPOINT;

  get headerMenuItems() {
    return [
      {
        value: HeaderMenuType.HideBalances,
        icon: this.hideBalancesIcon,
        text: this.hideBalancesText,
      },
      {
        value: HeaderMenuType.Theme,
        icon: this.themeIcon,
        text: this.themeText,
      },
      {
        value: HeaderMenuType.Language,
        icon: 'basic-globe-24',
        text: this.t('headerMenu.switchLanguage'),
      },
    ];
  }

  get themeIcon(): string {
    return this.libraryTheme === Theme.LIGHT ? 'various-moon-24' : 'various-brightness-low-24';
  }

  get themeTitle(): string {
    return this.libraryTheme === Theme.LIGHT ? Theme.DARK : Theme.LIGHT;
  }

  get themeText(): string {
    const theme = this.t(this.themeTitle);
    return this.t('headerMenu.switchTheme', { theme });
  }

  get hideBalancesIcon(): string {
    return this.shouldBalanceBeHidden ? 'basic-eye-no-24' : 'basic-filterlist-24';
  }

  get hideBalancesText(): string {
    return this.t(`headerMenu.${this.shouldBalanceBeHidden ? 'showBalances' : 'hideBalances'}`);
  }

  mounted(): void {
    this.mediaQueryList.addEventListener('change', this.updateLargeDesktopFlag);
  }

  beforeDestroy(): void {
    this.mediaQueryList.removeEventListener('change', this.updateLargeDesktopFlag);
  }

  private updateLargeDesktopFlag(e: MediaQueryListEvent): void {
    this.isLargeDesktop = e.matches;
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
        this.setSelectLanguageDialogVisibility(true);
        break;
    }
  }
}
</script>
