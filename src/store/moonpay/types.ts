import type { BridgeHistory } from '@sora-substrate/util';

import type { MoonpayApi, MoonpayCurrency, MoonpayTransaction } from '@/utils/moonpay';
import type { MoonpayNotifications } from '@/components/Moonpay/consts';

export type MoonpayState = {
  api: MoonpayApi;
  dialogVisibility: boolean;
  notificationVisibility: boolean;
  notificationKey: MoonpayNotifications | '';
  confirmationVisibility: boolean;
  pollingTimestamp: number;
  transactions: Array<MoonpayTransaction>;
  transactionsFetching: boolean;
  bridgeTransactionData: Nullable<BridgeHistory>;
  startBridgeButtonVisibility: boolean;
  currencies: Array<MoonpayCurrency>;
};

export type BridgeTxData = Partial<{
  data: Nullable<BridgeHistory>;
  startBridgeButtonVisibility: boolean;
}>;
