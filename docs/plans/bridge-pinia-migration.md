# Bridge Module Pinia Migration Plan

This plan tracks the remaining work required to replace the legacy Vuex bridge module (`src/store/bridge/**`) with first-class Pinia stores. It complements `docs/plans/state-layer-migration.md` and the parity table in `docs/plans/pinia-store-parity.md`.

## Objectives

1. Collapse all bridge state (forms, history, transactions, fee calculators) into Pinia stores that expose typed state/getters/actions.
2. Remove `direct-vuex` decorators from bridge consumers (`src/views/Bridge*.vue`, dialogs, composables) in favour of `useBridge*` hooks.
3. Ensure Vitest suites cover Pinia logic (history/page sync, form validation, transaction notifications) before deleting Vuex modules.

## Current State (2025-11-18)

- Pinia sub-stores already exist:
  - `useBridgeHistoryStore` — maintains `historyPage`/`historyId` and syncs legacy commits.
  - `useBridgeFormStore` — mirrors form state.
  - `useBridgeTransactionsStore` — wraps transaction watcher flags.
- Legacy Vuex modules under `src/store/bridge` still drive:
  - Asset/fee calculators (`state.asset`, `state.externalAsset`, `actions.registerAsset`).
  - Approval/subscription flows consumed by `src/views/Bridge.vue`, `BridgeTransactionsHistory.vue`, and `@/composables/useBridge*`.
- Decorator usage remains in Options API components and bridge mixins.

## Legacy Vuex Inventory Snapshot

### State (see `src/store/bridge/state.ts`)

| Group | Fields / Notes |
| ----- | -------------- |
| Form | `isSoraToEvm`, `assetAddress`, `amountSend`, `amountReceived`, `focusedField` |
| Balances & Limits | `assetSenderBalance`, `assetRecipientBalance`, `assetLockedBalance`, `assetExternalMinBalance`, `incomingMinLimit`, `outgoingMinLimit`, `outgoingMaxLimit`, `assetExternalMinBalance` |
| Fees / Network | `soraNetworkFee`, `externalTransferFee`, `externalNetworkFee`, `externalNativeBalance`, `externalBlockNumber`, `subBridgeConnector` (`SubNetworksConnector` instance) |
| Loading flags | `balancesFetching`, `feesAndLockedFundsFetching` |
| History & notifications | `historyInternal`, `historyPage`, `historyId`, `historyLoading`, `waitingForApprove`, `inProgressIds`, `notificationData` |
| Subscriptions | `outgoingMaxLimitSubscription`, `blockUpdatesSubscription` |
| Dialog flags | `isSignTxDialogVisible` |

### Key getters (see `src/store/bridge/getters.ts`)

- Bridge direction helpers: `isEthBridge`, `isEvmBridge`, `isSubBridge`, `operation`, `sender`, `recipient`.
- Asset lookups: `asset`, `registeredAsset`, `externalAsset`, `evmNativeAsset`, `isRegisteredAsset`.
- Fee + balance derived data: `assetSenderBalanceFormatted`, `assetLockedBalanceFormatted`, `canTransfer`, `maxAmount`, `amountFiatValue`.
- History helpers: `historyById`, `sortedHistory`, `operationLabel`.

### Actions / mutations (see `src/store/bridge/actions.ts`)

The module still encapsulates:

- Amount management: `setSendedAmount`, `setReceivedAmount`, `switchAmounts`, `updateAmounts`, precision/denomination adjustments.
- Balance/fee fetching: `getAccountAssetBalance`, `getEvmNetworkFee`, `getSubNetworkFee`, `getExternalNativeBalance`, `updateOutgoingLimits`, `setExternalTransferFee`, `setSoraNetworkFee`.
- Asset registration + subscriptions: `setAsset`, `resetAsset`, `subscribeOnBridgeAsset`, `unsubscribeFromBridgeAsset`, `resetOutgoingMaxSubscription`, `subscribeOnBridgeBlockUpdates`.
- Transfer lifecycle: `submit`, `approve`, `waitForEvmTransactionMined`, `waitForApprove`, `updateHistory`, `trackNotification`.
- History sync & storage: `loadBridgeHistory`, `syncHistory`, `cleanUpHistory`.

These blocks must gain Pinia equivalents (either consolidated into a single Pinia store or split across composables) before the Vuex module can be deleted.

## Migration Tasks

| Task | Owner | Notes |
| ---- | ----- | ----- |
| Inventory remaining Vuex state/actions (`docs/reports/store-access-audit.md`, domain `bridge`) | Platform + Bridge squads | Highlight fields/actions not yet mirrored in Pinia. |
| Spec consolidated Pinia bridge store (`src/stores/bridge/index.ts`) | Platform | Combine form/history/transactions plus asset/fee state; document contract in TS. **Status:** spec below, implementation next. |
| Build composables (`useBridgeAssets`, `useBridgeFees`) backed by Pinia | Platform | Replace `store.getters.bridge.*` access. |
| Update bridge views/dialogs (`src/views/Bridge*.vue`, `components/pages/Bridge/**`) | Frontend pod | Swap decorators for `<script setup>` + Pinia/composables. |
| Extend Vitest suites (`tests/unit/stores/bridge/**`, `tests/unit/views/Bridge*.spec.ts`) | QA + Platform | Cover new store actions, subscriptions, fee math. |
| Delete legacy Vuex bridge module (`src/store/bridge/**`) | Platform | Remove module registration + decorators; update docs. |

## Risks / Dependencies

- Wallet bundle: bridge approval flows depend on wallet subscriptions; coordinate with wallet squad before flipping.
- Telemetry: Pinia actions must emit `bridge.pinia.*` events per `docs/plans/pinia-telemetry-hooks.md`.
- QA: Bridge e2e smokes (`yarn test:e2e --grep @bridge`) must run against the Pinia-backed implementation before legacy code is removed.

## QA & Verification

1. Unit: `yarn test:unit --run tests/unit/stores/bridge/*.spec.ts`.
2. Integration: Bridge-specific Playwright smokes.
3. Regression: `yarn build`, `yarn build:vue3`, `yarn test:translation`.

Capture status updates in this document and cross-link from `roadmap.md` when subtasks land.

## Pinia Bridge Store Specification (Draft)

### Store structure

File: `src/stores/bridge/index.ts`

```ts
import { defineStore } from 'pinia';
import { SubNetworksConnector } from '@/utils/bridge/sub/classes/adapter';
import type { BridgeState } from './types';

const buildInitialState = (): BridgeState => ({
  form: {
    isSoraToEvm: true,
    assetAddress: '',
    amountSend: '',
    amountReceived: '',
    focusedField: null,
  },
  balances: {
    assetSenderBalance: null,
    assetRecipientBalance: null,
    assetLockedBalance: null,
    assetExternalMinBalance: ZeroStringValue,
    incomingMinLimit: FPNumber.ZERO,
    outgoingMinLimit: null,
    outgoingMaxLimit: null,
  },
  fees: {
    soraNetworkFee: ZeroStringValue,
    externalTransferFee: ZeroStringValue,
    externalNetworkFee: ZeroStringValue,
    externalNativeBalance: ZeroStringValue,
    externalBlockNumber: 0,
  },
  flags: {
    balancesFetching: false,
    feesAndLockedFundsFetching: false,
    isSignTxDialogVisible: false,
  },
  history: {
    internal: {},
    page: 1,
    id: '',
    loading: {},
    waitingForApprove: {},
    inProgressIds: {},
    notificationData: null,
  },
  subscriptions: {
    outgoingMaxLimit: null,
    blockUpdates: null,
  },
  connector: new SubNetworksConnector(),
});

export const useBridgeStore = defineStore('bridge', {
  state: (): BridgeState => buildInitialState(),
  getters: {
    asset(state) {
      const walletStore = useWalletStore();
      return walletStore.assetsDataTable[state.form.assetAddress];
    },
    isSubBridge(state, rootState) {
      return rootState.web3.networkType === BridgeNetworkType.Sub;
    },
    canTransfer(state) {
      return state.form.amountSend !== ZeroStringValue && !state.flags.balancesFetching;
    },
    // ...additional derived data mirroring legacy getters
  },
  actions: {
    setAsset(address: string) {
      this.form.assetAddress = address;
      void this.refreshBalances();
    },
    setAmountSend(value: string) {
      this.form.amountSend = value;
      void this.recalculateReceivedAmount();
    },
    async refreshBalances() {
      this.flags.balancesFetching = true;
      try {
        const walletStore = useWalletStore();
        // fetch sender/recipient balances using bridge APIs
      } finally {
        this.flags.balancesFetching = false;
      }
    },
    async calculateFees() {
      this.flags.feesAndLockedFundsFetching = true;
      try {
        // call eth/sub bridge helpers (extracted from legacy actions)
      } finally {
        this.flags.feesAndLockedFundsFetching = false;
      }
    },
    async submitTransfer(payload: SubmitPayload) {
      // orchestrate approve/submit flow, emit telemetry, push to history
    },
    setHistoryPage(page: number) {
      this.history.page = normalizePage(page);
      trackEvent('bridge.pinia.historyPage.changed', { page: this.history.page });
    },
    reset() {
      this.$patch(buildInitialState());
    },
  },
});
```

### Supporting modules

- `src/stores/bridge/types.ts`: define structured state slices (form, balances, fees, history, flags, subscriptions).
- Helper composables: `useBridgeAssets` (wraps asset registration/lookup), `useBridgeFees` (fetch/calculates fees), `useBridgeHistory` (persists history to localStorage/SDK).
- Telemetry integration: every action that mutates history or submits transfers should call `trackEvent('bridge.pinia.transfer.submitted', …)` per telemetry plan.

### Implementation notes

- Split complex async logic (e.g., substrate connector interactions) into `@/utils/bridge/pinia/*` helpers to keep the store readable.
- Use existing bridge APIs (`ethBridgeApi`, `subBridgeApi`, etc.) via extracted utility functions so they can be mocked in Vitest.
- Provide migration shims for legacy components until they are updated (e.g., `useLegacyBridgeStore()` composable exposing the new store shape while legacy code is refactored).
