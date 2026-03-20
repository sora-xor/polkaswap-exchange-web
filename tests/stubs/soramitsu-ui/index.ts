import {
  h,
  defineComponent,
  provide,
  inject,
  computed,
  ref,
  getCurrentInstance,
  type App,
  type Component,
  type InjectionKey,
  type Ref,
  type PropType,
  type VNodeArrayChildren,
} from 'vue';

type Attrs = Record<string, unknown>;

const STUB_CLASS = 'soramitsu-ui-stub';
const MENU_SELECT_KEY = Symbol('soramitsu-ui-menu-select');
const NOTIFICATIONS_KEY = Symbol('soramitsu-ui-notifications');
const DESIGN_SYSTEM_KEY = Symbol('soramitsu-ui-design-system');

const noop = () => undefined;

const defaultNotifications = {
  show: noop,
  hide: noop,
};

const toKebab = (name: string): string =>
  name
    .replace(/^S/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();

const withBaseClasses = (attrs: Attrs, baseClass: string, additional?: string | false) => {
  const { class: classAttr, ...rest } = attrs;
  const normalizedClass = additional
    ? [baseClass, additional, STUB_CLASS, classAttr]
    : [baseClass, STUB_CLASS, classAttr];

  return {
    attrs: rest,
    class: normalizedClass,
  };
};

const renderChildren = (children?: () => VNodeArrayChildren) => children?.() ?? [];

const appCounters = new WeakMap<App, number>();
let fallbackCounter = 0;

function createPrimitiveStub(name: string, tag: string = 'div'): Component {
  const baseClass = `s-${toKebab(name)}`;

  return defineComponent({
    name,
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
      const normalized = withBaseClasses(attrs as Attrs, baseClass);

      return () => h(tag, { ...normalized.attrs, class: normalized.class }, renderChildren(slots.default));
    },
  });
}

const DesignSystemProvider = defineComponent({
  name: 'SDesignSystemProvider',
  inheritAttrs: false,
  props: {
    value: {
      type: Object as PropType<Record<string, unknown>>,
      default: () => ({}),
    },
  },
  setup(props, { attrs, slots }) {
    const systemRef = computed(() => props.value);
    provide(DESIGN_SYSTEM_KEY, systemRef);

    const normalized = withBaseClasses(attrs as Attrs, 's-design-system-provider');

    return () => h('div', { ...normalized.attrs, class: normalized.class }, renderChildren(slots.default));
  },
});

const Button = defineComponent({
  name: 'SButton',
  inheritAttrs: false,
  props: {
    disabled: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    nativeType: { type: String as PropType<'button' | 'submit' | 'reset'>, default: 'button' },
  },
  setup(props, { attrs, slots }) {
    const normalized = withBaseClasses(attrs as Attrs, 's-button');
    const disabled = computed(() => props.disabled || props.loading);

    return () =>
      h(
        'button',
        {
          ...normalized.attrs,
          class: normalized.class,
          type: props.nativeType,
          disabled: disabled.value,
        },
        renderChildren(slots.default)
      );
  },
});

const Scrollbar = defineComponent({
  name: 'SScrollbar',
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    const normalized = withBaseClasses(attrs as Attrs, 's-scrollbar');
    return () =>
      h(
        'div',
        {
          ...normalized.attrs,
          class: normalized.class,
          style: {
            overflow: 'auto',
            ...(normalized.attrs.style as Record<string, unknown> | undefined),
          },
        },
        renderChildren(slots.default)
      );
  },
});

type MenuSelect = (index: string | number | undefined, event: Event) => void;

const Menu = defineComponent({
  name: 'SMenu',
  inheritAttrs: false,
  emits: ['select'],
  setup(_, { attrs, slots, emit }) {
    const handleSelect: MenuSelect = (index, event) => emit('select', index, event);
    provide(MENU_SELECT_KEY, handleSelect);

    const normalized = withBaseClasses(attrs as Attrs, 's-menu');

    return () => h('nav', { ...normalized.attrs, class: normalized.class }, renderChildren(slots.default));
  },
});

const MenuItem = defineComponent({
  name: 'SMenuItem',
  inheritAttrs: false,
  props: {
    index: { type: [String, Number], default: '' },
    disabled: { type: Boolean, default: false },
  },
  setup(props, { attrs, slots }) {
    const notifySelect = inject<MenuSelect>(MENU_SELECT_KEY, noop);
    const normalized = withBaseClasses(attrs as Attrs, 's-menu-item');

    const onClick = (event: Event) => {
      if (props.disabled) {
        event.preventDefault();
        return;
      }
      notifySelect(props.index, event);
    };

    return () =>
      h(
        'div',
        {
          ...normalized.attrs,
          role: 'menuitem',
          tabindex: 0,
          class: normalized.class,
          onClick,
        },
        renderChildren(slots.default)
      );
  },
});

const MenuItemGroup = defineComponent({
  name: 'SMenuItemGroup',
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    const normalized = withBaseClasses(attrs as Attrs, 's-menu-item-group');
    return () => h('div', { ...normalized.attrs, class: normalized.class }, renderChildren(slots.default));
  },
});

const Tooltip = defineComponent({
  name: 'STooltip',
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    const normalized = withBaseClasses(attrs as Attrs, 's-tooltip');
    const contentSlot = slots.content?.() ?? [];
    const defaultSlot = renderChildren(slots.default);

    return () =>
      h('span', { ...normalized.attrs, class: normalized.class }, [
        ...defaultSlot,
        contentSlot.length
          ? h(
              'span',
              {
                class: ['s-tooltip__content', `${STUB_CLASS}__content`],
                style: { display: 'none' },
              },
              contentSlot
            )
          : null,
      ]);
  },
});

const Icon = defineComponent({
  name: 'SIcon',
  inheritAttrs: false,
  props: {
    name: { type: String, default: '' },
  },
  setup(props, { attrs }) {
    const normalized = withBaseClasses(attrs as Attrs, 's-icon', props.name && `s-icon--${props.name}`);
    return () => h('i', { ...normalized.attrs, class: normalized.class });
  },
});

const Image = defineComponent({
  name: 'SImage',
  inheritAttrs: false,
  props: {
    src: { type: String, default: '' },
    alt: { type: String, default: '' },
  },
  setup(props, { attrs }) {
    const normalized = withBaseClasses(attrs as Attrs, 's-image');
    return () =>
      h('img', {
        ...normalized.attrs,
        class: normalized.class,
        src: props.src,
        alt: props.alt,
      });
  },
});

const NotificationsProvider = defineComponent({
  name: 'SNotificationsProvider',
  inheritAttrs: false,
  props: {
    value: {
      type: Object as PropType<Partial<typeof defaultNotifications>>,
      default: undefined,
    },
  },
  setup(props, { attrs, slots }) {
    const api = { ...defaultNotifications, ...props.value };
    provide(NOTIFICATIONS_KEY, api);

    const normalized = withBaseClasses(attrs as Attrs, 's-notifications-provider');

    return () => h('div', { ...normalized.attrs, class: normalized.class }, renderChildren(slots.default));
  },
});

const basicComponentNames = [
  'SCard',
  'SCol',
  'SForm',
  'SFormItem',
  'SRow',
  'SModal',
  'SDialog',
  'SDropdown',
  'SDropdownItem',
  'STabs',
  'STab',
  'STable',
  'STableColumn',
  'SSelect',
  'SOption',
  'SRadio',
  'SRadioGroup',
  'SSwitch',
  'SSlider',
  'STextField',
  'SInput',
  'SFloatInput',
  'SCheckbox',
  'SBadge',
  'SPagination',
  'SPopover',
  'SPopoverPanel',
  'SDatePicker',
  'SDatePickerPanel',
  'SDatePickerPanelOptions',
  'SDatePickerPanelTime',
  'SDatePickerPanelMonths',
  'SDatePickerTableMonths',
  'SDatePickerTableDate',
  'SAccordion',
  'SAccordionItem',
  'SRadioButton',
  'SBodyScrollLockProvider',
  'SNavigationMenu',
  'SNavigationSubmenu',
  'SNotifications',
  'SCollapse',
  'SCollapseItem',
  'SDivider',
  'SButtonGroup',
];

const componentMap: Record<string, Component> = {
  SButton: Button,
  SCard: createPrimitiveStub('SCard'),
  SSkeleton: createPrimitiveStub('SSkeleton'),
  SSkeletonItem: createPrimitiveStub('SSkeletonItem'),
  SDesignSystemProvider: DesignSystemProvider,
  SScrollbar: Scrollbar,
  SMenu: Menu,
  SMenuItem: MenuItem,
  SMenuItemGroup: MenuItemGroup,
  STooltip: Tooltip,
  SIcon: Icon,
  SImage: Image,
  SNotificationsProvider: NotificationsProvider,
};

for (const name of basicComponentNames) {
  if (componentMap[name]) continue;
  componentMap[name] = createPrimitiveStub(name);
}

export const Status = {
  Success: 'success',
  Info: 'info',
  Warning: 'warning',
  Error: 'error',
  SUCCESS: 'success',
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
} as const;

export const SortDirection = {
  ASC: 'ascending',
  DESC: 'descending',
} as const;

export function forceInject<T>(key: string | InjectionKey<T>): T {
  const sentinel = Symbol('forceInject sentinel');
  const something = inject(key, sentinel as unknown);

  if (something === sentinel) {
    throw new Error(`Injection of "${String(key)}" failed`);
  }

  return something as T;
}

export function bareMetalVModel<T, K extends string = 'modelValue'>(
  model: Ref<T>,
  prop: K = 'modelValue' as K
): {
  [key in `${K}`]: T;
} & {
  [key in `onUpdate:${K}`]: (value: T) => void;
} {
  return {
    [prop]: model.value as T,
    [`onUpdate:${prop}`]: (value: T) => {
      model.value = value;
    },
  } as any;
}

export function nextIncrementalCounter(): number {
  const instance = getCurrentInstance();
  const app = instance?.appContext.app;

  if (app) {
    const current = appCounters.get(app) ?? 0;
    appCounters.set(app, current + 1);
    return current;
  }

  return fallbackCounter++;
}

export function uniqueElementId(): string {
  return `soraui-uid-${nextIncrementalCounter()}`;
}

export const useFocusTrap = () => ({
  trap: ref(null),
});

export const components = componentMap;

export const SSkeleton = componentMap.SSkeleton;
export const SSkeletonItem = componentMap.SSkeletonItem;
export const SButton = componentMap.SButton;
export const SCard = componentMap.SCard;
export const SNotificationsProvider = componentMap.SNotificationsProvider;
export const SDesignSystemProvider = componentMap.SDesignSystemProvider;
export const SScrollbar = componentMap.SScrollbar;
export const SMenu = componentMap.SMenu;
export const SMenuItem = componentMap.SMenuItem;
export const SMenuItemGroup = componentMap.SMenuItemGroup;
export const STooltip = componentMap.STooltip;
export const SIcon = componentMap.SIcon;
export const SImage = componentMap.SImage;

export const plugin = () => (app: App) => {
  for (const [name, component] of Object.entries(componentMap)) {
    app.component(name, component);
  }
};

export const useNotifications = () => inject(NOTIFICATIONS_KEY, defaultNotifications);

export default {
  Status,
  SortDirection,
  components: componentMap,
  plugin,
  useNotifications,
  SSkeleton,
  SSkeletonItem,
  SButton,
  SCard,
  SNotificationsProvider: componentMap.SNotificationsProvider,
  SDesignSystemProvider: componentMap.SDesignSystemProvider,
};
