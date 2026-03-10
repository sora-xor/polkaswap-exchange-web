<template>
  <s-form
    ref="nodeForm"
    :model="nodeModel"
    :rules="validationRules"
    class="node-info s-flex"
    @submit.prevent="submitForm"
  >
    <generic-page-header class="node-info-title" has-button-back :title="title" @back.stop="handleBackClick">
      <template v-if="existing && removable">
        <s-button type="action" icon="basic-trash-24" @click="removeNodeHandler"></s-button>
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
      ></s-input>
    </s-form-item>
    <s-form-item prop="address">
      <s-input
        class="node-info-input s-typography-input-field"
        :placeholder="t('addressText')"
        v-model="nodeModel.address"
        :disabled="inputDisabled"
        @change="changeNodeAddress"
      ></s-input>
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

<script lang="ts" setup>
import { computed, nextTick, onMounted, reactive, ref, toRefs, watch } from 'vue';

import GenericPageHeader from '@/components/shared/GenericPageHeader.vue';
import { useTranslation } from '@/composables/useTranslation';
import { Links } from '@/consts';
import type { Node } from '@/types/nodes';
import { wsRegexp, dnsPathRegexp, ipv4Regexp } from '@/utils/regexp';

import { NodeModel } from './consts';
import { formatLocation } from './utils';

const stripEndingSlash = (str: string): string => (str.endsWith('/') ? str.slice(0, -1) : str);

const checkAddress =
  (translate: (key: string) => string) =>
  (_rule: unknown, value: Nullable<string>, callback: (error?: Error) => void) => {
    if (!value) return callback(new Error(translate('selectNodeDialog.messages.emptyAddress')));

    if (!wsRegexp.test(value)) {
      return callback(new Error(translate('selectNodeDialog.messages.incorrectProtocol')));
    }

    const address = value.replace(wsRegexp, '');

    if (!dnsPathRegexp.test(address) && !ipv4Regexp.test(address)) {
      return callback(new Error(translate('selectNodeDialog.messages.incorrectAddress')));
    }

    callback();
  };

type NodeHandler = (node: Node, isNewNode: boolean) => void;
type VoidHandler = () => void;

const props = withDefaults(
  defineProps<{
    handleBack?: VoidHandler;
    handleNode?: NodeHandler;
    removeNode?: (node: Node) => void;
    node?: Node;
    existing?: boolean;
    removable?: boolean;
    connected?: boolean;
    showTutorial?: boolean;
    disabled?: boolean;
    nodeAddressConnecting?: string;
  }>(),
  {
    handleBack: undefined,
    handleNode: undefined,
    removeNode: undefined,
    node: () => ({ ...NodeModel }),
    existing: false,
    removable: false,
    connected: false,
    showTutorial: false,
    disabled: false,
    nodeAddressConnecting: '',
  }
);

const { t } = useTranslation();
const { existing, removable, connected, showTutorial, disabled, nodeAddressConnecting } = toRefs(props);

const nodeForm = ref<any>(null);
const nodeNameInput = ref<HTMLInputElement | null>(null);
const nodeModel = reactive<Node>({ ...NodeModel }) as Node;

watch(
  () => props.node,
  (node) => {
    Object.assign(nodeModel, NodeModel, node ?? {});
  },
  { immediate: true }
);

const validationRules = computed(() => ({
  name: [{ required: true, message: t('selectNodeDialog.messages.emptyName'), trigger: 'blur' }],
  address: [{ validator: checkAddress(t), trigger: 'blur' }],
}));

const formattedLocation = computed(() => {
  if (!(existing.value && props.node?.location)) return null;
  return formatLocation(props.node.location);
});

const inputDisabled = computed(() => existing.value && !removable.value);

const nodeDataChanged = computed(
  () => nodeModel.name !== props.node?.name || nodeModel.address !== props.node?.address
);

const title = computed(() => {
  const customNodeText = t('selectNodeDialog.customNode');
  if (!existing.value) return customNodeText;
  return props.node?.chain || props.node?.name || customNodeText;
});

const buttonText = computed(() => {
  if (!existing.value) return t('selectNodeDialog.addNode');
  if (nodeDataChanged.value) return t('selectNodeDialog.updateNode');
  if (connected.value) return t('selectNodeDialog.connected');
  return t('selectNodeDialog.select');
});

const buttonDisabled = computed(() => disabled.value || (connected.value && !nodeDataChanged.value));
const buttonType = computed(() => (nodeDataChanged.value || !existing.value ? 'primary' : 'tertiary'));
const loading = computed(
  () => Boolean(nodeAddressConnecting.value) && nodeModel.address === nodeAddressConnecting.value
);

const tutorialLink = Links.nodes.tutorial;

function changeNodeAddress(value: string): void {
  nodeModel.address = value.trim().toLowerCase();
}

function handleBackClick(): void {
  props.handleBack?.();
}

function removeNodeHandler(): void {
  props.removeNode?.({ ...nodeModel });
}

async function submitForm(): Promise<void> {
  try {
    await nodeForm.value?.validate?.();

    const preparedModel: Node = {
      ...nodeModel,
      address: stripEndingSlash((nodeModel.address ?? '').trim()),
    };

    props.handleNode?.(preparedModel, !existing.value || nodeDataChanged.value);
  } catch (error) {
    console.warn(error);
  }
}

onMounted(() => {
  if (!inputDisabled.value) {
    nextTick(() => nodeNameInput.value?.focus?.());
  }
});
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
