(function (global) {
  "use strict";

  var xmlViz = global.xmlViz;

  function showErrorMessage(errorElement, message) {
    errorElement.textContent = message;
    errorElement.hidden = false;
  }

  function clearErrorMessage(errorElement) {
    errorElement.textContent = "";
    errorElement.hidden = true;
  }

  function readFileAsText(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        resolve(String(reader.result));
      };
      reader.onerror = function () {
        reject(new Error("Could not read the selected file."));
      };
      reader.readAsText(file);
    });
  }

  function normalizeDownloadFileName(rawFileName) {
    var trimmedName = String(rawFileName || "").trim();
    if (trimmedName === "") {
      return "analysis-export.xml";
    }
    if (trimmedName.toLowerCase().endsWith(".xml")) {
      return trimmedName;
    }
    return trimmedName + ".xml";
  }

  function triggerDownload(fileName, xmlText) {
    var blob = new Blob([xmlText], { type: "application/xml;charset=utf-8" });
    var objectUrl = URL.createObjectURL(blob);
    var downloadLink = document.createElement("a");
    downloadLink.href = objectUrl;
    downloadLink.download = fileName;
    downloadLink.style.display = "none";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(objectUrl);
  }

  function readStoredTheme() {
    try {
      return localStorage.getItem("theme");
    } catch (error) {
      return null;
    }
  }

  function writeStoredTheme(theme) {
    try {
      localStorage.setItem("theme", theme);
    } catch (error) {
      // The document class still carries the choice for this view.
    }
  }

  function syncThemeToggle(themeToggle) {
    if (!themeToggle) {
      return;
    }
    var isDark = document.documentElement.classList.contains("dark");
    themeToggle.setAttribute(
      "aria-label",
      isDark ? "Switch to light theme" : "Switch to dark theme"
    );
  }

  function bindThemeToggle(themeToggle) {
    if (!themeToggle) {
      return;
    }
    syncThemeToggle(themeToggle);
    themeToggle.addEventListener("click", function () {
      var nextTheme = document.documentElement.classList.contains("dark") ? "light" : "dark";
      document.documentElement.classList.toggle("dark", nextTheme === "dark");
      writeStoredTheme(nextTheme);
      syncThemeToggle(themeToggle);
    });

    var storedTheme = readStoredTheme();
    if (storedTheme === "light" || storedTheme === "dark" || !window.matchMedia) {
      return;
    }
    var themeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    var applySystemTheme = function (event) {
      document.documentElement.classList.toggle("dark", event.matches);
      syncThemeToggle(themeToggle);
    };
    if (themeQuery.addEventListener) {
      themeQuery.addEventListener("change", applySystemTheme);
    }
  }

  function bindAnalysisFileDrop(fileInput, dropZone, onFileDropped) {
    if (!fileInput || !dropZone) {
      return;
    }
    var dragDepth = 0;

    dropZone.addEventListener("dragenter", function (event) {
      event.preventDefault();
      dragDepth += 1;
      dropZone.classList.add("is-dragging");
    });

    dropZone.addEventListener("dragover", function (event) {
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "copy";
      }
    });

    dropZone.addEventListener("dragleave", function () {
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) {
        dropZone.classList.remove("is-dragging");
      }
    });

    dropZone.addEventListener("drop", function (event) {
      event.preventDefault();
      dragDepth = 0;
      dropZone.classList.remove("is-dragging");
      var droppedFiles = event.dataTransfer && event.dataTransfer.files;
      var droppedFile = droppedFiles && droppedFiles[0];
      if (!droppedFile || typeof DataTransfer !== "function") {
        return;
      }
      var transfer = new DataTransfer();
      transfer.items.add(droppedFile);
      fileInput.files = transfer.files;
      if (onFileDropped) {
        onFileDropped();
      }
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  function startApplication() {
    var fileInput = document.getElementById("analysis-file-input");
    var fileNameDisplay = document.getElementById("selected-file-name");
    var errorElement = document.getElementById("read-error-message");
    var exportStatusElement = document.getElementById("export-status-message");
    var visualizationRoot = document.getElementById("visualization-root");
    var themeToggle = document.getElementById("theme-toggle");
    var dropZone = document.querySelector(".file-drop-zone");
    var nextParseInput = "picker";
    bindThemeToggle(themeToggle);
    bindAnalysisFileDrop(fileInput, dropZone, function () {
      nextParseInput = "drop";
    });
    var currentAnalysisDocument = null;
    var currentSourceFileName = "";
    var currentSourceFileBytes = 0;
    var selectedTagCodes = [];
    var exportDraft = null;
    var currentView = "overview";

    function scrollPageToTop() {
      window.scrollTo(0, 0);
    }

    function clearExportStatus() {
      if (!exportStatusElement) {
        return;
      }
      exportStatusElement.textContent = "";
      exportStatusElement.hidden = true;
    }

    function showExportStatus(message) {
      if (!exportStatusElement) {
        return;
      }
      exportStatusElement.textContent = message;
      exportStatusElement.hidden = false;
    }

    function reportUsageEvent(event) {
      try {
        xmlViz.reportUsageEvent(event);
      } catch (error) {
        // A failed count must not change loading or export.
      }
    }

    function renderOverviewView() {
      currentView = "overview";
      exportDraft = null;
      if (!currentAnalysisDocument) {
        visualizationRoot.textContent = "";
        return;
      }
      xmlViz.renderVisualization(visualizationRoot, currentAnalysisDocument, {
        tagSelection: {
          selectedCodes: selectedTagCodes.slice(),
          onSelectedCodesChange: function (nextSelectedCodes, changeKind) {
            selectedTagCodes = nextSelectedCodes.slice();
            xmlViz.updateTagSelectionDisplay(visualizationRoot, selectedTagCodes);
            var measures = xmlViz.measureAnalysisDocument(currentAnalysisDocument);
            reportUsageEvent({
              action: "select",
              outcome: "success",
              errorCode: "",
              change: changeKind,
              selectedRowCount: selectedTagCodes.length,
              selectedInstanceCount: xmlViz.countInstancesForCodes(
                currentAnalysisDocument,
                selectedTagCodes
              ),
              tagCount: measures.tagCount,
              instanceCount: measures.instanceCount,
            });
          },
          onPrepareExport: function () {
            exportDraft = xmlViz.createDefaultExportDraft(
              selectedTagCodes,
              currentSourceFileName
            );
            var measures = xmlViz.measureAnalysisDocument(currentAnalysisDocument);
            var metadataOffer = xmlViz.describeMetadataOffer(
              currentAnalysisDocument,
              exportDraft.selectedCodes
            );
            reportUsageEvent({
              action: "prepare",
              outcome: "success",
              errorCode: "",
              selectedRowCount: exportDraft.selectedCodes.length,
              selectedInstanceCount: xmlViz.countInstancesForCodes(
                currentAnalysisDocument,
                exportDraft.selectedCodes
              ),
              tagCount: measures.tagCount,
              instanceCount: measures.instanceCount,
              metadataBlockCount: metadataOffer.metadataBlockCount,
              instanceMetadataTypeCount: metadataOffer.instanceMetadataTypeCount,
            });
            renderExportPrepareView();
          },
        },
      });
    }

    function renderExportPrepareView() {
      currentView = "exportPrepare";
      if (!currentAnalysisDocument || !exportDraft) {
        renderOverviewView();
        return;
      }
      xmlViz.renderExportPreparation(visualizationRoot, currentAnalysisDocument, exportDraft, {
        onBack: function () {
          var draftMeasures = xmlViz.measureExportDraft(exportDraft, currentSourceFileName);
          reportUsageEvent({
            action: "back",
            outcome: "success",
            errorCode: "",
            selectedRowCount: exportDraft ? exportDraft.selectedCodes.length : 0,
            selectedInstanceCount: xmlViz.countInstancesForCodes(
              currentAnalysisDocument,
              exportDraft ? exportDraft.selectedCodes : []
            ),
            renamedCount: draftMeasures.renamedCount,
            fieldOverrideCount: draftMeasures.fieldOverrideCount,
            excludedFileMetadataCount: draftMeasures.excludedFileMetadataCount,
            excludedInstanceMetadataCount: draftMeasures.excludedInstanceMetadataCount,
            downloadNameChanged: draftMeasures.downloadNameChanged,
          });
          renderOverviewView();
        },
        onMetadataChange: function (scope, included) {
          if (!exportDraft) {
            return;
          }
          var metadataOffer = xmlViz.describeMetadataOffer(
            currentAnalysisDocument,
            exportDraft.selectedCodes
          );
          reportUsageEvent({
            action: "metadata",
            outcome: "success",
            errorCode: "",
            scope: scope,
            included: included,
            excludedFileMetadataCount: exportDraft.excludedFileMetadataSlotIndexes.length,
            excludedInstanceMetadataCount: exportDraft.excludedInstanceElementNames.length,
            metadataBlockCount: metadataOffer.metadataBlockCount,
            instanceMetadataTypeCount: metadataOffer.instanceMetadataTypeCount,
          });
        },
        onExportBlocked: function (errorCode) {
          var measures = xmlViz.measureAnalysisDocument(currentAnalysisDocument);
          var draftMeasures = xmlViz.measureExportDraft(exportDraft, currentSourceFileName);
          reportUsageEvent({
            action: "export",
            outcome: "error",
            errorCode: errorCode,
            durationMs: 0,
            fileBytes: currentSourceFileBytes,
            exportBytes: 0,
            tagCount: measures.tagCount,
            instanceCount: measures.instanceCount,
            labelCount: measures.labelCount,
            selectedRowCount: exportDraft ? exportDraft.selectedCodes.length : 0,
            exportedInstanceCount: 0,
            exportedLabelCount: 0,
            exportedTimelineDurationMs: 0,
            renamedCount: draftMeasures.renamedCount,
            fieldOverrideCount: draftMeasures.fieldOverrideCount,
            excludedFileMetadataCount: draftMeasures.excludedFileMetadataCount,
            excludedInstanceMetadataCount: draftMeasures.excludedInstanceMetadataCount,
            downloadNameChanged: draftMeasures.downloadNameChanged,
          });
        },
        onExport: function (completedDraft) {
          var startedAt = xmlViz.markUsageTime();
          var sourceMeasures = xmlViz.measureAnalysisDocument(currentAnalysisDocument);
          var draftMeasures = xmlViz.measureExportDraft(completedDraft, currentSourceFileName);
          var outcome = "error";
          var errorCode = "failed";
          var exportBytes = 0;
          var exportedInstanceCount = 0;
          var exportedLabelCount = 0;
          var exportedTimelineDurationMs = 0;
          var exportStage = "build";
          try {
            var exportDocument = xmlViz.buildExportDocument(
              currentAnalysisDocument,
              completedDraft
            );
            var exportedMeasures = xmlViz.measureAnalysisDocument(exportDocument);
            exportedInstanceCount = exportedMeasures.instanceCount;
            exportedLabelCount = exportedMeasures.labelCount;
            exportedTimelineDurationMs = exportedMeasures.timelineDurationMs;
            exportStage = "write";
            var xmlText = xmlViz.writeAnalysisFile(exportDocument);
            exportBytes = xmlViz.utf8ByteLength(xmlText);
            exportStage = "download";
            var downloadFileName = normalizeDownloadFileName(completedDraft.downloadFileName);
            triggerDownload(downloadFileName, xmlText);
            showExportStatus("Saved " + downloadFileName + ".");
            outcome = "success";
            errorCode = "";
          } catch (error) {
            outcome = "error";
            errorCode = xmlViz.usageErrorCode(error, exportStage);
            throw error;
          } finally {
            reportUsageEvent({
              action: "export",
              outcome: outcome,
              errorCode: errorCode,
              durationMs: xmlViz.elapsedUsageMilliseconds(startedAt),
              fileBytes: currentSourceFileBytes,
              exportBytes: exportBytes,
              tagCount: sourceMeasures.tagCount,
              instanceCount: sourceMeasures.instanceCount,
              labelCount: sourceMeasures.labelCount,
              selectedRowCount: completedDraft.selectedCodes.length,
              exportedInstanceCount: exportedInstanceCount,
              exportedLabelCount: exportedLabelCount,
              exportedTimelineDurationMs: exportedTimelineDurationMs,
              renamedCount: draftMeasures.renamedCount,
              fieldOverrideCount: draftMeasures.fieldOverrideCount,
              excludedFileMetadataCount: draftMeasures.excludedFileMetadataCount,
              excludedInstanceMetadataCount: draftMeasures.excludedInstanceMetadataCount,
              downloadNameChanged: draftMeasures.downloadNameChanged,
            });
          }
        },
      });
      scrollPageToTop();
    }

    fileInput.addEventListener("change", function () {
      var selectedFile = fileInput.files && fileInput.files[0];
      if (!selectedFile) {
        return;
      }

      fileNameDisplay.textContent = selectedFile.name;
      clearErrorMessage(errorElement);
      clearExportStatus();
      var startedAt = xmlViz.markUsageTime();
      var fileBytes = typeof selectedFile.size === "number" ? selectedFile.size : 0;
      var inputKind = nextParseInput === "drop" ? "drop" : "picker";
      nextParseInput = "picker";

      readFileAsText(selectedFile)
        .then(function (xmlText) {
          var analysisDocument = xmlViz.readAnalysisFile(xmlText);
          currentAnalysisDocument = analysisDocument;
          currentSourceFileName = selectedFile.name;
          currentSourceFileBytes = fileBytes;
          selectedTagCodes = [];
          renderOverviewView();
          var measures = xmlViz.measureAnalysisDocument(analysisDocument);
          reportUsageEvent({
            action: "parse",
            outcome: "success",
            errorCode: "",
            input: inputKind,
            durationMs: xmlViz.elapsedUsageMilliseconds(startedAt),
            fileBytes: fileBytes,
            instanceCount: measures.instanceCount,
            tagCount: measures.tagCount,
            labelCount: measures.labelCount,
            distinctLabelCount: measures.distinctLabelCount,
            distinctGroupCount: measures.distinctGroupCount,
            colorRowCount: measures.colorRowCount,
            metadataBlockCount: measures.metadataBlockCount,
            timelineDurationMs: measures.timelineDurationMs,
          });
        })
        .catch(function (error) {
          var errorCode = "failed";
          try {
            errorCode = xmlViz.usageErrorCode(error, "parse");
            if (currentAnalysisDocument) {
              if (currentView === "exportPrepare") {
                renderExportPrepareView();
              } else {
                renderOverviewView();
              }
            }
            showErrorMessage(
              errorElement,
              error && error.message ? error.message : "Failed to load the XML file."
            );
          } finally {
            var emptyMeasures = xmlViz.measureAnalysisDocument(null);
            reportUsageEvent({
              action: "parse",
              outcome: "error",
              errorCode: errorCode,
              input: inputKind,
              durationMs: xmlViz.elapsedUsageMilliseconds(startedAt),
              fileBytes: fileBytes,
              instanceCount: emptyMeasures.instanceCount,
              tagCount: emptyMeasures.tagCount,
              labelCount: emptyMeasures.labelCount,
              distinctLabelCount: emptyMeasures.distinctLabelCount,
              distinctGroupCount: emptyMeasures.distinctGroupCount,
              colorRowCount: emptyMeasures.colorRowCount,
              metadataBlockCount: emptyMeasures.metadataBlockCount,
              timelineDurationMs: emptyMeasures.timelineDurationMs,
            });
          }
        });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startApplication);
  } else {
    startApplication();
  }
})(typeof window !== "undefined" ? window : globalThis);
