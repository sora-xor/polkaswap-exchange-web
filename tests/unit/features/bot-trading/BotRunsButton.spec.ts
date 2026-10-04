import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, ref } from 'vue';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';
import BotRunsButton from '@/features/bot-trading/components/BotRunsButton.vue';
import { botTradingRoutes } from '@/features/bot-trading/routes';
import type { BotRunItem } from '@/features/bot-trading/runs';

const mocks = vi.hoisted(() => ({
  runs: null as unknown as ReturnType<typeof fakeRuns>,
  connect: vi.fn(),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => (params ? `${key} ${JSON.stringify(params)}` : key),
  }),
}));
vi.mock('@/composables/useInternalConnect', () => ({
  useInternalConnect: () => ({ connectSoraWallet: mocks.connect }),
}));
vi.mock('@/features/bot-trading/runs', () => ({ useBotRuns: () => mocks.runs }));

function row(id: string, state: BotRunItem['state']): BotRunItem {
  return {
    id,
    name: `${id} bot`,
    mode: 'paper',
    assetIn: 'XOR',
    assetOut: 'PSWAP',
    state,
    endsAt: null,
    returnPercent: null,
    account: '',
    needsPassword: false,
  };
}

function fakeRuns() {
  const items = ref<BotRunItem[]>([]);
  return {
    ready: ref(true),
    items,
    runningCount: computed(
      () => items.value.filter((item) => ['running', 'elsewhere', 'continuing'].includes(item.state)).length
    ),
    waitingCount: computed(
      () => items.value.filter((item) => ['password', 'wallet', 'open', 'attention'].includes(item.state)).length
    ),
    busy: ref(false),
    failure: ref(null),
    check: vi.fn(async () => undefined),
    pause: vi.fn(),
    resume: vi.fn(),
    stop: vi.fn(),
  };
}

let router: Router;
async function render() {
  const wrapper = mount(BotRunsButton, { global: { plugins: [router] }, attachTo: document.body });
  await flushPromises();
  return wrapper;
}

beforeEach(async () => {
  mocks.runs = fakeRuns();
  mocks.connect.mockReset();
  router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/swap', component: {} }, ...botTradingRoutes.map((route) => ({ ...route, component: {} }))],
  });
  await router.push('/swap');
  await router.isReady();
});
afterEach(() => {
  document.body.innerHTML = '';
});

describe('BotRunsButton', () => {
  it('says how many bots run, and adds the ones that wait for the user', async () => {
    mocks.runs.items.value = [row('a', 'running'), row('b', 'continuing')];
    const wrapper = await render();
    const button = wrapper.get('[data-testid="bot-runs-button"]');
    expect(wrapper.get('[data-testid="bot-runs-label"]').text()).toBe('bots.runs.running {"count":2}');
    expect(button.classes()).toContain('bot-runs-trigger--running');
    mocks.runs.items.value = [row('a', 'running'), row('b', 'password')];
    await flushPromises();
    expect(button.classes()).toContain('bot-runs-trigger--mixed');
    expect(wrapper.get('[data-testid="bot-runs-badge"]').text()).toBe('1');
    expect(button.attributes('aria-label')).toBe('bots.runs.running {"count":1}. bots.runs.waiting {"count":1}');
    mocks.runs.items.value = [row('b', 'password')];
    await flushPromises();
    expect(wrapper.get('[data-testid="bot-runs-label"]').text()).toBe('bots.runs.waiting {"count":1}');
    mocks.runs.items.value = [row('c', 'paused')];
    await flushPromises();
    expect(wrapper.get('[data-testid="bot-runs-label"]').text()).toBe('bots.runs.paused {"count":1}');
    wrapper.unmount();
  });

  it('shows a plain label while the bot engine loads', async () => {
    mocks.runs.ready.value = false;
    const wrapper = await render();
    expect(wrapper.get('[data-testid="bot-runs-label"]').text()).toBe('bots.title');
    expect(wrapper.find('[data-testid="bot-runs-badge"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('opens a panel with the runs, how-to notes and a link to My Bots, and closes on Escape', async () => {
    mocks.runs.items.value = [row('a', 'running')];
    const wrapper = await render();
    const button = wrapper.get('[data-testid="bot-runs-button"]');
    expect(button.attributes('aria-expanded')).toBe('false');
    await button.trigger('click');
    await flushPromises();
    expect(button.attributes('aria-expanded')).toBe('true');
    expect(mocks.runs.check).toHaveBeenCalledOnce();
    const panel = wrapper.get('[data-testid="bot-runs-panel"]');
    expect(document.activeElement).toBe(panel.element);
    expect(panel.find('[data-testid="bot-run-a"]').exists()).toBe(true);
    expect(panel.text()).toContain('bots.runs.keepOpen');
    expect(panel.text()).toContain('bots.runs.controls');
    expect(panel.get('[data-testid="bot-runs-manage"]').attributes('href')).toBe('/bots/my-bots');
    await panel.trigger('keydown', { key: 'Escape' });
    expect(wrapper.find('[data-testid="bot-runs-panel"]').exists()).toBe(false);
    expect(document.activeElement).toBe(button.element);
    wrapper.unmount();
  });

  it('closes on an outside press and after navigation', async () => {
    mocks.runs.items.value = [row('a', 'running')];
    const wrapper = await render();
    await wrapper.get('[data-testid="bot-runs-button"]').trigger('click');
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await flushPromises();
    expect(wrapper.find('[data-testid="bot-runs-panel"]').exists()).toBe(false);
    await wrapper.get('[data-testid="bot-runs-button"]').trigger('click');
    await router.push('/bots');
    await flushPromises();
    expect(wrapper.find('[data-testid="bot-runs-panel"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('passes row actions to the run host and opens a bot on its page', async () => {
    mocks.runs.items.value = [row('a', 'running'), row('b', 'open'), { ...row('c', 'wallet'), mode: 'live' }];
    const wrapper = await render();
    await wrapper.get('[data-testid="bot-runs-button"]').trigger('click');
    await wrapper.get('[data-testid="bot-run-pause-a"]').trigger('click');
    expect(mocks.runs.pause).toHaveBeenCalledWith('a');
    await wrapper.get('[data-testid="bot-run-connect-c"]').trigger('click');
    expect(mocks.connect).toHaveBeenCalledOnce();
    await wrapper.get('[data-testid="bot-runs-button"]').trigger('click');
    await wrapper.get('[data-testid="bot-run-open-b"]').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe('/bots/my-bots?bot=b');
    wrapper.unmount();
  });
});
