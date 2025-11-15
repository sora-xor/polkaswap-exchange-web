<template>
  <div class="container">
    <StakingHeader :previous-page="SoraStakingPageNames.Overview">
      {{ t('soraStaking.info.validators') }}
    </StakingHeader>
    <SelectValidatorsMode @recommended="stakeWithSuggested" @selected="stakeWithSelected"></SelectValidatorsMode>
    <ValidatorsAttentionDialog
      v-model:visible="showValidatorsAttentionDialog"
      :parent-loading="dialogParentLoading"
      @proceed="handleSelectValidators"
    ></ValidatorsAttentionDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { useLoading } from '@/composables/useLoading';
import { useSoraStaking } from '@/modules/staking/sora/composables/useSoraStaking';
import { SoraStakingComponents, SoraStakingPageNames, ValidatorsListMode } from '@/modules/staking/sora/consts';
import { soraStakingLazyComponent } from '@/modules/staking/router';

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  parentLoading?: boolean;
}>();

const { t } = useI18n();
const router = useRouter();
const { loading } = useLoading();
const { setValidatorsType } = useSoraStaking();

const StakingHeader = soraStakingLazyComponent(SoraStakingComponents.StakingHeader);
const ValidatorsAttentionDialog = soraStakingLazyComponent(SoraStakingComponents.ValidatorsAttentionDialog);
const SelectValidatorsMode = soraStakingLazyComponent(SoraStakingComponents.SelectValidatorsMode);

const showValidatorsAttentionDialog = ref(false);

const dialogParentLoading = computed(() => Boolean(props.parentLoading) || loading.value);

const stakeWithSuggested = (): void => {
  setValidatorsType(ValidatorsListMode.RECOMMENDED);
  showValidatorsAttentionDialog.value = true;
};

const stakeWithSelected = (): void => {
  setValidatorsType(ValidatorsListMode.SELECT);
  showValidatorsAttentionDialog.value = true;
};

const handleSelectValidators = (): void => {
  showValidatorsAttentionDialog.value = false;
  router.push({ name: SoraStakingPageNames.SelectValidators });
};
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  width: $inner-window-width;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: $basic-spacing;
}

h4 {
  font-weight: 600;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 18px;
  border-radius: 24px;
  background: var(--s-color-base-border-primary);
  box-shadow:
    1px 1px 2px 0px rgba(255, 255, 255, 0.8) inset,
    1px 1px 10px 0px rgba(0, 0, 0, 0.1),
    -5px -5px 10px 0px #fff;
}

.criteria {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
  padding: 0;

  li {
    display: flex;
    align-items: center;
    gap: $inner-spacing-mini;
    width: 100%;
  }

  i {
    color: var(--s-color-status-success);
  }
}

.manual-select {
  color: var(--s-color-theme-accent);
  text-align: center;
  font-size: 14px;
  font-style: normal;
  font-weight: 500;
  text-transform: uppercase;
  cursor: pointer;
  margin-top: 8px;
}
</style>
