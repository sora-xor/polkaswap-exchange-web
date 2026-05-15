import { describe, expect, it } from 'vitest';

import appMenuSource from '@/components/App/Menu/AppMenu.vue?raw';

describe('AppMenu source', () => {
  it('keeps the collapse button aligned with the live sidebar lower edge', () => {
    expect(appMenuSource).toContain('border-style: none;');
    expect(appMenuSource).toContain(':aria-label="collapseTooltip"');
    expect(appMenuSource).toContain(':title="collapseTooltip"');
    expect(appMenuSource).toContain('.collapse-button {');
    expect(appMenuSource).toContain('top: 50%;');
    expect(appMenuSource).toContain('bottom: auto;');
    expect(appMenuSource).toContain('margin: auto;');
    expect(appMenuSource).toContain('transform: translateY(-50%);');
    expect(appMenuSource).toContain('display: block !important;');
    expect(appMenuSource).toContain('font-size: 12px !important;');
    expect(appMenuSource).toContain('line-height: 12px !important;');
    expect(appMenuSource).toContain('@include large-mobile(true) {');
    expect(appMenuSource).toContain('display: none !important;');
    expect(appMenuSource).not.toContain('left: calc(100% - var(--s-size-small));');
  });

  it('keeps the sidebar collapse button hidden until the sidebar is hovered', () => {
    expect(appMenuSource).toMatch(
      /\.collapse-button\s*\{[\s\S]*opacity:\s*0;[\s\S]*pointer-events:\s*none;[\s\S]*transition-property:\s*opacity, background-color, border-color, box-shadow, color;/s
    );
    expect(appMenuSource).toMatch(/&:focus-visible\s*\{[\s\S]*opacity:\s*1;[\s\S]*pointer-events:\s*all;/s);
    expect(appMenuSource).toMatch(
      /@include tablet\s*\{[\s\S]*&:hover\s*\{[\s\S]*\.collapse-button\s*\{[\s\S]*opacity:\s*1;[\s\S]*pointer-events:\s*all;/s
    );
  });

  it('uses the app-owned loading state instead of the legacy router store mirror', () => {
    expect(appMenuSource).toContain("from '@/app/navigation/loading'");
    expect(appMenuSource).not.toContain("from '@/stores/router'");
    expect(appMenuSource).not.toContain("from '@/router'");
    expect(appMenuSource).not.toContain('lazyComponent(');
    expect(appMenuSource).not.toContain('Components.');
  });

  it('uses the live active menu color in both light and noir themes', () => {
    expect(appMenuSource).toContain("const mainMenuActiveColor = computed(() => 'var(--s-color-theme-accent)');");
    expect(appMenuSource).not.toContain(
      "libraryTheme.value === Theme.LIGHT ? 'var(--s-color-theme-accent)' : 'var(--s-color-theme-accent-focused)'"
    );
  });
});
