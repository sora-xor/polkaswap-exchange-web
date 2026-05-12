<template>
  <s-design-system-provider
    :value="libraryTheme"
    class="app sora-theme-provider"
    :class="dsProviderClasses"
    :data-theme="libraryTheme"
  >
    <notification-provider>
      <app-shell-layout></app-shell-layout>
      <app-shell-overlays></app-shell-overlays>
    </notification-provider>
  </s-design-system-provider>
</template>

<script setup lang="ts">
import { provide } from 'vue';

import AppShellLayout from './AppShellLayout.vue';
import { provideAppShellKey } from './context';
import { useAppShell } from './useAppShell';
import WalletComponentNotificationProvider from '@/lib/soraneo-wallet/src/components/NotificationProvider.vue';
import { createAsyncComponent } from '@/shared/ui/async';

const AppShellOverlays = createAsyncComponent(() => import('./AppShellOverlays.vue'));

const shell = useAppShell();
const NotificationProvider = WalletComponentNotificationProvider ?? 'div';

provide(provideAppShellKey, shell);

const { dsProviderClasses, libraryTheme } = shell;
</script>

<style lang="scss">
html {
  overflow-y: hidden;
  font-size: var(--s-font-size-small);
  letter-spacing: var(--s-letter-spacing-small);
  font-family: var(--s-font-family-default);
  background-color: var(--s-color-utility-body);
  scrollbar-color: transparent transparent;
}

body {
  font-family: var(--s-font-family-default);
}

ul ul {
  list-style-type: none;
}

#app {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-family: var(--s-font-family-default);
  min-height: 100vh;
  min-height: 100dvh;
  height: 100vh;
  height: 100dvh;
  color: var(--s-color-base-content-primary);
  background: var(--s-color-utility-body);
  transition: background-color 500ms linear;
}

.app {
  &-main.app-main {
    &--rewards,
    &--referral {
      .app-content {
        width: 100%;
      }
    }
  }

  &-body-scrollbar {
    flex: 1;

    @include scrollbar;

    > .el-scrollbar__bar {
      opacity: 0 !important;
    }

    > .el-scrollbar__bar.is-horizontal {
      display: none !important;
    }

    &:hover > .el-scrollbar__bar.is-vertical,
    &:focus-within > .el-scrollbar__bar.is-vertical {
      opacity: 0.25 !important;
    }
  }
}

.mobile.ios {
  .el-scrollbar__bar,
  .asset-list .scrollbar {
    opacity: 0.01 !important;
  }
}

.el-notification.sora {
  background: var(--s-color-brand-day);
  box-shadow: var(--s-shadow-tooltip);
  border-radius: calc(var(--s-border-radius-mini) / 2);
  border: none;
  align-items: center;
  position: absolute;
  width: 405px;
  max-width: calc(100vw - 24px);

  .el-notification {
    &__icon {
      position: relative;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--s-color-utility-surface);
      flex-shrink: 0;

      &:before {
        position: absolute;
        top: -2px;
        left: -2px;
      }

      &.el-icon-success {
        &,
        &:hover {
          color: var(--s-color-status-success);
        }
      }
    }

    &__content {
      margin-top: 0;
      color: var(--s-color-utility-surface);
      text-align: left;
    }

    &__closeBtn {
      top: $inner-spacing-medium;
      color: var(--s-color-utility-surface);

      &:hover {
        color: var(--s-color-utility-surface);
      }
    }
  }

  .loader {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 2px;
    background: var(--s-color-utility-surface);
    animation: runloader 4.5s linear infinite;

    @keyframes runloader {
      0% {
        width: 100%;
      }

      100% {
        width: 0;
      }
    }
  }

  &:hover .loader {
    width: 0;
    animation: none;
  }

  @include mobile(true) {
    width: 300px;
  }
}

.el-form--actions {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.el-message-box {
  border-radius: var(--s-border-radius-small) !important;

  &__message {
    white-space: pre-line;
  }
}

.container {
  @include container-styles;

  .el-loading-mask {
    border-radius: var(--s-border-radius-medium);
  }
}

.link {
  color: var(--s-color-base-content-primary);
}

.s-typography-button--large.is-disabled {
  font-size: var(--s-font-size-medium) !important;
}

.el-tooltip[class*=' s-icon-'],
.el-button.el-tooltip i[class*=' s-icon-'] {
  @include icon-styles(true);
}

i.icon-divider {
  @include icon-styles;
}

.app-main--orderbook {
  @include large-mobile {
    .app-menu {
      position: absolute;
      right: initial;
    }
  }

  .app-content {
    display: flex;
    justify-content: center;
  }
}

@include desktop {
  .app-main--swap,
  .app-main--vaults,
  .app-main--vaultdetails,
  .app-main--assetowner,
  .app-main--assetownerdetails {
    &.app-main {
      .app-menu {
        &:not(.collapsed) {
          position: relative;
        }

        &.collapsed {
          & + .app-body {
            margin-left: 74px;
          }
        }
      }
    }
  }
}
</style>
