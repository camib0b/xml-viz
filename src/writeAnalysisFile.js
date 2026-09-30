(function (global) {
  "use strict";

  var xmlViz = global.xmlViz;

  function escapeXmlText(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function formatNumberForXml(numberValue) {
    if (Number.isInteger(numberValue)) {
      return String(numberValue);
    }
    return String(numberValue);
  }

  function buildLabelXml(label) {
    var lines = [];
    lines.push("      <label>");
    lines.push("        <group>" + escapeXmlText(label.groupName) + "</group>");
    lines.push("        <text>" + escapeXmlText(label.text) + "</text>");
    lines.push("      </label>");
    return lines.join("\n");
  }

  function buildInstanceXml(taggedInstance) {
    var lines = [];
    lines.push("    <instance>");
    lines.push("      <ID>" + escapeXmlText(taggedInstance.instanceId) + "</ID>");
    lines.push(
      "      <start>" + formatNumberForXml(taggedInstance.startSeconds) + "</start>"
    );
    lines.push("      <end>" + formatNumberForXml(taggedInstance.endSeconds) + "</end>");
    lines.push("      <code>" + escapeXmlText(taggedInstance.code) + "</code>");
    for (var index = 0; index < taggedInstance.labels.length; index += 1) {
      lines.push(buildLabelXml(taggedInstance.labels[index]));
    }
    lines.push("    </instance>");
    return lines.join("\n");
  }

  function buildRowXml(codeColor) {
    var lines = [];
    lines.push("    <row>");
    lines.push("      <code>" + escapeXmlText(codeColor.code) + "</code>");
    lines.push("      <R>" + formatNumberForXml(codeColor.redChannel) + "</R>");
    lines.push("      <G>" + formatNumberForXml(codeColor.greenChannel) + "</G>");
    lines.push("      <B>" + formatNumberForXml(codeColor.blueChannel) + "</B>");
    lines.push("    </row>");
    return lines.join("\n");
  }

  function writeAnalysisFile(analysisDocument) {
    var lines = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push("<file>");
    lines.push("  <ALL_INSTANCES>");
    for (var instanceIndex = 0; instanceIndex < analysisDocument.taggedInstances.length; instanceIndex += 1) {
      lines.push(buildInstanceXml(analysisDocument.taggedInstances[instanceIndex]));
    }
    lines.push("  </ALL_INSTANCES>");
    lines.push("  <ROWS>");
    for (var colorIndex = 0; colorIndex < analysisDocument.codeColors.length; colorIndex += 1) {
      lines.push(buildRowXml(analysisDocument.codeColors[colorIndex]));
    }
    lines.push("  </ROWS>");
    lines.push("</file>");
    return lines.join("\n");
  }

  xmlViz.writeAnalysisFile = writeAnalysisFile;
})(typeof window !== "undefined" ? window : globalThis);
