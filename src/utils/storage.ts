import { Storage } from '@sora-substrate/util';
import { storage as soraStorage } from '@soramitsu/soraneo-wallet-web';

export const settingsStorage = new Storage('dexSettings');

export default soraStorage;
