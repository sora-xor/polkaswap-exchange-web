<template>
  <div class="app-status s-flex">
    <a
      v-if="blockNumber && blockExplorerLink"
      class="block-number s-flex"
      :href="blockExplorerLink"
      target="_blank"
      rel="nofollow noopener"
    >
      <span class="block-number-icon"></span><span>{{ blockNumberFormatted }}</span>
    </a>
    <footer-popper
      icon="globe-16"
      panel-class="node"
      :panel-text="nodeConnectionText"
      :status="nodeConnectionStatus"
      :action-text="t('selectNodeText')"
      @action="setSelectNodeDialogVisibility(true)"
    >
      <template #label>
        <span>{{ t('selectNodeConnected') }}</span>
        <span v-if="node">{{ node.chain || node.name }}</span>
      </template>
      <template #default>
        <span v-if="node">{{ node.address }}</span>
        <span v-if="formattedNodeLocation">
          {{ formattedNodeLocation.name }} <span class="flag-emodji">{{ formattedNodeLocation.flag }}</span>
        </span>
        <div class="node-extras" v-if="node">
          <span v-if="nodeLatencyText">Latency: {{ nodeLatencyText }}</span>
          <span v-if="backoffNextText">Next retry: {{ backoffNextText }}</span>
          <s-button class="s-typography-button--mini" size="mini" type="secondary" @click="runLatencyProbe">
            Test latency
          </s-button>
          <div v-if="isDebug" class="node-dev s-flex">
            <s-button class="s-typography-button--mini" size="mini" type="secondary" @click="toggleBackoff">
              Toggle backoff ({{ backoffEnabledText }})
            </s-button>
            <s-button class="s-typography-button--mini" size="mini" type="secondary" @click="toggleParallel">
              Toggle parallel ({{ parallelDialEnabledText }})
            </s-button>
          </div>
        </div>
      </template>
    </footer-popper>
    <footer-popper
      icon="wi-fi-16"
      panel-class="internet"
      :panel-text="internetConnectionText"
      :status="internetConnectionStatus"
      :action-text="t('footer.internet.action')"
      @action="refreshPage"
    >
      <template #label>
        <span>{{ t('footer.internet.label') }}</span>
        <span>{{ internetConnectionSpeedMbText }}</span>
      </template>
      <template #default>
        <span>{{ internetConnectionDesc }}</span>
      </template>
    </footer-popper>
    <div
      class="app-status__item indexer-block s-flex"
      :class="indexerBlockStatus"
      :aria-label="indexerBlockText"
      :title="indexerBlockText"
    >
      <span v-if="isIndexerBlockInitialLoading" class="indexer-block__loading"></span>
      <s-icon v-else name="software-cloud-24" size="16"></s-icon>
      <span class="indexer-block__text">{{ indexerBlockText }}</span>
    </div>
    <div class="sora-logo">
      <span class="sora-logo__title">{{ t('poweredBy') }}</span>
      <a class="sora-logo__image" href="https://sora.org" title="Sora" target="_blank" rel="nofollow noopener">
        <sora-logo :theme="libraryTheme"></sora-logo>
      </a>
    </div>
    <select-node-dialog
      v-if="selectNodeDialogVisibility"
      :connection="appConnection"
      :visibility="selectNodeDialogVisibility"
      :set-visibility="setSelectNodeDialogVisibility"
    ></select-node-dialog>
    <no-internet-dialog v-if="!isBrowserOnline"></no-internet-dialog>
  </div>
</template>

<script lang="ts" setup>
import { FPNumber } from '@sora-substrate/math';
import { computed, markRaw, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { Status } from '@soramitsu-ui/ui/types';
import { SelectNodeDialog } from '@/app/shell/components';
import { useTranslation } from '@/composables/useTranslation';
import SoraLogo from '@/components/shared/Logo/Sora.vue';
import { IndexerType, type SoraNetwork } from '@/consts';
import { Theme } from '@/consts/theme';
import { createAsyncComponent } from '@/shared/ui/async';
import { connection } from '@/lib/soraneo-wallet/src/api';
import { getExplorerLinks } from '@/lib/soraneo-wallet/src/util';
import { ConnectionStatus, type IndexerState } from '@/lib/soraneo-wallet/src/types/common';
import { useSettingsStore } from '@/stores/settings';
import type { Node } from '@/types/nodes';
import { NodesConnection } from '@/utils/connection';
import { toSafeExternalLink } from '@/utils/externalLinks';
import { settingsStorage } from '@/utils/storage';
import { formatLocation } from '@/components/App/Settings/Node/utils';
import { resolveIndexerStatus } from '@/components/App/Footer/utils/resolveIndexerStatus';

import FooterPopper from './FooterPopper.vue';

const NoInternetDialog = createAsyncComponent(() => import('./NoInternetDialog.vue'));
type LatestIndexedBlockModule = typeof import('@/indexer/queries/latestIndexedBlock');

let latestIndexedBlockModulePromise: Promise<LatestIndexedBlockModule> | null = null;

/**
 * Defers Polkaswap indexer query code until the footer refreshes indexer
 * status, keeping GraphQL out of the shell startup path.
 */
const loadLatestIndexedBlockModule = (): Promise<LatestIndexedBlockModule> => {
  latestIndexedBlockModulePromise ??= import('@/indexer/queries/latestIndexedBlock');
  return latestIndexedBlockModulePromise;
};

/** Max limit provided by navigator.connection.downlink */
const MAX_INTERNET_CONNECTION_LIMIT = 10;
const INDEXER_BLOCK_REFRESH_INTERVAL_MS = 30_000;

defineOptions({ name: 'AppFooter' });

const { t, TranslationConsts } = useTranslation();
const settingsStore = useSettingsStore();

const soraNetwork = computed(() => settingsStore.soraNetwork as Nullable<SoraNetwork>);
const blockNumber = computed(() => settingsStore.blockNumber);
const indexerType = computed(() => settingsStore.indexerType ?? IndexerType.POLKASWAP);
const libraryTheme = computed(() => (settingsStore.libraryTheme as Theme | null) ?? Theme.LIGHT);

const fallbackAppConnection = markRaw(new NodesConnection(settingsStorage, markRaw(connection)));
const appConnection = computed<NodesConnection>(() => {
  const connectionInstance = settingsStore.appConnection as NodesConnection | undefined;
  return connectionInstance ?? fallbackAppConnection;
});
const selectNodeDialogVisibility = computed(() => Boolean(settingsStore.selectNodeDialogVisibility));

const indexersData = computed(
  () => (settingsStore.indexers as Record<IndexerType, IndexerState>) ?? ({} as Record<IndexerType, IndexerState>)
);
const indexerEndpoint = computed(() => indexersData.value[indexerType.value]?.endpoint ?? '');

const isBrowserOnline = computed(() => settingsStore.isInternetConnectionEnabled);
const isConnectionStable = computed(() => settingsStore.isInternetConnectionStable);
const connectionSpeedMb = computed(() => settingsStore.internetConnectionSpeedMb);
const latestIndexedBlock = ref<Nullable<number>>(null);
const isIndexerBlockLoading = ref(false);
let indexerBlockRefreshTimer: Nullable<ReturnType<typeof window.setInterval>> = null;
let indexerBlockRequestId = 0;

const blockExplorerLink = computed(() => toSafeExternalLink(getExplorerLinks(soraNetwork.value)?.[0]?.value));
const blockNumberFormatted = computed(() => new FPNumber(blockNumber.value).toLocaleString());

const connectingNode = computed(() => {
  const { nodeAddressConnecting, nodeList } = appConnection.value;
  if (!nodeAddressConnecting) return null;
  return nodeList.find((node) => node.address === nodeAddressConnecting) ?? null;
});

const node = computed<Node | null>(() => connectingNode.value ?? appConnection.value.node ?? null);

const isNodeConnected = computed(() => appConnection.value.nodeIsConnected);
const isNodeConnecting = computed(() => Boolean(connectingNode.value));

const nodeConnectionStatus = computed(() => {
  if (isNodeConnected.value) return Status.SUCCESS;
  if (isNodeConnecting.value) return Status.INFO;
  return Status.ERROR;
});

const nodeConnectionText = computed(() => {
  const key = isNodeConnected.value ? 'connected' : isNodeConnecting.value ? 'loading' : 'disconnected';
  return t(`footer.node.title.${key}`);
});

const formattedNodeLocation = computed(() => (node.value?.location ? formatLocation(node.value.location) : null));

const nodeLatencyText = computed(() => {
  const addr = node.value?.address;
  if (!addr) return '';
  const latency = appConnection.value.getNodeLatency(addr);
  return latency != null && isFinite(latency as number) ? `${latency} ms` : '';
});

const backoffEnabledText = computed(() => (NodesConnection.enableBackoff ? t('connectedText') : t('disabled')));
const parallelDialEnabledText = computed(() =>
  NodesConnection.enableParallelDial ? t('connectedText') : t('disabled')
);

const backoffNextText = computed(() => {
  if (!NodesConnection.enableBackoff) return '';
  const ms = appConnection.value.lastReconnectDelayMs;
  if (!ms) return '';
  const s = Math.ceil(ms / 1000);
  return `${s}s (attempt ${appConnection.value.reconnectAttempt})`;
});

const isDebug = computed(() => settingsStore.debugEnabled);

const internetConnectionStatus = computed(() => {
  if (!isBrowserOnline.value) return Status.ERROR;
  if (!isConnectionStable.value) return Status.WARNING;
  return Status.SUCCESS;
});

const internetConnectionText = computed(() => {
  const key = !isBrowserOnline.value ? 'disabled' : !isConnectionStable.value ? 'unstable' : 'stable';
  return t(`footer.internet.title.${key}`);
});

const internetConnectionDesc = computed(() => {
  const key = !isBrowserOnline.value ? 'disabled' : !isConnectionStable.value ? 'unstable' : 'stable';
  return t(`footer.internet.desc.${key}`);
});

const internetConnectionSpeedMbText = computed(() => {
  if (!connectionSpeedMb.value) return '';
  const suffix = connectionSpeedMb.value === MAX_INTERNET_CONNECTION_LIMIT ? '≥ ' : '';
  return `${suffix}${connectionSpeedMb.value} ${TranslationConsts.mbps}`;
});

const indexerStatus = computed(() => {
  return resolveIndexerStatus(indexerType.value, indexersData.value);
});

const fallbackIndexedBlock = computed(() => {
  const block = Number(blockNumber.value);

  return Number.isSafeInteger(block) && block > 0 ? block : null;
});
const displayedIndexedBlock = computed(() => latestIndexedBlock.value ?? fallbackIndexedBlock.value);

const indexerBlockStatus = computed(() => {
  if (displayedIndexedBlock.value !== null) {
    return Status.SUCCESS;
  }

  switch (indexerStatus.value) {
    case ConnectionStatus.Unavailable:
      return Status.ERROR;
    case ConnectionStatus.Loading:
      return Status.INFO;
    case ConnectionStatus.Available:
      return Status.SUCCESS;
    default:
      return Status.INFO;
  }
});

const isIndexerBlockInitialLoading = computed(
  () => isIndexerBlockLoading.value && displayedIndexedBlock.value === null
);
const latestIndexedBlockFormatted = computed(() => {
  if (displayedIndexedBlock.value === null) return '-';
  return new FPNumber(displayedIndexedBlock.value).toLocaleString();
});
const indexerBlockText = computed(() =>
  t('footer.statistics.indexerBlock', { block: latestIndexedBlockFormatted.value })
);

function setSelectNodeDialogVisibility(flag: boolean): void {
  settingsStore.setSelectNodeDialogVisibility(flag);
}

async function runLatencyProbe(): Promise<void> {
  await appConnection.value.testLatency();
}

function toggleBackoff(): void {
  NodesConnection.enableBackoff = !NodesConnection.enableBackoff;
}

function toggleParallel(): void {
  NodesConnection.enableParallelDial = !NodesConnection.enableParallelDial;
}

function refreshPage(): void {
  window.location.reload();
}

function handleOffline(): void {
  settingsStore.setInternetConnectionDisabled();
}

function handleOnline(): void {
  settingsStore.setInternetConnectionEnabled();
}

function handleConnectionChange(): void {
  settingsStore.setInternetConnectionSpeed();
}

async function refreshLatestIndexedBlock(): Promise<void> {
  const requestId = ++indexerBlockRequestId;
  isIndexerBlockLoading.value = true;

  try {
    const { fetchLatestIndexedBlock } = await loadLatestIndexedBlockModule();
    const block = await fetchLatestIndexedBlock();
    if (requestId !== indexerBlockRequestId) return;
    if (block !== null) {
      latestIndexedBlock.value = block;
    }
  } catch (error) {
    console.warn('[footer] Latest Polkaswap indexer block is unavailable', error);
  } finally {
    if (requestId === indexerBlockRequestId) {
      isIndexerBlockLoading.value = false;
    }
  }
}

watch([indexerType, indexerEndpoint], () => {
  latestIndexedBlock.value = null;
  void refreshLatestIndexedBlock();
});

onMounted(() => {
  window.addEventListener('offline', handleOffline);
  window.addEventListener('online', handleOnline);
  (navigator as any)?.connection?.addEventListener('change', handleConnectionChange);
  void refreshLatestIndexedBlock();
  indexerBlockRefreshTimer = window.setInterval(() => {
    void refreshLatestIndexedBlock();
  }, INDEXER_BLOCK_REFRESH_INTERVAL_MS);
});

onBeforeUnmount(() => {
  window.removeEventListener('offline', handleOffline);
  window.removeEventListener('online', handleOnline);
  (navigator as any)?.connection?.removeEventListener('change', handleConnectionChange);
  indexerBlockRequestId += 1;
  if (indexerBlockRefreshTimer !== null) {
    window.clearInterval(indexerBlockRefreshTimer);
    indexerBlockRefreshTimer = null;
  }
});
</script>

<style lang="scss" scoped>
$block-icon-size: 7px;
$sora-logo-height: 36px;
$sora-logo-width: 115px;

.app-status {
  font-size: var(--s-font-size-extra-mini);
  font-weight: 300;
  height: $footer-height;
  border-top: 1px solid var(--s-color-base-border-secondary);
  background-color: var(--s-color-utility-surface);
  justify-content: center;
  align-items: center;
  gap: $inner-spacing-tiny;
  padding: 0 $inner-spacing-small;

  :deep(i[class*='s-icon-']) {
    font-size: 16px !important;
    line-height: 16px !important;
    width: 16px;
    height: 16px;
  }
}
.block-number {
  color: var(--s-color-status-success);
  text-decoration: none;
  @include app-status-item;

  &-icon {
    background-color: var(--s-color-status-success);
    border-radius: 50%;
    height: $block-icon-size;
    width: $block-icon-size;
    margin-right: 2px;
  }
}

.indexer-block {
  @include app-status-item;
  cursor: default;

  &.error :deep(i) {
    color: var(--s-color-status-error);
  }

  &.warning :deep(i) {
    color: var(--s-color-status-warning);
  }

  &.success :deep(i) {
    color: var(--s-color-status-success);
  }

  &__loading {
    height: var(--s-font-size-mini);
    width: var(--s-font-size-mini);
    background-image: url('@/assets/img/status-pending.svg');
    @include loading;
  }

  &__text {
    margin-left: $inner-spacing-mini;
    white-space: nowrap;
  }
}

.sora-logo {
  display: flex;
  align-items: center;
  align-self: flex-end;
  position: absolute;
  right: 0;

  &__title {
    text-transform: uppercase;
    font-weight: 200;
    color: var(--s-color-base-content-secondary);
    font-size: 12px;
    line-height: 12px;
    margin-right: $basic-spacing * 0.5;
    margin-top: 2px;
    white-space: nowrap;
  }

  &__image {
    width: $sora-logo-width;
    height: $sora-logo-height;
    @include focus-outline;
  }
}

@include desktop(true) {
  .sora-logo {
    display: none;
  }
}

@include large-mobile(true) {
  .app-status {
    justify-content: space-between;
    padding: 0 $inner-spacing-mini;
    gap: $inner-spacing-mini;
  }

  .block-number {
    display: none;
  }

  .indexer-block {
    flex: 1 1 auto;
    justify-content: center;
    min-width: 0;
    margin-left: 0;
    margin-right: 0;
    padding-left: $inner-spacing-tiny;
    padding-right: $inner-spacing-tiny;

    &__text {
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .sora-logo {
    display: none;
  }
}
</style>
