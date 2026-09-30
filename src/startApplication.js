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

  function startApplication() {
    var fileInput = document.getElementById("analysis-file-input");
    var fileNameDisplay = document.getElementById("selected-file-name");
    var errorElement = document.getElementById("read-error-message");
    var exportStatusElement = document.getElementById("export-status-message");
    var visualizationRoot = document.getElementById("visualization-root");
    var currentAnalysisDocument = null;
    var currentSourceFileName = "";
    var selectedTagCodes = [];
    var exportDraft = null;
    var currentView = "overview";

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
          onSelectedCodesChange: function (nextSelectedCodes) {
            selectedTagCodes = nextSelectedCodes.slice();
            renderOverviewView();
          },
          onPrepareExport: function () {
            exportDraft = xmlViz.createDefaultExportDraft(
              selectedTagCodes,
              currentSourceFileName
            );
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
          renderOverviewView();
        },
        onExport: function (completedDraft) {
          var exportDocument = xmlViz.buildExportDocument(
            currentAnalysisDocument,
            completedDraft
          );
          var xmlText = xmlViz.writeAnalysisFile(exportDocument);
          var downloadFileName = normalizeDownloadFileName(completedDraft.downloadFileName);
          triggerDownload(downloadFileName, xmlText);
          showExportStatus("Saved " + downloadFileName + ".");
        },
      });
    }

    fileInput.addEventListener("change", function () {
      var selectedFile = fileInput.files && fileInput.files[0];
      if (!selectedFile) {
        return;
      }

      fileNameDisplay.textContent = selectedFile.name;
      clearErrorMessage(errorElement);
      clearExportStatus();

      readFileAsText(selectedFile)
        .then(function (xmlText) {
          var analysisDocument = xmlViz.readAnalysisFile(xmlText);
          currentAnalysisDocument = analysisDocument;
          currentSourceFileName = selectedFile.name;
          selectedTagCodes = [];
          renderOverviewView();
        })
        .catch(function (error) {
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
        });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startApplication);
  } else {
    startApplication();
  }
})(typeof window !== "undefined" ? window : globalThis);
