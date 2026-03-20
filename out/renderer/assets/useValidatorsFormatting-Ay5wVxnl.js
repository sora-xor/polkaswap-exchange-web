import { b_ as u8aToString, b$ as hexToU8a, h as computed, F as FPNumber, s as store } from "./index-73GArslZ.js";
function hexToString(_value) {
  return u8aToString(hexToU8a(_value));
}
function useValidatorsFormatting() {
  const historyDepth = computed(() => store.state.staking.historyDepth);
  const decodeName = (validator) => {
    const identityName = validator.identity?.info.display;
    if (identityName) {
      if (identityName.startsWith("0x")) {
        try {
          return hexToString(identityName);
        } catch (error) {
          console.error("Failed to decode validator name", error);
        }
      } else {
        return identityName;
      }
    }
    return validator.address;
  };
  const formatName = (validator, maxLength = 20) => {
    const name = decodeName(validator);
    return name.length > maxLength ? `${name.slice(0, maxLength)}...` : name;
  };
  const formatCommission = (value) => {
    return FPNumber.fromCodecValue(value, 7).toString();
  };
  const formatReturn = (value) => value;
  return {
    historyDepth,
    decodeName,
    formatName,
    formatCommission,
    formatReturn
  };
}
export {
  useValidatorsFormatting as u
};
