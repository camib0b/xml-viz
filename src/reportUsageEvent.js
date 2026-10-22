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
  var INPUT_KINDS = {
    picker: true,
    drop: true,
  };
  var CHANGE_KINDS = {
    toggle: true,
    all: true,
    clear: true,
  };
  var METADATA_SCOPES = {
    file: true,
    instance: true,
  };
  var EMPTY_DOCUMENT_MEASURES = {
    instanceCount: 0,
    tagCount: 0,
    labelCount: 0,
    distinctLabelCount: 0,
    distinctGroupCount: 0,
    colorRowCount: 0,
    metadataBlockCount: 0,
    timelineDurationMs: 0,
  };

  /**
   * Numeric fields copied for each action. Anything else on the caller object,
   * including names and file text, is ignored.
   */
  var ACTION_NUMERIC_FIELDS = {
    parse: [
      "durationMs",
      "fileBytes",
      "instanceCount",
      "tagCount",
      "labelCount",
      "distinctLabelCount",
      "distinctGroupCount",
      "colorRowCount",
      "metadataBlockCount",
      "timelineDurationMs",
    ],
    select: ["selectedRowCount", "selectedInstanceCount", "tagCount", "instanceCount"],
    prepare: [
      "selectedRowCount",
      "selectedInstanceCount",
      "tagCount",
      "instanceCount",
      "metadataBlockCount",
      "instanceMetadataTypeCount",
    ],
    metadata: [
      "included",
      "excludedFileMetadataCount",
      "excludedInstanceMetadataCount",
      "metadataBlockCount",
      "instanceMetadataTypeCount",
    ],
    back: [
      "selectedRowCount",
      "selectedInstanceCount",
      "renamedCount",
      "fieldOverrideCount",
      "excludedFileMetadataCount",
      "excludedInstanceMetadataCount",
      "downloadNameChanged",
    ],
    export: [
      "durationMs",
      "fileBytes",
      "exportBytes",
      "tagCount",
      "instanceCount",
      "labelCount",
      "selectedRowCount",
      "exportedInstanceCount",
      "exportedLabelCount",
      "exportedTimelineDurationMs",
      "renamedCount",
      "fieldOverrideCount",
      "excludedFileMetadataCount",
      "excludedInstanceMetadataCount",
      "downloadNameChanged",
    ],
  };
  var FLAG_FIELDS = {
    included: true,
    downloadNameChanged: true,
  };

  function finiteCount(value) {
    if (typeof value !== "number" || !isFinite(value) || value <= 0) {
      return 0;
    }
    return Math.min(Math.round(value), Number.MAX_SAFE_INTEGER);
  }

  function flagCount(value) {
    return value === 1 || value === true ? 1 : 0;
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

  function utf8ByteLength(text) {
    try {
      if (typeof TextEncoder !== "function") {
        return 0;
      }
      return new TextEncoder().encode(String(text)).length;
    } catch (error) {
      return 0;
    }
  }

  function copyDocumentMeasures(measures) {
    return {
      instanceCount: measures.instanceCount,
      tagCount: measures.tagCount,
      labelCount: measures.labelCount,
      distinctLabelCount: measures.distinctLabelCount,
      distinctGroupCount: measures.distinctGroupCount,
      colorRowCount: measures.colorRowCount,
      metadataBlockCount: measures.metadataBlockCount,
      timelineDurationMs: measures.timelineDurationMs,
    };
  }

  /**
   * Counts and the timeline span for one analysis document. Codes, label
   * text, ids, and metadata values stay in the document and are not returned.
   */
  function measureAnalysisDocument(analysisDocument) {
    if (!analysisDocument || !analysisDocument.taggedInstances) {
      return copyDocumentMeasures(EMPTY_DOCUMENT_MEASURES);
    }
    try {
      var summary = xmlViz.countTags(analysisDocument);
      var instances = analysisDocument.taggedInstances;
      var labelCount = 0;
      var groupNames = {};
      var earliestStartSeconds = Infinity;
      var latestEndSeconds = -Infinity;
      for (var instanceIndex = 0; instanceIndex < instances.length; instanceIndex += 1) {
        var taggedInstance = instances[instanceIndex];
        var labels = taggedInstance.labels || [];
        labelCount += labels.length;
        for (var labelIndex = 0; labelIndex < labels.length; labelIndex += 1) {
          var groupName = labels[labelIndex] && labels[labelIndex].groupName;
          if (typeof groupName === "string") {
            groupNames[groupName] = true;
          }
        }
        if (typeof taggedInstance.startSeconds === "number" && taggedInstance.startSeconds < earliestStartSeconds) {
          earliestStartSeconds = taggedInstance.startSeconds;
        }
        if (typeof taggedInstance.endSeconds === "number" && taggedInstance.endSeconds > latestEndSeconds) {
          latestEndSeconds = taggedInstance.endSeconds;
        }
      }
      var timelineDurationMs = 0;
      if (
        isFinite(earliestStartSeconds) &&
        isFinite(latestEndSeconds) &&
        latestEndSeconds > earliestStartSeconds
      ) {
        timelineDurationMs = Math.round((latestEndSeconds - earliestStartSeconds) * 1000);
      }
      var metadataBlockCount = 0;
      var fileChildSlots = analysisDocument.fileChildSlots || [];
      for (var slotIndex = 0; slotIndex < fileChildSlots.length; slotIndex += 1) {
        if (fileChildSlots[slotIndex].role === "metadata") {
          metadataBlockCount += 1;
        }
      }
      return {
        instanceCount: instances.length,
        tagCount: summary.tagCounts.length,
        labelCount: labelCount,
        distinctLabelCount: summary.labelGroupCounts.length,
        distinctGroupCount: Object.keys(groupNames).length,
        colorRowCount: (analysisDocument.codeColors || []).length,
        metadataBlockCount: metadataBlockCount,
        timelineDurationMs: finiteCount(timelineDurationMs),
      };
    } catch (error) {
      return copyDocumentMeasures(EMPTY_DOCUMENT_MEASURES);
    }
  }

  function countInstancesForCodes(analysisDocument, selectedCodes) {
    if (!analysisDocument || !analysisDocument.taggedInstances || !selectedCodes) {
      return 0;
    }
    var selectedLookup = {};
    for (var codeIndex = 0; codeIndex < selectedCodes.length; codeIndex += 1) {
      selectedLookup[selectedCodes[codeIndex]] = true;
    }
    var selectedInstanceCount = 0;
    var instances = analysisDocument.taggedInstances;
    for (var instanceIndex = 0; instanceIndex < instances.length; instanceIndex += 1) {
      if (selectedLookup[instances[instanceIndex].code]) {
        selectedInstanceCount += 1;
      }
    }
    return selectedInstanceCount;
  }

  /**
   * How the export draft was customized. The download name and rename strings
   * are compared locally and are not returned.
   */
  function measureExportDraft(exportDraft, sourceFileName) {
    var emptyMeasures = {
      renamedCount: 0,
      fieldOverrideCount: 0,
      excludedFileMetadataCount: 0,
      excludedInstanceMetadataCount: 0,
      downloadNameChanged: 0,
    };
    if (!exportDraft) {
      return emptyMeasures;
    }
    try {
      var selectedCodes = exportDraft.selectedCodes || [];
      var renamedCodes = exportDraft.renamedCodesByCurrentCode || {};
      var renamedCount = 0;
      for (var codeIndex = 0; codeIndex < selectedCodes.length; codeIndex += 1) {
        var currentCode = selectedCodes[codeIndex];
        var nextCode = renamedCodes[currentCode];
        if (nextCode === undefined || nextCode === null) {
          nextCode = currentCode;
        }
        if (String(nextCode).trim() !== String(currentCode)) {
          renamedCount += 1;
        }
      }
      var defaultDownloadFileName = xmlViz.buildDefaultDownloadFileName(sourceFileName || "");
      var downloadNameChanged =
        String(exportDraft.downloadFileName || "") !== String(defaultDownloadFileName) ? 1 : 0;
      return {
        renamedCount: renamedCount,
        fieldOverrideCount: exportDraft.fieldOverrides ? Object.keys(exportDraft.fieldOverrides).length : 0,
        excludedFileMetadataCount: (exportDraft.excludedFileMetadataSlotIndexes || []).length,
        excludedInstanceMetadataCount: (exportDraft.excludedInstanceElementNames || []).length,
        downloadNameChanged: downloadNameChanged,
      };
    } catch (error) {
      return emptyMeasures;
    }
  }

  function describeMetadataOffer(analysisDocument, selectedCodes) {
    try {
      var description = xmlViz.describeExportMetadata(analysisDocument, selectedCodes || []);
      return {
        metadataBlockCount: description.fileMetadataBlocks.length,
        instanceMetadataTypeCount: description.instanceMetadataTypes.length,
      };
    } catch (error) {
      return {
        metadataBlockCount: 0,
        instanceMetadataTypeCount: 0,
      };
    }
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
   * One small POST for a meaningful analysis action. sendBeacon survives a
   * closing page; fetch with keepalive covers browsers that refuse the beacon.
   * Only allowlisted fields are serialized. Failures are ignored.
   */
  function reportUsageEvent(event) {
    try {
      if (!event || !ACTION_NUMERIC_FIELDS[event.action]) {
        return;
      }
      if (event.outcome !== "success" && event.outcome !== "error") {
        return;
      }
      if (event.action === "metadata" && !METADATA_SCOPES[event.scope]) {
        return;
      }
      var browser = detectBrowserFamily();
      if (!BROWSER_FAMILIES[browser]) {
        browser = "other";
      }
      var payload = {
        action: event.action,
        browser: browser,
        outcome: event.outcome,
        errorCode: event.outcome === "error" ? sanitizeErrorCode(event.errorCode) : "",
      };
      if (event.action === "parse") {
        payload.input = INPUT_KINDS[event.input] ? event.input : "picker";
      }
      if (event.action === "select") {
        payload.change = CHANGE_KINDS[event.change] ? event.change : "toggle";
      }
      if (event.action === "metadata") {
        payload.scope = event.scope;
      }
      var fieldNames = ACTION_NUMERIC_FIELDS[event.action];
      for (var fieldIndex = 0; fieldIndex < fieldNames.length; fieldIndex += 1) {
        var fieldName = fieldNames[fieldIndex];
        if (FLAG_FIELDS[fieldName]) {
          payload[fieldName] = flagCount(event[fieldName]);
        } else {
          payload[fieldName] = finiteCount(event[fieldName]);
        }
      }
      sendUsagePayload(payload);
    } catch (error) {
      // A failed count must not change loading, selection, or export.
    }
  }

  xmlViz.markUsageTime = markUsageTime;
  xmlViz.elapsedUsageMilliseconds = elapsedUsageMilliseconds;
  xmlViz.usageErrorCode = usageErrorCode;
  xmlViz.exportValidationCode = exportValidationCode;
  xmlViz.utf8ByteLength = utf8ByteLength;
  xmlViz.measureAnalysisDocument = measureAnalysisDocument;
  xmlViz.countInstancesForCodes = countInstancesForCodes;
  xmlViz.measureExportDraft = measureExportDraft;
  xmlViz.describeMetadataOffer = describeMetadataOffer;
  xmlViz.reportUsageEvent = reportUsageEvent;
})(typeof window !== "undefined" ? window : globalThis);
