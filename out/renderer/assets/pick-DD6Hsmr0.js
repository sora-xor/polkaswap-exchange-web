import { d$ as require_assignValue, e0 as require_castPath, e1 as require_isIndex, e2 as requireIsObject, e3 as require_toKey, e4 as require_baseGet, e5 as requireHasIn, e6 as require_flatRest, e7 as requireConvert, e8 as requirePlaceholder, cU as getDefaultExportFromCjs } from "./index-73GArslZ.js";
var _baseSet;
var hasRequired_baseSet;
function require_baseSet() {
  if (hasRequired_baseSet) return _baseSet;
  hasRequired_baseSet = 1;
  var assignValue = require_assignValue(), castPath = require_castPath(), isIndex = require_isIndex(), isObject = requireIsObject(), toKey = require_toKey();
  function baseSet(object, path, value, customizer) {
    if (!isObject(object)) {
      return object;
    }
    path = castPath(path, object);
    var index = -1, length = path.length, lastIndex = length - 1, nested = object;
    while (nested != null && ++index < length) {
      var key = toKey(path[index]), newValue = value;
      if (key === "__proto__" || key === "constructor" || key === "prototype") {
        return object;
      }
      if (index != lastIndex) {
        var objValue = nested[key];
        newValue = customizer ? customizer(objValue, key, nested) : void 0;
        if (newValue === void 0) {
          newValue = isObject(objValue) ? objValue : isIndex(path[index + 1]) ? [] : {};
        }
      }
      assignValue(nested, key, newValue);
      nested = nested[key];
    }
    return object;
  }
  _baseSet = baseSet;
  return _baseSet;
}
var _basePickBy;
var hasRequired_basePickBy;
function require_basePickBy() {
  if (hasRequired_basePickBy) return _basePickBy;
  hasRequired_basePickBy = 1;
  var baseGet = require_baseGet(), baseSet = require_baseSet(), castPath = require_castPath();
  function basePickBy(object, paths, predicate) {
    var index = -1, length = paths.length, result = {};
    while (++index < length) {
      var path = paths[index], value = baseGet(object, path);
      if (predicate(value, path)) {
        baseSet(result, castPath(path, object), value);
      }
    }
    return result;
  }
  _basePickBy = basePickBy;
  return _basePickBy;
}
var _basePick;
var hasRequired_basePick;
function require_basePick() {
  if (hasRequired_basePick) return _basePick;
  hasRequired_basePick = 1;
  var basePickBy = require_basePickBy(), hasIn = requireHasIn();
  function basePick(object, paths) {
    return basePickBy(object, paths, function(value, path) {
      return hasIn(object, path);
    });
  }
  _basePick = basePick;
  return _basePick;
}
var pick_1;
var hasRequiredPick$1;
function requirePick$1() {
  if (hasRequiredPick$1) return pick_1;
  hasRequiredPick$1 = 1;
  var basePick = require_basePick(), flatRest = require_flatRest();
  var pick2 = flatRest(function(object, paths) {
    return object == null ? {} : basePick(object, paths);
  });
  pick_1 = pick2;
  return pick_1;
}
var pick$1;
var hasRequiredPick;
function requirePick() {
  if (hasRequiredPick) return pick$1;
  hasRequiredPick = 1;
  var convert = requireConvert(), func = convert("pick", requirePick$1());
  func.placeholder = requirePlaceholder();
  pick$1 = func;
  return pick$1;
}
var pickExports = requirePick();
const pick = /* @__PURE__ */ getDefaultExportFromCjs(pickExports);
export {
  pick as p
};
