(function (global) {
  "use strict";

  var xmlViz = global.xmlViz;

  var INSTANCE_KNOWN_CHILD_NAMES = {
    ID: true,
    start: true,
    end: true,
    code: true,
    label: true,
  };

  function cloneTaggedInstance(taggedInstance) {
    var clone = xmlViz.createTaggedInstance(
      taggedInstance.instanceId,
      taggedInstance.startSeconds,
      taggedInstance.endSeconds,
      taggedInstance.code,
      taggedInstance.labels,
      taggedInstance.orderedChildNodes
        ? taggedInstance.orderedChildNodes.map(xmlViz.cloneXmlNode)
        : undefined
    );
    return clone;
  }

  function cloneCodeColor(codeColor) {
    return xmlViz.createCodeColor(
      codeColor.code,
      codeColor.redChannel,
      codeColor.greenChannel,
      codeColor.blueChannel,
      codeColor.orderedChildNodes
        ? codeColor.orderedChildNodes.map(xmlViz.cloneXmlNode)
        : undefined
    );
  }

  function cloneFileChildSlots(fileChildSlots) {
    if (!fileChildSlots) {
      return undefined;
    }
    return fileChildSlots.map(function (slot) {
      if (slot.role === "metadata") {
        return xmlViz.createFileChildSlot("metadata", xmlViz.cloneXmlNode(slot.node));
      }
      return xmlViz.createFileChildSlot(slot.role);
    });
  }

  function cloneAnalysisDocument(analysisDocument) {
    var instances = analysisDocument.taggedInstances.map(cloneTaggedInstance);
    var colors = analysisDocument.codeColors.map(cloneCodeColor);
    return xmlViz.createAnalysisDocument(
      instances,
      colors,
      cloneFileChildSlots(analysisDocument.fileChildSlots)
    );
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
    var fileChildSlots = cloneFileChildSlots(analysisDocument.fileChildSlots);
    return xmlViz.createAnalysisDocument(selectedInstances, selectedColors, fileChildSlots);
  }

  function selectInstancesByCodes(analysisDocument, selectedCodes) {
    var codeLookup = {};
    for (var index = 0; index < selectedCodes.length; index += 1) {
      codeLookup[selectedCodes[index]] = true;
    }
    return selectInstances(analysisDocument, function (taggedInstance) {
      return codeLookup[taggedInstance.code];
    });
  }

  function updateCodeTextInOrderedChildNodes(orderedChildNodes, nextCode) {
    if (!orderedChildNodes) {
      return orderedChildNodes;
    }
    return orderedChildNodes.map(function (childNode) {
      if (childNode.elementName === "code" && childNode.childNodes.length === 0) {
        return xmlViz.createXmlNode("code", childNode.attributes, nextCode, []);
      }
      return xmlViz.cloneXmlNode(childNode);
    });
  }

  function renameTagOnInstance(taggedInstance, nextCode) {
    return xmlViz.createTaggedInstance(
      taggedInstance.instanceId,
      taggedInstance.startSeconds,
      taggedInstance.endSeconds,
      nextCode,
      taggedInstance.labels,
      updateCodeTextInOrderedChildNodes(taggedInstance.orderedChildNodes, nextCode)
    );
  }

  function renameTagOnCodeColor(codeColor, nextCode) {
    return xmlViz.createCodeColor(
      nextCode,
      codeColor.redChannel,
      codeColor.greenChannel,
      codeColor.blueChannel,
      updateCodeTextInOrderedChildNodes(codeColor.orderedChildNodes, nextCode)
    );
  }

  function renameTag(analysisDocument, currentCode, nextCode) {
    var updatedDocument = cloneAnalysisDocument(analysisDocument);
    updatedDocument.taggedInstances = updatedDocument.taggedInstances.map(function (taggedInstance) {
      if (taggedInstance.code === currentCode) {
        return renameTagOnInstance(taggedInstance, nextCode);
      }
      return taggedInstance;
    });
    updatedDocument.codeColors = updatedDocument.codeColors.map(function (codeColor) {
      if (codeColor.code === currentCode) {
        return renameTagOnCodeColor(codeColor, nextCode);
      }
      return codeColor;
    });
    return updatedDocument;
  }

  function countSameNameBefore(nodes, nodeIndex, elementName) {
    var count = 0;
    for (var index = 0; index < nodeIndex; index += 1) {
      if (nodes[index].elementName === elementName) {
        count += 1;
      }
    }
    return count;
  }

  function joinNodePath(parentPath, elementName, sameNameIndex) {
    var segment = elementName + "[" + sameNameIndex + "]";
    if (!parentPath) {
      return segment;
    }
    return parentPath + "/" + segment;
  }

  function collectEditableFieldsFromNode(xmlNode, parentPath, editableFields) {
    var nodePath = parentPath;
    if (!nodePath) {
      nodePath = xmlNode.elementName + "[0]";
    }

    for (var attributeIndex = 0; attributeIndex < xmlNode.attributes.length; attributeIndex += 1) {
      var attribute = xmlNode.attributes[attributeIndex];
      editableFields.push({
        fieldKind: "attribute",
        nodePath: nodePath,
        attributeName: attribute.name,
        currentValue: attribute.value,
        fieldKey: nodePath + "@" + attribute.name,
      });
    }

    if (xmlNode.childNodes.length === 0) {
      editableFields.push({
        fieldKind: "text",
        nodePath: nodePath,
        currentValue: xmlNode.textContent,
        fieldKey: nodePath + "#text",
      });
      return;
    }

    for (var childIndex = 0; childIndex < xmlNode.childNodes.length; childIndex += 1) {
      var childNode = xmlNode.childNodes[childIndex];
      var childSameNameIndex = countSameNameBefore(xmlNode.childNodes, childIndex, childNode.elementName);
      var childPath = joinNodePath(nodePath, childNode.elementName, childSameNameIndex);
      collectEditableFieldsFromNode(childNode, childPath, editableFields);
    }
  }

  function describeFileMetadataBlocks(analysisDocument) {
    var blocks = [];
    if (!analysisDocument.fileChildSlots) {
      return blocks;
    }
    for (var slotIndex = 0; slotIndex < analysisDocument.fileChildSlots.length; slotIndex += 1) {
      var slot = analysisDocument.fileChildSlots[slotIndex];
      if (slot.role !== "metadata") {
        continue;
      }
      var editableFields = [];
      collectEditableFieldsFromNode(slot.node, "", editableFields);
      for (var fieldIndex = 0; fieldIndex < editableFields.length; fieldIndex += 1) {
        editableFields[fieldIndex].fileMetadataSlotIndex = slotIndex;
        editableFields[fieldIndex].fieldKey =
          "fileSlot:" + slotIndex + "|" + editableFields[fieldIndex].fieldKey;
      }
      blocks.push({
        fileMetadataSlotIndex: slotIndex,
        elementName: slot.node.elementName,
        editableFields: editableFields,
      });
    }
    return blocks;
  }

  function describeInstanceMetadataOccurrences(analysisDocument, selectedCodes) {
    var codeLookup = {};
    for (var codeIndex = 0; codeIndex < selectedCodes.length; codeIndex += 1) {
      codeLookup[selectedCodes[codeIndex]] = true;
    }
    var occurrencesByElementName = {};

    for (var instanceIndex = 0; instanceIndex < analysisDocument.taggedInstances.length; instanceIndex += 1) {
      var taggedInstance = analysisDocument.taggedInstances[instanceIndex];
      if (!codeLookup[taggedInstance.code]) {
        continue;
      }
      if (!taggedInstance.orderedChildNodes) {
        continue;
      }
      for (var childIndex = 0; childIndex < taggedInstance.orderedChildNodes.length; childIndex += 1) {
        var childNode = taggedInstance.orderedChildNodes[childIndex];
        if (INSTANCE_KNOWN_CHILD_NAMES[childNode.elementName]) {
          continue;
        }
        if (!occurrencesByElementName[childNode.elementName]) {
          occurrencesByElementName[childNode.elementName] = [];
        }
        var sameNameIndex = countSameNameBefore(
          taggedInstance.orderedChildNodes,
          childIndex,
          childNode.elementName
        );
        var nodePath = joinNodePath("", childNode.elementName, sameNameIndex);
        var editableFields = [];
        collectEditableFieldsFromNode(childNode, nodePath, editableFields);
        for (var fieldIndex = 0; fieldIndex < editableFields.length; fieldIndex += 1) {
          editableFields[fieldIndex].instanceId = taggedInstance.instanceId;
          editableFields[fieldIndex].instanceCode = taggedInstance.code;
          editableFields[fieldIndex].fieldKey =
            taggedInstance.instanceId + "|" + editableFields[fieldIndex].fieldKey;
        }
        occurrencesByElementName[childNode.elementName].push({
          instanceId: taggedInstance.instanceId,
          instanceCode: taggedInstance.code,
          nodePath: nodePath,
          editableFields: editableFields,
        });
      }
    }

    var elementNames = Object.keys(occurrencesByElementName).sort();
    return elementNames.map(function (elementName) {
      return {
        elementName: elementName,
        occurrences: occurrencesByElementName[elementName],
      };
    });
  }

  function describeExportMetadata(analysisDocument, selectedCodes) {
    return {
      fileMetadataBlocks: describeFileMetadataBlocks(analysisDocument),
      instanceMetadataTypes: describeInstanceMetadataOccurrences(analysisDocument, selectedCodes),
    };
  }

  function applyOverridesWithPrefix(xmlNode, nodePath, fieldOverrides, keyPrefix) {
    var fullPath = nodePath;
    if (!fullPath) {
      fullPath = xmlNode.elementName + "[0]";
    }

    var textKey = keyPrefix + fullPath + "#text";
    var updatedText = xmlNode.textContent;
    if (Object.prototype.hasOwnProperty.call(fieldOverrides, textKey) && xmlNode.childNodes.length === 0) {
      updatedText = fieldOverrides[textKey];
    }

    var updatedAttributes = xmlNode.attributes.map(function (attribute) {
      var attributeKey = keyPrefix + fullPath + "@" + attribute.name;
      if (Object.prototype.hasOwnProperty.call(fieldOverrides, attributeKey)) {
        return xmlViz.createXmlAttribute(attribute.name, fieldOverrides[attributeKey]);
      }
      return xmlViz.cloneXmlAttribute(attribute);
    });

    var updatedChildren = [];
    for (var childIndex = 0; childIndex < xmlNode.childNodes.length; childIndex += 1) {
      var childNode = xmlNode.childNodes[childIndex];
      var childSameNameIndex = countSameNameBefore(xmlNode.childNodes, childIndex, childNode.elementName);
      var childPath = joinNodePath(fullPath, childNode.elementName, childSameNameIndex);
      updatedChildren.push(
        applyOverridesWithPrefix(childNode, childPath, fieldOverrides, keyPrefix)
      );
    }

    return xmlViz.createXmlNode(xmlNode.elementName, updatedAttributes, updatedText, updatedChildren);
  }

  function applyInstanceFieldOverridesToNode(xmlNode, nodePath, instanceId, fieldOverrides) {
    return applyOverridesWithPrefix(xmlNode, nodePath, fieldOverrides, instanceId + "|");
  }

  function filterInstanceOrderedChildNodes(taggedInstance, excludedElementNames) {
    if (!taggedInstance.orderedChildNodes) {
      return taggedInstance.orderedChildNodes;
    }
    var filteredNodes = taggedInstance.orderedChildNodes.filter(function (childNode) {
      return !excludedElementNames[childNode.elementName];
    });
    return filteredNodes;
  }

  function applyRenamesToDocument(analysisDocument, renamedCodesByCurrentCode) {
    var updatedDocument = analysisDocument;
    var currentCodes = Object.keys(renamedCodesByCurrentCode);
    for (var index = 0; index < currentCodes.length; index += 1) {
      var currentCode = currentCodes[index];
      var nextCode = renamedCodesByCurrentCode[currentCode];
      if (nextCode !== currentCode) {
        updatedDocument = renameTag(updatedDocument, currentCode, nextCode);
      }
    }
    return updatedDocument;
  }

  function removeExcludedFileMetadataSlots(analysisDocument, excludedFileSlotIndexes) {
    if (!analysisDocument.fileChildSlots) {
      return analysisDocument;
    }
    var excludedLookup = {};
    for (var index = 0; index < excludedFileSlotIndexes.length; index += 1) {
      excludedLookup[excludedFileSlotIndexes[index]] = true;
    }
    var filteredSlots = analysisDocument.fileChildSlots.filter(function (slot, slotIndex) {
      if (slot.role !== "metadata") {
        return true;
      }
      return !excludedLookup[slotIndex];
    });
    var updatedDocument = cloneAnalysisDocument(analysisDocument);
    updatedDocument.fileChildSlots = filteredSlots;
    return updatedDocument;
  }

  function applyFileMetadataEdits(analysisDocument, exportDraft) {
    if (!analysisDocument.fileChildSlots) {
      return analysisDocument;
    }
    var updatedDocument = cloneAnalysisDocument(analysisDocument);
    updatedDocument.fileChildSlots = updatedDocument.fileChildSlots.map(function (slot, slotIndex) {
      if (slot.role !== "metadata") {
        return slot;
      }
      return xmlViz.createFileChildSlot(
        "metadata",
        applyOverridesWithPrefix(slot.node, "", exportDraft.fieldOverrides, "fileSlot:" + slotIndex + "|")
      );
    });
    return updatedDocument;
  }

  function applyInstanceMetadataEdits(analysisDocument, exportDraft) {
    var excludedLookup = {};
    for (var index = 0; index < exportDraft.excludedInstanceElementNames.length; index += 1) {
      excludedLookup[exportDraft.excludedInstanceElementNames[index]] = true;
    }

    var updatedDocument = cloneAnalysisDocument(analysisDocument);
    updatedDocument.taggedInstances = updatedDocument.taggedInstances.map(function (taggedInstance) {
      var filteredChildNodes = filterInstanceOrderedChildNodes(taggedInstance, excludedLookup);
      if (!filteredChildNodes) {
        return taggedInstance;
      }
      var updatedChildNodes = [];
      for (var childIndex = 0; childIndex < filteredChildNodes.length; childIndex += 1) {
        var childNode = filteredChildNodes[childIndex];
        if (INSTANCE_KNOWN_CHILD_NAMES[childNode.elementName]) {
          updatedChildNodes.push(xmlViz.cloneXmlNode(childNode));
          continue;
        }
        var sameNameIndex = countSameNameBefore(filteredChildNodes, childIndex, childNode.elementName);
        var nodePath = joinNodePath("", childNode.elementName, sameNameIndex);
        updatedChildNodes.push(
          applyInstanceFieldOverridesToNode(
            childNode,
            nodePath,
            taggedInstance.instanceId,
            exportDraft.fieldOverrides
          )
        );
      }

      return xmlViz.createTaggedInstance(
        taggedInstance.instanceId,
        taggedInstance.startSeconds,
        taggedInstance.endSeconds,
        taggedInstance.code,
        taggedInstance.labels,
        updatedChildNodes
      );
    });
    return updatedDocument;
  }

  function buildExportDocument(analysisDocument, exportDraft) {
    var subsetDocument = selectInstancesByCodes(analysisDocument, exportDraft.selectedCodes);
    var renamedDocument = applyRenamesToDocument(subsetDocument, exportDraft.renamedCodesByCurrentCode);
    var withFileEdits = applyFileMetadataEdits(renamedDocument, exportDraft);
    var withoutFileMetadata = removeExcludedFileMetadataSlots(
      withFileEdits,
      exportDraft.excludedFileMetadataSlotIndexes
    );
    return applyInstanceMetadataEdits(withoutFileMetadata, exportDraft);
  }

  function validateExportRenames(selectedCodes, renamedCodesByCurrentCode) {
    var seenNextCodes = {};
    for (var index = 0; index < selectedCodes.length; index += 1) {
      var currentCode = selectedCodes[index];
      var nextCode = renamedCodesByCurrentCode[currentCode];
      if (nextCode === undefined || nextCode === null) {
        nextCode = currentCode;
      }
      nextCode = String(nextCode).trim();
      if (nextCode === "") {
        return "Each selected tag needs a name before export.";
      }
      if (seenNextCodes[nextCode]) {
        return "Two or more tags share the same export name: " + nextCode;
      }
      seenNextCodes[nextCode] = true;
    }
    return "";
  }

  function createDefaultExportDraft(selectedCodes, sourceFileName) {
    var renamedCodesByCurrentCode = {};
    for (var index = 0; index < selectedCodes.length; index += 1) {
      renamedCodesByCurrentCode[selectedCodes[index]] = selectedCodes[index];
    }
    return {
      selectedCodes: selectedCodes.slice(),
      downloadFileName: buildDefaultDownloadFileName(sourceFileName),
      renamedCodesByCurrentCode: renamedCodesByCurrentCode,
      excludedFileMetadataSlotIndexes: [],
      excludedInstanceElementNames: [],
      fieldOverrides: {},
    };
  }

  function buildDefaultDownloadFileName(sourceFileName) {
    var baseName = sourceFileName || "analysis.xml";
    if (baseName.toLowerCase().endsWith(".xml")) {
      return baseName.slice(0, -4) + "-export.xml";
    }
    return baseName + "-export.xml";
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
      updatedLabels,
      taggedInstance.orderedChildNodes
        ? taggedInstance.orderedChildNodes.map(xmlViz.cloneXmlNode)
        : undefined
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
  xmlViz.selectInstancesByCodes = selectInstancesByCodes;
  xmlViz.renameTag = renameTag;
  xmlViz.describeExportMetadata = describeExportMetadata;
  xmlViz.buildExportDocument = buildExportDocument;
  xmlViz.validateExportRenames = validateExportRenames;
  xmlViz.createDefaultExportDraft = createDefaultExportDraft;
  xmlViz.buildDefaultDownloadFileName = buildDefaultDownloadFileName;
  xmlViz.replaceLabelText = replaceLabelText;
})(typeof window !== "undefined" ? window : globalThis);
