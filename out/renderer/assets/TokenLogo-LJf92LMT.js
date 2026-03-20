import { dW as base64, z as defineComponent, h as computed, a9 as ref, bA as withDirectives, bB as vShow, A as createElementBlock, C as openBlock, dX as IpfsStorage, dD as LogoSize, r as requireLegacyStore, D as createBaseVNode, am as createBlock, aM as createCommentVNode, cd as normalizeStyle, bb as normalizeClass, dV as api, aP as _export_sfc } from "./index-73GArslZ.js";
const ALLOWED_ICON_MIME_TYPES = /* @__PURE__ */ new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"]);
const DATA_URI_BASE64_REGEX = /^data:(image\/[a-z0-9+.-]+);base64,([A-Za-z0-9+/=]+)$/i;
const DATA_URI_UTF8_SVG_REGEX = /^data:(image\/svg\+xml)(?:;charset=[a-z0-9-]+|;utf8)?,(.+)$/i;
const decodeBase64 = (value) => {
  try {
    if (typeof atob === "function") {
      return atob(value);
    }
  } catch (error) {
    console.error(error);
  }
  return base64.decode(value);
};
const encodeBase64 = (value) => {
  try {
    if (typeof btoa === "function") {
      return btoa(value);
    }
  } catch (error) {
    console.error(error);
  }
  return base64.encode(value);
};
const sanitizeElementAttributes = (element) => {
  Array.from(element.attributes).forEach((attribute) => {
    const name = attribute.name;
    const value = attribute.value || "";
    if (/^on/i.test(name) || value.trim().toLowerCase().startsWith("javascript:")) {
      element.removeAttribute(name);
    }
  });
};
const stripDisallowedSvgContent = (rawSvg) => {
  if (typeof DOMParser === "undefined") return null;
  const parser = new DOMParser();
  const document2 = parser.parseFromString(rawSvg, "image/svg+xml");
  if (document2.querySelector("parsererror")) return null;
  const root = document2.documentElement;
  if (!root) return null;
  const disallowedSelectors = ["script", "foreignObject"];
  disallowedSelectors.forEach((selector) => {
    document2.querySelectorAll(selector).forEach((node) => node.parentNode?.removeChild(node));
  });
  const walker = document2.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  sanitizeElementAttributes(root);
  while (walker.nextNode()) {
    const element = walker.currentNode;
    if (!element) continue;
    sanitizeElementAttributes(element);
  }
  root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  if (!root.getAttribute("width")) {
    root.setAttribute("width", "80px");
  }
  if (!root.getAttribute("height")) {
    root.setAttribute("height", "80px");
  }
  return new XMLSerializer().serializeToString(document2);
};
const sanitizeSvgDataUri = (dataUri) => {
  try {
    let decodedSvg = "";
    const base64Match = DATA_URI_BASE64_REGEX.exec(dataUri);
    if (base64Match) {
      const [, mimeType, payload] = base64Match;
      if (mimeType.toLowerCase() !== "image/svg+xml") return "";
      decodedSvg = decodeBase64(payload);
    } else {
      const utf8Match = DATA_URI_UTF8_SVG_REGEX.exec(dataUri);
      if (!utf8Match) return "";
      const [, mimeType, payload] = utf8Match;
      if (mimeType.toLowerCase() !== "image/svg+xml") return "";
      decodedSvg = decodeURIComponent(payload);
    }
    const sanitizedSvg = stripDisallowedSvgContent(decodedSvg);
    if (!sanitizedSvg) return "";
    const base64SvgEncoded = encodeBase64(sanitizedSvg);
    return `data:image/svg+xml;base64,${base64SvgEncoded}`;
  } catch (error) {
    console.error(error);
    return "";
  }
};
const sanitizeDataUri = (dataUri) => {
  const base64Match = DATA_URI_BASE64_REGEX.exec(dataUri);
  const utf8SvgMatch = DATA_URI_UTF8_SVG_REGEX.exec(dataUri);
  const mimeType = (base64Match?.[1] ?? utf8SvgMatch?.[1] ?? "").toLowerCase();
  if (!mimeType || !ALLOWED_ICON_MIME_TYPES.has(mimeType)) return "";
  if (mimeType === "image/svg+xml") {
    return sanitizeSvgDataUri(dataUri);
  }
  if (!base64Match) return "";
  return dataUri;
};
const sanitizeIconSource = (icon) => {
  if (!icon) return "";
  const trimmed = icon.trim();
  if (trimmed.startsWith("data:")) {
    return sanitizeDataUri(trimmed);
  }
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") return "";
    if (/["'()\s]/.test(trimmed)) return "";
    return url.href;
  } catch (error) {
    console.error(error);
    return "";
  }
};
const buildCssUrl = (url) => {
  const escaped = url.replace(/["\\\n\r]/g, (char) => `\\${char}`);
  const parenthesesEscaped = escaped.replace(/\)/g, "\\)");
  return `url("${parenthesesEscaped}")`;
};
const _hoisted_1$1 = ["src"];
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "NftTokenLogo",
  props: {
    asset: {}
  },
  setup(__props, { expose: __expose }) {
    const props = __props;
    const nftImage = ref(null);
    const showNftImage = ref(false);
    const nftImageUrl = computed(() => props.asset?.content ? IpfsStorage.constructFullIpfsUrl(props.asset.content) : "");
    function handleNftImageLoad() {
      const imgElement = nftImage.value;
      showNftImage.value = Boolean(imgElement && imgElement.complete && imgElement.naturalHeight !== 0);
    }
    function hideNftImage() {
      showNftImage.value = false;
    }
    __expose({
      nftImage,
      showNftImage,
      nftImageUrl,
      handleNftImageLoad,
      hideNftImage
    });
    return (_ctx, _cache) => {
      return withDirectives((openBlock(), createElementBlock("img", {
        ref_key: "nftImage",
        ref: nftImage,
        class: "asset-logo nft-image",
        src: nftImageUrl.value,
        onLoad: handleNftImageLoad,
        onError: hideNftImage
      }, null, 40, _hoisted_1$1)), [
        [vShow, __props.asset.content && showNftImage.value]
      ]);
    };
  }
});
const _hoisted_1 = { class: "logo" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "TokenLogo",
  props: {
    tokenSymbol: { default: "" },
    token: { default: null },
    size: { default: LogoSize.MEDIUM },
    withClickableLogo: { type: Boolean, default: false }
  },
  setup(__props, { expose: __expose }) {
    const props = __props;
    const store = requireLegacyStore();
    const whitelist = computed(() => {
      const value = store.getters["wallet/account/whitelist"];
      return value ?? {};
    });
    const whitelistIdsBySymbol = computed(() => {
      const value = store.getters["wallet/account/whitelistIdsBySymbol"];
      return value ?? {};
    });
    const normalizeTokenSymbol = (value) => (value ?? "").replace(/\s+/g, "").toUpperCase().trim();
    const normalizedWhitelistIdsBySymbol = computed(() => {
      return Object.entries(whitelistIdsBySymbol.value).reduce((result, [symbol, address]) => {
        if (symbol) {
          result[symbol] = address;
        }
        const normalized = normalizeTokenSymbol(symbol);
        if (normalized) {
          result[normalized] = address;
        }
        return result;
      }, {});
    });
    const isNft = computed(() => {
      const maybeAsset = props.token;
      if (!maybeAsset) return false;
      const isNftChecker = api?.assets?.isNft;
      return typeof isNftChecker === "function" ? isNftChecker(maybeAsset) : false;
    });
    const assetAddress = computed(() => {
      const tokenAddress = props.token?.address ?? null;
      if (tokenAddress) return tokenAddress;
      const normalizedSymbol = normalizeTokenSymbol(props.tokenSymbol);
      if (!normalizedSymbol) return null;
      return normalizedWhitelistIdsBySymbol.value[normalizedSymbol] ?? null;
    });
    const whitelistedItem = computed(() => {
      if (!props.token && !props.tokenSymbol) {
        return null;
      }
      const address = assetAddress.value;
      if (!address) {
        return null;
      }
      return whitelist.value[address] ?? null;
    });
    const sanitizedIcon = computed(() => {
      const icon = whitelistedItem.value?.icon;
      return sanitizeIconSource(icon ?? "");
    });
    const iconStyles = computed(() => {
      const icon = sanitizedIcon.value;
      if (!icon) {
        return {};
      }
      return {
        "background-size": "100%",
        "background-image": buildCssUrl(icon)
      };
    });
    const iconClasses = computed(() => {
      const questionMark = "s-icon-notifications-info-24";
      const tokenLogoClass = "asset-logo";
      const classes = [tokenLogoClass];
      const hasIcon = Boolean(sanitizedIcon.value);
      if (!assetAddress.value) {
        classes.push(questionMark);
      } else if (!whitelistedItem.value) {
        classes.push(isNft.value ? "asset-logo-nft" : questionMark);
      } else if (!isNft.value && !hasIcon) {
        classes.push(questionMark);
      }
      classes.push(`${tokenLogoClass}--${props.size.toLowerCase()}`);
      if (props.withClickableLogo) {
        classes.push("asset-logo--clickable");
      }
      return classes;
    });
    __expose({
      iconStyles,
      iconClasses
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("span", {
          class: normalizeClass(iconClasses.value),
          style: normalizeStyle(iconStyles.value)
        }, null, 6),
        isNft.value ? (openBlock(), createBlock(_sfc_main$1, {
          key: 0,
          class: normalizeClass(["asset-logo__nft-image", iconClasses.value]),
          asset: __props.token
        }, null, 8, ["class", "asset"])) : createCommentVNode("", true)
      ]);
    };
  }
});
const TokenLogo = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-7b8a10d7"]]);
export {
  TokenLogo as default
};
