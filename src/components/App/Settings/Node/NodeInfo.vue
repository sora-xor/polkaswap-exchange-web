<template>
  <s-form
    :model="nodeModel"
    :rules="validationRules"
    ref="nodeForm"
    class="node-info s-flex"
    @submit.native.prevent="submitForm"
  >
    <generic-page-header class="node-info-title" has-button-back :title="title" @back.stop="handleBack">
      <template v-if="existing && removable">
        <s-button type="action" icon="basic-trash-24" @click="removeNode(nodeModel)" />
      </template>
    </generic-page-header>
    <s-form-item prop="name">
      <s-input
        ref="nodeNameInput"
        class="node-info-input s-typography-input-field"
        :placeholder="t('nameText')"
        v-model="nodeModel.name"
        :maxlength="128"
        :disabled="inputDisabled"
      />
    </s-form-item>
    <s-form-item prop="address">
      <s-input
        class="node-info-input s-typography-input-field"
        :placeholder="t('addressText')"
        v-model="nodeModel.address"
        :disabled="inputDisabled"
        @change="changeNodeAddress"
      />
    </s-form-item>
    <s-form-item v-if="formattedLocation" prop="location">
      <div class="node-info-input location-input s-typography-input-field">
        <span class="location-input__placeholder">{{ t('locationText') }}</span>
        <span class="location-input__value">
          {{ formattedLocation.name }} <span class="flag-emodji">{{ formattedLocation.flag }}</span>
        </span>
      </div>
    </s-form-item>
    <s-button
      native-type="submit"
      class="node-info-button s-typography-button--big"
      :type="buttonType"
      :disabled="buttonDisabled"
      :loading="loading"
    >
      {{ buttonText }}
    </s-button>
    <a
      v-if="showTutorial"
      :href="tutorialLink"
      class="node-info-button"
      tabindex="-1"
      target="_blank"
      rel="noreferrer noopener"
    >
      <s-button type="tertiary" class="node-info-tutorial-button s-typography-button--medium">
        {{ t('selectNodeDialog.howToSetupOwnNode') }}
      </s-button>
    </a>
  </s-form>
</template>

<script lang="ts">
import { Component, Mixins, Prop, Ref } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import GenericPageHeader from '@/components/shared/GenericPageHeader.vue';
import { Links } from '@/consts';
import type { Node } from '@/types/nodes';
import { wsRegexp, dnsPathRegexp, ipv4Regexp } from '@/utils/regexp';

import { NodeModel } from './consts';
import { formatLocation } from './utils';

const checkAddress = (
  translate: TranslationMixin['t']
): ((rule: unknown, value: Nullable<string>, callback: (error?: Error) => void) => void) => {
  return (rule, value, callback): void => {
    if (!value) {
      return callback(new Error(translate('selectNodeDialog.messages.emptyAddress')));
    }

    if (!wsRegexp.test(value)) {
      return callback(new Error(translate('selectNodeDialog.messages.incorrectProtocol')));
    }

    const address = value.replace(wsRegexp, '');

    if (!dnsPathRegexp.test(address) && !ipv4Regexp.test(address)) {
      return callback(new Error(translate('selectNodeDialog.messages.incorrectAddress')));
    }

    callback();
  };
};

const stripEndingSlash = (str: string): string => (str.charAt(str.length - 1) === '/' ? str.slice(0, -1) : str);

@Component({
  components: {
    GenericPageHeader,
  },
})
export default class NodeInfo extends Mixins(TranslationMixin) {
  @Prop({ default: () => {}, type: Function }) readonly handleBack!: FnWithoutArgs;
  @Prop({ default: () => {}, type: Function }) readonly handleNode!: (node: any, isNewNode: boolean) => void;
  @Prop({ default: () => {}, type: Function }) readonly removeNode!: (node: any) => void;
  @Prop({ default: () => ({}), type: Object }) readonly node!: Node;
  @Prop({ default: false, type: Boolean }) readonly existing!: boolean;
  @Prop({ default: false, type: Boolean }) readonly removable!: boolean;
  @Prop({ default: false, type: Boolean }) readonly connected!: boolean;
  @Prop({ default: false, type: Boolean }) readonly showTutorial!: boolean;
  @Prop({ default: false, type: Boolean }) readonly disabled!: boolean;
  @Prop({ default: '', type: String }) readonly nodeAddressConnecting!: string;

  @Ref('nodeNameInput') private readonly nodeNameInput!: HTMLInputElement;

  readonly tutorialLink = Links.nodes.tutorial;

  readonly validationRules = {
    name: [{ required: true, message: this.t('selectNodeDialog.messages.emptyName'), trigger: 'blur' }],
    address: [{ validator: checkAddress(this.t), trigger: 'blur' }],
  };

  nodeModel: Partial<Node> = { ...NodeModel };

  created(): void {
    this.nodeModel = Object.keys(NodeModel).reduce(
      (result, key) => ({
        ...result,
        [key]: this.node[key] ?? NodeModel[key],
      }),
      {}
    );
  }

  async mounted(): Promise<void> {
    // Re-center dialog programmatically (need to simplify it). Components lazy loading might break it
    await this.$nextTick();
    const sDialog: any = this.$parent?.$parent;
    sDialog?.computeTop?.();
    // Focus first element if inputs are editable
    if (!this.inputDisabled) {
      this.nodeNameInput?.focus?.();
    }
  }

  /** Will be shown only for default nodes */
  get formattedLocation() {
    if (!(this.existing && this.node?.location)) {
      return null;
    }
    return formatLocation(this.node.location);
  }

  get inputDisabled(): boolean {
    return this.existing && !this.removable;
  }

  get buttonText(): string {
    if (!this.existing) return this.t('selectNodeDialog.addNode');
    if (this.nodeDataChanged) return this.t('selectNodeDialog.updateNode');
    if (this.connected) return this.t('selectNodeDialog.connected');

    return this.t('selectNodeDialog.select');
  }

  get buttonDisabled(): boolean {
    return this.disabled || (this.connected && !this.nodeDataChanged);
  }

  get buttonType(): string {
    return this.nodeDataChanged || !this.existing ? 'primary' : 'tertiary';
  }

  get title(): string {
    const customNodeText = this.t('selectNodeDialog.customNode');
    if (!this.existing) return customNodeText;
    return this.node.chain || this.node.name || customNodeText;
  }

  get loading(): boolean {
    if (!this.nodeAddressConnecting) return false;

    return this.nodeModel.address === this.nodeAddressConnecting;
  }

  get nodeDataChanged(): boolean {
    return this.nodeModel.name !== this.node.name || this.nodeModel.address !== this.node.address;
  }

  changeNodeAddress(value: string): void {
    this.nodeModel.address = value.trim().toLowerCase();
  }

  async submitForm(): Promise<void> {
    try {
      await (this.$refs.nodeForm as any).validate();

      const preparedModel = {
        ...this.nodeModel,
        address: stripEndingSlash((this.nodeModel as Node).address),
      };

      this.handleNode(preparedModel, !this.existing || this.nodeDataChanged);
    } catch (error) {
      console.warn(error);
    }
  }
}
</script>

<style lang="scss">
.node-info {
  .el-form-item.is-error > .el-form-item__content {
    & > [class^='s-input']:not(.s-disabled) {
      &,
      &:hover {
        & .el-input > input {
          background-color: inherit;
        }
      }

      .s-placeholder {
        background-color: inherit;
      }
    }

    & > .el-form-item__error,
    & > .s-icon-status-error {
      color: var(--s-color-status-error) !important;
    }

    .s-icon-status-error:before {
      content: '\ea29';
    }
  }
}
</style>

<style lang="scss" scoped>
$min-s-input-height: 58px;

.node-info {
  flex-direction: column;
  align-items: center;

  &-title {
    padding-top: calc(var(--s-basic-spacing) * 2);
  }

  & > *:not(:last-child) {
    margin-bottom: $inner-spacing-medium;
    width: 100%;
  }

  &-button,
  &-tutorial-button {
    width: 100%;
  }
}
.location-input {
  display: flex;
  flex-direction: column;
  border-color: var(--s-color-base-disabled);
  color: var(--s-color-base-content-secondary);
  box-shadow: var(--s-shadow-element);
  background: var(--s-color-base-background);
  border-width: 0;
  padding: $inner-spacing-mini $inner-spacing-medium;
  height: auto;
  min-height: $min-s-input-height;
  border-radius: var(--s-border-radius-small);
  border-style: solid;
  letter-spacing: var(--s-letter-spacing-small);
  cursor: not-allowed;

  &__value {
    font-weight: 400;
  }

  &__placeholder {
    font-size: var(--s-font-size-mini);
    font-weight: 300;
  }
}
</style>
