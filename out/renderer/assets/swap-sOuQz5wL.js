import { g as getAssetBalance, F as FPNumber } from "./index-73GArslZ.js";
var DifferenceStatus = /* @__PURE__ */ ((DifferenceStatus2) => {
  DifferenceStatus2["Success"] = "success";
  DifferenceStatus2["Warning"] = "warning";
  DifferenceStatus2["Error"] = "error";
  return DifferenceStatus2;
})(DifferenceStatus || {});
const calcFiatDifference = (from, to) => {
  if (from.isZero() || to.isZero()) return FPNumber.ZERO;
  const difference = to.sub(from).div(from).mul(FPNumber.HUNDRED);
  return difference;
};
const getDifferenceStatus = (value) => {
  if (value > 0) return "success";
  if (value < -10) return "error";
  if (value < -1) return "warning";
  return "";
};
const getVisibleSwapTokenBalance = (token, isLoggedIn) => {
  if (!isLoggedIn || !token) return null;
  return getAssetBalance(token);
};
export {
  DifferenceStatus as D,
  getVisibleSwapTokenBalance as a,
  calcFiatDifference as c,
  getDifferenceStatus as g
};
