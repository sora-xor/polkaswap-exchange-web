import { Storage } from '@sora-substrate/util';
import { storage as soraStorage, settingsStorage as settingsStorageInternal } from '@soramitsu/soraneo-wallet-web';

export const settingsStorage: Storage = settingsStorageInternal; // TODO: update keys

export default soraStorage;
