import { describe, expect, it } from 'vitest';
import { h } from 'vue';
import { mount } from '@vue/test-utils';
import sCollapseItemSource from '@/lib/soramitsu-ui/components/Accordion/SCollapseItem.vue?raw';

import SCollapse from '@/lib/soramitsu-ui/components/Accordion/SCollapse.vue';
import SCollapseItem from '@/lib/soramitsu-ui/components/Accordion/SCollapseItem.vue';

describe('SCollapse', () => {
  it('toggles item visibility and emits active item names', async () => {
    const wrapper = mount(SCollapse, {
      slots: {
        default: () =>
          h(
            SCollapseItem,
            { name: 'first' },
            {
              title: () => 'First item',
              default: () => h('div', { class: 'collapse-content' }, 'Body'),
            }
          ),
      },
    });

    const header = wrapper.find('.el-collapse-item__header');
    const arrow = wrapper.find('.el-collapse-item__arrow');

    expect(wrapper.find('.el-collapse-item').classes()).not.toContain('is-active');
    expect(arrow.element.tagName).toBe('I');
    expect(arrow.classes()).toContain('el-icon-arrow-right');

    await header.trigger('click');

    expect(wrapper.find('.el-collapse-item').classes()).toContain('is-active');
    expect(wrapper.emitted('change')?.[0]).toEqual([['first']]);

    await header.trigger('click');

    expect(wrapper.find('.el-collapse-item').classes()).not.toContain('is-active');
    expect(wrapper.emitted('change')?.[1]).toEqual([[]]);
  });

  it('keeps only one opened item in accordion mode', async () => {
    const wrapper = mount(SCollapse, {
      props: {
        accordion: true,
      },
      slots: {
        default: () => [
          h(
            SCollapseItem,
            { name: 'one' },
            {
              title: () => 'One',
              default: () => h('div', 'First'),
            }
          ),
          h(
            SCollapseItem,
            { name: 'two' },
            {
              title: () => 'Two',
              default: () => h('div', 'Second'),
            }
          ),
        ],
      },
    });

    const headers = wrapper.findAll('.el-collapse-item__header');

    await headers[0].trigger('click');
    await headers[1].trigger('click');

    const items = wrapper.findAll('.el-collapse-item');

    expect(items[0].classes()).not.toContain('is-active');
    expect(items[1].classes()).toContain('is-active');
    expect(wrapper.emitted('update:modelValue')?.[1]).toEqual(['two']);
  });

  it('uses production-style height transitions for collapse wrappers', () => {
    expect(sCollapseItemSource).toContain('class="el-collapse-item__wrap collapse-transition"');
    expect(sCollapseItemSource).toContain('@before-enter="handleBeforeEnter"');
    expect(sCollapseItemSource).toContain('@leave="handleLeave"');
    expect(sCollapseItemSource).toContain('height 0.3s ease-in-out');
  });

  it('renders legacy collapse arrow glyphs with the Soramitsu icon font', () => {
    expect(sCollapseItemSource).toContain('font-family: var(--s-font-family-icons, soramitsu-icons);');
  });

  it('keeps collapse arrows as clean icon controls in the active state', () => {
    expect(sCollapseItemSource).toContain('&__arrow.is-active');
    expect(sCollapseItemSource).toContain('transform: rotate(180deg);');
    expect(sCollapseItemSource).toContain('box-shadow: none;');
    expect(sCollapseItemSource).not.toContain('#fff -5px -5px 10px 0');
  });
});
