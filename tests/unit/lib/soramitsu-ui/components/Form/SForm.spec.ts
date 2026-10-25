import { mount } from '@vue/test-utils';
import { h, nextTick } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import SForm from '@/lib/soramitsu-ui/components/Form/SForm.vue';
import SFormItem from '@/lib/soramitsu-ui/components/Form/SFormItem.vue';
import type { FormRules } from '@/lib/soramitsu-ui/components/Form/api';

type SFormPublic = {
  validate: () => Promise<void>;
  validateField: (prop: string) => Promise<void>;
  clearValidate: (propsToClear?: string | string[]) => void;
};

const mountForm = (props: Record<string, unknown> = {}) =>
  mount(SForm, {
    props,
    slots: {
      default: () => [
        h(SFormItem, { prop: 'name' }, () => h('input', { name: 'name' })),
        h(SFormItem, { prop: 'profile.email' }, () => h('input', { name: 'profile.email' })),
        h(SFormItem, { prop: 'status' }, () => h('input', { name: 'status' })),
      ],
    },
  });

const formApi = (wrapper: ReturnType<typeof mountForm>) => wrapper.vm as unknown as SFormPublic;

describe('SForm', () => {
  it('validates required fields, including nested model paths, and renders item errors', async () => {
    const rules: FormRules = {
      name: [{ required: true, message: 'Name is required' }],
      'profile.email': [{ required: true, message: 'Email is required' }],
    };
    const wrapper = mountForm({
      model: {
        name: ' ',
        profile: {
          email: '',
        },
      },
      rules,
    });

    await expect(formApi(wrapper).validate()).rejects.toThrow('Validation failed');
    await nextTick();

    const errors = wrapper.findAll('.el-form-item__error');

    expect(wrapper.classes()).toContain('s-form');
    expect(wrapper.attributes('novalidate')).toBe('');
    expect(errors).toHaveLength(2);
    expect(errors.map((error) => error.text())).toEqual(['Name is required', 'Email is required']);
    expect(wrapper.findAll('.s-form-item.is-error')).toHaveLength(2);
  });

  it('hides rendered error messages when showMessage is false while keeping validation failures', async () => {
    const wrapper = mountForm({
      showMessage: false,
      model: {
        name: '',
      },
      rules: {
        name: [{ required: true, message: 'Hidden name error' }],
      },
    });

    await expect(formApi(wrapper).validate()).rejects.toThrow('Validation failed');
    await nextTick();

    expect(wrapper.find('.el-form-item__error').exists()).toBe(false);
    expect(wrapper.find('.s-form-item.is-error').exists()).toBe(false);
  });

  it('validates a single field and clears stale field errors after the model is fixed', async () => {
    const wrapper = mountForm({
      model: {
        name: '',
      },
      rules: {
        name: [{ required: true, message: 'Name is required' }],
      },
    });

    await expect(formApi(wrapper).validateField('name')).rejects.toThrow('Name is required');
    await nextTick();

    expect(wrapper.find('.el-form-item__error').text()).toBe('Name is required');

    await wrapper.setProps({
      model: {
        name: 'Alice',
      },
    });
    await formApi(wrapper).validateField('name');
    await nextTick();

    expect(wrapper.find('.el-form-item__error').exists()).toBe(false);
  });

  it('runs boolean, Error, callback, and Promise validators in field order', async () => {
    const callbackValidator = vi.fn((_rule, _value, callback) => callback(new Error('Callback failed')));
    const skippedValidator = vi.fn();
    const rules: FormRules = {
      name: [
        {
          message: 'Boolean failed',
          validator: () => false,
        },
        {
          validator: skippedValidator,
        },
      ],
      'profile.email': [
        {
          validator: () => Promise.reject('Promise failed'),
          message: 'Promise fallback',
        },
      ],
      status: [
        {
          validator: () => new Error('Error instance failed'),
        },
        {
          validator: callbackValidator,
        },
      ],
    };
    const wrapper = mountForm({
      model: {
        name: 'Alice',
        profile: {
          email: 'alice@example.com',
        },
        status: 'pending',
      },
      rules,
    });

    await expect(formApi(wrapper).validate()).rejects.toThrow('Validation failed');
    await nextTick();

    expect(wrapper.findAll('.el-form-item__error').map((error) => error.text())).toEqual([
      'Boolean failed',
      'Promise failed',
      'Error instance failed',
    ]);
    expect(skippedValidator).not.toHaveBeenCalled();
    expect(callbackValidator).not.toHaveBeenCalled();
  });

  it('supports callback validators and clearValidate for selected or all fields', async () => {
    const rules: FormRules = {
      name: [
        {
          validator: (_rule, _value, callback) => callback(new Error('Name callback failed')),
        },
      ],
      status: [
        {
          validator: (_rule, _value, callback) => callback(new Error('Status callback failed')),
        },
      ],
    };
    const wrapper = mountForm({
      model: {
        name: 'Alice',
        status: 'pending',
      },
      rules,
    });

    await expect(formApi(wrapper).validate()).rejects.toThrow('Validation failed');
    await nextTick();

    expect(wrapper.findAll('.el-form-item__error').map((error) => error.text())).toEqual([
      'Name callback failed',
      'Status callback failed',
    ]);

    formApi(wrapper).clearValidate('name');
    await nextTick();

    expect(wrapper.findAll('.el-form-item__error').map((error) => error.text())).toEqual(['Status callback failed']);

    formApi(wrapper).clearValidate(['status']);
    await nextTick();

    expect(wrapper.find('.el-form-item__error').exists()).toBe(false);

    await expect(formApi(wrapper).validate()).rejects.toThrow('Validation failed');
    await nextTick();

    formApi(wrapper).clearValidate();
    await nextTick();

    expect(wrapper.find('.el-form-item__error').exists()).toBe(false);
  });

  it('treats synchronous validators without callback parameters as successful', async () => {
    const validator = vi.fn(() => undefined);
    const wrapper = mountForm({
      model: {
        name: 'Alice',
      },
      rules: {
        name: [{ validator }],
      },
    });

    await expect(formApi(wrapper).validateField('name')).resolves.toBeUndefined();

    expect(validator).toHaveBeenCalledWith(expect.any(Object), 'Alice', expect.any(Function));
    expect(wrapper.find('.el-form-item__error').exists()).toBe(false);
  });

  it('accepts non-empty array values for required rules and resolved promise validators', async () => {
    const promiseValidator = vi.fn(() => Promise.resolve());
    const wrapper = mountForm({
      model: {
        name: 'Alice',
        count: 0,
        status: ['ready'],
      },
      rules: {
        count: [{ required: true, message: 'Count is required' }],
        name: [{ validator: promiseValidator }],
        status: [{ required: true, message: 'Status is required' }],
      },
    });

    await expect(formApi(wrapper).validate()).resolves.toBeUndefined();

    expect(promiseValidator).toHaveBeenCalledWith(expect.any(Object), 'Alice', expect.any(Function));
    expect(wrapper.find('.el-form-item__error').exists()).toBe(false);
  });

  it('normalizes thrown validator values and clears a field when it has no rules', async () => {
    const wrapper = mountForm({
      model: {
        name: 'Alice',
      },
      rules: {
        name: [
          {
            validator: () => {
              throw 'Thrown validation value';
            },
          },
        ],
      },
    });

    await expect(formApi(wrapper).validateField('name')).rejects.toThrow('Thrown validation value');
    await nextTick();

    expect(wrapper.find('.el-form-item__error').text()).toBe('Thrown validation value');

    await formApi(wrapper).validateField('status');
    await nextTick();

    expect(wrapper.find('.el-form-item__error').text()).toBe('Thrown validation value');

    await wrapper.setProps({ rules: {} });
    await formApi(wrapper).validateField('name');
    await nextTick();

    expect(wrapper.find('.el-form-item__error').exists()).toBe(false);
  });

  it('renders standalone form items without requiring a form context or prop', () => {
    const wrapper = mount(SFormItem, {
      slots: {
        default: '<input name="standalone" />',
      },
    });

    expect(wrapper.classes()).toContain('s-form-item');
    expect(wrapper.find('input[name="standalone"]').exists()).toBe(true);
    expect(wrapper.find('.el-form-item__error').exists()).toBe(false);
    expect(wrapper.classes()).not.toContain('is-error');
  });
});
