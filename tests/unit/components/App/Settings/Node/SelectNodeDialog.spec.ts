import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => `t:${key}`,
  }),
}));

vi.mock('@/composables/useNodeNotifications', () => ({
  useNodeNotifications: () => ({
    handleNodeError: vi.fn(),
    handleNodeConnect: vi.fn(),
    handleNodeDisconnect: vi.fn(),
  }),
}));

import NodeInfo from '@/components/App/Settings/Node/NodeInfo.vue';
import SelectNodeDialog from '@/components/App/Settings/Node/SelectNodeDialog.vue';

const DialogBaseStub = defineComponent({
  name: 'DialogBaseStub',
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    title: {
      type: String,
      default: '',
    },
    customClass: {
      type: String,
      default: '',
    },
  },
  setup(props, { slots }) {
    return () =>
      h(
        'div',
        {
          class: 'dialog-base-stub',
          'data-custom-class': props.customClass,
          'data-title': props.title,
        },
        slots.default?.()
      );
  },
});

const SelectNodeStub = defineComponent({
  name: 'SelectNodeStub',
  props: {
    viewNode: {
      type: Function,
      default: undefined,
    },
  },
  setup(props) {
    return () =>
      h(
        'button',
        {
          class: 'open-node-info',
          onClick: () =>
            (props.viewNode as undefined | ((node?: { address: string }) => void))?.({ address: 'wss://2' }),
        },
        'open-node-info'
      );
  },
});

const NodeInfoStub = defineComponent({
  name: 'NodeInfoStub',
  setup() {
    return () => h('div', { class: 'node-info-stub' });
  },
});

const FormStub = defineComponent({
  name: 'SFormStub',
  setup(_, { slots }) {
    return () => h('form', { class: 's-form-stub' }, slots.default?.());
  },
});

const FormItemStub = defineComponent({
  name: 'SFormItemStub',
  setup(_, { slots }) {
    return () => h('div', { class: 's-form-item-stub' }, slots.default?.());
  },
});

const InputStub = defineComponent({
  name: 'SInputStub',
  props: {
    modelValue: {
      type: String,
      default: '',
    },
  },
  setup(props) {
    return () => h('input', { class: 's-input-stub', value: props.modelValue });
  },
});

const ButtonStub = defineComponent({
  name: 'SButtonStub',
  setup(_, { slots }) {
    return () => h('button', { class: 's-button-stub' }, slots.default?.());
  },
});

const GenericPageHeaderStub = defineComponent({
  name: 'GenericPageHeaderStub',
  props: {
    title: {
      type: String,
      default: '',
    },
  },
  setup(props, { slots }) {
    return () =>
      h(
        'div',
        {
          class: 'generic-page-header-stub',
          'data-title': props.title,
        },
        slots.default?.()
      );
  },
});

const createConnectionMock = () => ({
  nodeList: [
    { address: 'wss://1', name: 'Node 1', chain: 'SORA' },
    { address: 'wss://2', name: 'Node 2', chain: 'SORA' },
  ],
  customNodes: [],
  defaultNodes: [{ address: 'wss://1', name: 'Node 1', chain: 'SORA' }],
  node: { address: 'wss://1' },
  nodeAddressConnecting: '',
  connectionAllowance: true,
  connect: vi.fn().mockResolvedValue(undefined),
  updateCustomNode: vi.fn(),
  removeCustomNode: vi.fn(),
});

describe('SelectNodeDialog', () => {
  it('applies dialog card classes for both list and add-node views', async () => {
    const wrapper = mount(SelectNodeDialog, {
      props: {
        connection: createConnectionMock(),
        visibility: true,
        setVisibility: vi.fn(),
      },
      global: {
        stubs: {
          DialogBase: DialogBaseStub,
          SelectNode: SelectNodeStub,
          NodeInfo: NodeInfoStub,
        },
      },
    });

    const card = wrapper.get('.dialog-base-stub');
    expect(card.attributes('data-custom-class')).toBe('select-node-dialog');

    await wrapper.get('.open-node-info').trigger('click');
    await nextTick();

    expect(wrapper.get('.dialog-base-stub').attributes('data-custom-class')).toContain('select-node-dialog--add-node');
  });
});

describe('NodeInfo', () => {
  it('renders custom node title when editing a new node', () => {
    const wrapper = mount(NodeInfo, {
      props: {
        existing: false,
        node: {
          name: '',
          chain: '',
          address: '',
        },
      },
      global: {
        stubs: {
          SForm: FormStub,
          SFormItem: FormItemStub,
          SInput: InputStub,
          SButton: ButtonStub,
          GenericPageHeader: GenericPageHeaderStub,
        },
      },
    });

    expect(wrapper.get('.generic-page-header-stub').attributes('data-title')).toBe('t:selectNodeDialog.customNode');
  });

  it('renders chain title when editing an existing chain node', () => {
    const wrapper = mount(NodeInfo, {
      props: {
        existing: true,
        node: {
          name: 'Node Name',
          chain: 'SORA',
          address: 'wss://node',
        },
      },
      global: {
        stubs: {
          SForm: FormStub,
          SFormItem: FormItemStub,
          SInput: InputStub,
          SButton: ButtonStub,
          GenericPageHeader: GenericPageHeaderStub,
        },
      },
    });

    expect(wrapper.get('.generic-page-header-stub').attributes('data-title')).toBe('SORA');
  });
});
