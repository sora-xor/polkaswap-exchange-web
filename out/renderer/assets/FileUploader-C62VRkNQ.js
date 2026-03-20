import { z as defineComponent, bX as LoadingMixin, bS as TranslationMixin, cT as IMAGE_MIME_TYPES, aP as _export_sfc, a_ as resolveComponent, A as createElementBlock, C as openBlock, aJ as renderSlot, aM as createCommentVNode, D as createBaseVNode, ap as createVNode, aq as withModifiers, bb as normalizeClass } from "./index-73GArslZ.js";
const FILE_TYPES_LIST_STRING = Object.values(IMAGE_MIME_TYPES).join(",");
const HUNDRED_MB = 100 * 1024 * 1024;
const _sfc_main = defineComponent({
  mixins: [LoadingMixin, TranslationMixin],
  props: {
    /**
     * Boolean check for the external link
     */
    isLinkProvided: {
      default: false,
      type: Boolean
    },
    /**
     * Accepted format of files. `image/*` is set by default
     */
    accept: {
      default: FILE_TYPES_LIST_STRING,
      type: String
    },
    /**
     * Limit (in bytes) of the file. 100 MB is set by default.
     */
    limit: {
      default: HUNDRED_MB,
      type: Number
    }
  },
  emits: ["hide-limit", "show-limit", "upload", "clear"],
  data() {
    return {
      isFileDraggedOver: false,
      isClearBtnShown: false
    };
  },
  computed: {
    dropZoneClass() {
      return this.isFileDraggedOver || this.isLinkProvided ? "drop-zone--over" : "";
    },
    clearBtnShown() {
      return this.isClearBtnShown || this.isLinkProvided;
    }
  },
  methods: {
    dropImage(event) {
      event.preventDefault();
      if (!(event.dataTransfer && event.dataTransfer.files[0] && this.accept.includes(event.dataTransfer.files[0].type))) {
        this.resetFileInput();
        return;
      }
      const fileInput = this.$refs.fileInput;
      if (!fileInput) {
        this.resetFileInput();
        return;
      }
      fileInput.files = event.dataTransfer.files;
      this.upload();
    },
    dragOver() {
      this.isFileDraggedOver = true;
    },
    dragCancelled() {
      this.isFileDraggedOver = false;
    },
    openFileUpload() {
      const fileInput = this.$refs.fileInput;
      if (!fileInput || fileInput.files?.[0] || this.isLinkProvided) {
        return;
      }
      fileInput.click();
    },
    upload() {
      const fileInput = this.$refs.fileInput;
      if (!(fileInput && fileInput.files)) {
        this.resetFileInput();
        return;
      }
      this.$emit("hide-limit");
      const file = fileInput.files[0];
      if (!file) {
        this.resetFileInput();
        return;
      }
      if (file.size > this.limit) {
        this.$emit("show-limit");
        this.resetFileInput();
        return;
      }
      this.$emit("upload", file);
      this.isFileDraggedOver = true;
      this.isClearBtnShown = true;
    },
    clear(event) {
      event.stopPropagation();
      this.resetFileInput();
      this.$emit("clear");
    },
    resetFileInput() {
      const fileInput = this.$refs.fileInput;
      if (fileInput) {
        fileInput.value = "";
      }
      this.isClearBtnShown = false;
      this.isFileDraggedOver = false;
    }
  }
});
const _hoisted_1 = ["accept"];
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_s_icon = resolveComponent("s-icon");
  return openBlock(), createElementBlock("div", {
    class: normalizeClass(["drop-zone", _ctx.dropZoneClass]),
    onDrop: _cache[2] || (_cache[2] = (...args) => _ctx.dropImage && _ctx.dropImage(...args)),
    onDragenter: _cache[3] || (_cache[3] = withModifiers(() => {
    }, ["prevent"])),
    onDragover: _cache[4] || (_cache[4] = withModifiers((...args) => _ctx.dragOver && _ctx.dragOver(...args), ["prevent"])),
    onDragleave: _cache[5] || (_cache[5] = (...args) => _ctx.dragCancelled && _ctx.dragCancelled(...args)),
    onDragend: _cache[6] || (_cache[6] = (...args) => _ctx.dragCancelled && _ctx.dragCancelled(...args)),
    onClick: _cache[7] || (_cache[7] = (...args) => _ctx.openFileUpload && _ctx.openFileUpload(...args))
  }, [
    renderSlot(_ctx.$slots, "default"),
    _ctx.clearBtnShown ? (openBlock(), createElementBlock("div", {
      key: 0,
      onClick: _cache[0] || (_cache[0] = (...args) => _ctx.clear && _ctx.clear(...args))
    }, [
      createVNode(_component_s_icon, {
        class: "clear-file-input-btn",
        name: "basic-clear-X-24",
        size: "64px"
      })
    ])) : createCommentVNode("", true),
    createBaseVNode("input", {
      ref: "fileInput",
      class: "drop-zone__input",
      type: "file",
      accept: _ctx.accept,
      onChange: _cache[1] || (_cache[1] = (...args) => _ctx.upload && _ctx.upload(...args))
    }, null, 40, _hoisted_1)
  ], 34);
}
const FileUploader = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render]]);
export {
  FileUploader as default
};
