import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import ConnectionItems from '@/lib/soraneo-wallet/src/components/Connection/List/ConnectionItems.vue';
import connectionItemsSource from '@/lib/soraneo-wallet/src/components/Connection/List/ConnectionItems.vue?raw';

describe('ConnectionItems', () => {
  it('caps list height when item count reaches the visible threshold', () => {
    const wrapper = mount(ConnectionItems, {
      props: {
        size: 7,
        visible: 4,
        itemHeight: 60,
        itemOffset: 8,
      },
      global: {
        stubs: {
          SScrollbar: { template: '<div><slot /></div>' },
        },
      },
    });

    expect((wrapper.vm as any).style).toEqual({ height: '264px' });
  });

  it('does not force a height when there are fewer items than the visible limit', () => {
    const wrapper = mount(ConnectionItems, {
      props: {
        size: 2,
        visible: 4,
      },
      global: {
        stubs: {
          SScrollbar: { template: '<div><slot /></div>' },
        },
      },
    });

    expect((wrapper.vm as any).style).toEqual({});
  });

  it('sizes the default account-list viewport from the rendered row height', () => {
    const wrapper = mount(ConnectionItems, {
      props: {
        size: 7,
      },
      global: {
        stubs: {
          SScrollbar: { template: '<div><slot /></div>' },
        },
      },
    });

    expect((wrapper.vm as any).style).toEqual({ height: '496px' });
  });

  it('uses border-box rows so card padding does not clip the account list', () => {
    expect(connectionItemsSource).toContain('itemHeight: 64');
    expect(connectionItemsSource).toContain('.connection-items-list');
    expect(connectionItemsSource).toMatch(/& > \.account-card\s*\{[\s\S]*box-sizing:\s*border-box;/);
  });

  it('keeps the wallet list scrollbar on the production selector and rail geometry', () => {
    expect(connectionItemsSource).toContain('.connection-items.el-scrollbar');
    expect(connectionItemsSource).not.toContain('.connection-items.s-scrollbar.el-scrollbar');
    expect(connectionItemsSource).not.toContain('always-show-vertical-bar');
    expect(connectionItemsSource).toContain('scrollbar-width: none;');
    expect(connectionItemsSource).toContain('-ms-overflow-style: none;');
    expect(connectionItemsSource).toContain('&::-webkit-scrollbar');
    expect(connectionItemsSource).toContain('display: none !important;');
  });
});
