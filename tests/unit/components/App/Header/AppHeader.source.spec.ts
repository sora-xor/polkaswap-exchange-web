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
});
