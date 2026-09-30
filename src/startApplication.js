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

  function startApplication() {
    var fileInput = document.getElementById("analysis-file-input");
    var fileNameDisplay = document.getElementById("selected-file-name");
    var errorElement = document.getElementById("read-error-message");
    var visualizationRoot = document.getElementById("visualization-root");
    var currentAnalysisDocument = null;

    fileInput.addEventListener("change", function () {
      var selectedFile = fileInput.files && fileInput.files[0];
      if (!selectedFile) {
        return;
      }

      fileNameDisplay.textContent = selectedFile.name;
      clearErrorMessage(errorElement);

      readFileAsText(selectedFile)
        .then(function (xmlText) {
          var analysisDocument = xmlViz.readAnalysisFile(xmlText);
          currentAnalysisDocument = analysisDocument;
          xmlViz.renderVisualization(visualizationRoot, analysisDocument);
        })
        .catch(function (error) {
          if (currentAnalysisDocument) {
            xmlViz.renderVisualization(visualizationRoot, currentAnalysisDocument);
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
