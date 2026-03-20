import { ae as OrderStatus$1 } from "./index-73GArslZ.js";
var Filter = /* @__PURE__ */ ((Filter2) => {
  Filter2["open"] = "open";
  Filter2["all"] = "all";
  Filter2["executed"] = "executed";
  return Filter2;
})(Filter || {});
var Cancel = /* @__PURE__ */ ((Cancel2) => {
  Cancel2["multiple"] = "multiple";
  Cancel2["all"] = "all";
  return Cancel2;
})(Cancel || {});
const OrderStatus = OrderStatus$1;
export {
  Cancel as C,
  Filter as F,
  OrderStatus as O
};
