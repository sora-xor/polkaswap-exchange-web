import { SortDirection } from '@soramitsu-ui/ui/types';
import SortButton from '@/components/shared/Button/SortButton.vue';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

const ICON_STUB = {
  name: 'SIconStub',
  template: '<i class="s-icon-stub" :class="$attrs.class"></i>',
};

const mountComponent = (props?: Record<string, unknown>) =>
  mount(SortButton, {
    props,
    global: {
      directives: {
        button: {
          created: () => undefined,
          mounted: () => undefined,
        },
      },
      stubs: {
        's-icon': ICON_STUB,
      },
    },
  });

describe('SortButton', () => {
  it('renders inactive state when sort property differs', () => {
    const wrapper = mountComponent({
      name: 'volume',
      sort: {
        property: 'price',
        order: SortDirection.ASC,
      },
    });

    const icon = wrapper.find('.s-icon-stub');
    expect(icon.classes()).toContain('sort-icon');
    expect(icon.classes()).not.toContain('sort-icon--active');
  });

  it('applies active classes when current column is sorted', () => {
    const wrapper = mountComponent({
      name: 'price',
      sort: {
        property: 'price',
        order: SortDirection.ASC,
      },
    });

    const icon = wrapper.find('.s-icon-stub');
    expect(icon.classes()).toEqual(expect.arrayContaining(['sort-icon', 'sort-icon--active', 'sort-icon--ascending']));
  });

  it('toggles sort order when the same column is clicked', async () => {
    const wrapper = mountComponent({
      name: 'price',
      sort: {
        property: 'price',
        order: SortDirection.ASC,
      },
    });

    wrapper.element.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));
    await nextTick();

    const emitted = wrapper.emitted('change-sort');
    expect(emitted).toBeTruthy();
    expect(emitted?.[0]?.[0]).toEqual({
      property: 'price',
      order: SortDirection.DESC,
    });
  });

  it('emits default sort order when a new column is activated', async () => {
    const wrapper = mountComponent({
      name: 'price',
      sort: {
        property: 'volume',
        order: SortDirection.DESC,
      },
      defaultSort: SortDirection.ASC,
    });

    wrapper.element.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));
    await nextTick();

    const emitted = wrapper.emitted('change-sort');
    expect(emitted?.[0]?.[0]).toEqual({
      property: 'price',
      order: SortDirection.ASC,
    });
  });
});
