import { defineStore } from 'pinia';

import { FPNumber } from '@sora-substrate/sdk';

import { ZeroStringValue } from '@/consts';
import type { Nullable } from '@/types/common';
import { trackEvent } from '@/utils/telemetry';

import { enterLegacySync, leaveLegacySync } from './sync';

import type { CodecString } from '@sora-substrate/sdk';

type BridgeFormState = {
  assetSenderBalance: Nullable<CodecString>;
  assetRecipientBalance: Nullable<CodecString>;
  assetLockedBalance: Nullable<FPNumber>;
  assetExternalMinBalance: CodecString;
  incomingMinLimit: FPNumber;
  outgoingMinLimit: Nullable<FPNumber>;
  outgoingMaxLimit: Nullable<FPNumber>;
  soraNetworkFee: CodecString;
  externalTransferFee: CodecString;
  externalNetworkFee: CodecString;
  externalNativeBalance: CodecString;
};

const buildInitialState = (): BridgeFormState => ({
  assetSenderBalance: null,
  assetRecipientBalance: null,
  assetLockedBalance: null,
  assetExternalMinBalance: ZeroStringValue,
  incomingMinLimit: FPNumber.ZERO,
  outgoingMinLimit: null,
  outgoingMaxLimit: null,
  soraNetworkFee: ZeroStringValue,
  externalTransferFee: ZeroStringValue,
  externalNetworkFee: ZeroStringValue,
  externalNativeBalance: ZeroStringValue,
});

const emitTelemetry = (field: string, category: 'balance' | 'fee'): void => {
  trackEvent('bridge.pinia.form.updated', {
    field,
    category,
  });
};

export const useBridgeFormStore = defineStore('bridgeForm', {
  state: (): BridgeFormState => buildInitialState(),
  actions: {
    setAssetSenderBalance(balance: Nullable<CodecString>): void {
      this.assetSenderBalance = balance ?? null;
      emitTelemetry('assetSenderBalance', 'balance');
    },
    setAssetRecipientBalance(balance: Nullable<CodecString>): void {
      this.assetRecipientBalance = balance ?? null;
      emitTelemetry('assetRecipientBalance', 'balance');
    },
    setAssetLockedBalance(value: Nullable<FPNumber>): void {
      this.assetLockedBalance = value ?? null;
      emitTelemetry('assetLockedBalance', 'balance');
    },
    setExternalNativeBalance(balance: CodecString): void {
      this.externalNativeBalance = balance ?? ZeroStringValue;
      emitTelemetry('externalNativeBalance', 'balance');
    },
    setAssetExternalMinBalance(balance: CodecString): void {
      this.assetExternalMinBalance = balance ?? ZeroStringValue;
      emitTelemetry('assetExternalMinBalance', 'balance');
    },
    setIncomingMinLimit(value: FPNumber): void {
      this.incomingMinLimit = value ?? FPNumber.ZERO;
      emitTelemetry('incomingMinLimit', 'balance');
    },
    setOutgoingMinLimit(value: Nullable<FPNumber>): void {
      this.outgoingMinLimit = value ?? null;
      emitTelemetry('outgoingMinLimit', 'balance');
    },
    setOutgoingMaxLimit(value: Nullable<FPNumber>): void {
      this.outgoingMaxLimit = value ?? null;
      emitTelemetry('outgoingMaxLimit', 'balance');
    },
    setSoraNetworkFee(fee: CodecString): void {
      this.soraNetworkFee = fee ?? ZeroStringValue;
      emitTelemetry('soraNetworkFee', 'fee');
    },
    setExternalTransferFee(fee: CodecString): void {
      this.externalTransferFee = fee ?? ZeroStringValue;
      emitTelemetry('externalTransferFee', 'fee');
    },
    setExternalNetworkFee(fee: CodecString): void {
      this.externalNetworkFee = fee ?? ZeroStringValue;
      emitTelemetry('externalNetworkFee', 'fee');
    },
    syncAssetSenderBalance(balance: Nullable<CodecString>): void {
      enterLegacySync();
      try {
        this.setAssetSenderBalance(balance);
      } finally {
        leaveLegacySync();
      }
    },
    syncAssetRecipientBalance(balance: Nullable<CodecString>): void {
      enterLegacySync();
      try {
        this.setAssetRecipientBalance(balance);
      } finally {
        leaveLegacySync();
      }
    },
    syncAssetLockedBalance(value: Nullable<FPNumber>): void {
      enterLegacySync();
      try {
        this.setAssetLockedBalance(value);
      } finally {
        leaveLegacySync();
      }
    },
    syncExternalNativeBalance(balance: CodecString): void {
      enterLegacySync();
      try {
        this.setExternalNativeBalance(balance);
      } finally {
        leaveLegacySync();
      }
    },
    syncAssetExternalMinBalance(balance: CodecString): void {
      enterLegacySync();
      try {
        this.setAssetExternalMinBalance(balance);
      } finally {
        leaveLegacySync();
      }
    },
    syncIncomingMinLimit(value: FPNumber): void {
      enterLegacySync();
      try {
        this.setIncomingMinLimit(value);
      } finally {
        leaveLegacySync();
      }
    },
    syncOutgoingMinLimit(value: Nullable<FPNumber>): void {
      enterLegacySync();
      try {
        this.setOutgoingMinLimit(value);
      } finally {
        leaveLegacySync();
      }
    },
    syncOutgoingMaxLimit(value: Nullable<FPNumber>): void {
      enterLegacySync();
      try {
        this.setOutgoingMaxLimit(value);
      } finally {
        leaveLegacySync();
      }
    },
    syncSoraNetworkFee(fee: CodecString): void {
      enterLegacySync();
      try {
        this.setSoraNetworkFee(fee);
      } finally {
        leaveLegacySync();
      }
    },
    syncExternalTransferFee(fee: CodecString): void {
      enterLegacySync();
      try {
        this.setExternalTransferFee(fee);
      } finally {
        leaveLegacySync();
      }
    },
    syncExternalNetworkFee(fee: CodecString): void {
      enterLegacySync();
      try {
        this.setExternalNetworkFee(fee);
      } finally {
        leaveLegacySync();
      }
    },
    async refreshExternalBalance(): Promise<void> {
      const bridgeDispatch = getLegacyBridgeDispatch();
      if (!bridgeDispatch?.updateExternalBalance) return;
      await bridgeDispatch.updateExternalBalance();
    },
    async refreshExternalMinBalance(): Promise<void> {
      const bridgeDispatch = getLegacyBridgeDispatch();
      if (!bridgeDispatch?.updateExternalMinBalance) return;
      await bridgeDispatch.updateExternalMinBalance();
    },
    async refreshExternalTransferFee(): Promise<void> {
      const bridgeDispatch = getLegacyBridgeDispatch();
      if (!bridgeDispatch?.updateExternalTransferFee) return;
      await bridgeDispatch.updateExternalTransferFee();
    },
    async refreshExternalNetworkFee(): Promise<void> {
      const bridgeDispatch = getLegacyBridgeDispatch();
      if (!bridgeDispatch?.updateExternalNetworkFee) return;
      await bridgeDispatch.updateExternalNetworkFee();
    },
    async refreshFeesAndLockedFunds(): Promise<void> {
      const bridgeDispatch = getLegacyBridgeDispatch();
      if (!bridgeDispatch?.updateFeesAndLockedFunds) return;
      await bridgeDispatch.updateFeesAndLockedFunds();
    },
  },
});
