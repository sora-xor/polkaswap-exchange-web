export * from './assert';
export * from './derived';
export * from './docs';
export * from './file';
export * from './formatting';
export * from './imports';
export * from './initMeta';
export * from './register';
export * from './wsMeta';
type Cmp = {
  name: {
    toString(): string;
  };
};
export declare function compareName(a: Cmp, b: Cmp): number;
