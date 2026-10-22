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

  function renderTagCountTable(parentElement, countSummary) {
    appendHeading(parentElement, "Tag counts");
    var summaryLine = createElement("p", "summary-line");
    summaryLine.textContent =
      countSummary.totalInstanceCount + " tagged instances across " + countSummary.tagCounts.length + " tag types.";
    parentElement.appendChild(summaryLine);

    var table = createElement("table", "data-table");
    var headerRow = createElement("tr");
    ["Tag", "Color", "Count"].forEach(function (columnTitle) {
      var headerCell = createElement("th");
      headerCell.textContent = columnTitle;
      headerRow.appendChild(headerCell);
    });
    table.appendChild(headerRow);

    countSummary.tagCounts.forEach(function (tagCount) {
      var row = createElement("tr");
      var codeCell = createElement("td");
      codeCell.textContent = tagCount.code;
      row.appendChild(codeCell);

      var colorCell = createElement("td");
      var swatch = createElement("span", "color-swatch");
      swatch.style.backgroundColor = tagCount.cssColor;
      swatch.title = tagCount.cssColor;
      colorCell.appendChild(swatch);
      row.appendChild(colorCell);

      var countCell = createElement("td");
      countCell.textContent = String(tagCount.count);
      row.appendChild(countCell);

      table.appendChild(row);
    });
    parentElement.appendChild(table);
  }

  function renderLabelGroupTable(parentElement, countSummary) {
    appendHeading(parentElement, "Label groups");
    var table = createElement("table", "data-table");
    var headerRow = createElement("tr");
    ["Group", "Text", "Count"].forEach(function (columnTitle) {
      var headerCell = createElement("th");
      headerCell.textContent = columnTitle;
      headerRow.appendChild(headerCell);
    });
    table.appendChild(headerRow);

    countSummary.labelGroupCounts.forEach(function (labelCount) {
      var row = createElement("tr");
      var groupCell = createElement("td");
      groupCell.textContent = labelCount.groupName;
      row.appendChild(groupCell);

      var textCell = createElement("td");
      textCell.textContent = labelCount.text;
      row.appendChild(textCell);

      var countCell = createElement("td");
      countCell.textContent = String(labelCount.count);
      row.appendChild(countCell);

      table.appendChild(row);
    });
    parentElement.appendChild(table);
  }

  function renderTimelineAxis(axisElement, timeline) {
    var axisLabels = createElement("div", "timeline-axis-labels");
    var startLabel = createElement("span");
    startLabel.textContent = timeline.axisStartLabel;
    var endLabel = createElement("span");
    endLabel.textContent = timeline.axisEndLabel;
    axisLabels.appendChild(startLabel);
    axisLabels.appendChild(endLabel);
    axisElement.appendChild(axisLabels);

    var tickRow = createElement("div", "timeline-tick-row");
    timeline.axisTicks.forEach(function (tick) {
      var tickMarker = createElement("div", "timeline-tick");
      tickMarker.style.left = tick.positionPercent + "%";
      var tickLabel = createElement("span");
      tickLabel.textContent = tick.label;
      tickMarker.appendChild(tickLabel);
      tickRow.appendChild(tickMarker);
    });
    axisElement.appendChild(tickRow);
  }

  function buildSelectedCodeLookup(selectedCodes) {
    var lookup = {};
    if (!selectedCodes) {
      return lookup;
    }
    for (var index = 0; index < selectedCodes.length; index += 1) {
      lookup[selectedCodes[index]] = true;
    }
    return lookup;
  }

  function formatSelectedTagRowCount(selectedCount) {
    if (selectedCount === 1) {
      return "1 tag row selected";
    }
    return selectedCount + " tag rows selected";
  }

  function updateTagSelectionDisplay(parentElement, selectedCodes) {
    var selectedLookup = buildSelectedCodeLookup(selectedCodes);
    var laneRows = parentElement.querySelectorAll(".timeline-lane[data-tag-code]");
    for (var laneIndex = 0; laneIndex < laneRows.length; laneIndex += 1) {
      var laneRow = laneRows[laneIndex];
      var tagCode = laneRow.getAttribute("data-tag-code");
      var checkbox = laneRow.querySelector(".timeline-lane-checkbox");
      if (checkbox) {
        checkbox.checked = Boolean(selectedLookup[tagCode]);
      }
    }

    var selectionCountElement = parentElement.querySelector(".export-selection-count");
    if (selectionCountElement) {
      selectionCountElement.textContent = formatSelectedTagRowCount(selectedCodes.length);
    }

    var prepareButton = parentElement.querySelector(".export-prepare-button");
    if (prepareButton) {
      prepareButton.disabled = selectedCodes.length === 0;
    }
  }

  function renderTimelineLanes(lanesContainer, timeline, tagSelectionOptions) {
    var selectedLookup = buildSelectedCodeLookup(
      tagSelectionOptions ? tagSelectionOptions.selectedCodes : []
    );

    timeline.lanes.forEach(function (lane) {
      var laneRow = createElement("div", "timeline-lane");
      laneRow.setAttribute("data-tag-code", lane.code);
      var laneLabel = createElement("div", "timeline-lane-label");
      if (tagSelectionOptions) {
        laneLabel.classList.add("timeline-lane-label-selectable");
        var checkbox = createElement("input", "timeline-lane-checkbox");
        checkbox.type = "checkbox";
        checkbox.checked = Boolean(selectedLookup[lane.code]);
        checkbox.addEventListener("change", function () {
          var nextSelectedCodes = tagSelectionOptions.selectedCodes.slice();
          if (checkbox.checked) {
            if (nextSelectedCodes.indexOf(lane.code) < 0) {
              nextSelectedCodes.push(lane.code);
            }
          } else {
            nextSelectedCodes = nextSelectedCodes.filter(function (code) {
              return code !== lane.code;
            });
          }
          tagSelectionOptions.onSelectedCodesChange(nextSelectedCodes, "toggle");
        });
        laneLabel.appendChild(checkbox);
      }
      var laneCodeText = createElement("span", "timeline-lane-code");
      laneCodeText.textContent = lane.code;
      laneLabel.appendChild(laneCodeText);
      laneRow.appendChild(laneLabel);

      var laneTrack = createElement("div", "timeline-lane-track");
      lane.bars.forEach(function (bar) {
        var barElement = createElement("div", "timeline-bar");
        barElement.style.left = bar.leftPercent + "%";
        barElement.style.width = bar.widthPercent + "%";
        barElement.style.backgroundColor = bar.cssColor;
        barElement.title = bar.tooltip;
        laneTrack.appendChild(barElement);
      });
      laneRow.appendChild(laneTrack);
      lanesContainer.appendChild(laneRow);
    });
  }

  function renderTagSelectionToolbar(parentElement, timeline, tagSelectionOptions) {
    var toolbar = createElement("div", "export-selection-toolbar");
    var helperText = createElement("p", "summary-line");
    helperText.textContent =
      "Select tag rows to include in a new XML file. Every instance with a selected tag is exported.";
    toolbar.appendChild(helperText);

    var buttonRow = createElement("div", "export-selection-actions");
    var selectAllButton = createElement("button", "action-button");
    selectAllButton.type = "button";
    selectAllButton.textContent = "Select all tags";
    selectAllButton.addEventListener("click", function () {
      var allCodes = timeline.lanes.map(function (lane) {
        return lane.code;
      });
      tagSelectionOptions.onSelectedCodesChange(allCodes, "all");
    });
    buttonRow.appendChild(selectAllButton);

    var clearButton = createElement("button", "action-button");
    clearButton.type = "button";
    clearButton.textContent = "Clear selection";
    clearButton.addEventListener("click", function () {
      tagSelectionOptions.onSelectedCodesChange([], "clear");
    });
    buttonRow.appendChild(clearButton);

    var prepareButton = createElement("button", "action-button action-button-primary export-prepare-button");
    prepareButton.type = "button";
    prepareButton.textContent = "Prepare export";
    prepareButton.disabled = tagSelectionOptions.selectedCodes.length === 0;
    prepareButton.addEventListener("click", function () {
      tagSelectionOptions.onPrepareExport();
    });
    buttonRow.appendChild(prepareButton);

    var selectionCount = createElement("span", "export-selection-count");
    selectionCount.textContent = formatSelectedTagRowCount(tagSelectionOptions.selectedCodes.length);
    buttonRow.appendChild(selectionCount);
    toolbar.appendChild(buttonRow);
    parentElement.appendChild(toolbar);
  }

  function renderTagTimeline(parentElement, analysisDocument, tagSelectionOptions) {
    appendHeading(parentElement, "Tag timeline");
    var timeline = xmlViz.buildTagTimeline(analysisDocument);
    if (tagSelectionOptions) {
      renderTagSelectionToolbar(parentElement, timeline, tagSelectionOptions);
    }
    var timelineSection = createElement("div", "timeline-section");
    var axisElement = createElement("div", "timeline-axis");
    renderTimelineAxis(axisElement, timeline);
    timelineSection.appendChild(axisElement);

    var scrollContainer = createElement("div", "timeline-scroll");
    var lanesContainer = createElement("div", "timeline-lanes");
    renderTimelineLanes(lanesContainer, timeline, tagSelectionOptions);
    scrollContainer.appendChild(lanesContainer);
    timelineSection.appendChild(scrollContainer);
    parentElement.appendChild(timelineSection);
  }

  function renderVisualization(parentElement, analysisDocument, visualizationOptions) {
    parentElement.textContent = "";
    var countSummary = xmlViz.countTags(analysisDocument);
    renderTagCountTable(parentElement, countSummary);
    renderLabelGroupTable(parentElement, countSummary);
    renderTagTimeline(parentElement, analysisDocument, visualizationOptions && visualizationOptions.tagSelection);
  }

  xmlViz.renderVisualization = renderVisualization;
  xmlViz.updateTagSelectionDisplay = updateTagSelectionDisplay;
})(typeof window !== "undefined" ? window : globalThis);
