(function (global) {
  "use strict";

  var xmlViz = global.xmlViz;

  function cloneTaggedInstance(taggedInstance) {
    return xmlViz.createTaggedInstance(
      taggedInstance.instanceId,
      taggedInstance.startSeconds,
      taggedInstance.endSeconds,
      taggedInstance.code,
      taggedInstance.labels
    );
  }

  function cloneCodeColor(codeColor) {
    return xmlViz.createCodeColor(
      codeColor.code,
      codeColor.redChannel,
      codeColor.greenChannel,
      codeColor.blueChannel
    );
  }

  function cloneAnalysisDocument(analysisDocument) {
    var instances = analysisDocument.taggedInstances.map(cloneTaggedInstance);
    var colors = analysisDocument.codeColors.map(cloneCodeColor);
    return xmlViz.createAnalysisDocument(instances, colors);
  }

  function collectCodesFromInstances(taggedInstances) {
    var codeSet = {};
    for (var index = 0; index < taggedInstances.length; index += 1) {
      codeSet[taggedInstances[index].code] = true;
    }
    return codeSet;
  }

  function selectInstances(analysisDocument, predicate) {
    var selectedInstances = analysisDocument.taggedInstances.filter(predicate);
    var codesInUse = collectCodesFromInstances(selectedInstances);
    var selectedColors = analysisDocument.codeColors.filter(function (codeColor) {
      return codesInUse[codeColor.code];
    });
    return xmlViz.createAnalysisDocument(selectedInstances, selectedColors);
  }

  function replaceLabelOnInstance(taggedInstance, groupName, currentText, nextText) {
    var updatedLabels = taggedInstance.labels.map(function (label) {
      if (label.groupName === groupName && label.text === currentText) {
        return xmlViz.createInstanceLabel(groupName, nextText);
      }
      return xmlViz.createInstanceLabel(label.groupName, label.text);
    });
    return xmlViz.createTaggedInstance(
      taggedInstance.instanceId,
      taggedInstance.startSeconds,
      taggedInstance.endSeconds,
      taggedInstance.code,
      updatedLabels
    );
  }

  function replaceLabelText(analysisDocument, groupName, currentText, nextText) {
    var updatedDocument = cloneAnalysisDocument(analysisDocument);
    updatedDocument.taggedInstances = updatedDocument.taggedInstances.map(function (taggedInstance) {
      return replaceLabelOnInstance(taggedInstance, groupName, currentText, nextText);
    });
    return updatedDocument;
  }

  xmlViz.selectInstances = selectInstances;
  xmlViz.replaceLabelText = replaceLabelText;
})(typeof window !== "undefined" ? window : globalThis);
