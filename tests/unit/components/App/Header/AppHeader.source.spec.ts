import { describe, expect, it } from 'vitest';

import appHeaderSource from '@/components/App/Header/AppHeader.vue?raw';

describe('AppHeader source', () => {
  it('only shows the marketing banner on desktop-width breakpoints and wider', () => {
    expect(appHeaderSource).toContain('<app-marketing v-show="showMarketing"></app-marketing>');
    expect(appHeaderSource).toContain('const showMarketing = computed(() =>');
    expect(appHeaderSource).toContain('BreakpointClass.Desktop');
    expect(appHeaderSource).toContain('BreakpointClass.LargeDesktop');
    expect(appHeaderSource).toContain('BreakpointClass.HugeDesktop');
  });

  it('uses the app router entrypoint for header navigation actions', () => {
    expect(appHeaderSource).toContain("import { goTo } from '@/app/router';");
    expect(appHeaderSource).toContain("from '@/app/shell/components'");
    expect(appHeaderSource).not.toContain("import { goTo, lazyComponent } from '@/router';");
    expect(appHeaderSource).not.toContain("import { lazyComponent } from '@/router';");
    expect(appHeaderSource).not.toContain('Components.AppMarketing');
  });

  it('bundles the settings dropdown with the header so it is present while logged out', () => {
    expect(appHeaderSource).toContain("import AppHeaderMenu from './AppHeaderMenu.vue';");
    expect(appHeaderSource).toContain('<app-header-menu></app-header-menu>');
    expect(appHeaderSource).not.toContain("const AppHeaderMenu = createAsyncComponent(() => import('./AppHeaderMenu.vue'));");
  });

  it('keeps mobile header icon controls aligned with the live site', () => {
    expect(appHeaderSource).toContain('aria-label="Menu"');
    expect(appHeaderSource).toContain(':aria-label="t(\'moonpay.buttons.buy\')"');
    expect(appHeaderSource).toContain('.header > &:not(.app-controls--middle) {');
    expect(appHeaderSource).toContain('.app-controls .settings-control.el-button {');
    expect(appHeaderSource).toContain('color: var(--s-color-base-content-tertiary) !important;');
    expect(appHeaderSource).toContain('.app-controls .settings-control.settings-control--open,');
    expect(appHeaderSource).toContain('color: var(--s-color-base-content-secondary) !important;');
    expect(appHeaderSource).toContain('width: 42px !important;');
    expect(appHeaderSource).toContain('height: 42px !important;');
    expect(appHeaderSource).toContain('min-height: 42px !important;');
    expect(appHeaderSource).toContain('line-height: 14px !important;');
    expect(appHeaderSource).toContain('font-weight: 500 !important;');
    expect(appHeaderSource).toContain('padding: 5px !important;');
    expect(appHeaderSource).toContain('.app-logo--header.app-logo.el-button {');
    expect(appHeaderSource).toContain('display: none !important;');
    expect(appHeaderSource).toContain('position: static !important;');
  });

  it('keeps the mobile menu button hover treatment aligned with production', () => {
    expect(appHeaderSource).toContain('.app-menu-button.el-button.neumorphic.s-action.s-primary {');
    expect(appHeaderSource).toContain('line-height: 14px !important;');
    expect(appHeaderSource).toContain('position: static !important;');
    expect(appHeaderSource).toContain(
      '.app-menu-button.el-button.neumorphic.s-action.s-primary:not(.is-disabled):hover'
    );
    expect(appHeaderSource).toContain('background-color: var(--s-color-theme-accent-hover) !important;');
    expect(appHeaderSource).toContain('0 0 20px rgba(247, 84, 163, 0.5) !important;');
  });

  it('mirrors the centered header toolbar offset for RTL locales', () => {
    expect(appHeaderSource).toContain("html[dir='rtl']");
    expect(appHeaderSource).toContain('direction: rtl;');
    expect(appHeaderSource).toContain('right: 42.5%;');
    expect(appHeaderSource).toContain('left: auto;');
    expect(appHeaderSource).toContain('transform: translate(50%, -50%);');
  });
});
