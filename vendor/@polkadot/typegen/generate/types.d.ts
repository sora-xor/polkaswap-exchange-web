export type ExtraTypes = Record<
  string,
  Record<
    string,
    {
      runtime?: Record<string, any>;
      types: Record<string, any>;
    }
  >
>;
