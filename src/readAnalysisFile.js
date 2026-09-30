(function (global) {
  "use strict";

  var xmlViz = global.xmlViz;

  function readDirectTextContent(element) {
    var text = "";
    for (var nodeIndex = 0; nodeIndex < element.childNodes.length; nodeIndex += 1) {
      var domNode = element.childNodes[nodeIndex];
      if (domNode.nodeType === Node.TEXT_NODE) {
        text += domNode.textContent;
      }
    }
    return text;
  }

  function readAttributesFromElement(element) {
    var attributes = [];
    for (var attributeIndex = 0; attributeIndex < element.attributes.length; attributeIndex += 1) {
      var attribute = element.attributes[attributeIndex];
      attributes.push(xmlViz.createXmlAttribute(attribute.name, attribute.value));
    }
    return attributes;
  }

  function readXmlNodeFromElement(element) {
    var childElements = element.children;
    var childNodes = [];
    for (var childIndex = 0; childIndex < childElements.length; childIndex += 1) {
      childNodes.push(readXmlNodeFromElement(childElements[childIndex]));
    }
    return xmlViz.createXmlNode(
      element.tagName,
      readAttributesFromElement(element),
      readDirectTextContent(element),
      childNodes
    );
  }

  function readRequiredChildText(parentElement, tagName, contextMessage) {
    var child = parentElement.querySelector(":scope > " + tagName);
    if (!child || child.textContent.trim() === "") {
      throw new Error(contextMessage + ": missing <" + tagName + ">.");
    }
    return child.textContent.trim();
  }

  function readInstanceLabels(instanceElement) {
    var labelElements = instanceElement.querySelectorAll(":scope > label");
    var labels = [];
    for (var index = 0; index < labelElements.length; index += 1) {
      var labelElement = labelElements[index];
      var groupName = readRequiredChildText(
        labelElement,
        "group",
        "Label inside instance " + instanceElement.querySelector(":scope > ID")?.textContent
      );
      var text = readRequiredChildText(labelElement, "text", "Label group " + groupName);
      labels.push(xmlViz.createInstanceLabel(groupName, text));
    }
    return labels;
  }

  function readOrderedChildNodes(parentElement) {
    var elementChildren = parentElement.children;
    var orderedChildNodes = [];
    for (var index = 0; index < elementChildren.length; index += 1) {
      orderedChildNodes.push(readXmlNodeFromElement(elementChildren[index]));
    }
    return orderedChildNodes;
  }

  function readTaggedInstances(allInstancesElement) {
    var instanceElements = allInstancesElement.querySelectorAll(":scope > instance");
    var taggedInstances = [];
    for (var index = 0; index < instanceElements.length; index += 1) {
      var instanceElement = instanceElements[index];
      var instanceId = readRequiredChildText(instanceElement, "ID", "Instance at index " + index);
      var startText = readRequiredChildText(instanceElement, "start", "Instance " + instanceId);
      var endText = readRequiredChildText(instanceElement, "end", "Instance " + instanceId);
      var code = readRequiredChildText(instanceElement, "code", "Instance " + instanceId);
      var startSeconds = Number(startText);
      var endSeconds = Number(endText);
      if (Number.isNaN(startSeconds) || Number.isNaN(endSeconds)) {
        throw new Error("Instance " + instanceId + ": start and end must be numbers.");
      }
      var labels = readInstanceLabels(instanceElement);
      var orderedChildNodes = readOrderedChildNodes(instanceElement);
      taggedInstances.push(
        xmlViz.createTaggedInstance(
          instanceId,
          startSeconds,
          endSeconds,
          code,
          labels,
          orderedChildNodes
        )
      );
    }
    return taggedInstances;
  }

  function readCodeColors(rowsElement) {
    if (!rowsElement) {
      return [];
    }
    var rowElements = rowsElement.querySelectorAll(":scope > row");
    var codeColors = [];
    for (var index = 0; index < rowElements.length; index += 1) {
      var rowElement = rowElements[index];
      var code = readRequiredChildText(rowElement, "code", "Row at index " + index);
      var redChannel = Number(readRequiredChildText(rowElement, "R", "Row " + code));
      var greenChannel = Number(readRequiredChildText(rowElement, "G", "Row " + code));
      var blueChannel = Number(readRequiredChildText(rowElement, "B", "Row " + code));
      if (
        Number.isNaN(redChannel) ||
        Number.isNaN(greenChannel) ||
        Number.isNaN(blueChannel)
      ) {
        throw new Error("Row " + code + ": R, G, and B must be numbers.");
      }
      var orderedChildNodes = readOrderedChildNodes(rowElement);
      codeColors.push(
        xmlViz.createCodeColor(code, redChannel, greenChannel, blueChannel, orderedChildNodes)
      );
    }
    return codeColors;
  }

  function readFileChildSlots(fileElement) {
    var slots = [];
    var elementChildren = fileElement.children;
    for (var index = 0; index < elementChildren.length; index += 1) {
      var childElement = elementChildren[index];
      var tagName = childElement.tagName;
      if (tagName === "ALL_INSTANCES") {
        slots.push(xmlViz.createFileChildSlot("instances"));
      } else if (tagName === "ROWS") {
        slots.push(xmlViz.createFileChildSlot("rows"));
      } else {
        slots.push(xmlViz.createFileChildSlot("metadata", readXmlNodeFromElement(childElement)));
      }
    }
    return slots;
  }

  function readAnalysisFile(xmlText) {
    var parser = new DOMParser();
    var xmlDocument = parser.parseFromString(xmlText, "application/xml");
    var parserError = xmlDocument.querySelector("parsererror");
    if (parserError) {
      throw new Error("Invalid XML: " + parserError.textContent.trim());
    }

    var fileElement = xmlDocument.querySelector("file");
    if (!fileElement) {
      throw new Error("Missing root <file> element.");
    }

    var allInstancesElement = fileElement.querySelector(":scope > ALL_INSTANCES");
    if (!allInstancesElement) {
      throw new Error("Missing <ALL_INSTANCES> inside <file>.");
    }

    var rowsElement = fileElement.querySelector(":scope > ROWS");
    var taggedInstances = readTaggedInstances(allInstancesElement);
    var codeColors = readCodeColors(rowsElement);
    var fileChildSlots = readFileChildSlots(fileElement);

    return xmlViz.createAnalysisDocument(taggedInstances, codeColors, fileChildSlots);
  }

  xmlViz.readAnalysisFile = readAnalysisFile;
})(typeof window !== "undefined" ? window : globalThis);
