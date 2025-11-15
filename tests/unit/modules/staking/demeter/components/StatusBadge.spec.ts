import { defineComponent, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import StatusBadge from '@/modules/staking/demeter/components/StatusBadge.vue';

vi.mock('@/router', () => ({
  lazyComponent: () =>
    defineComponent({
      name: 'StatusBadgeSharedStub',
      props: ['active', 'stopped', 'apr', 'rewardAsset'],
      emits: ['click'],
      template: `<div class="status-badge-shared-stub" @click="$emit('click', $event)"><slot /></div>`,
    }),
}));

const emitParams = { baseAsset: 'base', poolAsset: 'pool', rewardAsset: 'reward' };

const useDemeterPoolStatusMock = vi.fn();

vi.mock('@/modules/staking/demeter/composables/useDemeterPoolStatus', () => ({
  useDemeterPoolStatus: (...args: unknown[]) => useDemeterPoolStatusMock(...args),
}));

const createStatusApi = (overrides: Record<string, unknown> = {}) => ({
  hasStake: ref(false),
  activeStatus: ref(true),
  depositDisabled: ref(false),
  emitParams: ref(emitParams),
  ...overrides,
});

const baseProps = {
  apr: '12%',
  rewardAsset: { symbol: 'REWARD' },
  pool: null,
  accountPool: null,
  poolAsset: null,
  liquidity: null,
};

const findStatusBadgeShared = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findComponent({ name: 'StatusBadgeSharedStub' });

describe('Demeter StatusBadge', () => {
  beforeEach(() => {
    useDemeterPoolStatusMock.mockReset();
  });

  it('passes pool state to the shared badge component', () => {
    useDemeterPoolStatusMock.mockReturnValue(createStatusApi());

    const wrapper = mount(StatusBadge, { props: baseProps });
    const stub = findStatusBadgeShared(wrapper);

    expect(stub.props('active')).toBe(false);
    expect(stub.props('stopped')).toBe(false);
    expect(stub.props('apr')).toBe(baseProps.apr);
    expect(stub.props('rewardAsset')).toEqual(baseProps.rewardAsset);
  });

  it('emits add when badge is clickable', async () => {
    useDemeterPoolStatusMock.mockReturnValue(createStatusApi());

    const wrapper = mount(StatusBadge, { props: baseProps });
    const stub = findStatusBadgeShared(wrapper);

    await stub.vm.$emit('click', new Event('click') as unknown as Event);

    expect(wrapper.emitted('add')).toEqual([[emitParams]]);
  });

  it('suppresses add events when deposits are disabled', async () => {
    useDemeterPoolStatusMock.mockReturnValue(createStatusApi({ depositDisabled: ref(true) }));

    const wrapper = mount(StatusBadge, { props: baseProps });
    const stub = findStatusBadgeShared(wrapper);

    await stub.vm.$emit('click', new Event('click') as unknown as Event);

    expect(wrapper.emitted('add')).toBeUndefined();
  });
});
