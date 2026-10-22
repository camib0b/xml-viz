(function (global) {
  "use strict";

  var xmlViz = global.xmlViz;
  var SAMPLE_ANALYSIS_FILE_URL = "sample/england-vs-china-junior-world-cup-2025-12-02.xml";
  var SAMPLE_ANALYSIS_FILE_NAME = "england-vs-china-junior-world-cup-2025-12-02.xml";
  var SAMPLE_LANDING_DURATION_MS = 400;
  var SAMPLE_MATCH_ATTENTION_CLASS = "is-sample-attention";
  var SAMPLE_MATCH_ATTENTION_ANIMATION = "sample-match-attention-pulse";
  var SAMPLE_MATCH_ATTENTION_ANIMATION_DARK = "sample-match-attention-pulse-dark";

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
      return function unbindMissingDropZone() {
        return undefined;
      };
    }

    var dragDepth = 0;

    function handleDragEnter(event) {
      event.preventDefault();
      dragDepth += 1;
      dropZone.classList.add("is-drag-over");
    }

    function handleDragOver(event) {
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "copy";
      }
    }

    function handleDragLeave() {
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) {
        dropZone.classList.remove("is-drag-over");
      }
    }

    function handleDrop(event) {
      event.preventDefault();
      dragDepth = 0;
      dropZone.classList.remove("is-drag-over");
      var droppedFiles = event.dataTransfer && event.dataTransfer.files;
      var droppedFile = droppedFiles && droppedFiles[0];
      if (!droppedFile || typeof DataTransfer !== "function") {
        return;
      }
      var transfer = new DataTransfer();
      transfer.items.add(droppedFile);
      fileInput.files = transfer.files;
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    }

    dropZone.addEventListener("dragenter", handleDragEnter);
    dropZone.addEventListener("dragover", handleDragOver);
    dropZone.addEventListener("dragleave", handleDragLeave);
    dropZone.addEventListener("drop", handleDrop);

    return function unbindAnalysisFileDrop() {
      dropZone.removeEventListener("dragenter", handleDragEnter);
      dropZone.removeEventListener("dragover", handleDragOver);
      dropZone.removeEventListener("dragleave", handleDragLeave);
      dropZone.removeEventListener("drop", handleDrop);
      dragDepth = 0;
      dropZone.classList.remove("is-drag-over");
    };
  }

  function bindSampleMatchAttention(sampleMatchButton, fileInput) {
    if (!sampleMatchButton) {
      return;
    }
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    var attentionStopped = false;

    function removeSampleMatchAttentionListeners() {
      document.removeEventListener("click", stopSampleMatchAttention, true);
      document.removeEventListener("dragenter", stopSampleMatchAttention, true);
      sampleMatchButton.removeEventListener("animationend", finishSampleMatchAttention);
      if (fileInput) {
        fileInput.removeEventListener("change", stopSampleMatchAttentionOnFileChosen);
      }
    }

    function stopSampleMatchAttention() {
      if (attentionStopped) {
        return;
      }
      attentionStopped = true;
      sampleMatchButton.classList.remove(SAMPLE_MATCH_ATTENTION_CLASS);
      sampleMatchButton.style.transition = "none";
      void sampleMatchButton.offsetWidth;
      sampleMatchButton.style.transition = "";
      removeSampleMatchAttentionListeners();
    }

    function stopSampleMatchAttentionOnFileChosen() {
      var selectedFile = fileInput.files && fileInput.files[0];
      if (!selectedFile) {
        return;
      }
      stopSampleMatchAttention();
    }

    function finishSampleMatchAttention(event) {
      if (!event) {
        return;
      }
      if (
        event.animationName !== SAMPLE_MATCH_ATTENTION_ANIMATION &&
        event.animationName !== SAMPLE_MATCH_ATTENTION_ANIMATION_DARK
      ) {
        return;
      }
      stopSampleMatchAttention();
    }

    sampleMatchButton.classList.add(SAMPLE_MATCH_ATTENTION_CLASS);
    document.addEventListener("click", stopSampleMatchAttention, true);
    document.addEventListener("dragenter", stopSampleMatchAttention, true);
    sampleMatchButton.addEventListener("animationend", finishSampleMatchAttention);
    if (fileInput) {
      fileInput.addEventListener("change", stopSampleMatchAttentionOnFileChosen);
    }
  }

  function applySharedControlClasses(rootElement) {
    if (!rootElement) {
      return;
    }
    var actionButtons = rootElement.querySelectorAll(".action-button");
    for (var buttonIndex = 0; buttonIndex < actionButtons.length; buttonIndex += 1) {
      var actionButton = actionButtons[buttonIndex];
      var sharedButtonClass = actionButton.classList.contains("action-button-primary")
        ? "button-primary"
        : "button-secondary";
      actionButton.classList.add(sharedButtonClass);
    }
    var textInputs = rootElement.querySelectorAll(".form-text-input, .metadata-field-input");
    for (var inputIndex = 0; inputIndex < textInputs.length; inputIndex += 1) {
      textInputs[inputIndex].classList.add("input");
    }
  }

  function startApplication() {
    var fileInput = document.getElementById("analysis-file-input");
    var fileNameDisplay = document.getElementById("selected-file-name");
    var errorElement = document.getElementById("read-error-message");
    var exportStatusElement = document.getElementById("export-status-message");
    var visualizationRoot = document.getElementById("visualization-root");
    var themeToggle = document.getElementById("theme-toggle");
    var dropZone = document.querySelector(".file-drop-zone");
    var fileSection = document.querySelector(".file-input-section");
    var fileDropPrompt = document.getElementById("file-drop-prompt");
    var fileChosenLabel = document.getElementById("file-chosen-label");
    var sampleMatch = document.getElementById("sample-match");
    var sampleMatchButton = document.getElementById("sample-match-button");
    var clearFileButton = document.getElementById("clear-file-button");
    bindThemeToggle(themeToggle);
    bindAnalysisFileDrop(fileInput, dropZone);
    bindSampleMatchAttention(sampleMatchButton, fileInput);
    var currentAnalysisDocument = null;
    var currentSourceFileName = "";
    var currentSourceFileBytes = 0;
    var selectedTagCodes = [];
    var exportDraft = null;
    var currentView = "overview";
    var analysisLoadGeneration = 0;
    var chosenFileCommitted = false;
    var sampleLandingChip = null;
    var sampleLandingSettled = false;
    var landingFallbackTimer = 0;

    function prefersReducedMotion() {
      return Boolean(
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      );
    }

    function scrollPrepareExportHeaderIntoView() {
      var sectionHeading = visualizationRoot.querySelector(
        ".export-preparation-header .section-heading"
      );
      if (!sectionHeading) {
        return;
      }
      sectionHeading.scrollIntoView({
        block: "start",
        behavior: prefersReducedMotion() ? "auto" : "smooth",
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
      applySharedControlClasses(visualizationRoot);
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
      applySharedControlClasses(visualizationRoot);
      scrollPrepareExportHeaderIntoView();
    }

    function reportAnalysisLoadFailure(error, fileBytes, usageAction, startedAt) {
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
          action: usageAction,
          outcome: "error",
          errorCode: errorCode,
          fileBytes: fileBytes,
          tagCount: 0,
          instanceCount: 0,
          exportedCount: 0,
          durationMs: xmlViz.elapsedUsageMilliseconds(startedAt),
        });
      }
    }

    function beginAnalysisLoad() {
      analysisLoadGeneration += 1;
      return analysisLoadGeneration;
    }

    function isCurrentAnalysisLoad(loadGeneration) {
      return loadGeneration === analysisLoadGeneration;
    }

    function removeSampleLandingChip() {
      if (landingFallbackTimer) {
        window.clearTimeout(landingFallbackTimer);
        landingFallbackTimer = 0;
      }
      if (sampleLandingChip && sampleLandingChip.parentNode) {
        sampleLandingChip.parentNode.removeChild(sampleLandingChip);
      }
      sampleLandingChip = null;
    }

    function cancelSampleLanding() {
      removeSampleLandingChip();
      sampleLandingSettled = false;
      if (dropZone) {
        dropZone.classList.remove("is-sample-landing");
      }
    }

    function revealChosenFileLabel() {
      if (!chosenFileCommitted || !dropZone) {
        return;
      }
      if (sampleLandingChip && !sampleLandingSettled) {
        return;
      }
      dropZone.classList.add("is-label-visible");
      removeSampleLandingChip();
      dropZone.classList.remove("is-sample-landing");
    }

    function commitChosenFile(fileName) {
      fileNameDisplay.textContent = fileName;
      fileNameDisplay.title = fileName;
      chosenFileCommitted = true;
      if (sampleMatch) {
        sampleMatch.hidden = true;
      }
      if (fileDropPrompt) {
        fileDropPrompt.setAttribute("aria-hidden", "true");
      }
      if (fileChosenLabel) {
        fileChosenLabel.setAttribute("aria-hidden", "false");
      }
      if (clearFileButton) {
        clearFileButton.hidden = false;
      }
      if (!dropZone) {
        return;
      }
      dropZone.classList.add("is-chosen");
      if (sampleLandingChip) {
        dropZone.classList.add("is-sample-landing");
      }
      revealChosenFileLabel();
    }

    function clearChosenFile() {
      beginAnalysisLoad();
      cancelSampleLanding();
      chosenFileCommitted = false;
      currentAnalysisDocument = null;
      currentSourceFileName = "";
      currentSourceFileBytes = 0;
      selectedTagCodes = [];
      exportDraft = null;
      currentView = "overview";
      fileNameDisplay.textContent = "";
      fileNameDisplay.title = "";
      if (fileInput) {
        fileInput.value = "";
      }
      if (fileDropPrompt) {
        fileDropPrompt.removeAttribute("aria-hidden");
      }
      if (fileChosenLabel) {
        fileChosenLabel.setAttribute("aria-hidden", "true");
      }
      if (clearFileButton) {
        clearFileButton.hidden = true;
      }
      if (sampleMatch) {
        sampleMatch.hidden = false;
      }
      if (dropZone) {
        dropZone.classList.remove("is-chosen", "is-label-visible", "is-sample-landing");
      }
      clearErrorMessage(errorElement);
      clearExportStatus();
      visualizationRoot.textContent = "";
      if (sampleMatchButton) {
        sampleMatchButton.focus();
      }
    }

    function measureChosenLabelRect(fileName) {
      fileNameDisplay.textContent = fileName;
      if (!dropZone || !fileChosenLabel) {
        return null;
      }
      dropZone.classList.add("is-motion-frozen", "is-chosen");
      var labelRect = fileChosenLabel.getBoundingClientRect();
      dropZone.classList.remove("is-chosen");
      void dropZone.offsetWidth;
      dropZone.classList.remove("is-motion-frozen");
      return labelRect;
    }

    function buildSampleLandingChip(fileName, chipWidth) {
      var chip = document.createElement("span");
      chip.className = "sample-file-chip";
      chip.setAttribute("aria-hidden", "true");
      var formatNote = document.createElement("span");
      formatNote.className = "file-format-note";
      formatNote.textContent = "XML";
      var fileNameText = document.createElement("span");
      fileNameText.className = "selected-file-name";
      fileNameText.textContent = fileName;
      chip.appendChild(formatNote);
      chip.appendChild(fileNameText);
      if (chipWidth > 0) {
        chip.style.width = chipWidth + "px";
      }
      return chip;
    }

    function playSampleLanding(fileName) {
      cancelSampleLanding();
      if (
        prefersReducedMotion() ||
        !sampleMatchButton ||
        !dropZone ||
        !fileSection ||
        !fileChosenLabel
      ) {
        sampleLandingSettled = true;
        return;
      }

      var labelRect = measureChosenLabelRect(fileName);
      var buttonRect = sampleMatchButton.getBoundingClientRect();
      var sectionRect = fileSection.getBoundingClientRect();
      if (!labelRect || !buttonRect.width || !sectionRect.width) {
        sampleLandingSettled = true;
        return;
      }

      var chip = buildSampleLandingChip(fileName, labelRect.width);
      fileSection.appendChild(chip);
      var startLeft = buttonRect.left - sectionRect.left;
      var startTop =
        buttonRect.top -
        sectionRect.top +
        (buttonRect.height - chip.offsetHeight) / 2;
      chip.style.left = startLeft + "px";
      chip.style.top = startTop + "px";
      sampleLandingChip = chip;

      var translateX = labelRect.left - sectionRect.left - startLeft;
      var translateY = labelRect.top - sectionRect.top - startTop;
      var landingSettled = false;

      function finishSampleLanding(event) {
        if (landingSettled) {
          return;
        }
        if (event && (event.target !== chip || event.propertyName !== "transform")) {
          return;
        }
        landingSettled = true;
        chip.removeEventListener("transitionend", finishSampleLanding);
        if (landingFallbackTimer) {
          window.clearTimeout(landingFallbackTimer);
          landingFallbackTimer = 0;
        }
        if (sampleLandingChip === chip) {
          sampleLandingSettled = true;
        }
        revealChosenFileLabel();
      }

      chip.addEventListener("transitionend", finishSampleLanding);
      landingFallbackTimer = window.setTimeout(function () {
        finishSampleLanding();
      }, SAMPLE_LANDING_DURATION_MS + 80);
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          if (sampleLandingChip !== chip) {
            return;
          }
          chip.style.setProperty("--chip-translate-x", translateX + "px");
          chip.style.setProperty("--chip-translate-y", translateY + "px");
          chip.classList.add("is-landing");
        });
      });
    }

    function acceptAnalysisText(fileName, xmlText, fileBytes, usageAction, startedAt) {
      var analysisDocument = xmlViz.readAnalysisFile(xmlText);
      currentAnalysisDocument = analysisDocument;
      currentSourceFileName = fileName;
      currentSourceFileBytes = fileBytes;
      selectedTagCodes = [];
      commitChosenFile(fileName);
      renderOverviewView();
      var counts = documentCounts(analysisDocument);
      reportUsageEvent({
        action: usageAction,
        outcome: "success",
        errorCode: "",
        fileBytes: fileBytes,
        tagCount: counts.tagCount,
        instanceCount: counts.instanceCount,
        exportedCount: 0,
        durationMs: xmlViz.elapsedUsageMilliseconds(startedAt),
      });
    }

    function prepareAnalysisLoad() {
      clearErrorMessage(errorElement);
      clearExportStatus();
      return xmlViz.markUsageTime();
    }

    fileInput.addEventListener("change", function () {
      var selectedFile = fileInput.files && fileInput.files[0];
      if (!selectedFile) {
        return;
      }

      cancelSampleLanding();
      var loadGeneration = beginAnalysisLoad();
      var startedAt = prepareAnalysisLoad();
      var fileBytes = typeof selectedFile.size === "number" ? selectedFile.size : 0;

      readFileAsText(selectedFile)
        .then(function (xmlText) {
          if (!isCurrentAnalysisLoad(loadGeneration)) {
            return;
          }
          acceptAnalysisText(selectedFile.name, xmlText, fileBytes, "parse", startedAt);
        })
        .catch(function (error) {
          if (!isCurrentAnalysisLoad(loadGeneration)) {
            return;
          }
          cancelSampleLanding();
          reportAnalysisLoadFailure(error, fileBytes, "parse", startedAt);
        });
    });

    if (clearFileButton) {
      clearFileButton.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        clearChosenFile();
      });
    }

    if (sampleMatchButton) {
      sampleMatchButton.addEventListener("click", function () {
        var loadGeneration = beginAnalysisLoad();
        var startedAt = prepareAnalysisLoad();
        var fileBytes = 0;
        if (fileInput) {
          fileInput.value = "";
        }
        playSampleLanding(SAMPLE_ANALYSIS_FILE_NAME);

        fetch(SAMPLE_ANALYSIS_FILE_URL)
          .then(function (response) {
            if (!response.ok) {
              throw new Error("Could not read the selected file.");
            }
            return response.blob();
          })
          .then(function (blob) {
            fileBytes = typeof blob.size === "number" ? blob.size : 0;
            return readFileAsText(blob);
          })
          .then(function (xmlText) {
            if (!isCurrentAnalysisLoad(loadGeneration)) {
              return;
            }
            acceptAnalysisText(
              SAMPLE_ANALYSIS_FILE_NAME,
              xmlText,
              fileBytes,
              "sample",
              startedAt
            );
          })
          .catch(function (error) {
            if (!isCurrentAnalysisLoad(loadGeneration)) {
              return;
            }
            cancelSampleLanding();
            reportAnalysisLoadFailure(error, fileBytes, "sample", startedAt);
          });
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startApplication);
  } else {
    startApplication();
  }
})(typeof window !== "undefined" ? window : globalThis);
