(function (global) {
  "use strict";

  function createXmlAttribute(name, value) {
    return {
      name: name,
      value: value,
    };
  }

  function createXmlNode(elementName, attributes, textContent, childNodes) {
    return {
      elementName: elementName,
      attributes: attributes ? attributes.slice() : [],
      textContent: textContent === undefined || textContent === null ? "" : String(textContent),
      childNodes: childNodes ? childNodes.slice() : [],
    };
  }

  function cloneXmlAttribute(attribute) {
    return createXmlAttribute(attribute.name, attribute.value);
  }

  function cloneXmlNode(xmlNode) {
    return createXmlNode(
      xmlNode.elementName,
      xmlNode.attributes.map(cloneXmlAttribute),
      xmlNode.textContent,
      xmlNode.childNodes.map(cloneXmlNode)
    );
  }

  function createInstanceLabel(groupName, text) {
    return {
      groupName: groupName,
      text: text,
    };
  }

  function createTaggedInstance(
    instanceId,
    startSeconds,
    endSeconds,
    code,
    labels,
    orderedChildNodes
  ) {
    var instance = {
      instanceId: instanceId,
      startSeconds: startSeconds,
      endSeconds: endSeconds,
      code: code,
      labels: labels.slice(),
    };
    if (orderedChildNodes) {
      instance.orderedChildNodes = orderedChildNodes.slice();
    }
    return instance;
  }

  function createCodeColor(code, redChannel, greenChannel, blueChannel, orderedChildNodes) {
    var row = {
      code: code,
      redChannel: redChannel,
      greenChannel: greenChannel,
      blueChannel: blueChannel,
    };
    if (orderedChildNodes) {
      row.orderedChildNodes = orderedChildNodes.slice();
    }
    return row;
  }

  function createFileChildSlot(role, node) {
    var slot = { role: role };
    if (node) {
      slot.node = node;
    }
    return slot;
  }

  function createAnalysisDocument(taggedInstances, codeColors, fileChildSlots) {
    var document = {
      taggedInstances: taggedInstances.slice(),
      codeColors: codeColors.slice(),
    };
    if (fileChildSlots) {
      document.fileChildSlots = fileChildSlots.slice();
    }
    return document;
  }

  function scaleSixteenBitChannelToByte(channel) {
    return Math.round(channel / 257);
  }

  function formatSecondsAsClock(totalSeconds) {
    const wholeSeconds = Math.floor(totalSeconds);
    const minutes = Math.floor(wholeSeconds / 60);
    const seconds = wholeSeconds % 60;
    const paddedSeconds = String(seconds).padStart(2, "0");
    return minutes + ":" + paddedSeconds;
  }

  function codeColorToCssRgb(codeColor) {
    const red = scaleSixteenBitChannelToByte(codeColor.redChannel);
    const green = scaleSixteenBitChannelToByte(codeColor.greenChannel);
    const blue = scaleSixteenBitChannelToByte(codeColor.blueChannel);
    return "rgb(" + red + ", " + green + ", " + blue + ")";
  }

  global.xmlViz = global.xmlViz || {};
  global.xmlViz.createXmlAttribute = createXmlAttribute;
  global.xmlViz.createXmlNode = createXmlNode;
  global.xmlViz.cloneXmlNode = cloneXmlNode;
  global.xmlViz.createInstanceLabel = createInstanceLabel;
  global.xmlViz.createTaggedInstance = createTaggedInstance;
  global.xmlViz.createCodeColor = createCodeColor;
  global.xmlViz.createFileChildSlot = createFileChildSlot;
  global.xmlViz.createAnalysisDocument = createAnalysisDocument;
  global.xmlViz.scaleSixteenBitChannelToByte = scaleSixteenBitChannelToByte;
  global.xmlViz.formatSecondsAsClock = formatSecondsAsClock;
  global.xmlViz.codeColorToCssRgb = codeColorToCssRgb;
})(typeof window !== "undefined" ? window : globalThis);
