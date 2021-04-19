<template>
  <div class="layout">
    <div class="content">
      <div class="about-1">
        <img src="@/assets/about/about01.png" draggable="false" class="img unselectable" />
        <div class="about-1-text">
          <span class="text">Cross-chain exchange of assets, simple creation and listing of new assets, and the easiest
            swaps ever. The interoperable future of Polkadot is here and we are at the forefront!</span>
        </div>
        <img src="@/assets/about/web3.png" draggable="false" class="web3 unselectable" />
      </div>
      <div class="about-2">
        <img src="@/assets/about/about02.png" draggable="false" class="unselectable">
        <div class="about-2-text-1">
          <span class="text">Polkaswap is a non-custodial, cross-chain AMM DEX protocol for swapping tokens based on
            Polkadot and Kusama relay chains, Polkadot and Kusama parachains, and blockchains directly connected via
            bridges.</span>
        </div>
        <div class="about-2-text-2">
          <div class="bubble-block">
            <img src="@/assets/about/about02-1.png" draggable="false" class="unselectable" style="width: 30%">
            <span class="text">Polkaswap removes trusted intermediaries and provides the opportunity for faster
              trading</span>
          </div>
        </div>
        <div class="about-2-text-3">
          <div class="bubble-block">
            <img src="@/assets/about/about02-2.png" draggable="false" class="unselectable" style="width: 30%">
            <span class="text">Polkaswap is a community project and devs collaborate on the open source code using the
              <a href="https://en.wikipedia.org/wiki/BSD_licenses#4-clause_license_(original_%22BSD_License%22)" title="BSD 4-clause license">BSD 4-clause license</a></span>
          </div>
        </div>
      </div>
      <div class="about-3">
        <img src="@/assets/about/about03.png" draggable="false" class="unselectable">
        <div class="about-3-text-1">
          <span class="text">Polkaswap combines multiple liquidity sources under a common liquidity aggregation
            algorithm, operating completely on-chain, in a trustless and decentralized way.</span>
        </div>
        <div class="about-3-text-2">
          <div class="bubble-block">
            <img src="@/assets/about/about03-1.png" draggable="false" class="unselectable" style="width: 30%">
            <span class="text">When traders call the swap function, the liquidity aggregation algorithm will fill orders
              using the best offers across all liquidity sources. Liquidity sources can be other DEXs, order books, or
              other API-driven sources.</span>
          </div>
        </div>
        <div class="about-3-text-3">
          <div class="bubble-block">
            <img src="@/assets/about/about03-2.png" draggable="false" class="unselectable" style="width: 30%">
            <span class="text">Because Polkaswap is an open-source project, anyone can add more liquidity sources by
              making contributions to the Polkaswap codebase.</span>
          </div>
        </div>
      </div>
      <div class="about-4">
        <img src="@/assets/about/about04.png" draggable="false" class="unselectable">
        <div class="about-4-text-1">
          <span class="text">Go beyond the limits of current DEXs by adding tokens from the Polkadot ecosystem as well
            as other blockchains.</span>
        </div>
        <div class="about-4-text-2">
          <div class="bubble-block">
            <img src="@/assets/about/about04-1.png" draggable="false" class="unselectable" style="width: 30%">
            <span class="text">Create, list and trade your own tokens on the SORA network.</span>
          </div>
        </div>
        <div class="about-4-text-3">
          <div class="bubble-block">
            <img src="@/assets/about/about04-2.png" draggable="false" class="unselectable" style="width: 30%">
            <span class="text">Our core infrastructure uses Parity Substrate, which is more scalable than Ethereum, and
              does not use expensive mining for consensus.</span>
          </div>
        </div>
      </div>
      <div class="about-5">
        <img src="@/assets/about/about05.png" draggable="false" class="unselectable">
        <div class="about-5-text-1">
          <span class="text">PSWAP was created by community governance by voting on its release. It is a utility and
            governance token used to reward liquidity providers on Polkaswap. Unlike most other reward tokens, PSWAP is
            burned with transactions and decreases in supply over time.</span>
        </div>
        <div class="about-5-text-2">
          <div class="bubble-block">
            <img src="@/assets/about/about05-1.png" draggable="false" class="unselectable" style="width: 30%">
            <span class="text">The 0.3% fee for every swap on the Polkaswap DEX is used to buy back PSWAP tokens, which
              are then burned. At first, 90% of burned PSWAP tokens are reminted to allocate to liquidity providers, but
              with time this percentage will decrease to 35% after 4 years.</span>
          </div>
        </div>
        <!-- <div class="about-5-text-3">
          <img src="@/assets/about/about05-2.png" draggable="false" class="unselectable">
          <span class="text"></span>
        </div> -->
      </div>
      <div class="about-6">
        <img src="@/assets/about/about06.png" draggable="false" class="unselectable" style="width: 70%; cursor: pointer;">
      </div>
      <div class="about-7">
        <div class="about-7-part" @click="openLink('https://sora.org/validator')">
          <img src="@/assets/about/about07-1.png" draggable="false" class="unselectable icon">
          <span class="title">Become a SORA Validator<img src="@/assets/about/about07-3.png" class="link"></span>
          <span class="text">Secure the future of the SORA network and decentralized apps like Polkaswap, and earn
            rewards along the way by becoming a SORA validator.</span>
        </div>
        <div class="about-7-part" @click="openLink('https://sora.org')">
          <img src="@/assets/about/about07-2.png" draggable="false" class="unselectable icon">
          <span class="title">Connect a Chain to SORA<img src="@/assets/about/about07-3.png" class="link"></span>
          <span class="text">Grow the decentralized world economy by connecting more chains to SORA and Polkaswap using
            the HASHI bridge protocol.</span>
        </div>
      </div>
      <div class="about-8">
        <img src="@/assets/about/about08.png" draggable="false" class="unselectable" style="width: 65%">
        <span class="text" style="width: 55%; text-align: center;">Polkaswap is built on the SORA Network, focusing on
          interoperability to connect the rest of the crypto ecosystem to Polkadot.</span>
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
.img {
  min-width: 1200px;
  max-width: 1600px;
  width: 100%;
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
}

.about {
  margin: auto;
  &-1 {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    position: relative;

    &-text {
      top: 60%;
      width: 35%;

      position: absolute;
      text-align: center;
    }
  }
  &-2 {
    min-width: 800px;
    padding-top: 5rem;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    position: relative;

    @include backgroundImageWidth;

    &-text-1 {
      top: 26%;
      right: 7.5%;
      width: 40%;

      position: absolute;
    }
    &-text-2 {
      top: 38%;
      right: 5.5%;
      width: 45%;

      position: absolute;
    }
    &-text-3 {
      top: 54%;
      right: 5.5%;
      width: 45%;

      position: absolute;
    }
  }
  &-3 {
    min-width: 800px;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    position: relative;

    @include backgroundImageWidth;

    &-text-1 {
      top: 49.5%;
      left: 12.5%;
      width: 35%;

      position: absolute;
    }
    &-text-2 {
      top: 60%;
      left: 9%;
      width: 55%;

      position: absolute;
    }
    &-text-3 {
      top: 75%;
      left: 9%;
      width: 55%;

      position: absolute;
    }
  }
  &-4 {
    min-width: 800px;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    position: relative;

    @include backgroundImageWidth;

    &-text-1 {
      top: 20%;
      right: 7.5%;
      width: 40%;

      position: absolute;
    }
    &-text-2 {
      top: 27%;
      right: 5.5%;
      width: 45%;

      position: absolute;
    }
    &-text-3 {
      top: 52%;
      right: 5.5%;
      width: 45%;

      position: absolute;
    }
  }
  &-5 {
    min-width: 800px;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    flex-direction: column;
    position: relative;

    @include backgroundImageWidth;

    &-text-1 {
      top: 30%;
      right: 32%;
      width: 40%;

      position: absolute;
    }
    &-text-2 {
      top: 55%;
      left: 24%;
      width: 65%;

      position: absolute;
    }
    // &-text-3 {
    //   top: 66%;
    //   right: 20.5%;
    //   width: 20%;

    //   position: absolute;
    // }
  }
  &-6 {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    position: relative;
  }
  &-7 {
    width: 70%;
    max-width: 1600px;
    padding-top: 7rem;

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
  }
  &-8 {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    position: relative;

    padding-top: 5rem;
    padding-bottom: 5rem;
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

  @media screen and (min-width: 1500px) {
    font-size: 16px;
  }

  @media screen and (min-width: 1200px) {
    font-size: 14px;
  }
}
</style>
