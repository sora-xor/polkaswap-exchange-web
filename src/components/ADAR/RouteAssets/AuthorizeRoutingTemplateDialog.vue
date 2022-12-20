<template>
  <dialog-base
    :visible.sync="isVisible"
    :title="t('adar.routeAssets.routingTemplate.authorizeDialog.title')"
    custom-class="dialog__authorize-routing-template"
  >
    <div class="authorize-routing-template">
      <div class="labels">
        <p>{{ t('adar.routeAssets.routingTemplate.authorizeDialog.asset') }}</p>
        <p>{{ t('adar.routeAssets.routingTemplate.authorizeDialog.total') }}</p>
      </div>
      <s-divider />
      <div class="values">
        <div><token-select-button :token="asset" disabled /></div>
        <div>{{ Number(totalAssets).toLocaleString('en-US') }}</div>
      </div>
      <s-divider />
      <div class="disclaimer">
        {{ t('adar.routeAssets.routingTemplate.authorizeDialog.agreement') }}
        <span class="red">{{ t('adar.routeAssets.routingTemplate.authorizeDialog.termsAndConditions') }}</span>
      </div>
      <div class="button-section">
        <s-button
          type="secondary"
          class="s-typography-button--medium"
          :disabled="loading"
          @click="$emit('update:visible', false)"
        >
          {{ t('cancelText') }}
        </s-button>
        <s-button
          type="primary"
          class="s-typography-button--medium"
          :disabled="loading"
          @click="
            () => {
              $emit('authorize');
            }
          "
        >
          {{ t('adar.routeAssets.routingTemplate.authorizeDialog.submit') }}
        </s-button>
      </div>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Prop, Watch } from 'vue-property-decorator';
import { mixins, components } from '@soramitsu/soraneo-wallet-web';
// import DialogMixin from '@/components/mixins/DialogMixin';
// import DialogBase from '@/components/DialogBase.vue';
import { lazyComponent } from '@/router';
import { Components } from '@/consts';
import { getter } from '@/store/decorators';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import { Asset } from '@sora-substrate/util/build/assets/types';
@Component({
  components: {
    DialogBase: components.DialogBase,
    TokenSelectButton: lazyComponent(Components.TokenSelectButton),
    FromList: lazyComponent('Templates/AddRecipient/FromList'),
    AddNewRecipient: lazyComponent('Templates/AddRecipient/AddNewRecipient'),
    BalanceCheck: lazyComponent('Templates/RouteAssets/BalanceCheck'),
    SelectRecievers: lazyComponent('Templates/RouteAssets/SelectRecievers'),
  },
})
export default class AuthorizeRoutingTemplateDialog extends Mixins(mixins.TransactionMixin, mixins.DialogMixin) {
  //   @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;
  //   @Prop() readonly template!: Template;
  @Prop() readonly asset!: Asset;
  @Prop() readonly totalAssets!: string | number;

  file = null;

  get fileElement() {
    return (this as any).$refs.file;
  }

  uploadFile() {
    this.$emit('onFileUploaded', this.fileElement.files[0]);
  }

  onBrowseButtonClick() {
    this.fileElement.click();
  }

  get xor() {
    return XOR;
  }
}
</script>

<style lang="scss">
.dialog__authorize-routing-template {
  .el-dialog {
    max-width: 630px;
    &__body {
      > div > div {
        margin-bottom: $inner-spacing-medium;
      }
    }
  }

  .authorize-routing-template {
    > div:not(.disclaimer) {
      @include flex-start;
      > * {
        width: 50%;
      }
    }

    .labels {
      text-transform: uppercase;
      font-weight: 800;
      font-size: var(--s-font-size-small);
      color: var(--s-color-brand-day);
      white-space: nowrap;
    }

    .values {
      font-weight: 600;
      font-size: 14px;
    }

    .disclaimer {
      margin-bottom: 20px;
      text-align: center;
    }
  }
}
</style>

<style lang="scss" scoped>
.browse-button {
  width: 100%;
  margin-bottom: 16px;
}

.red {
  color: red;
}
</style>
