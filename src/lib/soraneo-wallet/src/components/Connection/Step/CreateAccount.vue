<template>
  <div class="login">
    <div class="login__step-count">{{ t('stepText') }} {{ stepNumber }} / {{ ColumnsCount }}</div>
    <!-- Create/SeedPhrase -->
    <template v-if="step === LoginStep.SeedPhrase">
      <div class="seed-grid s-flex">
        <div v-for="column in ColumnsCount" :key="column" class="seed-grid__column">
          <div v-for="(word, idx) in seedPhraseWords" :key="`${word}${idx}`">
            <div v-if="renderWord(column, idx)" class="seed-grid__word">
              <span class="seed-grid__word-number">{{ idx + 1 }}</span>
              <span>{{ word }}</span>
            </div>
          </div>
        </div>
      </div>
      <s-button size="mini" class="login__copy-seed" icon="basic-copy-24" icon-position="right" @click="handleCopy">
        <span>{{ t('copyPhraseText') }}</span>
      </s-button>
      <div class="login__text-advice">
        <p>{{ t('desktop.seedAdviceText', { wallet: selectedWalletTitle }) }}</p>
        <p>{{ t('desktop.seedAdviceAdditionTitle') }}</p>
        <p>{{ t('desktop.seedAdviceAdditionText') }}</p>
      </div>
      <s-button key="step1" class="s-typography-button--large login-btn" type="primary" @click="nextStep">{{
        t('desktop.button.next')
      }}</s-button>
    </template>
    <!-- Create/ConfirmSeedPhrase -->
    <template v-if="step === LoginStep.ConfirmSeedPhrase">
      <div class="login__random-order login__order-container">
        <div
          v-for="(word, idx) in randomizedSeedPhraseMap"
          :key="idx"
          :class="['login__random-word', { hidden: isHiddenWord(idx), incorrect }]"
          @click="chooseWord(idx)"
        >
          <s-button size="small">{{ word }}</s-button>
        </div>
      </div>
      <div class="login__text-confirm">
        <p>{{ t('desktop.confirmSeedText') }}</p>
      </div>
      <div class="delimiter"></div>
      <div class="login__correct-order login__order-container">
        <div v-for="idx in seedPhraseToCompareIdx" :key="idx" class="login__random-word" @click="discardWord(idx)">
          <s-button size="small">{{ randomizedSeedPhraseMap[idx] }}</s-button>
        </div>
      </div>
      <div class="login__error">
        <transition name="fade">
          <span v-if="showErrorMessage" class="login__error-text">{{ t('desktop.errorMnemonicText') }}</span>
        </transition>
      </div>
      <s-button
        key="step2"
        class="s-typography-button--large login-btn"
        :type="btnTypeConfirmStep"
        @click="handleMnemonicCheck"
      >
        {{ btnTextConfirmStep }}
      </s-button>
    </template>
    <!-- Create/Credentials -->
    <template v-else-if="step === LoginStep.CreateCredentials">
      <s-form class="login__inputs" @submit.prevent="handleAccountCreate">
        <s-input
          v-model="accountName"
          :disabled="loading"
          :placeholder="t('desktop.accountName.placeholder')"
        ></s-input>
        <p class="login__create-account-desc">{{ t('desktop.accountName.desc') }}</p>
        <password-input v-model="accountPassword" :disabled="loading"></password-input>
        <p class="login__create-account-desc">{{ t('desktop.password.desc') }}</p>
        <s-input
          v-model="accountPasswordConfirm"
          type="password"
          :disabled="loading"
          :placeholder="t('desktop.confirmPassword.placeholder')"
        ></s-input>
        <p v-if="!arePasswordsEqual" class="login__create-account-desc error">
          {{ t('desktop.errorMessages.passwords') }}
        </p>

        <div class="wallet-settings-create-token_export">
          <s-switch v-model="toExport" :disabled="loading"></s-switch>
          <span>{{ t('desktop.exportOptionText') }}</span>
        </div>

        <p class="wallet-settings-create-token_desc">{{ t('desktop.exportJsonText') }}</p>

        <s-button
          key="step3"
          class="s-typography-button--large login-btn"
          type="primary"
          native-type="submit"
          :disabled="btnConfirmDisabled"
          :loading="loading"
        >
          {{ t('desktop.button.createAccount') }}
        </s-button>
      </s-form>
    </template>
  </div>
</template>

<script setup lang="ts">
import isEqual from 'lodash/fp/isEqual';
import { computed, ref, watch } from 'vue';

import { useNotification } from '../../../composables/useNotification';
import { LoginStep } from '../../../consts';
import { copyToClipboard } from '../../../util';
import PasswordInput from '../../Input/Password.vue';

import type { CreateAccountArgs } from '@/stores/wallet/account/types';
import type { WithKeyring } from '@sora-substrate/sdk';

const props = withDefaults(
  defineProps<{
    chainApi: WithKeyring;
    step: LoginStep;
    selectedWalletTitle?: string;
    loading?: boolean;
    createAccount?: (data: CreateAccountArgs) => Promise<void>;
  }>(),
  {
    selectedWalletTitle: '',
    loading: false,
    createAccount: async () => undefined,
  }
);

const emit = defineEmits<{
  'update:step': [step: LoginStep];
}>();

const { t } = useNotification();

const ColumnsCount = 3;
const PhraseLength = 12;
const accountName = ref('');
const accountPassword = ref('');
const accountPasswordConfirm = ref('');
const seedPhraseToCompareIdx = ref<number[]>([]);
const showErrorMessage = ref(false);
const toExport = ref(false);
const incorrect = ref(false);

watch(
  () => props.step,
  (value) => {
    if (value !== LoginStep.ConfirmSeedPhrase) {
      seedPhraseToCompareIdx.value = [];
    }
  }
);

const stepNumber = computed((): number => {
  switch (props.step) {
    case LoginStep.SeedPhrase:
      return 1;
    case LoginStep.ConfirmSeedPhrase:
      return 2;
    case LoginStep.CreateCredentials:
      return 3;
    default:
      return 1;
  }
});
const seedPhrase = computed(() => {
  const { seed } = props.chainApi.createSeed();
  return seed;
});
const seedPhraseWords = computed(() => seedPhrase.value.split(' '));
const randomizedSeedPhraseMap = computed<Record<number, string>>(() => {
  return [...seedPhraseWords.value]
    .sort(() => Math.random() - 0.5)
    .reduce((acc, word, index) => ({ ...acc, [index]: word }), {});
});
const seedPhraseToCompare = computed(() =>
  seedPhraseToCompareIdx.value.map((idx) => randomizedSeedPhraseMap.value[idx])
);
const btnTextConfirmStep = computed(() =>
  seedPhraseToCompare.value.length === PhraseLength ? t('desktop.button.next') : t('desktop.button.skip')
);
const btnTypeConfirmStep = computed(() =>
  seedPhraseToCompare.value.length === PhraseLength ? 'primary' : 'secondary'
);
const isInputsNotFilled = computed(() => !accountName.value || !accountPassword.value || !accountPasswordConfirm.value);
const arePasswordsEqual = computed(() => accountPassword.value === accountPasswordConfirm.value);
const btnConfirmDisabled = computed(() => isInputsNotFilled.value || !arePasswordsEqual.value);

function isHiddenWord(wordIndex: number): boolean {
  return seedPhraseToCompareIdx.value.includes(wordIndex);
}

function chooseWord(index: number): void {
  if (!isHiddenWord(index)) {
    seedPhraseToCompareIdx.value.push(index);
  }
}

function discardWord(index: number): void {
  seedPhraseToCompareIdx.value = seedPhraseToCompareIdx.value.filter((idx) => idx !== index);
}

async function handleCopy(): Promise<void> {
  await copyToClipboard(seedPhrase.value);
}

function renderWord(column: number, index: number): boolean {
  return Math.floor(index / 4) === column - 1;
}

function nextStep(): void {
  emit('update:step', LoginStep.ConfirmSeedPhrase);
}

function runErrorMessage(): void {
  showErrorMessage.value = true;

  setTimeout(() => {
    showErrorMessage.value = false;
  }, 4_500);
}

function runReturnAnimation(): void {
  incorrect.value = true;

  setTimeout(() => {
    incorrect.value = false;
  }, 2_000);
}

function handleMnemonicCheck(): void {
  if (seedPhraseToCompare.value.length < PhraseLength) {
    emit('update:step', LoginStep.CreateCredentials);
    return;
  }

  const isSeedPhraseMatched = isEqual(seedPhraseToCompare.value.join(' '), seedPhrase.value);

  if (!isSeedPhraseMatched) {
    seedPhraseToCompareIdx.value = [];
    runErrorMessage();
    runReturnAnimation();
  } else {
    emit('update:step', LoginStep.CreateCredentials);
  }
}

function handleAccountCreate(): Promise<void> {
  return props.createAccount({
    seed: seedPhrase.value,
    name: accountName.value,
    password: accountPassword.value,
    passwordConfirm: accountPasswordConfirm.value,
    exportAccount: toExport.value,
  });
}
</script>

<style lang="scss" scoped>
$telegram-web-app-width: 500px;

@include login-view;

.login {
  &__text-advice {
    text-align: center;
    margin-bottom: $basic-spacing;
    font-weight: 300;
    p {
      &:first-child {
        margin-bottom: $basic-spacing-medium;
      }
      &:not(:first-child) {
        font-weight: 600;
      }
    }
  }

  &__text-confirm {
    width: 300px;
    text-align: center;
    font-weight: 300;
  }

  &__error {
    height: 20px;
    margin-bottom: $basic-spacing-tiny;
    &-text {
      color: var(--s-color-status-error);
    }
  }

  &__copy-seed {
    margin: $basic-spacing 0 $basic-spacing-big 0;
  }

  &__order-container {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 10px 8px;
    min-height: 74px;
  }

  &__random-order {
    margin: 0px auto $basic-spacing-mini auto;
  }

  &__correct-order {
    margin: $basic-spacing-mini auto;
  }

  &__random-word {
    &.hidden {
      visibility: hidden;
    }

    &.incorrect {
      @include shake;
    }
  }

  &__step-count {
    margin-bottom: $basic-spacing-medium;
  }

  .eye-icon {
    color: var(--s-color-base-content-tertiary);
    &:hover {
      cursor: pointer;
    }
  }

  .delimiter {
    margin: $basic-spacing-mini 0 $basic-spacing-mini 0;
    width: 100%;
    height: 1px;
    background-color: var(--s-color-base-content-tertiary);
  }
}

.seed-grid {
  &__word {
    margin: 10px 20px;
    text-transform: uppercase;

    @media screen and (max-width: $telegram-web-app-width) {
      margin: 10px 12px;
      font-size: var(--s-font-size-extra-mini);
    }

    &-number {
      margin-right: $basic-spacing;
      color: var(--s-color-base-content-secondary);
    }
  }

  &__column {
    display: inline-block;
  }
}

.wallet-settings-create-token {
  &_desc {
    color: var(--s-color-base-content-primary);
    font-size: var(--s-font-size-extra-small);
    font-weight: 300;
    line-height: var(--s-line-height-base);
    padding: 0 $basic-spacing-small;
  }

  &_export {
    @include switch-block;
    & {
      align-self: start;
      padding: 0 $basic-spacing-small;
    }
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 1s;
}
.fade-enter,
.fade-leave-to {
  opacity: 0;
}
</style>
