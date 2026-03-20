const isSelectableAsset = (value) => {
  if (!value || typeof value !== "object") return false;
  const address = value.address;
  return typeof address === "string" && address.length > 0;
};
export {
  isSelectableAsset as i
};
