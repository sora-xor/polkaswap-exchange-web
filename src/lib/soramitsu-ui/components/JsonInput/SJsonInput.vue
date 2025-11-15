<script setup lang="ts">
import JSONEditor, { type JSONEditorOptions } from 'jsoneditor';
import 'jsoneditor/dist/jsoneditor.min.css';
import { isEmpty } from 'lodash-es';

const emit = defineEmits<{
  (event: 'update:modelValue', value: any): void;
  (event: 'error', value: unknown): void;
}>();

const props = withDefaults(
  defineProps<{
    modelValue?: Object;
    options?: JSONEditorOptions;
    height?: string;
    dictionary?: string[];
  }>(),
  {
    modelValue: () => ({}),
    options: () => ({}),
    height: '',
    dictionary: () => [],
  }
);

const model = computed(() => props.modelValue);

const minHeight = 178;

const editor = ref<JSONEditor | null>(null);
const aceEditor = ref<Record<string, any> | null>(null);
const internalChange = ref(false);
const localHeight = ref<number | null>(null);
const stretchStartHeight = ref<number | null>(null);
const stretchStartMouseY = ref<number | null>(null);

const jsoneditor = ref<HTMLElement | null>(null);

onMounted(initView);
onBeforeUnmount(destroyView);
onBeforeUnmount(() => {
  document.removeEventListener('mousemove', handleStretchMousemove);
  document.removeEventListener('mouseup', handleStretchMouseup);
});

const defaultOptions = computed<JSONEditorOptions>(() => ({
  // https://github.com/josdejong/jsoneditor/blob/master/docs/api.md#configuration-options
  mode: 'code',
  mainMenuBar: false,
  statusBar: true,
  autocomplete: {
    caseSensitive: false,
    getOptions: () => {
      return isEmpty(props.dictionary) ? null : props.dictionary;
    },
  },
}));

const computedOptions = computed(() => ({
  ...defaultOptions.value,
  ...props.options,
}));

const computedHeight = computed(() => {
  if (localHeight.value === null) return props.height;
  return `${localHeight.value}px`;
});

function handleStretchMousedown() {
  if (!jsoneditor.value) throw new Error('jsoneditor is missing');
  stretchStartHeight.value = jsoneditor.value.offsetHeight;
  document.addEventListener('mousemove', handleStretchMousemove);
  document.addEventListener('mouseup', handleStretchMouseup);
}

function handleStretchMousemove(event: MouseEvent) {
  if (stretchStartHeight.value === null) throw new Error('stretchStartHeight is null');
  if (stretchStartMouseY.value === null) stretchStartMouseY.value = event.clientY as number;
  localHeight.value = Math.max(stretchStartHeight.value + event.clientY - stretchStartMouseY.value, minHeight);
}

function handleStretchMouseup() {
  document.removeEventListener('mousemove', handleStretchMousemove);
  document.removeEventListener('mouseup', handleStretchMouseup);
  stretchStartMouseY.value = null;
}

watch(computedHeight, () => {
  if (!aceEditor.value) throw new Error('jsoneditor is missing');
  aceEditor.value.resize();
});

function onChange(...args: any) {
  let error = null;
  let json = {};
  try {
    json = (editor.value as any).get();
  } catch (err) {
    error = err;
  }
  if (error) {
    emit('error', error);
  } else {
    if (editor.value) {
      internalChange.value = true;
      emit('update:modelValue', json);
      nextTick(() => {
        internalChange.value = false;
      });
    }
  }
}

function initView() {
  if (!editor.value) {
    if (!jsoneditor.value) throw new Error('jsoneditor is missing');
    const editorOptions = {
      ...computedOptions.value,
      onChange,
    };
    editor.value = new JSONEditor(jsoneditor.value as HTMLElement, editorOptions);
  }
  editor.value.set(model.value !== undefined ? model.value : {});
  aceEditor.value = (editor.value as any).aceEditor;
}

function destroyView() {
  if (editor.value) {
    editor.value.destroy();
    editor.value = null;
  }
}

watch(
  model,
  (val) => {
    if (editor.value && val !== undefined && !internalChange.value) editor.value.set(val);
  },
  { deep: true }
);

watch(
  () => props.options,
  () => {
    if (!editor.value) throw new Error('editor is null');
    if (props.options?.mode && editor) editor.value.setMode(props.options.mode);
  },
  { deep: true }
);
</script>

<template>
  <div class="s-json-input" :style="{ height: computedHeight }">
    <div ref="jsoneditor" class="s-json-input__editor" />
    <div class="s-json-input__stretch" @mousedown="handleStretchMousedown">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16">
        <path d="M4.29 12.07l-.35-.35 7.78-7.78.35.35-7.78 7.78zm7.78-3.54l-.35-.35-3.54 3.54.35.35 3.54-3.54z" />
      </svg>
    </div>
  </div>
</template>
