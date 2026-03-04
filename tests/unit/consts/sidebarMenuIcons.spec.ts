import { describe, expect, it } from 'vitest';

import { PageNames, SidebarMenuGroups } from '@/consts';
import { PoolPageNames } from '@/modules/pool/consts';
import { VaultPageNames } from '@/modules/vault/consts';

describe('SidebarMenuGroups icons', () => {
  it('keeps sidebar icons aligned with polkaswap menu and preserves SCCP icon', () => {
    const menuEntries = SidebarMenuGroups.map(({ href, icon, title }) => ({ href, icon, title }));

    expect(menuEntries).toEqual([
      { href: '#/swap', icon: 'arrows-swap-90-24', title: PageNames.Swap },
      { href: '#/trade', icon: 'music-CD-24', title: PageNames.OrderBook },
      { href: '#/points', icon: 'basic-circle-star-24', title: PageNames.Rewards },
      { href: '#/pool', icon: 'basic-drop-24', title: PoolPageNames.Pool },
      { href: '#/staking', icon: 'basic-layers-24', title: PageNames.StakingContainer },
      { href: '#/bridge', icon: 'grid-block-distribute-vertically-24', title: PageNames.Bridge },
      // SCCP is the only intentional extension over live polkaswap menu.
      { href: '#/bridge/sccp', icon: 'various-planet-24', title: PageNames.Sccp },
      { href: '#/wallet', icon: 'finance-wallet-24', title: PageNames.Wallet },
      { href: '#/kensetsu', icon: 'call-phone-16', title: VaultPageNames.VaultsContainer },
      { href: '#/explore', icon: 'various-items-24', title: PageNames.ExploreContainer },
      { href: '#/stats', icon: 'various-planet-24', title: PageNames.Stats },
      { href: '#/dashboard/owner', icon: 'various-rocket-24', title: PageNames.AssetOwnerContainer },
    ]);
  });
});
