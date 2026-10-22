(function (global) {
  "use strict";

  var xmlViz = global.xmlViz || {};
  global.xmlViz = xmlViz;

  var XML_EVENT_URL = "https://camilaescudero.cl/api/xml-event";
  var ERROR_CODE_PATTERN = /^[a-z0-9-]{1,32}$/;
  var BROWSER_FAMILIES = {
    chrome: true,
    edge: true,
    firefox: true,
    safari: true,
    ios: true,
    other: true,
  };

  function finiteCount(value) {
    if (typeof value !== "number" || !isFinite(value) || value <= 0) {
      return 0;
    }
    return Math.min(Math.round(value), Number.MAX_SAFE_INTEGER);
  }

  function markUsageTime() {
    if (typeof performance !== "undefined" && typeof performance.now === "function") {
      return performance.now();
    }
    return Date.now();
  }

  function elapsedUsageMilliseconds(startedAt) {
    var finishedAt = markUsageTime();
    if (typeof startedAt !== "number" || !isFinite(startedAt)) {
      return 0;
    }
    var elapsed = finishedAt - startedAt;
    if (!isFinite(elapsed) || elapsed <= 0) {
      return 0;
    }
    return Math.min(Math.round(elapsed), Number.MAX_SAFE_INTEGER);
  }

  /**
   * Coarse browser family. The same set as the concat join count.
   * iOS is separate because every browser there is WebKit.
   */
  function detectBrowserFamily() {
    if (typeof navigator === "undefined" || typeof navigator.userAgent !== "string") {
      return "other";
    }
    var userAgent = navigator.userAgent;
    var isIos =
      /iPhone|iPad|iPod/i.test(userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (isIos) {
      return "ios";
    }
    if (/Edg\//i.test(userAgent)) {
      return "edge";
    }
    if (/Firefox/i.test(userAgent)) {
      return "firefox";
    }
    if (/OPR\/|Opera|SamsungBrowser/i.test(userAgent)) {
      return "other";
    }
    if (/Chrome|Chromium/i.test(userAgent)) {
      return "chrome";
    }
    if (/Safari/i.test(userAgent)) {
      return "safari";
    }
    return "other";
  }

  /**
   * A short allowlisted code. Parser text can contain ids and file contents,
   * so the original message is never copied into the event.
   */
  function usageErrorCode(error, stage) {
    var message = error && typeof error.message === "string" ? error.message : "";
    if (message === "Could not read the selected file.") {
      return "read-failed";
    }
    if (message.indexOf("Invalid XML:") === 0) {
      return "invalid-xml";
    }
    if (message === "Missing root <file> element.") {
      return "missing-file";
    }
    if (message === "Missing <ALL_INSTANCES> inside <file>.") {
      return "missing-instances";
    }
    if (message.indexOf("start and end must be numbers") !== -1) {
      return "bad-time";
    }
    if (message.indexOf("R, G, and B must be numbers") !== -1) {
      return "bad-color";
    }
    if (message.indexOf("missing <") !== -1) {
      return "missing-field";
    }
    var name = error && typeof error.name === "string" ? error.name : "";
    if (name === "QuotaExceededError") {
      return "quota";
    }
    if (name === "NotAllowedError") {
      return "not-allowed";
    }
    if (name === "NotFoundError") {
      return "not-found";
    }
    if (name === "SecurityError") {
      return "security";
    }
    if (stage === "build") {
      return "build-failed";
    }
    if (stage === "write") {
      return "write-failed";
    }
    if (stage === "download") {
      return "download-failed";
    }
    return "failed";
  }

  function exportValidationCode(message) {
    var text = typeof message === "string" ? message : "";
    if (text.indexOf("Each selected tag needs a name") === 0) {
      return "rename-empty";
    }
    if (text.indexOf("Two or more tags share the same export name") === 0) {
      return "rename-duplicate";
    }
    return "failed";
  }

  function sanitizeErrorCode(errorCode) {
    if (typeof errorCode !== "string" || !ERROR_CODE_PATTERN.test(errorCode)) {
      return "failed";
    }
    return errorCode;
  }

  function sendUsagePayload(payload) {
    var body = "";
    try {
      body = JSON.stringify(payload);
      if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
        var blob = new Blob([body], { type: "application/json" });
        if (navigator.sendBeacon(XML_EVENT_URL, blob)) {
          return;
        }
      }
    } catch (error) {
      // Fall through to fetch when the body was built. The page must not depend on this POST.
    }
    if (body === "" || typeof fetch !== "function") {
      return;
    }
    try {
      var request = fetch(XML_EVENT_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: body,
        keepalive: true,
        credentials: "omit",
        cache: "no-store",
      });
      if (request && typeof request.catch === "function") {
        request.catch(function () {});
      }
    } catch (error) {
      // The count is optional. Ignore network failures.
    }
  }

  /**
   * One small POST after a parse or a subset export. The body is only the
   * fields POST /api/xml-event accepts. Failures are ignored.
   */
  function reportUsageEvent(event) {
    try {
      if (!event || (event.action !== "parse" && event.action !== "export")) {
        return;
      }
      if (event.outcome !== "success" && event.outcome !== "error") {
        return;
      }
      var browser = detectBrowserFamily();
      if (!BROWSER_FAMILIES[browser]) {
        browser = "other";
      }
      sendUsagePayload({
        action: event.action,
        browser: browser,
        outcome: event.outcome,
        errorCode: event.outcome === "error" ? sanitizeErrorCode(event.errorCode) : "",
        fileBytes: finiteCount(event.fileBytes),
        tagCount: finiteCount(event.tagCount),
        instanceCount: finiteCount(event.instanceCount),
        exportedCount: finiteCount(event.exportedCount),
        durationMs: finiteCount(event.durationMs),
      });
    } catch (error) {
      // A failed count must not change loading or export.
    }
  }

  xmlViz.markUsageTime = markUsageTime;
  xmlViz.elapsedUsageMilliseconds = elapsedUsageMilliseconds;
  xmlViz.usageErrorCode = usageErrorCode;
  xmlViz.exportValidationCode = exportValidationCode;
  xmlViz.reportUsageEvent = reportUsageEvent;
})(typeof window !== "undefined" ? window : globalThis);
