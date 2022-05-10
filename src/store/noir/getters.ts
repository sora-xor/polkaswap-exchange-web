import { defineGetters } from 'direct-vuex';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import type { CodecString } from '@sora-substrate/util';

import { noirGetterContext } from '@/store/noir';
import type { NoirState } from './types';

import { NOIR_TOKEN_ADDRESS } from '@/consts';

const getters = defineGetters<NoirState>()({
  xorBalance(...args): CodecString {
    const { rootGetters } = noirGetterContext(args);
    const token = rootGetters.assets.assetDataByAddress(XOR.address);
    return token?.balance?.transferable || '0';
  },
  noirBalance(...args): CodecString {
    const { rootGetters } = noirGetterContext(args);
    const token = rootGetters.assets.assetDataByAddress(NOIR_TOKEN_ADDRESS);
    return token?.balance?.transferable || '0';
  },
});

export default getters;
