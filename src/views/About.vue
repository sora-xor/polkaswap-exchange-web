<template>
  <div class="layout">
    <div class="content">
      <div class="about-main">
        <img src="@/assets/about/about01.png" draggable="false" class="main unselectable" />
        <div class="about-main-text">
          <p class="text">Cross-chain exchange of assets, simple creation and listing of new assets, and the easiest
            swaps ever. The interoperable future of Polkadot is here and we are at the forefront!</p>
        </div>
        <img src="@/assets/about/web3.png" draggable="false" class="web3 unselectable" />
      </div>
      <div class="about-trading">
        <img src="@/assets/about/about02.png" draggable="false" class="unselectable">
        <div class="about-trading-block-1">
          <p class="text">Polkaswap is a non-custodial, cross-chain AMM DEX protocol for swapping tokens based on
            Polkadot and Kusama relay chains, Polkadot and Kusama parachains, and blockchains directly connected via
            bridges.</p>
        </div>
        <div class="about-trading-block-2">
          <div class="bubble-block">
            <img src="@/assets/about/about02-1.png" draggable="false" class="unselectable bubble-icon">
            <p class="text">Polkaswap removes trusted intermediaries and provides the opportunity for faster
              trading</p>
          </div>
        </div>
        <div class="about-trading-block-3">
          <div class="bubble-block">
            <img src="@/assets/about/about02-2.png" draggable="false" class="unselectable bubble-icon">
            <p class="text">Polkaswap is a community project and devs collaborate on the open source code using the
              <a href="https://en.wikipedia.org/wiki/BSD_licenses#4-clause_license_(original_%22BSD_License%22)" title="BSD 4-clause license" class="text">BSD 4-clause license</a></p>
          </div>
        </div>
        <img src="@/assets/about/about02-shadow-1.png" draggable="false" class="unselectable about-trading-shadow-1">
      </div>
      <div class="about-liquidity">
        <img src="@/assets/about/about03.png" draggable="false" class="unselectable">
        <div class="about-liquidity-block-1">
          <p class="text">Polkaswap combines multiple liquidity sources under a common liquidity aggregation
            algorithm, operating completely on-chain, in a trustless and decentralized way.</p>
        </div>
        <div class="about-liquidity-block-2">
          <div class="bubble-block">
            <img src="@/assets/about/about03-1.png" draggable="false" class="unselectable bubble-icon">
            <p class="text">When traders call the swap function, the liquidity aggregation algorithm will fill orders
              using the best offers across all liquidity sources. Liquidity sources can be other DEXs, order books, or
              other API-driven sources.</p>
          </div>
        </div>
        <div class="about-liquidity-block-3">
          <div class="bubble-block">
            <img src="@/assets/about/about03-2.png" draggable="false" class="unselectable bubble-icon">
            <p class="text">Because Polkaswap is an open-source project, anyone can add more liquidity sources by
              making contributions to the Polkaswap codebase.</p>
          </div>
        </div>
        <img src="@/assets/about/about03-shadow-1.png" draggable="false" class="unselectable about-liquidity-shadow-1">
      </div>
      <div class="about-swap">
        <img src="@/assets/about/about04.png" draggable="false" class="unselectable">
        <div class="about-swap-block-1">
          <p class="text">Go beyond the limits of current DEXs by adding tokens from the Polkadot ecosystem as well
            as other blockchains.</p>
        </div>
        <div class="about-swap-block-2">
          <div class="bubble-block">
            <img src="@/assets/about/about04-1.png" draggable="false" class="unselectable bubble-icon">
            <p class="text">Create, list and trade your own tokens on the SORA network.</p>
          </div>
        </div>
        <div class="about-swap-block-3">
          <div class="bubble-block">
            <img src="@/assets/about/about04-2.png" draggable="false" class="unselectable bubble-icon">
            <p class="text">Our core infrastructure uses Parity Substrate, which is more scalable than Ethereum, and
              does not use expensive mining for consensus.</p>
          </div>
        </div>
        <img src="@/assets/about/about04-shadow-1.png" draggable="false" class="unselectable about-swap-shadow-1">
      </div>
      <div class="about-pswap">
        <img src="@/assets/about/about05.png" draggable="false" class="unselectable">
        <div class="about-pswap-block-1">
          <p class="text">PSWAP was created by community governance by voting on its release. It is a utility and
            governance token used to reward liquidity providers on Polkaswap. Unlike most other reward tokens, PSWAP is
            burned with transactions and decreases in supply over time.</p>
        </div>
        <div class="about-pswap-block-2">
          <div class="bubble-block">
            <img src="@/assets/about/about05-1.png" draggable="false" class="unselectable bubble-icon">
            <p class="text">The 0.3% fee for every swap on the Polkaswap DEX is used to buy back PSWAP tokens, which
              are then burned. At first, 90% of burned PSWAP tokens are reminted to allocate to liquidity providers, but
              with time this percentage will decrease to 35% after 4 years.</p>
          </div>
        </div>
        <img src="@/assets/about/about05-shadow-1.png" draggable="false" class="unselectable about-pswap-shadow-1">
      </div>
      <div class="about-video">
        <img src="@/assets/about/about06.png" draggable="false" class="unselectable preview">
        <img src="@/assets/about/about06-shadow-1.png" draggable="false" class="unselectable about-video-shadow-1">
      </div>
      <div class="about-links">
        <div class="about-links-part" @click="openLink('https://sora.org/validator')">
          <img src="@/assets/about/about07-1.png" draggable="false" class="unselectable icon">
          <span class="title">Become a SORA Validator<img src="@/assets/about/about07-3.png" class="link"></span>
          <p class="text">Secure the future of the SORA network and decentralized apps like Polkaswap, and earn
            rewards along the way by becoming a SORA validator.</p>
        </div>
        <div class="about-links-part" @click="openLink('https://sora.org')">
          <img src="@/assets/about/about07-2.png" draggable="false" class="unselectable icon">
          <span class="title">Connect a Chain to SORA<img src="@/assets/about/about07-3.png" class="link"></span>
          <p class="text">Grow the decentralized world economy by connecting more chains to SORA and Polkaswap using
            the HASHI bridge protocol.</p>
        </div>
        <img src="@/assets/about/about07-shadow-1.png" draggable="false" class="unselectable about-links-shadow-1">
      </div>
      <div class="about-network">
        <img src="@/assets/about/about08.png" draggable="false" class="unselectable network-img">
        <p class="text">Polkaswap is built on the SORA Network, focusing on
          interoperability to connect the rest of the crypto ecosystem to Polkadot.</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'

import TranslationMixin from '@/components/mixins/TranslationMixin'

@Component
export default class About extends Mixins(TranslationMixin) {
  openLink (url): void {
    window.open(url, '_blank')
  }
}
</script>

<style lang="scss" scoped>
@mixin backgroundImageWidth {
  &>:first-child {
    width: 80%;
    min-width: 800px;
  }
}

.content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
.unselectable {
  user-drag: none;
  user-select: none;
}

.web3 {
  width: 100px;
  position: absolute;
  bottom: 0;
  right: 5%;
}

.bubble-block {
  display: flex;
  align-items: center;

  &>:first-child {
    max-width: 120px;
  }

  .bubble-icon {
    width: 30%;
  }
}

.about {
  margin: auto;
  &-main {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    position: relative;

    .main {
      min-width: 800px;
      max-width: 1700px;
      width: 100%;
    }

    &-text {
      top: 60%;
      width: 35%;

      position: absolute;
      text-align: center;
    }
  }
  &-trading {
    min-width: 800px;
    padding-top: 5rem;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    position: relative;

    @include backgroundImageWidth;

    &-block-1 {
      top: 26%;
      right: 7.5%;
      width: 40%;

      position: absolute;
    }
    &-block-2 {
      top: 38%;
      right: 5.5%;
      width: 45%;

      position: absolute;
    }
    &-block-3 {
      top: 54%;
      right: 5.5%;
      width: 45%;

      position: absolute;
    }
    &-shadow-1 {
      position: absolute;
      top: -110%;
      z-index: -1;
      width: 100%;
    }
  }
  &-liquidity {
    min-width: 800px;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    position: relative;

    @include backgroundImageWidth;

    &-block-1 {
      top: 49.5%;
      left: 12.5%;
      width: 35%;

      position: absolute;
    }
    &-block-2 {
      top: 60%;
      left: 9%;
      width: 55%;

      position: absolute;
    }
    &-block-3 {
      top: 75%;
      left: 9%;
      width: 55%;

      position: absolute;
    }
    &-shadow-1 {
      position: absolute;
      top: -110%;
      z-index: -1;
      width: 100%;
    }
    @media screen and (max-width: 1024px) {
      &-block-1 {
        left: 6.5%;
      }
      &-block-2 {
        left: 2%;
      }
      &-block-3 {
        left: 2%;
      }
    }
  }
  &-swap {
    min-width: 800px;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    position: relative;

    @include backgroundImageWidth;

    &-block-1 {
      top: 20%;
      right: 7.5%;
      width: 40%;

      position: absolute;
    }
    &-block-2 {
      top: 28%;
      right: 5.5%;
      width: 45%;

      position: absolute;
    }
    &-block-3 {
      top: 48%;
      right: 5.5%;
      width: 45%;

      position: absolute;
    }
    &-shadow-1 {
      position: absolute;
      top: -150%;
      z-index: -1;
      width: 100%;
    }
  }
  &-pswap {
    min-width: 800px;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    flex-direction: column;
    position: relative;

    @include backgroundImageWidth;

    &-block-1 {
      top: 36%;
      right: 33%;
      width: 33%;

      position: absolute;
    }
    &-block-2 {
      top: 58%;
      left: 32%;
      width: 50%;

      position: absolute;
    }
    &-shadow-1 {
      position: absolute;
      top: -70%;
      z-index: -1;
      width: 100%;
    }
  }
  &-video {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    position: relative;

    .preview {
      width: 70%;
      cursor: pointer;
    }

    &-shadow-1 {
      position: absolute;
      top: -100%;
      z-index: -1;
      width: 120%;

      @media screen and (max-width: 1200px) {
        width: 100%;
      }
    }
  }
  &-links {
    width: 70%;
    max-width: 1600px;
    padding-top: 7rem;
    position: relative;

    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr;
    gap: 0px 5rem;
    grid-template-areas: ". .";
    &-part {
      display: flex;
      flex-direction: column;
      cursor: pointer;

      &:after {
        content: '';
        margin-top: 20px;
        background: linear-gradient(80.38deg, #FFD9E5 14.49%, rgba(242, 153, 133, 0.68) 38.03%, rgba(239, 20, 92, 0.38) 61.35%, rgba(171, 24, 184, 0.25) 79.98%, rgba(24, 174, 184, 0.2) 85.51%);
        height: 1px;
      }

      .icon {
        width: 50px
      }
      .title {
        font-family: Sora;
        font-style: normal;
        font-weight: bold;
        font-size: 36px;
        line-height: 100%;

        letter-spacing: -0.02em;
        font-feature-settings: 'case' on, 'liga' off;

        color: #D5CDD0;

        .link {
          width: 12px;
          margin-left: 5px;
          margin-bottom: 10px;
        }
      }
    }

    &-shadow-1 {
      position: absolute;
      top: 0;
      z-index: -1;
      width: 100%;
    }
  }
  &-network {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    position: relative;

    padding-top: 5rem;
    padding-bottom: 5rem;

    .network-img {
      width: 65%;
    }

    .text {
      width: 55%;
      text-align: center;
    }
  }
}

.text {
  font-family: Sora;
  font-style: normal;
  font-weight: 200;
  font-size: 12px;
  line-height: 160%;

  letter-spacing: -0.02em;
  font-feature-settings: 'case' on, 'liga' off;

  color: #2A171F;
  @media screen and (min-width: 1100px) {
    font-size: 14px;
  }
  @media screen and (min-width: 1250px) {
    font-size: 15px;
  }
  @media screen and (min-width: 1800px) {
    font-size: 18px;
  }
}
</style>
