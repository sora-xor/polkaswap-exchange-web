import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import NftTokenLogo from '@/lib/soraneo-wallet/src/components/NftTokenLogo.vue';
import { IPFS_GATEWAY_BASE_URL } from '@/utils/ipfs';

import type { Asset } from '@sora-substrate/sdk/build/assets/types';

describe('NftTokenLogo', () => {
  it.each(['../api/v0/version', 'QmToken/%2e%2e/api/v0/version', 'https://example.com/logo.png'])(
    'renders malformed chain content without throwing or requesting another host path: %s',
    (content) => {
      const wrapper = mount(NftTokenLogo, { props: { asset: { content } as Asset } });
      expect(wrapper.get('img').attributes('src')).toBe('');
      expect(wrapper.get('img').isVisible()).toBe(false);
      wrapper.unmount();
    }
  );

  it('resolves valid NFT content through the maintained gateway', () => {
    const wrapper = mount(NftTokenLogo, { props: { asset: { content: 'QmToken/logo.png' } as Asset } });
    expect(wrapper.get('img').attributes('src')).toBe(`${IPFS_GATEWAY_BASE_URL}/ipfs/QmToken/logo.png`);
    wrapper.unmount();
  });
});
