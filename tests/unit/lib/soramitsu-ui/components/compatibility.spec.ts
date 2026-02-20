import { describe, expect, it } from 'vitest';

import { getAllComponents } from '@/lib/soramitsu-ui/components/all-components';

describe('soramitsu-ui compatibility exports', () => {
  it('includes compatibility primitives required by exchange pages', () => {
    const components = getAllComponents();

    expect(components).toHaveProperty('SDesignSystemProvider');
    expect(components).toHaveProperty('SScrollbar');
    expect(components).toHaveProperty('SMenu');
    expect(components).toHaveProperty('SMenuItem');
    expect(components).toHaveProperty('SMenuItemGroup');
    expect(components).toHaveProperty('SIcon');
    expect(components).toHaveProperty('SImage');
    expect(components).toHaveProperty('SForm');
    expect(components).toHaveProperty('SFormItem');
    expect(components).toHaveProperty('SInput');
    expect(components).toHaveProperty('STabs');
  });

  it('keeps icon/button primitives in the registry for sidebar and header controls', () => {
    const components = getAllComponents();

    expect(components).toHaveProperty('SButton');
    expect(components).toHaveProperty('SIcon');
  });
});
