import { mount } from '@vue/test-utils';
import { defineComponent, effectScope, nextTick, onMounted, ref } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useRadiosRegistration, useRadiosSelector } from '@/lib/soramitsu-ui/components/Radio/util';

describe('radio utilities', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('tracks matching radio elements and updates when the selector changes', async () => {
    const scope = effectScope();
    const root = document.createElement('div');
    const first = document.createElement('button');
    const second = document.createElement('button');
    const other = document.createElement('button');
    first.setAttribute('role', 'radio');
    second.setAttribute('role', 'radio');
    second.className = 'choice';
    other.setAttribute('role', 'button');
    root.append(first, second, other);

    const target = ref<HTMLElement | null>(root);
    const selector = ref('[role="radio"]');
    const api = scope.run(() => useRadiosSelector<HTMLButtonElement>(target, selector));

    expect(api).toBeDefined();
    api!.update(true);
    expect(api!.elems.value).toEqual([first, second]);

    const third = document.createElement('button');
    third.setAttribute('role', 'radio');
    root.append(third);
    api!.update();
    await nextTick();

    expect(api!.elems.value).toEqual([first, second, third]);

    selector.value = '.choice';
    await nextTick();

    expect(api!.elems.value).toEqual([second]);
    scope.stop();
  });

  it('throws when radio selector update runs before the root element exists', () => {
    const scope = effectScope();
    const api = scope.run(() => useRadiosSelector(ref(null), '[role="radio"]'));

    expect(api).toBeDefined();
    expect(() => api!.update(true)).toThrow('Element is not defined; unable to update');
    scope.stop();
  });

  it('registers radios with checked state, tabindex, and update callbacks', async () => {
    const wrapper = mountRadioUtilityHarness();

    await nextTick();

    const vm = wrapper.vm as RadioUtilityHarness;

    expect(vm.updateRadioElements).toHaveBeenCalled();
    expect(vm.firstApi.isChecked).toBe(false);
    expect(vm.firstApi.tabindex).toBe(-1);
    expect(vm.secondApi.isChecked).toBe(true);
    expect(vm.secondApi.tabindex).toBe(0);
    expect(vm.thirdApi.tabindex).toBe(-1);

    vm.firstApi.check();
    await nextTick();

    expect(vm.model).toBe('first');
    expect(vm.firstApi.isChecked).toBe(true);
    expect(vm.firstApi.tabindex).toBe(0);
  });

  it('moves focus through enabled radios and wraps around disabled entries', async () => {
    const wrapper = mountRadioUtilityHarness();
    const vm = wrapper.vm as RadioUtilityHarness;

    await nextTick();

    vm.first!.focus();
    await nextTick();
    vm.moveFocus();
    await nextTick();

    expect(vm.model).toBe('second');
    expect(document.activeElement).toBe(vm.second);

    vm.moveFocus();
    await nextTick();

    expect(vm.model).toBe('first');
    expect(document.activeElement).toBe(vm.first);

    vm.moveFocus(false);
    await nextTick();

    expect(vm.model).toBe('second');
    expect(document.activeElement).toBe(vm.second);
  });

  it('checks only the currently focused radio and ignores disabled-only focus movement', async () => {
    const wrapper = mountRadioUtilityHarness();
    const vm = wrapper.vm as RadioUtilityHarness;

    await nextTick();

    vm.model = 'first';
    vm.moveFocus();
    await nextTick();

    expect(vm.model).toBe('first');
    expect(document.activeElement).toBe(document.body);

    vm.checkFocused();
    await nextTick();

    expect(vm.model).toBe('first');

    vm.second!.focus();
    await nextTick();
    vm.checkFocused();
    await nextTick();

    expect(vm.model).toBe('second');

    vm.firstDisabled = true;
    vm.secondDisabled = true;
    await nextTick();

    vm.moveFocus();
    await nextTick();

    expect(vm.model).toBe('second');
    expect(document.activeElement).toBe(vm.second);
  });

  it('unregisters radios on unmount and refreshes the element list', async () => {
    const wrapper = mountRadioUtilityHarness();
    const vm = wrapper.vm as RadioUtilityHarness;

    await nextTick();

    vi.mocked(vm.updateRadioElements).mockClear();
    wrapper.unmount();

    expect(vm.updateRadioElements).toHaveBeenCalledTimes(3);
  });
});

const mountRadioUtilityHarness = () =>
  mount(
    defineComponent({
      setup() {
        const root = ref<HTMLElement | null>(null);
        const first = ref<HTMLElement | null>(null);
        const second = ref<HTMLElement | null>(null);
        const third = ref<HTMLElement | null>(null);
        const model = ref('second');
        const firstDisabled = ref(false);
        const secondDisabled = ref(false);
        const thirdDisabled = ref(true);
        const radioElements = ref<HTMLElement[]>([]);
        const updateRadioElements = vi.fn(() => {
          radioElements.value = Array.from(root.value?.querySelectorAll<HTMLElement>('[data-radio]') ?? []);
        });
        const { registerRadio, moveFocus, checkFocused } = useRadiosRegistration({
          radioElements,
          model,
          updateRadioElements,
        });
        const firstApi = registerRadio({
          elRef: first,
          valueRef: ref('first'),
          disabledRef: firstDisabled,
        });
        const secondApi = registerRadio({
          elRef: second,
          valueRef: ref('second'),
          disabledRef: secondDisabled,
        });
        const thirdApi = registerRadio({
          elRef: third,
          valueRef: ref('third'),
          disabledRef: thirdDisabled,
        });

        onMounted(updateRadioElements);

        return {
          root,
          first,
          second,
          third,
          model,
          firstDisabled,
          secondDisabled,
          thirdDisabled,
          firstApi,
          secondApi,
          thirdApi,
          moveFocus,
          checkFocused,
          updateRadioElements,
        };
      },
      template: `
        <div ref="root">
          <button ref="first" data-radio type="button">First</button>
          <button ref="second" data-radio type="button">Second</button>
          <button ref="third" data-radio type="button">Third</button>
        </div>
      `,
    }),
    { attachTo: document.body }
  );

interface RadioApiSnapshot {
  isChecked: boolean;
  tabindex: number;
  check: () => void;
}

interface RadioUtilityHarness {
  root: HTMLElement | null;
  first: HTMLElement | null;
  second: HTMLElement | null;
  third: HTMLElement | null;
  model: string;
  firstDisabled: boolean;
  secondDisabled: boolean;
  thirdDisabled: boolean;
  firstApi: RadioApiSnapshot;
  secondApi: RadioApiSnapshot;
  thirdApi: RadioApiSnapshot;
  moveFocus: (forward?: boolean) => void;
  checkFocused: () => void;
  updateRadioElements: ReturnType<typeof vi.fn>;
}
