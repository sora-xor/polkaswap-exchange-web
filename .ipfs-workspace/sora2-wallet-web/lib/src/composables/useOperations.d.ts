import { type History } from '@sora-substrate/sdk';
export declare function useOperations(): {
  getTitle: (value?: History) => string;
  getOperationMessage: (value?: History, hideAmountValues?: boolean) => string;
};
