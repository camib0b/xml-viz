(function (global) {
  "use strict";

  function createInstanceLabel(groupName, text) {
    return {
      groupName: groupName,
      text: text,
    };
  }

  function createTaggedInstance(instanceId, startSeconds, endSeconds, code, labels) {
    return {
      instanceId: instanceId,
      startSeconds: startSeconds,
      endSeconds: endSeconds,
      code: code,
      labels: labels.slice(),
    };
  }

  function createCodeColor(code, redChannel, greenChannel, blueChannel) {
    return {
      code: code,
      redChannel: redChannel,
      greenChannel: greenChannel,
      blueChannel: blueChannel,
    };
  }

  function createAnalysisDocument(taggedInstances, codeColors) {
    return {
      taggedInstances: taggedInstances.slice(),
      codeColors: codeColors.slice(),
    };
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
  global.xmlViz.createInstanceLabel = createInstanceLabel;
  global.xmlViz.createTaggedInstance = createTaggedInstance;
  global.xmlViz.createCodeColor = createCodeColor;
  global.xmlViz.createAnalysisDocument = createAnalysisDocument;
  global.xmlViz.scaleSixteenBitChannelToByte = scaleSixteenBitChannelToByte;
  global.xmlViz.formatSecondsAsClock = formatSecondsAsClock;
  global.xmlViz.codeColorToCssRgb = codeColorToCssRgb;
})(typeof window !== "undefined" ? window : globalThis);
