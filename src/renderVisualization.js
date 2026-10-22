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

  var cancelTimelineAxisWatch = null;

  function clearTimelineAxisLayoutWatcher() {
    if (cancelTimelineAxisWatch) {
      cancelTimelineAxisWatch();
      cancelTimelineAxisWatch = null;
    }
  }

  function timelineTagLabel(tagCode) {
    var normalized = String(tagCode == null ? "" : tagCode).replace(/[\r\n]+/g, " ").trim();
    if (!normalized) {
      return "Untitled tag";
    }
    return normalized;
  }

  function measureCssLengthPixels(tickRow, cssLength, fallbackPixels) {
    var probe = createElement("span", "timeline-tick");
    probe.setAttribute("aria-hidden", "true");
    probe.style.position = "fixed";
    probe.style.left = "0";
    probe.style.top = "0";
    probe.style.visibility = "hidden";
    probe.style.width = cssLength;
    probe.style.padding = "0";
    probe.style.border = "0";
    tickRow.appendChild(probe);
    var pixels = probe.offsetWidth;
    tickRow.removeChild(probe);
    if (pixels > 0) {
      return pixels;
    }
    return fallbackPixels;
  }

  function measureWidestTimelineLabelPixels(tickRow, labelTexts) {
    var probe = createElement("span", "timeline-tick");
    probe.setAttribute("aria-hidden", "true");
    probe.style.position = "fixed";
    probe.style.left = "0";
    probe.style.top = "0";
    probe.style.visibility = "hidden";
    probe.style.width = "auto";
    tickRow.appendChild(probe);
    var maxWidth = 0;
    for (var index = 0; index < labelTexts.length; index += 1) {
      probe.textContent = labelTexts[index];
      if (probe.offsetWidth > maxWidth) {
        maxWidth = probe.offsetWidth;
      }
    }
    if (!(maxWidth > 0)) {
      probe.textContent = "";
      probe.style.width = "5ch";
      maxWidth = probe.offsetWidth;
    }
    tickRow.removeChild(probe);
    return maxWidth;
  }

  function renderAxisTickElements(tickRow, ticks) {
    tickRow.textContent = "";
    for (var index = 0; index < ticks.length; index += 1) {
      var tick = ticks[index];
      var tickMarker = createElement("span", "timeline-tick timeline-tick-" + tick.placement);
      if (tick.placement === "center") {
        tickMarker.style.left = tick.positionPercent + "%";
      }
      tickMarker.textContent = tick.label;
      tickRow.appendChild(tickMarker);
    }
  }

  function setTimelineTrackMinimum(timelineSection, minimumTrackWidthPixels) {
    var nextValue = Math.ceil(minimumTrackWidthPixels) + "px";
    if (timelineSection.style.getPropertyValue("--timeline-track-min") !== nextValue) {
      timelineSection.style.setProperty("--timeline-track-min", nextValue);
    }
  }

  function layoutTimelineAxisTicks(tickRow, timelineSection, timeline) {
    var gapPixels = measureCssLengthPixels(tickRow, "0.75rem", 12);
    var labelWidthPixels = measureWidestTimelineLabelPixels(tickRow, [
      timeline.axisStartLabel,
      timeline.axisEndLabel,
    ]);
    if (!(labelWidthPixels > 0)) {
      labelWidthPixels = measureCssLengthPixels(tickRow, "5ch", 40);
    }

    var borderPixels = tickRow.offsetWidth - tickRow.clientWidth;
    if (!(borderPixels > 0)) {
      borderPixels = 2;
    }

    var axis = null;
    var trackWidthPixels = 0;
    var minimumTrackWidthPixels = 0;
    for (var passIndex = 0; passIndex < 2; passIndex += 1) {
      var sizingAxis = xmlViz.buildTimelineAxisTicks(
        timeline.timelineStartSeconds,
        timeline.timelineEndSeconds,
        tickRow.clientWidth,
        labelWidthPixels,
        gapPixels
      );
      minimumTrackWidthPixels = sizingAxis.minimumTrackWidthPixels + borderPixels;
      setTimelineTrackMinimum(timelineSection, minimumTrackWidthPixels);
      trackWidthPixels = tickRow.clientWidth;
      axis = xmlViz.buildTimelineAxisTicks(
        timeline.timelineStartSeconds,
        timeline.timelineEndSeconds,
        trackWidthPixels,
        labelWidthPixels,
        gapPixels
      );
      var producedLabels = [];
      for (var tickIndex = 0; tickIndex < axis.ticks.length; tickIndex += 1) {
        producedLabels.push(axis.ticks[tickIndex].label);
      }
      var producedLabelWidthPixels = measureWidestTimelineLabelPixels(tickRow, producedLabels);
      if (!(producedLabelWidthPixels > labelWidthPixels + 0.5)) {
        break;
      }
      labelWidthPixels = producedLabelWidthPixels;
    }

    if (!(trackWidthPixels > 0)) {
      renderAxisTickElements(tickRow, axis.ticks);
      tickRow._timelineLayoutKey = "";
      return;
    }

    var layoutKey = [
      trackWidthPixels,
      labelWidthPixels,
      gapPixels,
      Math.ceil(minimumTrackWidthPixels),
      axis.ticks.length,
    ].join(":");
    if (tickRow._timelineLayoutKey === layoutKey) {
      return;
    }
    tickRow._timelineLayoutKey = layoutKey;
    renderAxisTickElements(tickRow, axis.ticks);
  }

  function watchTimelineAxis(tickRow, timelineSection, timeline) {
    var cancelled = false;
    var frameId = 0;
    var observer = null;

    function requestRefresh() {
      if (cancelled || frameId) {
        return;
      }
      frameId = window.requestAnimationFrame(function () {
        frameId = 0;
        if (cancelled || !tickRow.isConnected) {
          return;
        }
        layoutTimelineAxisTicks(tickRow, timelineSection, timeline);
      });
    }

    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(requestRefresh);
      observer.observe(tickRow);
    }
    window.addEventListener("resize", requestRefresh);
    if (document.fonts && document.fonts.ready && typeof document.fonts.ready.then === "function") {
      document.fonts.ready.then(function () {
        requestRefresh();
      });
    }

    cancelTimelineAxisWatch = function () {
      cancelled = true;
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      if (observer) {
        observer.disconnect();
      }
      window.removeEventListener("resize", requestRefresh);
    };
  }

  function renderTimelineAxis(axisElement) {
    var spacer = createElement("div", "timeline-axis-spacer");
    spacer.setAttribute("aria-hidden", "true");
    var tickRow = createElement("div", "timeline-tick-row");
    axisElement.appendChild(spacer);
    axisElement.appendChild(tickRow);
    return tickRow;
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
          tagSelectionOptions.onSelectedCodesChange(nextSelectedCodes);
        });
        laneLabel.appendChild(checkbox);
      }
      var laneCodeText = createElement("span", "timeline-lane-code");
      var tagLabel = timelineTagLabel(lane.code);
      laneCodeText.textContent = tagLabel;
      laneCodeText.title = tagLabel;
      laneCodeText.setAttribute("dir", "auto");
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
      tagSelectionOptions.onSelectedCodesChange(allCodes);
    });
    buttonRow.appendChild(selectAllButton);

    var clearButton = createElement("button", "action-button");
    clearButton.type = "button";
    clearButton.textContent = "Clear selection";
    clearButton.addEventListener("click", function () {
      tagSelectionOptions.onSelectedCodesChange([]);
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
    if (timeline.lanes.length === 0) {
      var emptyMessage = createElement("p", "summary-line");
      emptyMessage.textContent = "No tags to show.";
      parentElement.appendChild(emptyMessage);
      return;
    }
    if (tagSelectionOptions) {
      renderTagSelectionToolbar(parentElement, timeline, tagSelectionOptions);
    }
    var timelineSection = createElement("div", "timeline-section");
    if (tagSelectionOptions) {
      timelineSection.classList.add("is-selectable");
    }
    var scrollContainer = createElement("div", "timeline-scroll");
    var sheet = createElement("div", "timeline-sheet");
    var axisElement = createElement("div", "timeline-axis");
    var tickRow = renderTimelineAxis(axisElement);
    sheet.appendChild(axisElement);

    var lanesContainer = createElement("div", "timeline-lanes");
    renderTimelineLanes(lanesContainer, timeline, tagSelectionOptions);
    sheet.appendChild(lanesContainer);
    scrollContainer.appendChild(sheet);
    timelineSection.appendChild(scrollContainer);
    parentElement.appendChild(timelineSection);
    layoutTimelineAxisTicks(tickRow, timelineSection, timeline);
    watchTimelineAxis(tickRow, timelineSection, timeline);
  }

  function renderVisualization(parentElement, analysisDocument, visualizationOptions) {
    clearTimelineAxisLayoutWatcher();
    parentElement.textContent = "";
    var countSummary = xmlViz.countTags(analysisDocument);
    renderTagCountTable(parentElement, countSummary);
    renderLabelGroupTable(parentElement, countSummary);
    renderTagTimeline(parentElement, analysisDocument, visualizationOptions && visualizationOptions.tagSelection);
  }

  xmlViz.renderVisualization = renderVisualization;
  xmlViz.updateTagSelectionDisplay = updateTagSelectionDisplay;
})(typeof window !== "undefined" ? window : globalThis);
