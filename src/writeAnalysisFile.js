(function (global) {
  "use strict";

  var xmlViz = global.xmlViz;

  var INSTANCE_INDENT = "    ";
  var CHILD_INDENT = "      ";
  var LABEL_INDENT = "      ";
  var LABEL_CHILD_INDENT = "        ";

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

  function formatAttributesForXml(attributes) {
    if (!attributes || attributes.length === 0) {
      return "";
    }
    var parts = [];
    for (var index = 0; index < attributes.length; index += 1) {
      var attribute = attributes[index];
      parts.push(attribute.name + '="' + escapeXmlText(attribute.value) + '"');
    }
    return " " + parts.join(" ");
  }

  function buildXmlNodeLines(xmlNode, indent) {
    var lines = [];
    var attributeText = formatAttributesForXml(xmlNode.attributes);
    var hasChildElements = xmlNode.childNodes.length > 0;
    var hasText = xmlNode.textContent !== "";

    if (!hasChildElements && !hasText) {
      lines.push(indent + "<" + xmlNode.elementName + attributeText + "/>");
      return lines;
    }

    if (!hasChildElements) {
      lines.push(
        indent +
          "<" +
          xmlNode.elementName +
          attributeText +
          ">" +
          escapeXmlText(xmlNode.textContent) +
          "</" +
          xmlNode.elementName +
          ">"
      );
      return lines;
    }

    lines.push(indent + "<" + xmlNode.elementName + attributeText + ">");
    if (hasText) {
      lines.push(indent + "  " + escapeXmlText(xmlNode.textContent));
    }
    for (var childIndex = 0; childIndex < xmlNode.childNodes.length; childIndex += 1) {
      var childLines = buildXmlNodeLines(xmlNode.childNodes[childIndex], indent + "  ");
      for (var lineIndex = 0; lineIndex < childLines.length; lineIndex += 1) {
        lines.push(childLines[lineIndex]);
      }
    }
    lines.push(indent + "</" + xmlNode.elementName + ">");
    return lines;
  }

  function buildLabelXml(label) {
    var lines = [];
    lines.push(LABEL_INDENT + "<label>");
    lines.push(LABEL_CHILD_INDENT + "<group>" + escapeXmlText(label.groupName) + "</group>");
    lines.push(LABEL_CHILD_INDENT + "<text>" + escapeXmlText(label.text) + "</text>");
    lines.push(LABEL_INDENT + "</label>");
    return lines.join("\n");
  }

  function buildInstanceXmlFromFields(taggedInstance) {
    var lines = [];
    lines.push(INSTANCE_INDENT + "<instance>");
    lines.push(CHILD_INDENT + "<ID>" + escapeXmlText(taggedInstance.instanceId) + "</ID>");
    lines.push(
      CHILD_INDENT + "<start>" + formatNumberForXml(taggedInstance.startSeconds) + "</start>"
    );
    lines.push(CHILD_INDENT + "<end>" + formatNumberForXml(taggedInstance.endSeconds) + "</end>");
    lines.push(CHILD_INDENT + "<code>" + escapeXmlText(taggedInstance.code) + "</code>");
    for (var index = 0; index < taggedInstance.labels.length; index += 1) {
      lines.push(buildLabelXml(taggedInstance.labels[index]));
    }
    lines.push(INSTANCE_INDENT + "</instance>");
    return lines.join("\n");
  }

  function buildInstanceXmlFromNodes(taggedInstance) {
    var wrapperLines = buildXmlNodeLines(
      xmlViz.createXmlNode("instance", [], "", taggedInstance.orderedChildNodes),
      INSTANCE_INDENT
    );
    return wrapperLines.join("\n");
  }

  function buildInstanceXml(taggedInstance) {
    if (taggedInstance.orderedChildNodes && taggedInstance.orderedChildNodes.length > 0) {
      return buildInstanceXmlFromNodes(taggedInstance);
    }
    return buildInstanceXmlFromFields(taggedInstance);
  }

  function buildRowXmlFromFields(codeColor) {
    var lines = [];
    lines.push(INSTANCE_INDENT + "<row>");
    lines.push(CHILD_INDENT + "<code>" + escapeXmlText(codeColor.code) + "</code>");
    lines.push(CHILD_INDENT + "<R>" + formatNumberForXml(codeColor.redChannel) + "</R>");
    lines.push(CHILD_INDENT + "<G>" + formatNumberForXml(codeColor.greenChannel) + "</G>");
    lines.push(CHILD_INDENT + "<B>" + formatNumberForXml(codeColor.blueChannel) + "</B>");
    lines.push(INSTANCE_INDENT + "</row>");
    return lines.join("\n");
  }

  function buildRowXmlFromNodes(codeColor) {
    var wrapperLines = buildXmlNodeLines(
      xmlViz.createXmlNode("row", [], "", codeColor.orderedChildNodes),
      INSTANCE_INDENT
    );
    return wrapperLines.join("\n");
  }

  function buildRowXml(codeColor) {
    if (codeColor.orderedChildNodes && codeColor.orderedChildNodes.length > 0) {
      return buildRowXmlFromNodes(codeColor);
    }
    return buildRowXmlFromFields(codeColor);
  }

  function buildAllInstancesBlock(analysisDocument) {
    var lines = [];
    lines.push("  <ALL_INSTANCES>");
    for (var instanceIndex = 0; instanceIndex < analysisDocument.taggedInstances.length; instanceIndex += 1) {
      lines.push(buildInstanceXml(analysisDocument.taggedInstances[instanceIndex]));
    }
    lines.push("  </ALL_INSTANCES>");
    return lines;
  }

  function buildRowsBlock(analysisDocument) {
    var lines = [];
    lines.push("  <ROWS>");
    for (var colorIndex = 0; colorIndex < analysisDocument.codeColors.length; colorIndex += 1) {
      lines.push(buildRowXml(analysisDocument.codeColors[colorIndex]));
    }
    lines.push("  </ROWS>");
    return lines;
  }

  function writeAnalysisFileWithSlots(analysisDocument) {
    var lines = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push("<file>");
    for (var slotIndex = 0; slotIndex < analysisDocument.fileChildSlots.length; slotIndex += 1) {
      var slot = analysisDocument.fileChildSlots[slotIndex];
      if (slot.role === "metadata") {
        var metadataLines = buildXmlNodeLines(slot.node, "  ");
        for (var metadataLineIndex = 0; metadataLineIndex < metadataLines.length; metadataLineIndex += 1) {
          lines.push(metadataLines[metadataLineIndex]);
        }
      } else if (slot.role === "instances") {
        var instanceBlockLines = buildAllInstancesBlock(analysisDocument);
        for (var instanceLineIndex = 0; instanceLineIndex < instanceBlockLines.length; instanceLineIndex += 1) {
          lines.push(instanceBlockLines[instanceLineIndex]);
        }
      } else if (slot.role === "rows") {
        var rowsBlockLines = buildRowsBlock(analysisDocument);
        for (var rowLineIndex = 0; rowLineIndex < rowsBlockLines.length; rowLineIndex += 1) {
          lines.push(rowsBlockLines[rowLineIndex]);
        }
      }
    }
    lines.push("</file>");
    return lines.join("\n");
  }

  function writeAnalysisFileDefaultOrder(analysisDocument) {
    var lines = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push("<file>");
    var instanceBlockLines = buildAllInstancesBlock(analysisDocument);
    for (var instanceLineIndex = 0; instanceLineIndex < instanceBlockLines.length; instanceLineIndex += 1) {
      lines.push(instanceBlockLines[instanceLineIndex]);
    }
    var rowsBlockLines = buildRowsBlock(analysisDocument);
    for (var rowLineIndex = 0; rowLineIndex < rowsBlockLines.length; rowLineIndex += 1) {
      lines.push(rowsBlockLines[rowLineIndex]);
    }
    lines.push("</file>");
    return lines.join("\n");
  }

  function writeAnalysisFile(analysisDocument) {
    if (analysisDocument.fileChildSlots && analysisDocument.fileChildSlots.length > 0) {
      return writeAnalysisFileWithSlots(analysisDocument);
    }
    return writeAnalysisFileDefaultOrder(analysisDocument);
  }

  xmlViz.writeAnalysisFile = writeAnalysisFile;
  xmlViz.buildXmlNodeLines = buildXmlNodeLines;
})(typeof window !== "undefined" ? window : globalThis);
