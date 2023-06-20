<template>
  <div v-loading="isSpinner || !fileName" class="container route-assets-processing-template">
    <div class="route-assets__page-header-title">Process routing template</div>
    <div class="route-assets__page-header-description">Our system is processing your uploaded Routing Template</div>
    <div v-if="!isSpinner && fileName" class="content-container">
      <div class="route-assets-processing-template__file-info">
        <div>
          <svg class="file-icon" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M7 2C4.79086 2 3 3.79086 3 6V18C3 20.2091 4.79086 22 7 22H17C19.2091 22 21 20.2091 21 18V7.65685C21 6.59599 20.5786 5.57857 19.8284 4.82843L18.1716 3.17157C17.4214 2.42143 16.404 2 15.3431 2H7ZM8 6.25C7.58579 6.25 7.25 6.58579 7.25 7C7.25 7.41421 7.58579 7.75 8 7.75H16C16.4142 7.75 16.75 7.41421 16.75 7C16.75 6.58579 16.4142 6.25 16 6.25H8ZM7.25 12C7.25 11.5858 7.58579 11.25 8 11.25H16C16.4142 11.25 16.75 11.5858 16.75 12C16.75 12.4142 16.4142 12.75 16 12.75H8C7.58579 12.75 7.25 12.4142 7.25 12ZM8 16.25C7.58579 16.25 7.25 16.5858 7.25 17C7.25 17.4142 7.58579 17.75 8 17.75H12C12.4142 17.75 12.75 17.4142 12.75 17C12.75 16.5858 12.4142 16.25 12 16.25H8Z"
            />
          </svg>
        </div>
        <div>
          <div>{{ fileName }}</div>
          <div class="metadata">{{ `${lastModified} &#183; ${fileSize} kb` }}</div>
        </div>
      </div>
      <div class="fields-container">
        <div v-for="(item, idx) in fields" :key="idx">
          <div class="field">
            <p class="field__label">{{ item.title }}</p>
            <div class="field__status" :class="item.status.correct ? 'field__status_success' : 'field__status_error'">
              <div>{{ item.status.title }}</div>
              <div>
                <s-icon
                  class="icon-status"
                  :name="item.status.correct ? 'basic-check-marks-24' : 'basic-clear-X-xs-24'"
                />
              </div>
            </div>
            <!-- <p class="field__status">{{ item.status }}</p> -->
          </div>
          <s-divider />
        </div>
      </div>
      <div class="buttons-container">
        <s-button type="primary" class="s-typography-button--big" @click.stop="nextButtonAction">
          {{ nextButtonTitle }}
        </s-button>
        <s-button type="secondary" class="s-typography-button--big" @click.stop="cancelButtonAction">
          {{ `CANCEL PROCESSING` }}
        </s-button>
      </div>
    </div>
    <fix-issues-dialog
      :visible.sync="fixIssuesDialog"
      :recipient="incorrectRecipients[currentIssueIdx]"
      :currentIssueIdx="currentIssueIdx"
      :totalIssuesCount="incorrectRecipients.length"
      @changeIssueIdx="changeIssueIdx"
    ></fix-issues-dialog>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components } from '@/consts';
import { AdarComponents } from '@/modules/ADAR/consts';
import { adarLazyComponent } from '@/modules/ADAR/router';
import { lazyComponent } from '@/router';
import { action, getter } from '@/store/decorators';
import { Recipient } from '@/store/routeAssets/types';
import validate from '@/store/routeAssets/utils';
@Component({
  components: {
    FixIssuesDialog: adarLazyComponent(AdarComponents.RouteAssetsFixIssuesDialog),
  },
})
export default class ProcessTemplate extends Mixins(TranslationMixin) {
  @getter.routeAssets.file private file!: Nullable<File>;
  @getter.routeAssets.recipients private recipients!: Array<Recipient>;
  @action.routeAssets.processingNextStage nextStage!: () => void;
  @action.routeAssets.processingPreviousStage previousStage!: () => void;
  @action.routeAssets.cancelProcessing private cancelProcessing!: () => void;

  fixIssuesDialog = false;
  isSpinner = true;
  currentIssueIdx = 0;

  created() {
    setTimeout(() => {
      this.isSpinner = false;
    }, 1000);
  }

  get fields() {
    return [
      { title: 'Recipients', status: this.recipientsStatus },
      { title: 'Assets', status: this.assetsStatus },
      { title: 'USD Equivalent', status: this.usdStatus },
      { title: 'Wallets', status: this.walletsStatus },
      { title: 'Estimated Amounts', status: this.amountsStatus },
    ];
  }

  get recipientsStatus() {
    return {
      title: `${this.recipientsCount} payeers`,
      correct: true,
    };
  }

  get assetsStatus() {
    const areErrors = this.invalidAssetsCount > 0;
    return {
      title: areErrors ? `${this.invalidAssetsCount} issues found` : `${this.assetsCount} assets`,
      correct: !areErrors,
    };
  }

  get usdStatus() {
    const areErrors = this.incorrectUSD > 0;
    return {
      title: areErrors ? `${this.incorrectUSD} issues found` : `Calculated`,
      correct: !areErrors,
    };
  }

  get walletsStatus() {
    const areErrors = this.invalidWalletCount > 0;
    return {
      title: areErrors ? `${this.invalidWalletCount} issues found` : `${this.recipientsCount} wallets`,
      correct: !areErrors,
    };
  }

  get amountsStatus() {
    const areErrors = this.incorrectAmountCount > 0;
    return {
      title: areErrors ? `${this.incorrectAmountCount} issues found` : `Calculated`,
      correct: !areErrors,
    };
  }

  get fileName() {
    return this.file?.name;
  }

  get lastModified() {
    const options = { month: 'short', day: 'numeric' } as const;
    return new Date(this.file?.lastModified || 0).toLocaleDateString('en-US', options);
  }

  get fileSize() {
    return ((this.file?.size || 1) / 1024).toFixed(2);
  }

  get recipientsCount() {
    return this.recipients?.length;
  }

  get assetsCount() {
    return new Set(this.recipients?.map((recipient) => recipient.asset?.symbol)).size;
  }

  get invalidAssetsCount() {
    return this.recipients?.filter((recipient) => !validate.asset(recipient.asset)).length;
  }

  get invalidWalletCount() {
    return this.recipients?.filter((recipient) => !validate.wallet(recipient.wallet)).length;
  }

  get incorrectRecipients() {
    return this.recipients.filter((recipient) => !this.validateRecipient(recipient));
  }

  get incorrectRecipientsLength() {
    return this.incorrectRecipients.length;
  }

  get incorrectUSD() {
    return this.recipients.filter((recipient) => !validate.usd(recipient.usd)).length;
  }

  get incorrectAmountCount() {
    return this.recipients.filter((recipient) => !validate.amount(recipient.amount)).length;
  }

  get nextButtonTitle() {
    return this.incorrectRecipients.length > 0 ? 'fix issues' : 'continue';
  }

  nextButtonAction() {
    if (this.incorrectRecipients.length > 0) this.fixIssuesDialog = true;
    else this.nextStage();
  }

  cancelButtonAction() {
    this.cancelProcessing();
  }

  validateRecipient(recipient: Recipient) {
    return validate.validate(recipient);
  }

  changeIssueIdx(newValue) {
    this.currentIssueIdx = newValue;
  }

  @Watch('incorrectRecipientsLength', { deep: true })
  onIssueFixedChanged(newVal) {
    if (newVal < 1) {
      this.fixIssuesDialog = false;
      return;
    }
    if (this.currentIssueIdx <= newVal) {
      this.currentIssueIdx = newVal - 1;
    }
  }
}
</script>

<style lang="scss">
.route-assets-processing-template {
  width: 464px;
  text-align: center;
  font-weight: 300;
  font-feature-settings: 'case' on;

  &__title {
    font-size: 24px;
  }

  &__description {
    font-size: 16px;
  }

  > *:not(:last-child) {
    margin-bottom: $inner-spacing-big;
  }

  &__button {
    width: 100%;
    padding: inherit 30px;
  }

  &__label {
    font-weight: 300;
    font-size: 13px;
    line-height: 140%;
    color: var(--s-color-brand-day);
  }

  &__file-info {
    background: var(--s-color-utility-body);
    box-shadow: var(--s-shadow-element);
    border-radius: 24px;
    padding: 11px 16px;
    @include flex-start;
    gap: 16px;
    text-align: left;
    margin-bottom: $inner-spacing-big;

    .metadata {
      font-weight: 300;
      font-size: 12px;
      line-height: 150%;
      text-align: left;
      color: var(--s-color-base-content-secondary);
    }
  }
}
</style>

<style scoped lang="scss">
.container {
  min-height: auto;
}

.dropping-area {
  border: 1px dashed #d5cdd0;
  border-radius: 24px;
  height: 255px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  padding: 28px 22px;

  &__description {
    font-weight: 400;
    font-size: 16px;
    line-height: 150%;
  }

  &.drag-over {
    background-color: var(--s-color-brand-day);
  }
}

.buttons-container {
  button {
    display: block;
    width: 100%;
    margin: 16px 0 0 0;
  }
}

.file-icon {
  fill: #d5cdd0;
}

.spinner-container {
  @include flex-center;
  > div {
    background-image: url('~@/assets/img/adar-loader.svg');
    background-repeat: no-repeat;
    height: var(--s-size-medium);
    width: var(--s-size-medium);
    > svg {
      display: none;
    }
  }
}

.content-container {
  margin-bottom: 0;
}
</style>
