<template>
  <div class="app-header-menu">
    <s-button
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
          <div class="header-menu__settings">
            <p>Settings</p>
            <s-button class="s-pressed" type="action" icon="x-16" @click="handleClickHeaderMenu" />
          </div>
          <s-divider />
          <div v-for="section in dropdownHeaderMenuItems" :key="section.title">
            <p class="dropdown-section-title">{{ section.title }}</p>
            <div v-for="(item, index) in section.items" :key="item.value">
              <s-dropdown-item
                class="header-menu__item"
                :data-test-name="item.value"
                :icon="item.icon"
                :value="item.value"
                :disabled="item.disabled"
              >
                {{ item.text }}
                <s-icon :name="item.iconType" size="14px" class="icontype" />
                <span v-if="item.value === HeaderMenuType.Currency" class="current-currency">
                  {{ currency?.toUpperCase() }}
                </span>
              </s-dropdown-item>
              <s-divider class="divider-between-items" v-if="index < section.items.length - 1" />
            </div>
          </div>
        </template>
      </s-dropdown>
    </s-button>
  </div>
</template>

<script lang="ts">
import Theme from '@soramitsu-ui/ui-vue2/lib/types/Theme';
import { switchTheme } from '@soramitsu-ui/ui-vue2/lib/utils';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { getter, mutation, state } from '@/store/decorators';
import { updatePipTheme } from '@/utils';
import { tmaSdkService } from '@/utils/telegram';

import type { Currency } from '@soramitsu/soraneo-wallet-web/lib/types/currency';

enum HeaderMenuType {
  HideBalances = 'hide-balances',
  TurnPhoneHide = 'turn-phone-hide',
  Theme = 'theme',
  Language = 'language',
  Currency = 'currency',
  Notification = 'notification',
  Disclaimer = 'disclaimer',
}

type MenuItem = {
  value: HeaderMenuType;
  icon: string;
  iconType: string;
  text: string;
  disabled?: boolean;
};

type MenuSection = {
  title: string;
  items: Array<MenuItem>;
};

const BREAKPOINT = 1440;

@Component
export default class AppHeaderMenu extends Mixins(TranslationMixin) {
  readonly iconSize = 28;
  readonly HeaderMenuType = HeaderMenuType;

  @state.settings.disclaimerVisibility disclaimerVisibility!: boolean;
  @state.settings.userDisclaimerApprove userDisclaimerApprove!: boolean;
  @state.wallet.settings.shouldBalanceBeHidden private shouldBalanceBeHidden!: boolean;
  @state.wallet.settings.currency currency!: Currency;

  @getter.libraryTheme private libraryTheme!: Theme;
  @getter.settings.notificationActivated notificationActivated!: boolean;

  @mutation.wallet.settings.toggleHideBalance private toggleHideBalance!: FnWithoutArgs;
  @mutation.settings.setAlertSettingsPopup private setAlertSettingsPopup!: (flag: boolean) => void;
  @mutation.settings.setSelectLanguageDialogVisibility private setLanguageDialogVisibility!: (flag: boolean) => void;
  @mutation.settings.setSelectCurrencyDialogVisibility private setCurrencyDialogVisibility!: (flag: boolean) => void;
  @mutation.settings.toggleDisclaimerDialogVisibility private toggleDisclaimerDialogVisibility!: FnWithoutArgs;

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

  get disclaimerText(): string {
    return this.disclaimerVisibility ? this.t('headerMenu.hideDisclaimer') : this.t('headerMenu.showDisclaimer');
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

  // s-icon-various-brightness-low-24 for the sun
  // s-icon-basic-lightning-24 for the sun and moon
  private getHeaderMenuItems(isDropdown = false): Array<{ title: string; items: Array<MenuItem> }> {
    return [
      {
        title: 'BALANCES',
        items: [
          {
            value: HeaderMenuType.HideBalances,
            icon: this.getHideBalancesIcon(isDropdown),
            text: this.hideBalancesText,
            iconType: 'arrows-chevron-right-rounded-24',
          },
          {
            value: HeaderMenuType.TurnPhoneHide,
            icon: 'gadgets-iPhone-24',
            text: 'Turn phone & hide',
            iconType: 'arrows-chevron-right-rounded-24',
          },
        ],
      },
      {
        title: 'COLOR THEME',
        items: [
          {
            value: HeaderMenuType.Theme,
            icon: this.getThemeIcon(isDropdown), // Main icon
            text: this.themeText,
            iconType: 'arrows-chevron-right-rounded-24',
          },
          {
            value: HeaderMenuType.Language,
            icon: 'basic-globe-24', // Main icon
            text: this.t('headerMenu.switchLanguage'),
            iconType: 'arrows-chevron-right-rounded-24',
          },
        ],
      },
      {
        title: 'FIAT CURRENCY',
        items: [
          {
            value: HeaderMenuType.Currency,
            icon: 'various-lightbulb-24', // Main icon
            text: this.t('headerMenu.selectCurrency'),
            iconType: 'arrows-chevron-right-rounded-24',
          },
        ],
      },
      {
        title: 'MISC',
        items: [
          {
            value: HeaderMenuType.Notification,
            icon: 'notifications-bell-24', // Main icon
            text: this.t('browserNotificationDialog.title'),
            iconType: 'arrows-chevron-right-rounded-24',
          },
          {
            value: HeaderMenuType.Disclaimer,
            icon: 'info-16', // Main icon
            text: this.disclaimerText,
            iconType: 'arrows-chevron-right-rounded-24',
            disabled: this.disclaimerDisabled,
          },
        ],
      },
    ];
  }

  get headerMenuItems(): Array<MenuSection> {
    return this.getHeaderMenuItems();
  }

  get dropdownHeaderMenuItems(): Array<MenuSection> {
    return this.getHeaderMenuItems(true);
  }

  get disclaimerDisabled(): boolean {
    return this.disclaimerVisibility && !this.userDisclaimerApprove;
  }

  openNotificationDialog(): void {
    this.setAlertSettingsPopup(true);
  }

  handleClickHeaderMenu(): void {
    const dropdown = (this.$refs.headerMenu as any).dropdown;
    dropdown.visible ? dropdown.hide() : dropdown.show();
  }

  async handleSelectHeaderMenu(value: HeaderMenuType): Promise<void> {
    switch (value) {
      case HeaderMenuType.HideBalances:
        this.toggleHideBalance();
        break;
      case HeaderMenuType.Theme:
        await switchTheme();
        await this.$nextTick();
        updatePipTheme();
        tmaSdkService.updateTheme();
        break;
      case HeaderMenuType.Language:
        this.setLanguageDialogVisibility(true);
        break;
      case HeaderMenuType.Currency:
        this.setCurrencyDialogVisibility(true);
        break;
      case HeaderMenuType.Disclaimer:
        if (this.disclaimerDisabled) return;
        this.toggleDisclaimerDialogVisibility();
        break;
      case HeaderMenuType.Notification:
        this.openNotificationDialog();
        break;
    }
  }
}
</script>

<style lang="scss">
$icon-size: 28px;

.app-header-menu {
  display: flex;
}

.header-menu {
  $dropdown-background: var(--s-color-utility-surface);
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
  &__settings {
    min-width: 264px;
  }
  &__button i {
    font-size: $icon-size !important; // cuz font-size is inline style
  }
  &__settings {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 17px;
    width: 100%;
    i {
      font-size: 24px !important;
    }
    p {
      font-weight: 500;
      font-size: 15px;
      color: var(--s-color-base-content-primary);
    }
  }
  & &__item.el-dropdown-menu__item {
    line-height: $dropdown-item-line-height;
    font-weight: 300;
    font-size: var(--s-font-size-small);
    font-feature-settings: 'case' on;
    color: var(--s-color-base-content-secondary);
    display: flex;
    align-items: center;
    i {
      color: var(--s-color-base-content-tertiary);
      font-size: $icon-size;
    }
    .icontype {
      margin-left: auto;
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

    .current-currency {
      margin-left: 5px;
      color: var(--s-color-base-content-tertiary);
    }
  }
  .el-divider--horizontal {
    margin: unset;
  }
  .divider-between-items {
    margin-left: 50px;
  }
}

.dropdown-section-title {
  margin-top: 16px;
  margin-bottom: 19px;
  padding: 0 17px;
  font-size: 13px;
  font-weight: 700;
  color: var(--s-color-base-content-secondary);
}

.el-dropdown-menu__item.header-menu__item.is-disabled {
  pointer-events: initial;
  cursor: not-allowed;
}
</style>
