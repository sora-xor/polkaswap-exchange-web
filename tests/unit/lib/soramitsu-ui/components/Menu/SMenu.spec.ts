import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import { SMenu } from '@/lib/soramitsu-ui/components/Menu';

describe('SMenu compatibility', () => {
  it('keeps legacy visual classes for vertical menus', () => {
    const wrapper = mount(SMenu, {
      props: {
        mode: 'vertical',
      },
    });

    expect(wrapper.classes()).toEqual(expect.arrayContaining(['s-menu', 'el-menu', 's-menu--vertical']));
  });
});
