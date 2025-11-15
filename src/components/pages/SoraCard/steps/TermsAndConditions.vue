<template>
  <div class="tos" v-loading="parentLoading">
    <p class="tos__pre-disclaimer">
      {{ t('card.termsAndConditionsPreDisclaimer') }}
    </p>
    <div class="tos__disclaimer">
      <h4 class="tos__disclaimer-header">{{ t('disclaimerTitle') }}</h4>
      <p class="tos__disclaimer-paragraph">
        {{ t('card.disclaimerCollectData') }}
      </p>
      <div class="tos__disclaimer-warning icon">
        <s-icon name="notifications-alert-triangle-24" size="28px"></s-icon>
      </div>
    </div>
    <div class="tos__section">
      <div v-button class="tos__section-block" @click="openDialog('t&c')">
        <span class="tos__section-point">{{ t(termsAndConditionsTitle) }}</span>
        <s-icon name="arrows-circle-chevron-right-24" size="18px" class="tos__section-icon"></s-icon>
      </div>
      <div class="line"></div>
      <div v-button class="tos__section-block" @click="openDialog('privacyPolicy')">
        <span class="tos__section-point">{{ t(privacyPolicyTitle) }}</span>
        <s-icon name="arrows-circle-chevron-right-24" size="18px" class="tos__section-icon"></s-icon>
      </div>
      <div class="line"></div>
      <div v-button class="tos__section-block" @click="openDialog('unsupported')">
        <span class="tos__section-point">{{ t(unsupportedCountriesTitle) }}</span>
        <s-icon name="arrows-circle-chevron-right-24" size="18px" class="tos__section-icon"></s-icon>
      </div>
    </div>
    <p class="tos__continue-block">{{ t('card.termsAndConditionsWarning') }}</p>
    <s-button type="primary" class="sora-card__btn s-typography-button--large" @click="handleConfirmToS">
      <span class="text">{{ t('card.acceptAndContinue') }}</span>
    </s-button>
    <tos-dialog v-model:visible="showDialog" :src-link="link" :title="t(dialogTitle)" :key="link"></tos-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

import { Components, TosExternalLinks } from '@/consts';
import { Theme } from '@/consts/theme';
import { lazyComponent } from '@/router';
import store from '@/store';
import { delay } from '@/utils';
import { useTranslation } from '@/composables/useTranslation';

type TermsAndConditionsType = 't&c' | 'privacyPolicy' | 'unsupported';

defineOptions({
  inheritAttrs: false,
  components: {
    TosDialog: lazyComponent(Components.ToSDialog),
  },
});

const props = withDefaults(
  defineProps<{
    parentLoading?: boolean;
  }>(),
  {
    parentLoading: false,
  }
);

const emit = defineEmits<{
  (event: 'confirm'): void;
}>();

const { t } = useTranslation();

const libraryTheme = computed(() => store.getters.libraryTheme as Theme);

const termsAndConditionsTitle = 'card.termsAndConditions';
const privacyPolicyTitle = 'card.privacyPolicy';
const unsupportedCountriesTitle = 'card.unsupportedCountries';

const showDialog = ref(false);
const dialogTitle = ref(termsAndConditionsTitle);
const link = ref('');

const termsLink = computed(() => TosExternalLinks.getLinks(libraryTheme.value).Terms);
const privacyLink = computed(() => TosExternalLinks.getLinks(libraryTheme.value).Privacy);

const handleConfirmToS = () => {
  emit('confirm');
};

const openDialog = async (policy: TermsAndConditionsType) => {
  if (policy === 't&c') {
    link.value = termsLink.value;
    dialogTitle.value = termsAndConditionsTitle;
  } else if (policy === 'privacyPolicy') {
    link.value = privacyLink.value;
    dialogTitle.value = privacyPolicyTitle;
  } else {
    link.value = '';
    dialogTitle.value = unsupportedCountriesTitle;
  }

  await delay();
  showDialog.value = true;
};

const parentLoading = computed(() => props.parentLoading);

defineExpose({
  openDialog,
  handleConfirmToS,
  showDialog,
  dialogTitle,
  link,
});
</script>

<style lang="scss" scoped>
.tos {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  &__pre-disclaimer {
    font-size: var(--s-font-size-small);
    margin-bottom: $basic-spacing;
    text-align: center;
    font-weight: 300;
    line-height: 150%;
    letter-spacing: var(--s-letter-spacing-small);
    width: 95%;
  }

  &__section {
    width: 100%;
    background-color: var(--s-color-base-background);
    border-radius: var(--s-border-radius-small);
    box-shadow: var(--s-shadow-dialog);
    padding: 20px $basic-spacing;
    margin-bottom: $basic-spacing;
    position: relative;

    &-block {
      height: 26px;
      &:hover {
        cursor: pointer;
      }

      &:hover .tos__section-icon {
        color: var(--s-color-base-content-secondary);
      }
    }

    &-point {
      font-size: 17px;
      line-height: 26px;
      font-weight: 500;
    }

    &-icon {
      position: absolute;
      color: var(--s-color-base-content-tertiary);
      right: 20px;
      line-height: 26px;
      transition: 0.3s;
    }

    &-header {
      font-weight: 500;
      margin-bottom: 10px;
      padding-right: var(--s-size-mini);
    }

    &-paragraph {
      color: var(--s-color-base-content-secondary);
      margin-bottom: var(--s-size-mini);
      padding-right: var(--s-size-mini);
    }
  }

  &__continue-block {
    margin: 0 20px;
    text-align: center;
  }

  .sora-card__btn {
    width: 100%;
  }

  .line {
    height: 1px;
    margin: 14px 0;
    background-color: var(--s-color-base-border-secondary);
  }
}
</style>
