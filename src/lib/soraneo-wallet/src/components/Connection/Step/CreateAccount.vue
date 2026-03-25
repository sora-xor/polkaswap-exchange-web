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

<script lang="ts">
import isEqual from 'lodash/fp/isEqual';
import { defineComponent, type PropType } from 'vue';

import { LoginStep } from '../../../consts';
import { copyToClipboard } from '../../../util';
import PasswordInput from '../../Input/Password.vue';
import NotificationMixin from '../../mixins/NotificationMixin';

import type { CreateAccountArgs } from '@/stores/wallet/account/types';
import type { WithKeyring } from '@sora-substrate/sdk';

export default defineComponent({
  components: {
    PasswordInput,
  },
  mixins: [NotificationMixin],
  props: {
    chainApi: {
      required: true,
      type: Object as PropType<WithKeyring>,
    },
    step: {
      required: true,
      type: String as PropType<LoginStep>,
    },
    selectedWalletTitle: {
      default: '',
      type: String,
    },
    loading: {
      default: false,
      type: Boolean,
    },
    createAccount: {
      default: () => {},
      type: Function as PropType<(data: CreateAccountArgs) => Promise<void>>,
    },
  },
  emits: ['update:step'],
  data() {
    return {
      ColumnsCount: 3,
      LoginStep,
      PhraseLength: 12,
      accountName: '',
      accountPassword: '',
      accountPasswordConfirm: '',
      seedPhraseToCompareIdx: [] as number[],
      showErrorMessage: false,
      toExport: false,
      incorrect: false,
    };
  },
  watch: {
    step(this: any, value: LoginStep) {
      if (value !== LoginStep.ConfirmSeedPhrase) {
        this.seedPhraseToCompareIdx = [];
      }
    },
  },
  computed: {
    stepNumber(this: any): number {
      switch (this.step) {
        case LoginStep.SeedPhrase:
          return 1;
        case LoginStep.ConfirmSeedPhrase:
          return 2;
        case LoginStep.CreateCredentials:
          return 3;
        default:
          return 1;
      }
    },
    btnTextConfirmStep(this: any): string {
      if (this.seedPhraseToCompare.length === this.PhraseLength) {
        return this.t('desktop.button.next');
      }
      return this.t('desktop.button.skip');
    },
    btnTypeConfirmStep(this: any): string {
      return this.seedPhraseToCompare.length === this.PhraseLength ? 'primary' : 'secondary';
    },
    btnConfirmDisabled(this: any): boolean {
      return this.isInputsNotFilled || !this.arePasswordsEqual;
    },
    isInputsNotFilled(this: any): boolean {
      return !this.accountName || !this.accountPassword || !this.accountPasswordConfirm;
    },
    arePasswordsEqual(this: any): boolean {
      return this.accountPassword === this.accountPasswordConfirm;
    },
    seedPhrase(this: any): string {
      const { seed } = this.chainApi.createSeed();
      return seed;
    },
    seedPhraseWords(this: any): string[] {
      return this.seedPhrase.split(' ');
    },
    randomizedSeedPhraseMap(this: any): Record<number, string> {
      return [...this.seedPhraseWords]
        .sort(() => Math.random() - 0.5)
        .reduce((acc, word, index) => ({ ...acc, [index]: word }), {});
    },
    seedPhraseToCompare(this: any): string[] {
      return this.seedPhraseToCompareIdx.map((idx: number) => this.randomizedSeedPhraseMap[idx]);
    },
  },
  methods: {
    isHiddenWord(this: any, wordIndex: number): boolean {
      return this.seedPhraseToCompareIdx.includes(wordIndex);
    },
    chooseWord(this: any, index: number): void {
      if (!this.isHiddenWord(index)) {
        this.seedPhraseToCompareIdx.push(index);
      }
    },
    discardWord(this: any, index: number): void {
      this.seedPhraseToCompareIdx = this.seedPhraseToCompareIdx.filter((idx: number) => idx !== index);
    },
    async handleCopy(this: any): Promise<void> {
      await copyToClipboard(this.seedPhrase);
    },
    renderWord(this: any, column: number, index: number): boolean {
      return Math.floor(index / 4) === column - 1;
    },
    nextStep(this: any): void {
      this.$emit('update:step', LoginStep.ConfirmSeedPhrase);
    },
    handleMnemonicCheck(this: any): void {
      if (this.seedPhraseToCompare.length < this.PhraseLength) {
        this.$emit('update:step', LoginStep.CreateCredentials);
        return;
      }

      const isSeedPhraseMatched = isEqual(this.seedPhraseToCompare.join(' '), this.seedPhrase);

      if (!isSeedPhraseMatched) {
        this.seedPhraseToCompareIdx = [];
        this.runErrorMessage();
        this.runReturnAnimation();
      } else {
        this.$emit('update:step', LoginStep.CreateCredentials);
      }
    },
    runErrorMessage(this: any): void {
      this.showErrorMessage = true;

      setTimeout(() => {
        this.showErrorMessage = false;
      }, 4_500);
    },
    runReturnAnimation(this: any): void {
      this.incorrect = true;

      setTimeout(() => {
        this.incorrect = false;
      }, 2_000);
    },
    handleAccountCreate(this: any): Promise<void> {
      return this.createAccount({
        seed: this.seedPhrase,
        name: this.accountName,
        password: this.accountPassword,
        passwordConfirm: this.accountPasswordConfirm,
        exportAccount: this.toExport,
      });
    },
  },
});
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
