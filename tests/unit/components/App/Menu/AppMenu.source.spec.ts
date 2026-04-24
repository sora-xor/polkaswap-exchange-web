import { describe, expect, it } from 'vitest';

import appMenuSource from '@/components/App/Menu/AppMenu.vue?raw';

describe('AppMenu source', () => {
  it('keeps the collapse button aligned with the live sidebar lower edge', () => {
    expect(appMenuSource).toContain('.collapse-button {');
    expect(appMenuSource).toContain('top: 100%;');
    expect(appMenuSource).toContain('bottom: 0;');
    expect(appMenuSource).toContain('margin: auto;');
    expect(appMenuSource).not.toContain('left: calc(100% - var(--s-size-small));');
  });

  it('uses the app-owned loading state instead of the legacy router store mirror', () => {
    expect(appMenuSource).toContain("from '@/app/navigation/loading'");
    expect(appMenuSource).not.toContain("from '@/stores/router'");
    expect(appMenuSource).not.toContain("from '@/router'");
    expect(appMenuSource).not.toContain('lazyComponent(');
    expect(appMenuSource).not.toContain('Components.');
  });
});
