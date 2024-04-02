import { Storage } from '@sora-substrate/util';
import { storage as soraStorage } from '@soramitsu/soraneo-wallet-web';

export { settingsStorage } from '@soramitsu/soraneo-wallet-web';

export default soraStorage;

export const layoutsStorage = new Storage('layouts');
