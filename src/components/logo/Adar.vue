<template>
  <svg width="109" height="50" viewBox="0 0 109 50" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M47.9413 38.5324H59.748L71.1815 22.4612V38.5324H81.0368V8.93411H69.1362L47.9413 38.5324Z"
      fill="url(#paint0_linear_7432_327)"
    />
    <path
      d="M34.5415 0H46.3908L60.407 18.966L46.3908 38.5324H34.5415L48.4137 18.966L34.5415 0Z"
      fill="url(#paint1_linear_7432_327)"
    />
    <path
      d="M108.271 22.0776L94.2542 8.93411H82.406L96.2771 22.0776L82.4454 36.3252H82.406L82.4273 36.3464L82.406 36.3709H82.4518L96.2771 50H108.271L94.2766 36.3464L108.271 22.0776Z"
      fill="url(#paint2_linear_7432_327)"
    />
    <path
      d="M0 38.5324H11.8078L23.2413 22.4612V38.5324H33.0955V8.93411H21.1949L0 38.5324Z"
      fill="url(#paint3_linear_7432_327)"
    />
    <defs>
      <linearGradient
        id="paint0_linear_7432_327"
        x1="54.1357"
        y1="0"
        x2="54.1357"
        y2="50"
        gradientUnits="userSpaceOnUse"
      >
        <stop stop-color="#0D9999" />
        <stop offset="1" stop-color="#35D7D7" />
      </linearGradient>
      <linearGradient
        id="paint1_linear_7432_327"
        x1="54.1357"
        y1="0"
        x2="54.1357"
        y2="50"
        gradientUnits="userSpaceOnUse"
      >
        <stop stop-color="#0D9999" />
        <stop offset="1" stop-color="#35D7D7" />
      </linearGradient>
      <linearGradient
        id="paint2_linear_7432_327"
        x1="54.1357"
        y1="0"
        x2="54.1357"
        y2="50"
        gradientUnits="userSpaceOnUse"
      >
        <stop stop-color="#0D9999" />
        <stop offset="1" stop-color="#35D7D7" />
      </linearGradient>
      <linearGradient
        id="paint3_linear_7432_327"
        x1="54.1357"
        y1="0"
        x2="54.1357"
        y2="50"
        gradientUnits="userSpaceOnUse"
      >
        <stop stop-color="#0D9999" />
        <stop offset="1" stop-color="#35D7D7" />
      </linearGradient>
    </defs>
  </svg>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme';

@Component
export default class AdarLogo extends Vue {
  @Prop({ default: Theme.LIGHT, type: String }) theme!: Theme;

  get textColor(): string {
    if (this.theme === Theme.DARK) return 'var(--s-color-base-content-primary)';
    return '#92A5D4';
  }
}
</script>
