import { mount } from '@vue/test-utils';
import { defineComponent, h, markRaw, nextTick, ref } from 'vue';
import { describe, expect, it } from 'vitest';

import NodeIcon from '@/features/bridge/components/NodeIcon.vue';
import nodeIconSource from '@/features/bridge/components/NodeIcon.vue?raw';

const SButtonStub = defineComponent({
  name: 'SButtonStub',
  setup(_, { slots }) {
    return () => h('button', slots.default?.());
  },
});

const SIconStub = defineComponent({
  name: 'SIconStub',
  props: {
    name: {
      type: String,
      default: '',
    },
  },
  setup(props, { attrs }) {
    return () => h('span', { ...attrs, 'data-name': props.name });
  },
});

describe('Bridge NodeIcon source', () => {
  it('names the icon-only node selector action', () => {
    expect(nodeIconSource).toContain(':aria-label="t(\'selectNodeText\')"');
  });

  it('reacts to raw connection status snapshots', async () => {
    const statusState = ref({
      nodeAddressConnecting: '',
      connected: false,
    });
    const connection = markRaw({
      get status() {
        return statusState.value;
      },
    });
    const wrapper = mount(NodeIcon, {
      props: {
        connection: connection as any,
      },
      global: {
        stubs: {
          SButton: SButtonStub,
          SIcon: SIconStub,
        },
      },
    });

    expect(wrapper.get('i').classes()).toContain('status--error');
    expect(wrapper.get('i').attributes('name')).toBe('globe-16');

    statusState.value = {
      nodeAddressConnecting: 'wss://liberland',
      connected: false,
    };
    await nextTick();

    expect(wrapper.get('i').classes()).toContain('status--info');
    expect(wrapper.get('i').attributes('name')).toBe('el-icon-loading');

    statusState.value = {
      nodeAddressConnecting: '',
      connected: true,
    };
    await nextTick();

    expect(wrapper.get('i').classes()).toContain('status--success');
    expect(wrapper.get('i').attributes('name')).toBe('globe-16');
  });
});
