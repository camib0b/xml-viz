(function (global) {
  "use strict";

  var xmlViz = global.xmlViz;

  function createElement(tagName, className) {
    var element = document.createElement(tagName);
    if (className) {
      element.className = className;
    }
    return element;
  }

  function appendHeading(parentElement, titleText) {
    var heading = createElement("h2", "section-heading");
    heading.textContent = titleText;
    parentElement.appendChild(heading);
  }

  function isFileMetadataSlotIncluded(exportDraft, slotIndex) {
    return exportDraft.excludedFileMetadataSlotIndexes.indexOf(slotIndex) < 0;
  }

  function isInstanceMetadataTypeIncluded(exportDraft, elementName) {
    return exportDraft.excludedInstanceElementNames.indexOf(elementName) < 0;
  }

  function setFileMetadataSlotIncluded(exportDraft, slotIndex, included) {
    var excludedIndexes = exportDraft.excludedFileMetadataSlotIndexes.filter(function (index) {
      return index !== slotIndex;
    });
    if (!included) {
      excludedIndexes.push(slotIndex);
    }
    exportDraft.excludedFileMetadataSlotIndexes = excludedIndexes;
  }

  function setInstanceMetadataTypeIncluded(exportDraft, elementName, included) {
    var excludedNames = exportDraft.excludedInstanceElementNames.filter(function (name) {
      return name !== elementName;
    });
    if (!included) {
      excludedNames.push(elementName);
    }
    exportDraft.excludedInstanceElementNames = excludedNames;
  }

  function refreshExportPreview(previewRoot, analysisDocument, exportDraft) {
    previewRoot.textContent = "";
    var previewDocument = xmlViz.buildExportDocument(analysisDocument, exportDraft);
    xmlViz.renderVisualization(previewRoot, previewDocument);
  }

  function refreshExportValidation(exportDraft, renameErrorElement, exportButton) {
    var validationMessage = xmlViz.validateExportRenames(
      exportDraft.selectedCodes,
      exportDraft.renamedCodesByCurrentCode
    );
    if (validationMessage) {
      renameErrorElement.textContent = validationMessage;
      renameErrorElement.hidden = false;
      exportButton.disabled = true;
      return;
    }
    renameErrorElement.textContent = "";
    renameErrorElement.hidden = true;
    exportButton.disabled = false;
  }

  function renderEditableFieldRow(parentElement, field, exportDraft, onDraftChange) {
    var row = createElement("div", "metadata-field-row");
    var label = createElement("label", "metadata-field-label");
    var labelText = field.fieldKind === "attribute" ? field.attributeName : "Text";
    if (field.instanceId) {
      labelText =
        "Instance " + field.instanceId + " (" + field.instanceCode + ") — " + labelText;
    }
    label.textContent = labelText;

    var input = createElement("input", "metadata-field-input");
    input.type = "text";
    input.value =
      exportDraft.fieldOverrides[field.fieldKey] !== undefined
        ? exportDraft.fieldOverrides[field.fieldKey]
        : field.currentValue;
    input.addEventListener("input", function () {
      exportDraft.fieldOverrides[field.fieldKey] = input.value;
      onDraftChange();
    });

    row.appendChild(label);
    row.appendChild(input);
    parentElement.appendChild(row);
  }

  function renderFileMetadataSection(
    formElement,
    metadataDescription,
    exportDraft,
    onDraftChange
  ) {
    appendHeading(formElement, "File metadata");
    if (metadataDescription.fileMetadataBlocks.length === 0) {
      var emptyMessage = createElement("p", "summary-line");
      emptyMessage.textContent = "This file has no extra file-level metadata.";
      formElement.appendChild(emptyMessage);
      return;
    }

    metadataDescription.fileMetadataBlocks.forEach(function (metadataBlock) {
      var blockElement = createElement("div", "metadata-block");
      var includeLabel = createElement("label", "metadata-include-label");
      var includeCheckbox = createElement("input");
      includeCheckbox.type = "checkbox";
      includeCheckbox.checked = isFileMetadataSlotIncluded(
        exportDraft,
        metadataBlock.fileMetadataSlotIndex
      );
      includeCheckbox.addEventListener("change", function () {
        setFileMetadataSlotIncluded(
          exportDraft,
          metadataBlock.fileMetadataSlotIndex,
          includeCheckbox.checked
        );
        onDraftChange();
      });
      includeLabel.appendChild(includeCheckbox);
      includeLabel.appendChild(
        document.createTextNode(" Include <" + metadataBlock.elementName + "> in export")
      );
      blockElement.appendChild(includeLabel);

      var fieldsContainer = createElement("div", "metadata-fields");
      metadataBlock.editableFields.forEach(function (field) {
        renderEditableFieldRow(fieldsContainer, field, exportDraft, onDraftChange);
      });
      blockElement.appendChild(fieldsContainer);
      formElement.appendChild(blockElement);
    });
  }

  function renderInstanceMetadataSection(
    formElement,
    metadataDescription,
    exportDraft,
    onDraftChange
  ) {
    appendHeading(formElement, "Instance metadata");
    if (metadataDescription.instanceMetadataTypes.length === 0) {
      var emptyMessage = createElement("p", "summary-line");
      emptyMessage.textContent = "Selected tags have no extra instance-level metadata.";
      formElement.appendChild(emptyMessage);
      return;
    }

    metadataDescription.instanceMetadataTypes.forEach(function (metadataType) {
      var typeElement = createElement("div", "metadata-block");
      var includeLabel = createElement("label", "metadata-include-label");
      var includeCheckbox = createElement("input");
      includeCheckbox.type = "checkbox";
      includeCheckbox.checked = isInstanceMetadataTypeIncluded(
        exportDraft,
        metadataType.elementName
      );
      includeCheckbox.addEventListener("change", function () {
        setInstanceMetadataTypeIncluded(
          exportDraft,
          metadataType.elementName,
          includeCheckbox.checked
        );
        onDraftChange();
      });
      includeLabel.appendChild(includeCheckbox);
      includeLabel.appendChild(
        document.createTextNode(" Include <" + metadataType.elementName + "> on exported instances")
      );
      typeElement.appendChild(includeLabel);

      var scrollContainer = createElement("div", "metadata-occurrence-scroll");
      metadataType.occurrences.forEach(function (occurrence) {
        occurrence.editableFields.forEach(function (field) {
          renderEditableFieldRow(scrollContainer, field, exportDraft, onDraftChange);
        });
      });
      typeElement.appendChild(scrollContainer);
      formElement.appendChild(typeElement);
    });
  }

  function renderExportPreparation(parentElement, analysisDocument, exportDraft, callbacks) {
    parentElement.textContent = "";
    var metadataDescription = xmlViz.describeExportMetadata(
      analysisDocument,
      exportDraft.selectedCodes
    );

    var header = createElement("div", "export-preparation-header");
    appendHeading(header, "Prepare export");
    var intro = createElement("p", "summary-line");
    intro.textContent =
      "Rename tags, choose metadata, and review the subset before downloading the new XML file.";
    header.appendChild(intro);

    var backButton = createElement("button", "action-button");
    backButton.type = "button";
    backButton.textContent = "Back to timeline";
    backButton.addEventListener("click", function () {
      callbacks.onBack();
    });
    header.appendChild(backButton);
    parentElement.appendChild(header);

    var formElement = createElement("div", "export-preparation-form");
    parentElement.appendChild(formElement);

    appendHeading(formElement, "Download file name");
    var fileNameRow = createElement("div", "form-row");
    var fileNameInput = createElement("input", "form-text-input");
    fileNameInput.type = "text";
    fileNameInput.value = exportDraft.downloadFileName;
    fileNameInput.addEventListener("input", function () {
      exportDraft.downloadFileName = fileNameInput.value;
    });
    fileNameRow.appendChild(fileNameInput);
    formElement.appendChild(fileNameRow);

    appendHeading(formElement, "Rename tags");
    var renameErrorElement = createElement("p", "read-error-message");
    renameErrorElement.hidden = true;
    renameErrorElement.setAttribute("role", "alert");
    formElement.appendChild(renameErrorElement);

    var previewRoot = createElement("div", "export-preview-root");
    var exportButton = createElement("button", "action-button action-button-primary");
    exportButton.type = "button";
    exportButton.textContent = "Export XML file";

    function onDraftChange() {
      refreshExportValidation(exportDraft, renameErrorElement, exportButton);
      refreshExportPreview(previewRoot, analysisDocument, exportDraft);
    }

    exportDraft.selectedCodes.forEach(function (currentCode) {
      var renameRow = createElement("div", "form-row");
      var renameLabel = createElement("label", "form-inline-label");
      renameLabel.textContent = currentCode + " → ";
      var renameInput = createElement("input", "form-text-input");
      renameInput.type = "text";
      renameInput.value = exportDraft.renamedCodesByCurrentCode[currentCode] || currentCode;
      renameInput.addEventListener("input", function () {
        exportDraft.renamedCodesByCurrentCode[currentCode] = renameInput.value;
        refreshExportValidation(exportDraft, renameErrorElement, exportButton);
        refreshExportPreview(previewRoot, analysisDocument, exportDraft);
      });
      renameRow.appendChild(renameLabel);
      renameRow.appendChild(renameInput);
      formElement.appendChild(renameRow);
    });

    renderFileMetadataSection(formElement, metadataDescription, exportDraft, onDraftChange);
    renderInstanceMetadataSection(formElement, metadataDescription, exportDraft, onDraftChange);

    appendHeading(formElement, "Export preview");
    formElement.appendChild(previewRoot);

    var exportActions = createElement("div", "export-selection-actions");
    exportButton.addEventListener("click", function () {
      var validationMessage = xmlViz.validateExportRenames(
        exportDraft.selectedCodes,
        exportDraft.renamedCodesByCurrentCode
      );
      if (validationMessage) {
        renameErrorElement.textContent = validationMessage;
        renameErrorElement.hidden = false;
        if (callbacks.onExportBlocked) {
          callbacks.onExportBlocked(xmlViz.exportValidationCode(validationMessage));
        }
        return;
      }
      callbacks.onExport(exportDraft);
    });
    exportActions.appendChild(exportButton);
    formElement.appendChild(exportActions);

    refreshExportValidation(exportDraft, renameErrorElement, exportButton);
    refreshExportPreview(previewRoot, analysisDocument, exportDraft);
  }

  xmlViz.renderExportPreparation = renderExportPreparation;
})(typeof window !== "undefined" ? window : globalThis);
