import type { BridgeTxStatus } from '@sora-substrate/util';

export enum STATES {
  INITIAL = 'INITIAL',
  SORA_SUBMITTED = 'SORA_SUBMITTED',
  SORA_PENDING = 'SORA_PENDING',
  SORA_REJECTED = 'SORA_REJECTED',
  SORA_COMMITED = 'SORA_COMMITED',
  EVM_SUBMITTED = 'EVM_SUBMITTED',
  EVM_PENDING = 'EVM_PENDING',
  EVM_REJECTED = 'EVM_REJECTED',
  EVM_COMMITED = 'EVM_COMMITED',
}

export type HandleTransactionPayload = {
  status?: BridgeTxStatus;
  nextState: STATES;
  rejectState: STATES;
  handler?: (id: string) => Promise<void>;
};
