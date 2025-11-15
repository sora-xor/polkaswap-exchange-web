import { shallowMount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import FirstTxCard from '@/components/pages/PointSystem/FirstTxCard.vue';

const formatDateMock = vi.fn();

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    formatDate: formatDateMock,
  }),
}));

describe('FirstTxCard.vue', () => {
  it('renders translated content and the formatted date', () => {
    const timestamp = 1_700_000_000;
    formatDateMock.mockReturnValueOnce('2023-11-14');

    const wrapper = shallowMount(FirstTxCard, {
      props: {
        date: timestamp,
      },
    });

    expect(wrapper.text()).toContain('points.firstSoraNetworkTransaction');
    expect(wrapper.text()).toContain('points.dated');
    expect(wrapper.text()).toContain('2023-11-14');
    expect(formatDateMock).toHaveBeenCalledWith(timestamp, 'L');
  });
});
