<template>
  <div class="login">
    <template v-if="step === LoginStep.Import">
      <!-- Mnemonic phrase imput (only for desktop version) -->
      <template v-if="!jsonOnly">
        <s-input
          v-model="mnemonicPhrase"
          class="input-textarea"
          type="textarea"
          :disabled="loading"
          :placeholder="t('desktop.accountMnemonic.placeholder')"
          :maxlength="255"
          @input="handleMnemonicInput"
        ></s-input>
        <s-button
          key="step1"
          class="s-typography-button--large login-btn"
          type="primary"
          :disabled="disabledNextStep"
          @click="nextStep"
        >
          {{ t('desktop.button.next') }}
        </s-button>
        <p class="line">or</p>
      </template>
      <!-- JSON upload area -->
      <file-uploader ref="uploader" accept="application/json" class="upload-json" @upload="handleUploadJson">
        <div class="placeholder">
          <s-icon class="upload-json__icon" name="el-icon-document" size="32px"></s-icon>
          <span class="upload-json__placeholder">
            {{ t('dragAndDropText', { extension: TranslationConsts.JSON }) }}
          </span>
        </div>
      </file-uploader>
      <!-- Import instructions (only for non desktop version) -->
      <template v-if="jsonOnly">
        <s-card shadow="always" class="import-steps">
          <div v-for="(text, index) in importSteps" :key="index" class="import-step">
            <div class="import-step__count">{{ index + 1 }}</div>
            <div class="import-step__text">{{ text }}</div>
          </div>
        </s-card>
        <div class="export-tutorial">
          <div class="export-tutorial-title">{{ t('desktop.exportTutorialsText') }}</div>
          <div class="export-tutorial-grid">
            <a
              v-for="{ logo, title, link } in Tutorials"
              :key="title"
              :href="link"
              target="_blank"
              rel="nofollow noopener noreferrer"
              class="export-tutorial-grid-item"
            >
              <s-card shadow="always">
                <div class="extension-tutorial">
                  <img class="extension-tutorial-logo" :src="logo" />
                  <span class="extension-tutorial-title">{{ title }}</span>
                </div>
              </s-card>
            </a>
          </div>
        </div>
      </template>
    </template>
    <template v-else-if="step === LoginStep.ImportCredentials">
      <s-form :class="computedClasses" @submit.prevent="importAccount">
        <wallet-account v-if="json" :polkadot-account="{ name: accountName, address: json.address }"></wallet-account>
        <template v-else>
          <s-input
            v-model="accountName"
            :disabled="loading"
            :placeholder="t('desktop.accountName.placeholder')"
          ></s-input>

          <p class="login__create-account-desc">{{ t('desktop.accountName.desc') }}</p>
        </template>

        <password-input v-model="accountPassword" :disabled="loading"></password-input>

        <template v-if="!json">
          <p class="login__create-account-desc">{{ t('desktop.password.desc') }}</p>

          <s-input
            v-model="accountPasswordConfirm"
            type="password"
            :disabled="loading"
            :placeholder="t('desktop.confirmPassword.placeholder')"
          ></s-input>
        </template>

        <s-button
          key="step2"
          :disabled="disabledImportStep"
          :loading="loading"
          class="s-typography-button--large login-btn"
          type="primary"
          native-type="submit"
        >
          {{ t('desktop.button.importAccount') }}
        </s-button>
      </s-form>
    </template>
  </div>
</template>

<script lang="ts">
import { mnemonicValidate } from '@polkadot/util-crypto';
import { mixins, Options, Prop, Ref } from 'vue-property-decorator';

import FearlessLogo from '../../../assets/img/FearlessWalletLogo.svg?url';
import PolkadotLogo from '../../../assets/img/PolkadotLogo.svg?url';
import SubWalletLogo from '../../../assets/img/SubWalletLogo.svg?url';
import { LoginStep } from '../../../consts';
import { AppError } from '../../../util';
import { parseAccountJson } from '../../../util/account';
import WalletAccount from '../../Account/WalletAccount.vue';
import FileUploader from '../../FileUploader.vue';
import PasswordInput from '../../Input/Password.vue';
import NotificationMixin from '../../mixins/NotificationMixin';

import type { CreateAccountArgs, RestoreAccountArgs } from '../../../store/account/types';
import type { KeyringPair$Json } from '../../../types/common';

@Options({
  components: {
    FileUploader,
    PasswordInput,
    WalletAccount,
  },
})
export default class ImportAccountStep extends mixins(NotificationMixin) {
  @Prop({ type: String, required: true }) readonly step!: LoginStep;
  @Prop({ type: Boolean, default: false }) readonly jsonOnly!: boolean;
  @Prop({ type: Boolean, default: false }) readonly loading!: boolean;
  @Prop({ type: Function, default: () => {} }) readonly createAccount!: (data: CreateAccountArgs) => Promise<void>;
  @Prop({ type: Function, default: () => {} }) readonly restoreAccount!: (data: RestoreAccountArgs) => void;

  @Ref('uploader') readonly uploader!: HTMLFormElement;

  readonly LoginStep = LoginStep;
  readonly PhraseLength = 12;
  readonly Tutorials = [
    {
      logo: FearlessLogo,
      title: 'Fearless',
      link: 'https://wiki.fearlesswallet.io/accounts/walkthrough/exporting-and-importing-a-wallet-using-a-json-file',
    },
    {
      logo: PolkadotLogo,
      title: 'Polkadot{.js}',
      link: 'https://support.polkadot.network/support/solutions/articles/65000177677-how-to-export-your-json-backup-file',
    },
    {
      logo: SubWalletLogo,
      title: 'Subwallet',
      link: 'https://docs.subwallet.app/extension-user-guide/export-and-backup-an-account',
    },
  ];

  mnemonicPhrase = '';
  accountName = '';
  accountPassword = '';
  accountPasswordConfirm = '';
  json: Nullable<KeyringPair$Json> = null;

  get disabledNextStep(): boolean {
    return this.mnemonicPhrase.length === 0;
  }

  get disabledImportStep(): boolean {
    if (this.json) return !this.accountPassword;

    return !(this.accountName && this.accountPassword && this.accountPasswordConfirm);
  }

  get computedClasses(): string {
    const baseClass = ['login__inputs'];
    if (this.json) baseClass.push('login__inputs--json');
    return baseClass.join(' ');
  }

  get importSteps(): string[] {
    return [
      this.t('desktop.importSteps.selectWallet'),
      this.t('desktop.importSteps.selectAccount'),
      this.t('desktop.importSteps.exportAccount'),
    ];
  }

  handleMnemonicInput(char: string) {
    const letter = char.replace('.', '').replace('  ', ' ');

    if (/^[a-z ]+$/.test(letter)) this.mnemonicPhrase = letter;
  }

  nextStep(): void {
    this.withAppNotification(async () => {
      try {
        if (this.mnemonicPhrase.trim().split(' ').length !== this.PhraseLength) {
          throw new AppError({ key: 'desktop.errorMessages.mnemonicLength', payload: { number: this.PhraseLength } });
        }
        if (!mnemonicValidate(this.mnemonicPhrase)) {
          throw new AppError({ key: 'desktop.errorMessages.mnemonic' });
        }

        this.json = null;
        this.resetForm();

        this.$emit('update:step', LoginStep.ImportCredentials);
      } catch (error) {
        this.mnemonicPhrase = '';
        throw error;
      }
    });
  }

  async handleUploadJson(jsonFile: File): Promise<void> {
    this.withAppNotification(async () => {
      if (!jsonFile) return;

      const parsedJson = await parseAccountJson(jsonFile);
      const { address, encoded, encoding, meta = {} } = parsedJson;

      if (!(address && encoded && encoding)) {
        this.uploader.resetFileInput();
        throw new AppError({ key: 'desktop.errorMessages.jsonFields' });
      }

      this.accountName = (meta.name || '') as string;
      this.json = parsedJson;
      this.mnemonicPhrase = '';
      this.$emit('update:step', LoginStep.ImportCredentials);
    });
  }

  async importAccount(): Promise<void> {
    const action = this.json
      ? this.restoreAccount({ json: this.json, password: this.accountPassword })
      : this.createAccount({
          seed: this.mnemonicPhrase,
          name: this.accountName,
          password: this.accountPassword,
          passwordConfirm: this.accountPasswordConfirm,
        });
    await action;
    this.resetForm();
  }

  private resetForm(): void {
    this.accountName = '';
    this.accountPassword = '';
    this.accountPasswordConfirm = '';
  }
}
</script>

<style lang="scss" scoped>
@include login-view;

.login {
  .json-upload {
    display: none;
  }
  .input-textarea.s-textarea {
    margin-bottom: 0;
  }
}

.line {
  width: 100%;
  display: flex;
  flex-direction: row;
  text-transform: uppercase;
  color: var(--s-color-base-content-secondary);

  &::before,
  &::after {
    content: '';
    flex: 1 1;
    border-bottom: 2px solid var(--s-color-base-content-tertiary);
    margin: auto;
    margin-left: 10px;
    margin-right: 10px;
  }
}

.eye-icon:hover {
  cursor: pointer;
}

.upload-json {
  @include drag-drop-content;
}

.import-steps {
  width: 100%;
}

.import-step {
  display: flex;
  align-items: center;
  padding: $basic-spacing-small 0;

  &:first-child {
    padding-top: 0;
  }

  &:last-child {
    padding-bottom: 0;
  }

  &:not(:last-child) {
    border-bottom: 1px solid var(--s-color-base-border-secondary);
  }

  &__count {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: var(--s-size-small);
    height: var(--s-size-small);
    font-size: 24px;
    font-weight: 300;
    background: var(--s-color-base-content-tertiary);
    color: var(--s-color-base-on-accent);
    box-shadow: var(--s-shadow-element-pressed);
    border-radius: 50%;
    text-align: center;
    margin-right: $basic-spacing-small;
  }

  &__text {
    font-size: var(--s-font-size-medium);
  }
}

.export-tutorial {
  display: flex;
  flex-flow: column nowrap;
  gap: $basic-spacing-small;
  width: 100%;

  &-title {
    font-weight: 600;
    font-size: var(--s-font-size-extra-small);
    text-transform: uppercase;
  }

  &-grid {
    display: flex;
    gap: $basic-spacing-small;

    &-item {
      border-width: 1px;
      border-style: solid;
      border-color: transparent;
      border-radius: var(--s-border-radius-small);
      text-decoration: none;

      &:hover {
        border-color: var(--s-color-base-content-secondary);
      }

      @include focus-outline($withOffset: true);
      @include columns(3, $basic-spacing-mini);
    }
  }
}

.extension-tutorial {
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  gap: $basic-spacing-mini;

  &-logo {
    width: var(--s-size-small);
    height: var(--s-size-small);
  }
}
</style>
