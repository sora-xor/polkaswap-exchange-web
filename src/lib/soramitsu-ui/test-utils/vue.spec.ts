import { flushPromises } from '@vue/test-utils';
import { defineStore } from 'pinia';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, type PropType } from 'vue';
import { useRoute } from 'vue-router';
import {
  createTestPinia,
  createTestRouter,
  mountWithPinia,
  mountWithProviders,
  mountWithRouter,
} from '@soramitsu-ui/ui/test-utils';

type StoreFactory = () => { value: string };

const TestHarness = defineComponent({
  name: 'TestHarness',
  props: {
    showRoute: {
      type: Boolean,
      default: false,
    },
    useStore: {
      type: Function as PropType<StoreFactory>,
      default: undefined,
    },
  },
  setup(props) {
    const route = props.showRoute ? useRoute() : undefined;
    const store = props.useStore ? props.useStore() : undefined;

    return () => {
      if (props.showRoute && route && store) {
        return h('span', `${route.path} - ${store.value}`);
      }

      if (props.showRoute && route) {
        return h('span', route.path);
      }

      return h('span', store?.value ?? '');
    };
  },
});

describe('test-utils/vue', () => {
  it('mountWithRouter wires vue-router and exposes the instance', async () => {
    const wrapper = mountWithRouter(TestHarness, {
      props: { showRoute: true },
      router: {
        routes: [{ path: '/', name: 'home', component: { template: '<div />' } }],
        initialRoute: '/',
      },
    });

    await wrapper.router?.isReady();
    await flushPromises();
    await nextTick();

    expect(wrapper.router).toBeDefined();
    expect(wrapper.text()).toBe('/');
  });

  it('mountWithPinia installs a Pinia instance and shares stores', () => {
    const useTestStore = defineStore('test-store', {
      state: () => ({ value: 'works' }),
    });

    const wrapper = mountWithPinia(TestHarness, {
      props: {
        useStore: useTestStore,
      },
    });

    expect(wrapper.pinia).toBeDefined();
    expect(wrapper.text()).toBe('works');
  });

  it('mountWithProviders accepts existing router and pinia instances', async () => {
    const router = createTestRouter({
      routes: [
        { path: '/', name: 'home', component: { template: '<div />' } },
        { path: '/other', name: 'other', component: { template: '<div />' } },
      ],
    });
    const pinia = createTestPinia();

    const useSecondStore = defineStore('second-store', {
      state: () => ({ value: 'from pinia' }),
    });

    const wrapper = mountWithProviders(TestHarness, {
      props: {
        showRoute: true,
        useStore: useSecondStore,
      },
      router,
      pinia,
    });

    await wrapper.router?.push('/other');
    await wrapper.router?.isReady();
    await flushPromises();
    await nextTick();

    expect(wrapper.router).toBe(router);
    expect(wrapper.pinia).toBe(pinia);
    expect(wrapper.router?.currentRoute.value.path).toBe('/other');
    expect(wrapper.text()).toContain('from pinia');
  });
});
