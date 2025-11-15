import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { computed, ref, unref } from 'vue';

import type { Asset } from '@sora-substrate/sdk/build/assets/types';
import type { MaybeRef, Ref } from 'vue';

type BooleanSource = Ref<boolean | undefined> | (() => boolean | undefined) | undefined;

function resolveBoolean(source: BooleanSource): boolean {
  if (!source) return false;

  if (typeof source === 'function') {
    return Boolean(source());
  }

  return Boolean(source.value);
}

export type WidgetTokenSelectOptions = {
  defaultAsset?: Asset;
  predefinedToken?: MaybeRef<Nullable<Asset>>;
  parentLoading?: BooleanSource;
  loading?: BooleanSource;
};

export function useWidgetTokenSelect(options: WidgetTokenSelectOptions = {}) {
  const fallbackAsset = ref(options.defaultAsset ?? XOR);
  const showSelectTokenDialog = ref(false);

  const predefinedToken = computed(() => unref(options.predefinedToken ?? null));

  const resolveParentLoading = () => resolveBoolean(options.parentLoading);
  const resolveLoading = () => resolveBoolean(options.loading);

  const selectedToken = computed<Asset>(() => predefinedToken.value ?? fallbackAsset.value);
  const areActionsDisabled = computed(() => resolveParentLoading() || resolveLoading());
  const selectTokenIcon = computed<Nullable<string>>(() =>
    areActionsDisabled.value ? null : 'chevron-down-rounded-16'
  );
  const tokenTabIndex = computed(() => (areActionsDisabled.value ? -1 : 0));

  const handleSelectToken = () => {
    if (areActionsDisabled.value) return;
    showSelectTokenDialog.value = true;
  };

  const changeToken = (asset: Asset) => {
    if (selectedToken.value.address === asset.address) return;
    fallbackAsset.value = asset;
  };

  const closeTokenDialog = () => {
    showSelectTokenDialog.value = false;
  };

  return {
    selectedToken,
    areActionsDisabled,
    selectTokenIcon,
    tokenTabIndex,
    showSelectTokenDialog,
    handleSelectToken,
    changeToken,
    closeTokenDialog,
  };
}

export type WidgetTokenSelectComposable = ReturnType<typeof useWidgetTokenSelect>;
