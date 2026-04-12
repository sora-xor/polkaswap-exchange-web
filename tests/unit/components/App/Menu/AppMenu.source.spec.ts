import { describe, expect, it } from 'vitest';

import appMenuSource from '@/components/App/Menu/AppMenu.vue?raw';

describe('AppMenu source', () => {
  it('keeps the collapse button inside the sidebar shell at tablet widths', () => {
    expect(appMenuSource).toContain('@media (min-width: $breakpoint_tablet) and (max-width: #{$breakpoint_desktop - 1})');
    expect(appMenuSource).toContain('.collapse-button {');
    expect(appMenuSource).toContain('left: calc(100% - var(--s-size-small));');
  });
});
