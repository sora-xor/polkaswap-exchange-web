import type { EvmHistory } from '@sora-substrate/util/build/evm/types';

import type { MoonpayApi, MoonpayCurrency, MoonpayTransaction } from '@/utils/moonpay';
import type { MoonpayNotifications } from '@/components/pages/Moonpay/consts';

export type MoonpayState = {
  api: MoonpayApi;
  dialogVisibility: boolean;
  notificationVisibility: boolean;
  notificationKey: MoonpayNotifications | '';
  confirmationVisibility: boolean;
  pollingTimestamp: number;
  transactions: Array<MoonpayTransaction>;
  transactionsFetching: boolean;
  bridgeTransactionData: Nullable<EvmHistory>;
  startBridgeButtonVisibility: boolean;
  currencies: Array<MoonpayCurrency>;
};

export type BridgeTxData = Partial<{
  data: Nullable<EvmHistory>;
  startBridgeButtonVisibility: boolean;
}>;
