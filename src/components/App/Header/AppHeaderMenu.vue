<template>
  <div class="app-header-menu">
    <s-button
      type="action"
      class="settings-control s-pressed"
      :tooltip="isDropdownVisible ? '' : t('headerMenu.settings')"
      @click="handleClickHeaderMenu"
    >
      <s-dropdown
        ref="headerMenu"
        :popper-class="`header-menu ${!isDropdownVisible ? 'slide-in' : ''} custom-z-index`"
        class="header-menu__button"
        icon="grid-block-align-left-24"
        type="ellipsis"
        placement="bottom-start"
        :hide-on-click="false"
        @visible-change="handleDropdownVisibilityChange"
      >
        <template #menu>
          <div class="header-menu__settings">
            <p>{{ t('settingsText') }}</p>
            <s-button class="s-pressed" type="action" icon="x-16" @click="handleClickHeaderMenu" />
          </div>
          <s-divider />
          <div v-for="section in dropdownHeaderMenuItems" :key="section.title">
            <p class="dropdown-section-title">{{ section.title.toUpperCase() }}</p>
            <div v-for="(item, index) in section.items" :key="item.value" @click="handleSelectHeaderMenu(item.value)">
              <s-dropdown-item
                class="header-menu__item"
                :data-test-name="item.value"
                :icon="item.isTextInsteadIcon ? null : item.icon"
                :value="item.value"
                :disabled="item.disabled"
              >
                <span v-if="item.isTextInsteadIcon" class="current-currency">
                  {{ getCurrenyOrLanguage(item.value).toUpperCase() }}
                </span>

                <p>{{ item.text }}</p>
                <template v-if="item.isThemeItem">
                  <div class="check" :class="{ selected: selectedTheme === item.value }">
                    <s-icon name="basic-check-mark-24" size="12px" />
                  </div>
                </template>
                <template v-else-if="item.value === HeaderMenuType.HideBalances">
                  <s-switch class="icontype" :value="shouldBalanceBeHidden" />
                </template>
                <template v-else-if="item.value === HeaderMenuType.TurnPhoneHide">
                  <s-switch
                    v-if="isAccessRotationListener && !isAccessAccelerometrEventDeclined"
                    class="icontype"
                    :value="isRotatePhoneHideBalanceFeatureEnabled"
                  />
                  <s-icon v-else :name="item.iconType" size="14px" class="icontype" />
                </template>
                <template v-else>
                  <s-icon :name="item.iconType" size="14px" class="icontype" />
                </template>
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
import { Component, Mixins, Watch } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Language, Languages } from '@/consts';
import { BreakpointClass } from '@/consts/layout';
import { getter, mutation, state } from '@/store/decorators';
import { updatePipTheme } from '@/utils';
import { tmaSdkService } from '@/utils/telegram';

import type { Currency } from '@soramitsu/soraneo-wallet-web/lib/types/currency';

enum HeaderMenuType {
  HideBalances = 'hide-balances',
  TurnPhoneHide = 'turn-phone-hide',
  LightMode = 'light',
  NoirMode = 'noir',
  Theme = 'theme',
  Language = 'language',
  Currency = 'currency',
  Notification = 'notification',
  Disclaimer = 'disclaimer',
}

type MenuItem = {
  value: HeaderMenuType;
  icon: string;
  iconType?: string;
  text: string;
  disabled?: boolean;
  isThemeItem?: boolean;
  isTextInsteadIcon?: boolean;
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
  selectedTheme: HeaderMenuType | null = null;
  isDropdownVisible = false;

  @state.settings.disclaimerVisibility disclaimerVisibility!: boolean;
  @state.settings.userDisclaimerApprove userDisclaimerApprove!: boolean;
  @state.settings.isRotatePhoneHideBalanceFeatureEnabled private isRotatePhoneHideBalanceFeatureEnabled!: boolean;
  @state.settings.isAccessRotationListener private isAccessRotationListener!: boolean;
  @state.settings.isAccessAccelerometrEventDeclined private isAccessAccelerometrEventDeclined!: boolean;
  @state.settings.language currentLanguage!: Language;
  @state.settings.isTMA isTMA!: boolean;
  @state.settings.screenBreakpointClass private screenBreakpointClass!: BreakpointClass;
  @state.wallet.settings.shouldBalanceBeHidden private shouldBalanceBeHidden!: boolean;
  @state.wallet.settings.currency currency!: Currency;

  @getter.libraryTheme private libraryTheme!: Theme;
  @getter.settings.notificationActivated notificationActivated!: boolean;

  @mutation.wallet.settings.toggleHideBalance private toggleHideBalance!: FnWithoutArgs;
  @mutation.settings.setAlertSettingsPopup private setAlertSettingsPopup!: (flag: boolean) => void;
  @mutation.settings.setSelectLanguageDialogVisibility private setLanguageDialogVisibility!: (flag: boolean) => void;
  @mutation.settings.setSelectCurrencyDialogVisibility private setCurrencyDialogVisibility!: (flag: boolean) => void;
  @mutation.settings.setRotatePhoneDialogVisibility private setRotatePhoneDialogVisibility!: (flag: boolean) => void;
  @mutation.settings.setIsRotatePhoneHideBalanceFeatureEnabled private setIsRotatePhoneHideBalanceFeatureEnabled!: (
    flag: boolean
  ) => void;

  @mutation.settings.toggleDisclaimerDialogVisibility private toggleDisclaimerDialogVisibility!: FnWithoutArgs;

  @Watch('libraryTheme', { immediate: true })
  onLibraryThemeChange(newTheme: Theme) {
    this.selectedTheme = newTheme === Theme.LIGHT ? HeaderMenuType.LightMode : HeaderMenuType.NoirMode;
  }

  get mediaQueryList(): MediaQueryList {
    return window.matchMedia(`(min-width: ${BREAKPOINT}px)`);
  }

  mounted() {
    this.selectedTheme = this.libraryTheme === Theme.LIGHT ? HeaderMenuType.LightMode : HeaderMenuType.NoirMode;
  }

  handleDropdownVisibilityChange(visible: boolean) {
    this.isDropdownVisible = visible;
  }

  get isMobile(): boolean {
    return this.screenBreakpointClass === BreakpointClass.Mobile;
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

  private getCurrenyOrLanguage(value: string): string {
    if (value === HeaderMenuType.Currency) {
      return this?.currency;
    } else {
      return this.currentLanguage;
    }
  }

  private getHeaderMenuItems(isDropdown = false): Array<{ title: string; items: Array<MenuItem> }> {
    return [
      {
        title: this.t('headerMenu.titleBalance'),
        items: [
          {
            value: HeaderMenuType.HideBalances,
            icon: this.getHideBalancesIcon(isDropdown),
            text: this.hideBalancesText,
            iconType: 'arrows-chevron-right-rounded-24',
          },
          ...(this.isTMA && this.isMobile
            ? [
                {
                  value: HeaderMenuType.TurnPhoneHide,
                  icon: 'gadgets-iPhone-24',
                  text: this.t('headerMenu.turnPhoneHideBalances'),
                  iconType: 'arrows-chevron-right-rounded-24',
                },
              ]
            : []),
        ],
      },
      {
        title: this.t('headerMenu.titleTheme'),
        items: [
          {
            value: HeaderMenuType.Theme,
            icon: 'basic-lightning-24',
            text: 'System preferences',
            isThemeItem: true,
          },
          {
            value: HeaderMenuType.LightMode,
            icon: 'various-brightness-low-24',
            text: this.t('headerMenu.switchTheme', { theme: this.t('light') }),
            isThemeItem: true,
          },
          {
            value: HeaderMenuType.NoirMode,
            icon: 'finance-PSWAP-24',
            text: this.t('headerMenu.switchTheme', { theme: this.t('noir') }),
            isThemeItem: true,
          },
        ],
      },
      {
        title: this.t('headerMenu.titleCurrency'),
        items: [
          {
            value: HeaderMenuType.Currency,
            icon: 'various-lightbulb-24',
            text: this.t('headerMenu.selectCurrency'),
            iconType: 'arrows-chevron-right-rounded-24',
            isTextInsteadIcon: true,
          },
        ],
      },
      {
        title: this.t('headerMenu.titleMisc'),
        items: [
          {
            value: HeaderMenuType.Notification,
            icon: 'notifications-bell-24',
            text: this.t('browserNotificationDialog.title'),
            iconType: 'arrows-chevron-right-rounded-24',
          },
          {
            value: HeaderMenuType.Disclaimer,
            icon: 'info-16',
            text: this.disclaimerText,
            iconType: 'arrows-chevron-right-rounded-24',
            disabled: this.disclaimerDisabled,
          },
          {
            value: HeaderMenuType.Language,
            icon: 'basic-globe-24',
            text: `${Languages.find((lang) => lang.key === this.currentLanguage)?.name}`,

            iconType: 'arrows-chevron-right-rounded-24',
            isTextInsteadIcon: true,
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

  getDropdownVisible(): boolean {
    const dropdown = (this.$refs.headerMenu as any)?.dropdown;
    return dropdown ? dropdown.visible : false;
  }

  handleClickHeaderMenu(): void {
    const dropdown = (this.$refs.headerMenu as any).dropdown;
    if (dropdown) {
      if (dropdown.visible) {
        dropdown.hide();
        this.isDropdownVisible = false;
      } else {
        dropdown.show();
        this.isDropdownVisible = true;
      }
    }
  }

  async handleSelectHeaderMenu(value: HeaderMenuType): Promise<void> {
    switch (value) {
      case HeaderMenuType.HideBalances:
        this.toggleHideBalance();
        break;
      case HeaderMenuType.LightMode:
      case HeaderMenuType.NoirMode:
        if (this.selectedTheme !== value) {
          this.selectedTheme = value;
          await switchTheme();
          await this.$nextTick();
          updatePipTheme();
          tmaSdkService.updateTheme();
        }
        break;
      case HeaderMenuType.TurnPhoneHide:
        if (this.isRotatePhoneHideBalanceFeatureEnabled) {
          this.setIsRotatePhoneHideBalanceFeatureEnabled(false);
          tmaSdkService.removeDeviceRotationListener();
          this.setRotatePhoneDialogVisibility(false);
        } else if (!this.isRotatePhoneHideBalanceFeatureEnabled && this.isAccessRotationListener) {
          tmaSdkService.listenForDeviceRotation();
          this.setIsRotatePhoneHideBalanceFeatureEnabled(true);
        } else {
          this.setRotatePhoneDialogVisibility(true);
        }

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
$item-padding: 17px;

.app-header-menu {
  display: flex;
}

.header-menu {
  $dropdown-background: var(--s-color-utility-surface);
  $dropdown-item-line-height: 42px;

  &.custom-z-index {
    z-index: calc($app-loader-layer - 1) !important;
  }
  transform: translateX(-100%);
  transition: transform 0.2s cubic-bezier(0.22, 0.77, 0.81, 0.61);

  &.slide-in {
    transform: translateX(0);
  }

  &.el-dropdown-menu.el-popper {
    background-color: $dropdown-background;
    box-shadow: var(--s-shadow-element-pressed);
    position: fixed !important;
    top: -16px !important;
    max-width: $menu-setting-max-width;
    height: calc(100% - #{$footer-height} + 4px);
    right: calc(0px - ($menu-setting-max-width - $inner-spacing-small));
    left: auto !important;
    border-radius: unset;
    border: unset;
    .popper__arrow {
      display: none;
    }
  }
  &__button i {
    font-size: $icon-size !important;
  }
  &__settings {
    min-width: 264px;
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
    font-weight: 500;
    font-size: var(--s-font-size-small);
    font-feature-settings: 'case' on;
    color: var(--s-color-base-content-primary);
    display: flex;
    align-items: center;
    p {
      @include text-ellipsis;
      margin-left: $inner-spacing-small;
      margin-right: $inner-spacing-tiny;
    }
    i {
      color: var(--s-color-base-content-tertiary);
      font-size: $icon-size;
    }
    .icontype {
      margin-left: auto;
    }

    &:focus {
      background-color: transparent;
      color: var(--s-color-base-content-primary);
    }

    &:hover,
    &:focus:hover {
      background-color: transparent;
      color: var(--s-color-base-content-secondary);
    }

    @include tablet(true) {
      &:hover {
        color: var(--s-color-base-content-primary) !important;
      }
    }

    .current-currency {
      min-width: 31px;
      text-align: center;
      color: var(--s-color-base-content-secondary);
    }
  }

  &__item .check {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 24px;
    height: 24px;
    border: 1px solid var(--s-color-base-content-secondary);
    border-radius: 50%;
    transition: opacity 150ms, border-color 150ms, background-color 150ms;
    margin-left: auto;
    i {
      margin: unset;
    }
  }

  .check i {
    opacity: 0;
  }

  .selected {
    background: var(--s-color-theme-accent);
    border: 1px solid transparent;
    i {
      &::before {
        color: white;
      }
      opacity: 1;
    }
  }

  .el-divider--horizontal {
    margin: unset;
  }

  .divider-between-items {
    margin-left: calc($basic-spacing * 4);
  }
}

.dropdown-section-title {
  margin-top: 16px;
  margin-bottom: 19px;
  padding: 0 $item-padding;
  font-size: 13px;
  font-weight: 700;
  color: var(--s-color-base-content-secondary);
}

.el-dropdown-menu__item.header-menu__item.is-disabled {
  pointer-events: initial;
  cursor: not-allowed;
}
</style>
