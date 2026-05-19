import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import { SInput } from '@/lib/soramitsu-ui/components/Input';
import SearchInput from '@/lib/soraneo-wallet/src/components/Input/SearchInput.vue';
import searchInputSource from '@/lib/soraneo-wallet/src/components/Input/SearchInput.vue?raw';

describe('Wallet SearchInput', () => {
  it('exposes focus for dialogs that restore cursor focus after opening', () => {
    const focus = vi.fn();
    const wrapper = mount(SearchInput, {
      props: {
        modelValue: '',
      },
      global: {
        components: {
          SInput: defineComponent({
            name: 'SInputStub',
            inheritAttrs: false,
            setup(_, { expose }) {
              expose({ focus });
              return () => h('input', { class: 'el-input__inner' });
            },
          }),
        },
        stubs: {
          SButton: {
            name: 'SButton',
            template: '<button type="button"><slot /></button>',
          },
        },
      },
    });

    (wrapper.vm as unknown as { focus: () => void }).focus();

    expect(focus).toHaveBeenCalledTimes(1);
  });

  it('keeps the native search field editable even when readonly leaks through attrs', () => {
    const wrapper = mount(SearchInput, {
      props: {
        modelValue: '',
      },
      attrs: {
        readonly: true,
        placeholder: 'Search by currency name or symbol',
      },
      global: {
        components: {
          SInput: defineComponent({
            name: 'SInputStub',
            inheritAttrs: false,
            props: ['readonly', 'modelValue'],
            emits: ['update:modelValue'],
            template: '<input class="el-input__inner" :readonly="readonly" :value="modelValue" />',
          }),
        },
        stubs: {
          SButton: {
            name: 'SButton',
            template: '<button type="button"><slot /></button>',
          },
        },
      },
    });

    const input = wrapper.find('input.el-input__inner');

    expect(input.exists()).toBe(true);
    expect(input.attributes('readonly')).toBeUndefined();
  });

  it('drops both readonly attr casings while preserving unrelated input attrs', () => {
    const wrapper = mount(SearchInput, {
      props: {
        modelValue: '',
      },
      attrs: {
        readonly: true,
        readOnly: true,
        autocomplete: 'off',
        'data-probe': 'validator-search',
      },
      global: {
        components: {
          SInput: defineComponent({
            name: 'SInputStub',
            inheritAttrs: false,
            props: {
              modelValue: { type: String, default: '' },
              readonly: { type: Boolean, default: undefined },
              readOnly: { type: Boolean, default: undefined },
            },
            setup(props, { attrs }) {
              return () =>
                h('input', {
                  class: 'el-input__inner',
                  readonly: props.readonly || props.readOnly || undefined,
                  value: props.modelValue,
                  autocomplete: attrs.autocomplete,
                  'data-probe': attrs['data-probe'],
                });
            },
          }),
        },
        stubs: {
          SButton: {
            name: 'SButton',
            template: '<button type="button"><slot /></button>',
          },
        },
      },
    });

    const input = wrapper.get('input.el-input__inner');

    expect(input.attributes('readonly')).toBeUndefined();
    expect(input.attributes('autocomplete')).toBe('off');
    expect(input.attributes('data-probe')).toBe('validator-search');
  });

  it('renders an editable native input with the real SInput implementation', () => {
    const wrapper = mount(SearchInput, {
      props: {
        modelValue: '',
      },
      attrs: {
        readonly: true,
        placeholder: 'Search by currency name or symbol',
      },
      global: {
        components: {
          SInput,
        },
        stubs: {
          SButton: {
            name: 'SButton',
            template: '<button type="button"><slot /></button>',
          },
        },
      },
    });

    const input = wrapper.find('input.el-input__inner');

    expect(input.exists()).toBe(true);
    expect(input.element.readOnly).toBe(false);
    expect(input.attributes('readonly')).toBeUndefined();
  });

  it('forwards a trailing action slot without pinning the clear suffix over it', () => {
    const wrapper = mount(SearchInput, {
      props: {
        modelValue: 'xor',
      },
      slots: {
        right: '<button class="search-action" type="button">Filters</button>',
      },
      global: {
        components: {
          SInput: defineComponent({
            name: 'SInputStub',
            inheritAttrs: false,
            setup(_, { attrs, slots }) {
              return () => h('div', { class: attrs.class as string | string[] }, [slots.suffix?.(), slots.right?.()]);
            },
          }),
        },
        stubs: {
          SButton: {
            name: 'SButton',
            template: '<button type="button" class="s-button--clear"><slot /></button>',
          },
        },
      },
    });

    expect(wrapper.get('.search-input').classes()).toContain('search-input--with-right');
    expect(wrapper.get('.search-action').text()).toBe('Filters');
    expect(searchInputSource).toMatch(
      /&--with-right\s*\{[\s\S]*\.s-input__suffix\s*\{[\s\S]*position:\s*static;[\s\S]*transform:\s*none;/s
    );
  });

  it('does not enable right-slot layout when no trailing action is provided', () => {
    const wrapper = mount(SearchInput, {
      props: {
        modelValue: 'xor',
      },
      global: {
        components: {
          SInput: defineComponent({
            name: 'SInputStub',
            inheritAttrs: false,
            setup(_, { attrs, slots }) {
              return () => h('div', { class: attrs.class as string | string[] }, [slots.suffix?.(), slots.right?.()]);
            },
          }),
        },
        stubs: {
          SButton: {
            name: 'SButton',
            template: '<button type="button" class="s-button--clear"><slot /></button>',
          },
        },
      },
    });

    expect(wrapper.get('.search-input').classes()).not.toContain('search-input--with-right');
    expect(wrapper.find('.search-action').exists()).toBe(false);
  });

  it('keeps the clear action hidden for an empty query even when a trailing action is present', () => {
    const wrapper = mount(SearchInput, {
      props: {
        modelValue: '',
      },
      slots: {
        right: '<button class="search-action" type="button">Filters</button>',
      },
      global: {
        components: {
          SInput: defineComponent({
            name: 'SInputStub',
            inheritAttrs: false,
            setup(_, { attrs, slots }) {
              return () => h('div', { class: attrs.class as string | string[] }, [slots.suffix?.(), slots.right?.()]);
            },
          }),
        },
        stubs: {
          SButton: {
            name: 'SButton',
            template: '<button type="button" class="s-button--clear"><slot /></button>',
          },
        },
      },
    });

    expect(wrapper.get('.search-input').classes()).toContain('search-input--with-right');
    expect(wrapper.get('.search-action').text()).toBe('Filters');
    expect(wrapper.get('.s-button--clear').attributes('style')).toContain('display: none');
  });

  it('emits hostile typed input exactly once without treating it as a clear action', async () => {
    const wrapper = mount(SearchInput, {
      props: {
        modelValue: '',
      },
      global: {
        components: {
          SInput: defineComponent({
            name: 'SInputStub',
            inheritAttrs: false,
            props: {
              modelValue: { type: String, default: '' },
            },
            emits: ['update:modelValue'],
            setup(props, { emit }) {
              return () =>
                h('input', {
                  class: 'el-input__inner',
                  value: props.modelValue,
                  onInput: (event: Event) => emit('update:modelValue', (event.target as HTMLInputElement).value),
                });
            },
          }),
        },
        stubs: {
          SButton: {
            name: 'SButton',
            template: '<button type="button" class="s-button--clear"><slot /></button>',
          },
        },
      },
    });

    await wrapper.get('input.el-input__inner').setValue('<svg onload=alert(1)>');

    expect(wrapper.emitted('update:modelValue')).toEqual([[`<svg onload=alert(1)>`]]);
    expect(wrapper.emitted('clear')).toBeUndefined();
  });

  it('emits clear once for hostile input text without mutating the model itself', async () => {
    const wrapper = mount(SearchInput, {
      props: {
        modelValue: '<img src=x onerror=alert(1)>',
      },
      global: {
        components: {
          SInput: defineComponent({
            name: 'SInputStub',
            inheritAttrs: false,
            props: {
              modelValue: { type: String, default: '' },
            },
            setup(props, { attrs, slots }) {
              return () =>
                h('div', { class: attrs.class as string | string[] }, [
                  h('input', { class: 'el-input__inner', value: props.modelValue }),
                  slots.suffix?.(),
                ]);
            },
          }),
        },
        stubs: {
          SButton: {
            name: 'SButton',
            emits: ['click'],
            template: '<button type="button" class="s-button--clear" @click="$emit(\'click\')"><slot /></button>',
          },
        },
      },
    });

    await wrapper.get('.s-button--clear').trigger('click');

    expect(wrapper.emitted('clear')).toHaveLength(1);
    expect(wrapper.get<HTMLInputElement>('input.el-input__inner').element.value).toBe('<img src=x onerror=alert(1)>');
  });

  it('keeps the search input on the shared design-system surface size', () => {
    expect(searchInputSource).toContain('min-height: var(--s-size-big);');
    expect(searchInputSource).toContain('padding: 8px 16px;');
    expect(searchInputSource).toContain('border-radius: var(--s-border-radius-small);');
    expect(searchInputSource).toContain('background-color: var(--s-color-base-background);');
    expect(searchInputSource).toContain('box-shadow: var(--s-shadow-element);');
    expect(searchInputSource).toContain('height: 21px;');
    expect(searchInputSource).toContain('padding: 0 26px;');
    expect(searchInputSource).not.toContain('min-height: var(--s-size-small);');
  });
});
