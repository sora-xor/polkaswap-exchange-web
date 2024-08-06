<template>
  <div class="asset-owner-create">
    <create-token-start v-if="showIntroPage" @select-type="selectType" />
    <div v-else>
      <create-regular-token
        v-if="type === AssetType.CreateRegularToken"
        :is-regulated="isRegulated"
        @go-back="showStart"
        @go-to-create="openSbtCreation"
      />
      <create-nft-token v-else-if="type === AssetType.CreateNftToken" @go-back="showStart" />
      <create-sbt-token
        v-else-if="type === AssetType.CreateSbtToken"
        @go-back="showStart"
        @go-to-create="openRegulatedCreation"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import { DashboardComponents } from '@/modules/dashboard/consts';
import { dashboardLazyComponent } from '@/modules/dashboard/router';

export enum AssetType {
  CreateRegularToken = 'CreateRegularToken',
  CreateNftToken = 'CreateNftToken',
  CreateSbtToken = 'CreateSbtToken',
}

@Component({
  components: {
    WalletBase: components.WalletBase,
    CreateTokenStart: dashboardLazyComponent(DashboardComponents.CreateTokenStart),
    CreateRegularToken: dashboardLazyComponent(DashboardComponents.CreateRegularToken),
    CreateNftToken: dashboardLazyComponent(DashboardComponents.CreateNftToken),
    CreateSbtToken: dashboardLazyComponent(DashboardComponents.CreateSbtToken),
  },
})
export default class CreateToken extends Mixins(mixins.TranslationMixin) {
  readonly AssetType = AssetType;

  type = AssetType.CreateRegularToken;
  showIntroPage = true;
  isRegulated = false;

  showStart(): void {
    this.showIntroPage = true;
  }

  selectType(type: AssetType): void {
    this.type = type;
    this.showIntroPage = false;
  }

  openRegulatedCreation(): void {
    this.isRegulated = true;
    this.type = AssetType.CreateRegularToken;
  }

  openSbtCreation(): void {
    this.type = AssetType.CreateSbtToken;
  }
}
</script>

<style lang="scss">
.asset-owner-create {
  .el-card {
    margin: auto;
  }
}

.dashboard-create {
  &-token {
    &_desc {
      color: var(--s-color-base-content-primary);
      font-size: var(--s-font-size-extra-small);
      line-height: var(--s-line-height-base);
      padding: var(--s-basic-spacing) #{$basic-spacing-small} #{$basic-spacing-medium};
      font-weight: 300;
    }
    &_supply-block {
      @include switch-block;
      padding: 0 #{$basic-spacing-small};
    }
    &_action {
      margin-top: #{$basic-spacing-medium};
      width: 100%;
    }
    &_type {
      margin-left: 8px;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--s-color-base-content-secondary);
    }
    &_divider {
      margin: 0 0 20px 0;
    }
  }

  .input-textarea {
    margin-bottom: $basic-spacing;
  }

  .el-textarea {
    height: 54px;

    &__inner {
      resize: none;
      scrollbar-width: none; /* Firefox - not customizable */

      &:hover::-webkit-scrollbar {
        width: 4px;

        &-thumb {
          background-color: var(--s-color-base-content-tertiary);
          border-radius: 6px;
        }
      }

      &::-webkit-scrollbar {
        width: 4px;

        &-track {
          margin-bottom: calc(var(--s-size-small) * 0.25);
        }
      }
    }
  }

  &__button {
    width: 100%;
    margin-bottom: $basic-spacing;
  }

  .preview-image-create-nft {
    margin: #{$basic-spacing-medium} 0;
    height: 200px;

    @include drag-drop-content;

    .image {
      margin: 0 auto;
      height: 176px;
    }

    &__content {
      height: 176px;
      width: 176px;
      object-fit: cover;
      border-radius: calc(var(--s-border-radius-mini) * 0.75);
    }
  }
}
</style>

<style lang="scss">
.sbt-instructions {
  display: flex;
  width: 100%;

  &__section {
    display: flex;
    align-items: center;
    width: 100%;

    .text {
      padding-top: $basic-spacing;
      width: 400px;
    }

    &:last-child .text {
      margin-bottom: $basic-spacing;
    }

    .line {
      height: 1px;
      margin-top: $basic-spacing;
      background-color: var(--s-color-base-border-secondary);

      &--last {
        visibility: hidden;
        margin: 0;
      }
    }
  }

  &__number {
    display: block;
    width: var(--s-size-mini);
    height: var(--s-size-mini);
    font-size: var(--s-font-size-large);
    font-weight: 600;
    color: #a19a9d;
    margin-right: $basic-spacing;
    margin-top: 4px;
  }

  &__point {
    font-weight: 450;
    font-size: var(--s-font-size-big);
  }

  &__text-info {
    width: 120%;
  }

  &__point-desc {
    color: var(--s-color-base-content-secondary);
    margin-top: 3px;
    display: block;
    margin-right: 20px;
  }

  &__point-note {
    margin-top: $inner-spacing-mini;
    margin-right: $inner-spacing-mini;
    font-size: var(--s-font-size-small);
    font-weight: 550;
    color: #efac47;
  }

  .s-icon-basic-check-mark-24 {
    color: #fff;
    position: relative;
    margin-left: 3px;
  }
}

.sbt-title {
  margin-top: $basic-spacing;
  font-size: 22px;
  font-weight: 700;
}
</style>
