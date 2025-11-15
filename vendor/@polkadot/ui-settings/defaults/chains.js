// Copyright 2017-2023 @polkadot/ui-settings authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { selectableNetworks } from '@polkadot/networks';
import { objectSpread } from '@polkadot/util';
const chains = selectableNetworks
  .filter((n) => n.genesisHash.length)
  .reduce(
    (chains, { genesisHash, network }) =>
      objectSpread(chains, {
        [network]: genesisHash,
      }),
    {}
  );
export { chains };
