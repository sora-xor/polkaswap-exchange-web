import { aW as Status } from "./index-73GArslZ.js";
function getLtvStatus(ltv) {
  if (ltv > 50) return Status.Error;
  if (ltv > 30) return Status.Warning;
  return Status.Success;
}
export {
  getLtvStatus as g
};
