function toggleSelectedTagCodes(selectedCodes, tagCode, includeTag) {
  var nextSelectedCodes = selectedCodes.slice();
  if (includeTag) {
    if (nextSelectedCodes.indexOf(tagCode) < 0) {
      nextSelectedCodes.push(tagCode);
    }
    return nextSelectedCodes;
  }
  return nextSelectedCodes.filter(function (code) {
    return code !== tagCode;
  });
}

(function (global) {
  "use strict";
  var xmlViz = global.xmlViz || {};
  global.xmlViz = xmlViz;
  xmlViz.toggleSelectedTagCodes = toggleSelectedTagCodes;
})(typeof window !== "undefined" ? window : globalThis);

if (typeof module !== "undefined" && module.exports) {
  module.exports = { toggleSelectedTagCodes: toggleSelectedTagCodes };
}
