import { Vue } from 'vue-property-decorator';
import { HistoryItem } from '@sora-substrate/sdk';

export default class EthBridgeTransactionMixin extends Vue {
  isEthBridgeTx(transaction: HistoryItem): boolean;
  getEthBridgeTxState(transaction: HistoryItem): string;
  isSoraToEthTx(transaction: HistoryItem): boolean;
  isEthBridgeTxStarted(transaction: HistoryItem): boolean;
  isEthBridgeTxFromPending(transaction: HistoryItem): boolean;
  isEthBridgeTxFromFailed(transaction: HistoryItem): boolean;
  isEthBridgeTxToFailed(transaction: HistoryItem): boolean;
  isEthBridgeTxFromCompleted(transaction: HistoryItem): boolean;
  isEthBridgeTxToCompleted(transaction: HistoryItem): boolean;
}
