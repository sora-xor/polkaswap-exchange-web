import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { describe, expect, it } from 'vitest';

import { SInput } from '@/lib/soramitsu-ui/components/Input';
import SearchInput from '@/lib/soraneo-wallet/src/components/Input/SearchInput.vue';

describe('Wallet SearchInput', () => {
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
});
