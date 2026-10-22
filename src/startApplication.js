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

  function bindAnalysisFileDrop(fileInput, dropZone) {
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
    bindThemeToggle(themeToggle);
    bindAnalysisFileDrop(fileInput, dropZone);
    var currentAnalysisDocument = null;
    var currentSourceFileName = "";
    var currentSourceFileBytes = 0;
    var selectedTagCodes = [];
    var exportDraft = null;
    var currentView = "overview";

    function scrollPrepareExportHeaderIntoView() {
      var sectionHeading = visualizationRoot.querySelector(
        ".export-preparation-header .section-heading"
      );
      if (!sectionHeading) {
        return;
      }
      var prefersReducedMotion =
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      sectionHeading.scrollIntoView({
        block: "start",
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
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

    function documentCounts(analysisDocument) {
      if (!analysisDocument) {
        return { tagCount: 0, instanceCount: 0 };
      }
      try {
        var summary = xmlViz.countTags(analysisDocument);
        return {
          tagCount: summary.tagCounts.length,
          instanceCount: summary.totalInstanceCount,
        };
      } catch (error) {
        return { tagCount: 0, instanceCount: 0 };
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
          onSelectedCodesChange: function (nextSelectedCodes) {
            selectedTagCodes = nextSelectedCodes.slice();
            xmlViz.updateTagSelectionDisplay(visualizationRoot, selectedTagCodes);
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
        onExportBlocked: function (errorCode) {
          var counts = documentCounts(currentAnalysisDocument);
          reportUsageEvent({
            action: "export",
            outcome: "error",
            errorCode: errorCode,
            fileBytes: currentSourceFileBytes,
            tagCount: counts.tagCount,
            instanceCount: counts.instanceCount,
            exportedCount: 0,
            durationMs: 0,
          });
        },
        onExport: function (completedDraft) {
          var startedAt = xmlViz.markUsageTime();
          var counts = documentCounts(currentAnalysisDocument);
          var outcome = "error";
          var errorCode = "failed";
          var exportedCount = 0;
          var exportStage = "build";
          try {
            var exportDocument = xmlViz.buildExportDocument(
              currentAnalysisDocument,
              completedDraft
            );
            exportedCount = exportDocument.taggedInstances ? exportDocument.taggedInstances.length : 0;
            exportStage = "write";
            var xmlText = xmlViz.writeAnalysisFile(exportDocument);
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
              fileBytes: currentSourceFileBytes,
              tagCount: counts.tagCount,
              instanceCount: counts.instanceCount,
              exportedCount: exportedCount,
              durationMs: xmlViz.elapsedUsageMilliseconds(startedAt),
            });
          }
        },
      });
      scrollPrepareExportHeaderIntoView();
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

      readFileAsText(selectedFile)
        .then(function (xmlText) {
          var analysisDocument = xmlViz.readAnalysisFile(xmlText);
          currentAnalysisDocument = analysisDocument;
          currentSourceFileName = selectedFile.name;
          currentSourceFileBytes = fileBytes;
          selectedTagCodes = [];
          renderOverviewView();
          var counts = documentCounts(analysisDocument);
          reportUsageEvent({
            action: "parse",
            outcome: "success",
            errorCode: "",
            fileBytes: fileBytes,
            tagCount: counts.tagCount,
            instanceCount: counts.instanceCount,
            exportedCount: 0,
            durationMs: xmlViz.elapsedUsageMilliseconds(startedAt),
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
            reportUsageEvent({
              action: "parse",
              outcome: "error",
              errorCode: errorCode,
              fileBytes: fileBytes,
              tagCount: 0,
              instanceCount: 0,
              exportedCount: 0,
              durationMs: xmlViz.elapsedUsageMilliseconds(startedAt),
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
