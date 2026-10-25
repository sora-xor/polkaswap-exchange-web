import { mount } from '@vue/test-utils';
import { defineComponent, h, provide, ref, type Component } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import { ACCORDION_API_KEY, useAccordionApi, type AccordionApi } from '@/lib/soramitsu-ui/components/Accordion/api';
import { FORM_CONTEXT_KEY, useFormContext, type FormContext } from '@/lib/soramitsu-ui/components/Form/api';
import { MENU_CONTEXT_KEY, useMenuContext, type MenuContext } from '@/lib/soramitsu-ui/components/Menu/api';
import { POPOVER_API_KEY, usePopoverApi, type PopoverApi } from '@/lib/soramitsu-ui/components/Popover/api';
import { SELECT_API_KEY, useSelectApi, type SelectApi } from '@/lib/soramitsu-ui/components/Select/api';

describe('soramitsu-ui context APIs', () => {
  it('returns optional contexts as nullish values when providers are missing', () => {
    const seen: { accordion?: AccordionApi; form?: FormContext | null; menu?: MenuContext | null } = {};

    const Host = defineComponent({
      setup() {
        seen.accordion = useAccordionApi();
        seen.form = useFormContext();
        seen.menu = useMenuContext();
        return () => null;
      },
    });

    mount(Host);

    expect(seen.accordion).toBeUndefined();
    expect(seen.form).toBeNull();
    expect(seen.menu).toBeNull();
  });

  it('reads provided accordion, form, and menu contexts', () => {
    const accordion: AccordionApi = {
      register: vi.fn(),
      unregister: vi.fn(),
    };
    const form: FormContext = {
      errors: ref({ amount: 'Required' }),
      showMessage: ref(true),
    };
    const menu: MenuContext = {
      active: ref('swap'),
      select: vi.fn(),
    };
    const seen: { accordion?: AccordionApi; form?: FormContext | null; menu?: MenuContext | null } = {};

    const Child = defineComponent({
      setup() {
        seen.accordion = useAccordionApi();
        seen.form = useFormContext();
        seen.menu = useMenuContext();
        return () => h('span', seen.menu?.active.value);
      },
    });

    const Parent = withProviders(Child, () => {
      provide(ACCORDION_API_KEY, accordion);
      provide(FORM_CONTEXT_KEY, form);
      provide(MENU_CONTEXT_KEY, menu);
    });

    const wrapper = mount(Parent);

    expect(seen.accordion).toBe(accordion);
    expect(seen.form).toBe(form);
    expect(seen.menu).toBe(menu);
    expect(wrapper.text()).toBe('swap');
  });

  it('requires select and popover contexts through force-injected APIs', () => {
    const select = {
      options: [],
      multiple: false,
      disabled: false,
      loading: false,
      mandatory: false,
      label: null,
      size: 'medium',
      noAutoClose: false,
      searchQuery: '',
      remoteSearch: false,
      isMenuOpened: false,
      menuToggle: vi.fn(),
      updateSearchQuery: vi.fn(),
    } as unknown as SelectApi<string>;
    const popover: PopoverApi = {
      show: true,
      popper: null,
      addPopperRefOverride: vi.fn(),
      deletePopperRefOverride: vi.fn(),
    };
    const seen: { select?: SelectApi<string>; popover?: PopoverApi } = {};

    const Child = defineComponent({
      setup() {
        seen.select = useSelectApi<string>();
        seen.popover = usePopoverApi();
        return () => h('span', String(seen.popover?.show));
      },
    });

    const Parent = withProviders(Child, () => {
      provide(SELECT_API_KEY, select);
      provide(POPOVER_API_KEY, popover);
    });

    const wrapper = mount(Parent);

    expect(seen.select).toBe(select);
    expect(seen.popover).toBe(popover);
    expect(wrapper.text()).toBe('true');

    const MissingSelect = defineComponent({
      setup() {
        useSelectApi();
        return () => null;
      },
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    try {
      expect(() => mount(MissingSelect)).toThrow('Injection of "Symbol(SelectAPI)" failed');
    } finally {
      warnSpy.mockRestore();
    }
  });
});

function withProviders(Child: Component, setupProviders: () => void): Component {
  return defineComponent({
    setup() {
      setupProviders();
      return () => h(Child);
    },
  });
}
