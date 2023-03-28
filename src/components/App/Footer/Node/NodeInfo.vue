<template>
  <s-form
    :model="nodeModel"
    :rules="validationRules"
    ref="nodeForm"
    class="node-info s-flex"
    @submit.native.prevent="submitForm"
  >
    <generic-page-header has-button-back :title="title" @back.stop="handleBack">
      <template v-if="existing && removable">
        <s-button type="action" icon="basic-trash-24" @click="removeNode(nodeModel)" />
      </template>
    </generic-page-header>
    <s-form-item prop="name">
      <s-input
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
      <s-input
        class="node-info-input flag-emodji-input s-typography-input-field"
        :placeholder="t('locationText')"
        :value="formattedLocation"
        :disabled="inputDisabled"
      />
    </s-form-item>
    <s-button
      native-type="submit"
      class="node-info-button s-typography-button--large"
      :type="buttonType"
      :disabled="buttonDisabled"
      :loading="loading"
    >
      {{ buttonText }}
    </s-button>
    <a :href="tutorialLink" class="node-info-button" tabindex="-1" target="_blank" rel="noreferrer noopener">
      <s-button
        type="tertiary"
        class="node-info-tutorial-button s-typography-button--big"
        icon="question-circle-16"
        icon-position="right"
      >
        {{ t('selectNodeDialog.howToSetupOwnNode') }}
      </s-button>
    </a>
  </s-form>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';

import { lazyComponent } from '@/router';
import { Components, Links } from '@/consts';
import { wsRegexp, dnsPathRegexp, ipv4Regexp } from '@/utils/regexp';
import { NodeModel } from './consts';
import { formatLocation } from './utils';

import TranslationMixin from '@/components/mixins/TranslationMixin';

import type { Node, NodeItem } from '@/types/nodes';

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
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
  },
})
export default class NodeInfo extends Mixins(TranslationMixin) {
  @Prop({ default: () => {}, type: Function }) handleBack!: FnWithoutArgs;
  @Prop({ default: () => {}, type: Function }) handleNode!: (node: any, isNewNode: boolean) => void;
  @Prop({ default: () => {}, type: Function }) removeNode!: (node: any) => void;
  @Prop({ default: () => ({}), type: Object }) node!: NodeItem;
  @Prop({ default: false, type: Boolean }) existing!: boolean;
  @Prop({ default: false, type: Boolean }) loading!: boolean;
  @Prop({ default: false, type: Boolean }) removable!: boolean;
  @Prop({ default: false, type: Boolean }) connected!: boolean;

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

  /** Will be shown only for default nodes */
  get formattedLocation(): Nullable<string> {
    if (!(this.existing && this.node?.location)) {
      return null;
    }
    const location = formatLocation(this.node.location);
    if (!location) return null;
    return location.name ? `${location.name} ${location.flag}` : location.flag;
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
    return this.connected && !this.nodeDataChanged;
  }

  get buttonType(): string {
    return this.nodeDataChanged || !this.existing ? 'primary' : 'tertiary';
  }

  get title(): string {
    const customNodeText = this.t('selectNodeDialog.customNode');
    if (!this.existing) return customNodeText;
    return this.node.title ?? customNodeText;
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
  &-tutorial-button {
    .s-icon-question-circle-16:before {
      font-size: 18px;
    }
  }

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
.node-info {
  flex-direction: column;
  align-items: center;

  & > *:not(:last-child) {
    margin-bottom: $inner-spacing-medium;
    width: 100%;
  }

  &-button,
  &-tutorial-button {
    width: 100%;
  }
}
</style>
