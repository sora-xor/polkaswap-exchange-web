<template>
  <wallet-base
    v-loading="loading"
    :title="title"
    :show-back="true"
    :title-center="true"
    @back="handleBack"
    class="sora-card"
  >
    <terms-and-conditions v-if="step === KycProcess.TermsAndConditions" @confirm="confirmToS"></terms-and-conditions>
    <phone v-else-if="step === KycProcess.Phone" @confirm="confirmPhone"></phone>
    <email v-else-if="step === KycProcess.Email" @confirm="confirmEmail"></email>
    <payment v-else-if="step === KycProcess.Payment" @confirm="confirmPayment"></payment>
    <guidance v-else-if="step === KycProcess.Guidance" @confirm="confirmReadiness"></guidance>
    <kyc-view v-else-if="step === KycProcess.KycView" @confirm="confirmKyc"></kyc-view>
  </wallet-base>
</template>

<script lang="ts" setup>
import { components } from '@wallet';
import { computed, onMounted, ref } from 'vue';

import { Components } from '@/consts';
import { useTranslation } from '@/composables/useTranslation';
import { lazyComponent } from '@/router';
import { CardUIViews } from '@/types/card';

const KycProcess = {
  TermsAndConditions: 0,
  Phone: 1,
  Email: 2,
  Payment: 3,
  Guidance: 4,
  KycView: 5,
} as const;

type KycProcessKey = (typeof KycProcess)[keyof typeof KycProcess];

defineOptions({
  components: {
    WalletBase: components.WalletBase,
    TermsAndConditions: lazyComponent(Components.TermsAndConditions),
    Guidance: lazyComponent(Components.Guidance),
    Phone: lazyComponent(Components.Phone),
    Email: lazyComponent(Components.Email),
    Payment: lazyComponent(Components.Payment),
    KycView: lazyComponent(Components.KycView),
  },
});

const props = defineProps<{ getReadyPage?: boolean }>();

const emit = defineEmits<{
  (event: 'go-to-start'): void;
  (event: 'go-to-kyc-result'): void;
  (event: 'go-to-dashboard'): void;
}>();

const { t } = useTranslation();

const loading = ref(false);
const step = ref<KycProcessKey>(KycProcess.TermsAndConditions);

const title = computed(() => {
  switch (step.value) {
    case KycProcess.TermsAndConditions:
      return t('card.termsAndConditions');
    case KycProcess.Guidance:
      return t('card.getPrepared');
    case KycProcess.Phone:
      return t('card.phoneConfirmation');
    case KycProcess.Email:
      return t('card.emailConfirmation');
    case KycProcess.KycView:
      return t('card.completeKYC');
    default:
      return '';
  }
});

const handleBack = () => {
  if (step.value === KycProcess.TermsAndConditions) {
    emit('go-to-start');
    return;
  }

  if (step.value === KycProcess.Phone || step.value === KycProcess.Payment || step.value === KycProcess.Guidance) {
    step.value = KycProcess.TermsAndConditions;
    return;
  }

  if (step.value === KycProcess.Email) {
    step.value = KycProcess.Phone;
    return;
  }

  if (step.value === KycProcess.KycView) {
    step.value = KycProcess.Guidance;
  }
};

const confirmToS = () => {
  step.value = KycProcess.Phone;
};

const confirmPayment = () => {
  step.value = KycProcess.Guidance;
};

const confirmPhone = (state: CardUIViews) => {
  switch (state) {
    case CardUIViews.Payment:
      step.value = KycProcess.Payment;
      break;
    case CardUIViews.Kyc:
      step.value = KycProcess.Guidance;
      break;
    case CardUIViews.Email:
      step.value = KycProcess.Email;
      break;
    case CardUIViews.KycResult:
      emit('go-to-kyc-result');
      break;
    case CardUIViews.Start:
      emit('go-to-start');
      break;
    case CardUIViews.Dashboard:
      emit('go-to-dashboard');
      break;
  }
};

const confirmEmail = (state: CardUIViews) => {
  if (state === CardUIViews.Payment) {
    step.value = KycProcess.Payment;
  }

  if (state === CardUIViews.Kyc) {
    step.value = KycProcess.Guidance;
  }
};

const confirmReadiness = () => {
  step.value = KycProcess.KycView;
};

const confirmKyc = (state: CardUIViews) => {
  if (state === CardUIViews.KycResult) {
    emit('go-to-kyc-result');
    return;
  }

  emit('go-to-start');
};

onMounted(() => {
  if (props.getReadyPage) {
    step.value = KycProcess.Guidance;
  }
});

defineExpose({
  KycProcess,
  step,
  loading,
  handleBack,
  confirmToS,
  confirmPayment,
  confirmPhone,
  confirmEmail,
  confirmReadiness,
  confirmKyc,
});
</script>

<style lang="scss" scoped>
.el-card {
  margin: var(--s-size-mini) auto 0;
}
.sora-card-kyc-wrapper {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
.post-disclaimer {
  color: var(--s-color-base-content-secondary);
  text-align: center;
  margin-top: $basic-spacing;
  font-size: var(--s-font-size-medium);
  width: 25%;
  line-height: var(--s-size-mini);
}
</style>

<style lang="scss">
.tos__disclaimer {
  width: 100%;
  background-color: var(--s-color-base-background);
  border-radius: var(--s-border-radius-small);
  box-shadow: var(--s-shadow-dialog);
  padding: 20px $basic-spacing;
  margin-bottom: $basic-spacing;
  position: relative;
  &-header {
    font-weight: 500;
    margin-bottom: 10px;
  }
  &-paragraph {
    color: var(--s-color-base-content-secondary);
    margin-bottom: calc(var(--s-basic-spacing) / 2);
  }
  &-warning.icon {
    position: absolute;
    background-color: #479aef;
    border: 2.25257px solid #f7f3f4;
    box-shadow: var(--s-shadow-element-pressed);
    top: 20px;
    right: 20px;
    border-radius: 50%;
    color: #fff;
    width: 46px;
    height: 46px;
    .s-icon-notifications-alert-triangle-24 {
      display: block;
      color: #fff;
      margin-top: 5px;
      margin-left: 7px;
    }
  }
  * {
    width: 85%;
  }
}
</style>
