<template>
  <dialog-base
    :visible="!!request"
    class="temporary-wallet-request"
    :title="t('temporaryWallet.request.title')"
    :show-close-button="!request?.busy"
    :close-on-click-modal="false"
    :close-on-esc="!request?.busy"
    @update:visible="onVisibility"
  >
    <template #title>
      <!-- The shared title style cuts long text with an ellipsis; translations of this title must wrap instead. -->
      <span class="temporary-wallet-request__title">{{ t('temporaryWallet.request.title') }}</span>
    </template>
    <template v-if="request">
      <p class="temporary-wallet-request__action" data-test-name="temporaryWalletAction">{{ actionText }}</p>
      <dl class="temporary-wallet-request__details">
        <div>
          <dt>{{ t('temporaryWallet.request.from') }}</dt>
          <dd>
            <code dir="ltr">{{ checksum(request.from) }}</code>
          </dd>
        </div>
        <div>
          <dt>{{ t('temporaryWallet.request.to') }}</dt>
          <dd>
            <code dir="ltr">{{ checksum(request.to) }}</code>
          </dd>
        </div>
        <div v-if="soraRecipient">
          <dt>{{ t('temporaryWallet.request.soraAccount') }}</dt>
          <dd>
            <code dir="ltr" translate="no" data-test-name="temporaryWalletSoraAccount">{{ soraRecipient }}</code>
          </dd>
        </div>
        <div v-if="sendsEth">
          <dt>{{ t('temporaryWallet.request.value') }}</dt>
          <dd data-test-name="temporaryWalletValue">{{ amount(request.value, 'up') }} ETH</dd>
        </div>
        <div>
          <dt>{{ t('temporaryWallet.request.fee') }}</dt>
          <dd data-test-name="temporaryWalletFee">
            {{
              t('temporaryWallet.request.feeValue', {
                estimate: amount(request.estimatedFee, 'up'),
                max: amount(request.maxFee, 'up'),
              })
            }}
          </dd>
        </div>
      </dl>
      <p
        v-if="otherSoraAccount"
        class="temporary-wallet-request__alert"
        role="alert"
        data-test-name="temporaryWalletOtherSoraAccount"
      >
        {{ t('temporaryWallet.request.otherSoraAccount') }}
      </p>
      <p v-if="request.feeIncreased" class="temporary-wallet-request__alert" role="alert">
        {{ t('temporaryWallet.request.feeIncreased') }}
      </p>
      <p class="temporary-wallet-request__note">{{ t('temporaryWallet.request.note') }}</p>
    </template>
    <template #footer>
      <div class="temporary-wallet-request__actions">
        <s-button type="secondary" native-type="button" :disabled="!request || request.busy" @click="reject">
          {{ t('temporaryWallet.request.reject') }}
        </s-button>
        <s-button
          type="primary"
          native-type="button"
          data-test-name="temporaryWalletApprove"
          :disabled="!request"
          :loading="request?.busy"
          @click="approve"
        >
          {{ t(request?.busy ? 'temporaryWallet.request.sending' : 'temporaryWallet.request.approve') }}
        </s-button>
      </div>
    </template>
  </dialog-base>
</template>

<script setup lang="ts">
import { u8aToHex } from '@polkadot/util';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';
import { FPNumber } from '@sora-substrate/sdk';
import { getAddress } from 'ethers';
import { computed } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { describeTemporaryWalletRequest } from '@/features/misc/lib/temporaryWalletAction';
import DialogBase from '@/lib/soraneo-wallet/src/components/DialogBase.vue';
import { useWalletStore } from '@/stores/wallet';
import {
  approveTemporaryWalletRequest,
  rejectTemporaryWalletRequest,
  temporaryWalletSession,
} from '@/utils/connection/evm/temporaryWalletSession';

/**
 * Approval prompt of the temporary Ethereum wallet, mounted by the app shell while a transaction waits.
 * It plays the part of a wallet extension's confirmation window: nothing is signed until Approve is clicked,
 * and closing the dialog rejects the request.
 */
defineOptions({ name: 'TemporaryWalletRequestDialog' });

/** SS58 prefix of SORA addresses. */
const SORA_SS58_PREFIX = 69;

const { t } = useTranslation();
const wallet = useWalletStore();
const request = computed(() => temporaryWalletSession.request);
const sendsEth = computed(() => !!request.value && BigInt(request.value.value) > 0n);
const action = computed(() => (request.value ? describeTemporaryWalletRequest(request.value) : null));
/** The SORA account a bridge transfer pays: the "To" row only shows the bridge contract. */
const soraRecipient = computed(() => {
  const current = action.value;
  if (current?.kind !== 'bridge') return '';
  try {
    return encodeAddress(current.recipient, SORA_SS58_PREFIX);
  } catch {
    return current.recipient;
  }
});
/** A bridge transfer to a SORA account other than the connected one gets a warning. */
const otherSoraAccount = computed(() => {
  const current = action.value;
  if (current?.kind !== 'bridge' || !wallet.address) return false;
  try {
    return u8aToHex(decodeAddress(wallet.address)) !== current.recipient;
  } catch {
    return true;
  }
});
const actionText = computed(() => {
  const current = action.value;
  if (!current) return '';
  switch (current.kind) {
    case 'convert':
      return t('temporaryWallet.request.convert', {
        amount: amount(current.amount, 'up', false),
        minimum: amount(current.minimum, 'down', false),
      });
    case 'allowBridgeAll':
      return t('temporaryWallet.request.allowBridgeAll');
    case 'bridge':
      return t(current.asset === 'ETH' ? 'temporaryWallet.request.bridgeEth' : 'temporaryWallet.request.bridge', {
        amount: amount(current.amount, 'up', false),
      });
    case 'allowBridge':
    case 'send':
      return t(`temporaryWallet.request.${current.kind}`, { amount: amount(current.amount, 'up', false) });
    default:
      return t('temporaryWallet.request.contract');
  }
});

/**
 * Rounds for display only, never in the user's favour: what leaves the wallet rounds up and the minimum received
 * rounds down. `codec` amounts are wei; others are already natural units.
 */
function amount(value: string, direction: 'up' | 'down', codec = true): string {
  const exact = codec ? FPNumber.fromCodecValue(value, 18) : new FPNumber(value);
  return exact.dp(8, direction === 'up' ? 2 : 3).toLocaleString(8);
}

/** Mixed-case checksum form, so both addresses read alike and a mistyped one would stand out. */
function checksum(address: string): string {
  try {
    return getAddress(address);
  } catch {
    return address;
  }
}

function approve(): void {
  if (request.value) void approveTemporaryWalletRequest(request.value.id);
}

function reject(): void {
  if (request.value && !request.value.busy) rejectTemporaryWalletRequest(request.value.id);
}

function onVisibility(visible: boolean): void {
  if (!visible) reject();
}
</script>

<style scoped lang="scss">
.temporary-wallet-request {
  &__title {
    min-width: 0;
    color: var(--s-color-base-content-primary);
    font-size: 22px;
    font-weight: 600;
    line-height: 1.3;
    overflow-wrap: anywhere;
  }
  &__action {
    margin: 0 0 16px;
    font-size: 18px;
    font-weight: 600;
    line-height: 1.4;
    color: var(--s-color-base-content-primary);
  }
  &__details {
    margin: 0 0 12px;
    padding: 12px 16px;
    border-radius: var(--s-border-radius-small);
    background: var(--s-color-utility-body);
    box-shadow: var(--s-shadow-element);
    font-size: 13px;
    line-height: 1.5;
    > div {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 4px 16px;
      padding: 6px 0;
    }
    > div + div {
      border-top: 1px solid var(--s-color-base-border-secondary);
    }
  }
  dt {
    color: var(--s-color-base-content-secondary);
  }
  dd {
    margin: 0;
    min-width: 0;
    text-align: end;
    overflow-wrap: anywhere;
    font-variant-numeric: tabular-nums;
  }
  code {
    font-size: 12px;
  }
  &__alert {
    // The text token keeps 4.5:1 on the dialog in both themes; the plain status colour is for fills and icons.
    color: var(--s-color-status-warning-text, var(--s-color-status-warning));
  }
  &__note,
  &__alert {
    margin: 8px 0 0;
    font-size: 13px;
    line-height: 1.5;
  }
  &__note {
    color: var(--s-color-base-content-secondary);
  }
  &__actions {
    display: flex;
    gap: 12px;
    width: 100%;
    > * {
      flex: 1;
      margin: 0;
    }
  }
}
</style>
