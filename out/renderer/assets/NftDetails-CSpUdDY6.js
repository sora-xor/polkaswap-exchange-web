import { z as defineComponent, bS as TranslationMixin, aP as _export_sfc, a_ as resolveComponent, bz as resolveDirective, A as createElementBlock, C as openBlock, D as createBaseVNode, bA as withDirectives, am as createBlock, aM as createCommentVNode, aN as toDisplayString, bb as normalizeClass, ap as createVNode, bQ as Fragment } from "./index-73GArslZ.js";
const UrlCreator = globalThis.URL || globalThis.webkitURL;
const _sfc_main = defineComponent({
  mixins: [TranslationMixin],
  props: {
    contentLink: {
      default: "",
      type: String
    },
    tokenName: {
      default: "",
      type: String
    },
    tokenSymbol: {
      default: "",
      type: String
    },
    tokenDescription: {
      default: "",
      type: String
    },
    isAssetDetails: {
      default: false,
      type: Boolean
    }
  },
  emits: ["click-details"],
  data() {
    return {
      nftDetailsClicked: false,
      badLink: false,
      imageLoading: true,
      isNotImage: false,
      image: ""
    };
  },
  computed: {
    nftDetailsSectionClasses() {
      const cssClasses = ["nft-info__header--clickable"];
      if (this.nftDetailsClicked) {
        cssClasses.push("nft-info__header--clicked");
      }
      return cssClasses;
    },
    imagePreview() {
      return [this.image];
    }
  },
  mounted() {
    void this.$nextTick().then(() => this.checkImageAvailability());
  },
  beforeUnmount() {
    if (this.image) {
      UrlCreator?.revokeObjectURL(this.image);
    }
  },
  methods: {
    async checkImageAvailability() {
      if (!this.contentLink) {
        return;
      }
      try {
        const response = await fetch(this.contentLink);
        const buffer = await response.blob();
        if (!buffer.type.startsWith("image/")) {
          this.isNotImage = true;
          this.badLink = true;
          this.imageLoading = false;
          return;
        }
        this.imageLoading = false;
        this.image = UrlCreator?.createObjectURL(buffer) ?? "";
      } catch {
        this.badLink = true;
      }
    },
    handleDetailsClick() {
      this.nftDetailsClicked = !this.nftDetailsClicked;
      this.$emit("click-details");
    },
    handleRefresh() {
      this.badLink = false;
      this.imageLoading = true;
      void this.checkImageAvailability();
    }
  }
});
const _hoisted_1 = { class: "nft-details-container" };
const _hoisted_2 = { class: "preview-image-confirm-nft" };
const _hoisted_3 = { key: 0 };
const _hoisted_4 = {
  key: 1,
  class: "placeholder"
};
const _hoisted_5 = { class: "preview-image-confirm-nft__placeholder" };
const _hoisted_6 = {
  key: 1,
  class: "preview-image-confirm-nft__placeholder"
};
const _hoisted_7 = { class: "nft-info" };
const _hoisted_8 = { class: "nft-info__header" };
const _hoisted_9 = { class: "nft-info__name" };
const _hoisted_10 = { class: "nft-info__symbol" };
const _hoisted_11 = { class: "nft-info__desc" };
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_s_icon = resolveComponent("s-icon");
  const _component_s_image = resolveComponent("s-image");
  const _directive_loading = resolveDirective("loading");
  const _directive_button = resolveDirective("button");
  return openBlock(), createElementBlock("div", _hoisted_1, [
    createBaseVNode("div", _hoisted_2, [
      _ctx.imageLoading ? withDirectives((openBlock(), createElementBlock("div", _hoisted_3, null, 512)), [
        [_directive_loading, _ctx.imageLoading]
      ]) : _ctx.badLink ? (openBlock(), createElementBlock("div", _hoisted_4, [
        _ctx.isAssetDetails && !_ctx.isNotImage ? withDirectives((openBlock(), createBlock(_component_s_icon, {
          key: 0,
          class: "preview-image-confirm-nft__icon-refresh",
          name: "refresh-16",
          size: "64px",
          onClick: _ctx.handleRefresh
        }, null, 8, ["onClick"])), [
          [_directive_button]
        ]) : createCommentVNode("", true),
        createBaseVNode("span", _hoisted_5, toDisplayString(_ctx.t("createToken.nft.image.placeholderBadSource")), 1),
        _ctx.isAssetDetails ? (openBlock(), createElementBlock("span", _hoisted_6, toDisplayString(_ctx.t("createToken.nft.image.placeholderBadSourceAddition")), 1)) : createCommentVNode("", true)
      ])) : (openBlock(), createBlock(_component_s_image, {
        key: 2,
        class: "preview-image-confirm-nft__content",
        src: _ctx.image,
        fit: "cover",
        "src-list": _ctx.imagePreview
      }, null, 8, ["src", "src-list"]))
    ]),
    createBaseVNode("div", _hoisted_7, [
      createBaseVNode("div", _hoisted_8, [
        _ctx.isAssetDetails ? (openBlock(), createElementBlock("div", {
          key: 0,
          class: normalizeClass(_ctx.nftDetailsSectionClasses),
          onClick: _cache[0] || (_cache[0] = (...args) => _ctx.handleDetailsClick && _ctx.handleDetailsClick(...args))
        }, [
          createBaseVNode("span", null, toDisplayString(_ctx.tokenSymbol), 1),
          createVNode(_component_s_icon, {
            name: "chevron-down-rounded-16",
            size: "18"
          })
        ], 2)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
          createBaseVNode("span", _hoisted_9, toDisplayString(_ctx.tokenName), 1),
          createBaseVNode("span", _hoisted_10, toDisplayString(_ctx.tokenSymbol), 1)
        ], 64))
      ]),
      createBaseVNode("div", _hoisted_11, toDisplayString(_ctx.tokenDescription), 1)
    ])
  ]);
}
const NftDetails = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render]]);
export {
  NftDetails as default
};
