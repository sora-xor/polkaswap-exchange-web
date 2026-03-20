import { br as SnapshotTypes$1 } from "./index-73GArslZ.js";
var Timeframes = /* @__PURE__ */ ((Timeframes2) => {
  Timeframes2["FIVE_MINUTES"] = "FIVE_MINUTES";
  Timeframes2["FIFTEEN_MINUTES"] = "FIFTEEN_MINUTES";
  Timeframes2["THIRTY_MINUTES"] = "THIRTY_MINUTES";
  Timeframes2["HOUR"] = "HOUR";
  Timeframes2["FOUR_HOURS"] = "FOUR_HOURS";
  Timeframes2["DAY"] = "DAY";
  Timeframes2["WEEK"] = "WEEK";
  Timeframes2["MONTH"] = "MONTH";
  Timeframes2["QUARTER"] = "QUARTER";
  Timeframes2["HALF_YEAR"] = "HALF_YEAR";
  Timeframes2["YEAR"] = "YEAR";
  Timeframes2["ALL"] = "ALL";
  return Timeframes2;
})(Timeframes || {});
const SnapshotTypes = SnapshotTypes$1 ?? {
  DEFAULT: "default",
  HOUR: "hour",
  DAY: "day",
  MONTH: "month"
};
const SECONDS_IN_TYPE = {
  [SnapshotTypes.DEFAULT]: 5 * 60,
  [SnapshotTypes.HOUR]: 60 * 60,
  [SnapshotTypes.DAY]: 24 * 60 * 60,
  [SnapshotTypes.MONTH]: 30 * 24 * 60 * 60
};
const DAY_IN_HOURS_FILTER = {
  name: Timeframes.DAY,
  label: "1D",
  type: SnapshotTypes.HOUR,
  count: 24
};
const WEEK_IN_HOURS_FILTER = {
  name: Timeframes.WEEK,
  label: "1W",
  type: SnapshotTypes.HOUR,
  count: 24 * 7
};
const MONTH_IN_DAYS_FILTER = {
  name: Timeframes.MONTH,
  label: "1M",
  type: SnapshotTypes.DAY,
  count: 30
};
const QUARTER_IN_DAYS_FILTER = {
  name: Timeframes.QUARTER,
  label: "3M",
  type: SnapshotTypes.DAY,
  count: 90
};
const HALF_YEAR_IN_DAYS_FILTER = {
  name: Timeframes.HALF_YEAR,
  label: "6M",
  type: SnapshotTypes.DAY,
  count: 180
};
const YEAR_IN_MONTHS_FILTER = {
  name: Timeframes.YEAR,
  label: "1Y",
  type: SnapshotTypes.MONTH,
  count: 12
};
const YEAR_IN_DAYS_FILTER = {
  name: Timeframes.YEAR,
  label: "1Y",
  type: SnapshotTypes.DAY,
  count: 365
};
const NETWORK_STATS_FILTERS = [
  DAY_IN_HOURS_FILTER,
  WEEK_IN_HOURS_FILTER,
  MONTH_IN_DAYS_FILTER,
  QUARTER_IN_DAYS_FILTER,
  HALF_YEAR_IN_DAYS_FILTER,
  YEAR_IN_MONTHS_FILTER
];
const ASSET_SUPPLY_FILTERS = [
  DAY_IN_HOURS_FILTER,
  WEEK_IN_HOURS_FILTER,
  MONTH_IN_DAYS_FILTER,
  QUARTER_IN_DAYS_FILTER,
  HALF_YEAR_IN_DAYS_FILTER,
  YEAR_IN_DAYS_FILTER
];
export {
  ASSET_SUPPLY_FILTERS as A,
  NETWORK_STATS_FILTERS as N,
  SECONDS_IN_TYPE as S,
  Timeframes as T
};
