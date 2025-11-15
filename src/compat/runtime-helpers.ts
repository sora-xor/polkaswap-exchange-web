import { toDisplayString, renderList, renderSlot, createCommentVNode, createTextVNode } from 'vue';

type GlobalLike = Record<string, unknown>;

const runtime: GlobalLike = globalThis as GlobalLike;

const assignHelper = <T>(key: string, value: T) => {
  if (runtime[key] == null) {
    runtime[key] = value as unknown;
  }
};

const looseEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (Number.isNaN(a) && Number.isNaN(b)) return true;
  if (typeof a === 'object' && typeof b === 'object' && a && b) {
    const aKeys = Object.keys(a as Record<string, unknown>);
    const bKeys = Object.keys(b as Record<string, unknown>);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key) => looseEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]));
  }
  return String(a) === String(b);
};

const looseIndexOf = (arr: unknown[], value: unknown) => {
  for (let i = 0; i < arr.length; i += 1) {
    if (looseEqual(arr[i], value)) {
      return i;
    }
  }
  return -1;
};

assignHelper('_s', toDisplayString);
assignHelper('_n', (value: unknown) => {
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
});
assignHelper('_q', looseEqual);
assignHelper('_i', looseIndexOf);
assignHelper('_l', renderList);
assignHelper('_t', renderSlot);
assignHelper('_e', createCommentVNode);
assignHelper('_v', createTextVNode);
