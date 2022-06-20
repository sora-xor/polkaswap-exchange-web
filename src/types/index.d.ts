type Nullable<T> = T | null | undefined;

type AsyncVoidFn = () => Promise<void>;

type DataMap<T> = {
  [key: string]: T;
};
